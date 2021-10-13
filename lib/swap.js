const bsv = require('bsv')
const {
  getStasScript,
  getVersion,
  getScriptData,
  sighash,
  P2PKH_UNLOCKING_SCRIPT_BYTES,
  isSplittable
} = require('./stas')
const {
  numberToLESM,
  //   replaceAll,
  addressToPubkeyhash,
  reverseEndian,
  SATS_PER_BITCOIN
} = require('./utils')

const config = require('../config')

const { app: { sats, perByte } } = config

const preimageFn = require('./preimage')
const {
  Varint
} = bsv.encoding
// const BN = bsv.crypto.BN

// function int2SM (num) {
//   const n = BN.fromNumber(num)
//   const m = n.toSM({ endian: 'little' })
//   return m.toString('hex')
// }

const flags = bsv.Script.Interpreter.SCRIPT_ENABLE_SIGHASH_FORKID | bsv.Script.Interpreter.SCRIPT_ENABLE_MAGNETIC_OPCODES | bsv.Script.Interpreter.SCRIPT_ENABLE_MONOLITH_OPCODES

// function reverseEndian (str) {
//   const num = new BN(str, 'hex')
//   const buf = num.toBuffer()
//   return buf.toString('hex').match(/.{2}/g).reverse().join('')
// }
// ---------------- End of general parameters for all steps ---------------------------

// ----------------------- Step 1: maker 'makes' the offer ---------------------------
function offer (tokenOwnerPrivateKey, contractPublicKey, offerUtxo, requestedUtxo) {
  // The maker publishes his outpoint (TXID and output index), optionally the locking script of the outpoint (even though the taker has it anyway)
  //  and amount and locking script (of the requested assets)

  // offered assets locking script (including maker address)
  const tokenOwnerAddr = tokenOwnerPrivateKey.toAddress().toString()
  const tokenOwnerPubkeyHash = addressToPubkeyhash(tokenOwnerAddr)

  const prevlockingScript = offerUtxo.tx.outputs[offerUtxo.vout].script.toHex()
  const version = getVersion(prevlockingScript)

  const stasScript = getStasScript(tokenOwnerPubkeyHash, contractPublicKey, version, getScriptData(prevlockingScript, version), isSplittable(prevlockingScript))

  // const lockingScript = bsv.Script.fromASM(stasScript)

  // requested assets locking script (including maker address)
  // const slockStr2 = requestedUtxo.outputs[0].script.toHex()
  // const lockingScript2 = bsv.Script.fromASM(slockStr2)

  const offeredInputAmount = (Math.round(offerUtxo.amount * SATS_PER_BITCOIN)) // for first input providing offered assets
  // const requestedOutputAmount = requestedUtxo.satoshis // for first output recieving requested assets

  // outpoint of input 0
  const outpoint0Index = offerUtxo.vout
  const transferTxid = offerUtxo.txid

  //   console.log('paymentUtxo', paymentUtxo)
  // TX of outpoint of input 0 - to be put in unlocking script of input 1 at step 2 by taker
  //   const wholeTxOf0 = paymentUtxofs.readFileSync(path.join(__dirname, 'transfer_change_whole_tx.json'), { encoding: 'utf8' })

  // maker creates first output and first input with partial unlocking script (signature only)
  // as the rest of the unlocking script will be completed by taker later at last step 2
  const utxo = {
    txId: transferTxid,
    outputIndex: outpoint0Index,
    script: prevlockingScript,
    satoshis: offeredInputAmount
  }
  // console.log('utxo', utxo)

  const tx = new bsv.Transaction().from(utxo)

  // const newScriptPubKey = lockingScript2

  // output 0 STAS tokens
  tx.addOutput(new bsv.Transaction.Output({
    script: stasScript,
    satoshis: offeredInputAmount
  }))
  // requested Satoshi output
  tx.addOutput(new bsv.Transaction.Output({
    script: requestedUtxo.outputs[0].script.toHex(),
    satoshis: requestedUtxo.outputs[0].satoshis
  }))

  // maker signs with 'SIGHASH_SINGLE | SIGHASH_ANYONECANPAY' flags
  //   const privateKeyMaker = new bsv.PrivateKey('tf................................................a3')
  //   const publicKeyMaker = privateKeyMaker.publicKey

  const sighash = bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_ANYONECANPAY | bsv.crypto.Signature.SIGHASH_FORKID

  const sigSmart = bsv.Transaction.sighash.sign(tx, tokenOwnerPrivateKey, sighash, 0, stasScript, new bsv.crypto.BN(offeredInputAmount), flags)

  const sigSmartASM = sigSmart // .toTxFormat().toString('hex')

  // maker provides serialized partial TX and the signature separately
  // taker will use the signature to complete maker's unlocking script (input 0)

  //   const hexTX = tx.serialize(true)

  // post serialized partial TX ALONG WITH the signature covering only this partial TX
  return { sig: sigSmartASM, tx: tx }
// Another option: maker may not post the partical TX at all.
// Instead, only provide the signature in addiion to already posted outpoint of offered and details of requested assets.
// In this case, taker may construct the first input and output by himself on behalf of the maker
}

// ---------------- Step 2 (final): taker 'takes' the offer and executes (transmits) ---------------

// TODO: check the stas output amount.
function takeOffer (takerPrivateKey, contractPublicKey, swapOffer, swapRequestUtxo, paymentUtxo, paymentsPrivateKey) {
//   const sighash = bsv.crypto.Signature.SIGHASH_ALL | bsv.crypto.Signature.SIGHASH_FORKID

  // deserialize the TX made by maker at step 1 and extract all the necessary data needed from it

  // now all the full TX data is availabe, taker can create sighash preimage for maker's input and
  // complete it with his (maker's) signature provided at step 1 with 'SIGHASH_SINGLE | SIGHASH_ANYONECANPAY' flags
  const tx = swapOffer.tx
  // requested assets locking script (including taker address)

  const lockingScript = tx.outputs[0].script.toHex()
  const version = getVersion(lockingScript)

  const slockStrTaker = takerPrivateKey.toAddress().toString()
  const destinationPubkeyHash = addressToPubkeyhash(slockStrTaker)

  //   console.log('stasScript: ', stasScript)
  // const lockingScriptMerge = bsv.Script.fromASM(slockStrTaker)

  //   console.log('offerUtxo', offerUtxo)
  // offered assets locking script (including taker address)
  const updatedOfferStasScript = getStasScript(destinationPubkeyHash, contractPublicKey, version, getScriptData(lockingScript, version), isSplittable(lockingScript))
  //   const slockStr3 = fs.readFileSync(path.join(__dirname, 'STAS_asset_1_taker_address.json'), { encoding: 'utf8' })
  // const lockingScriptSplit = bsv.Script.fromASM(slockStr3)

  // Taker input
  tx.from(swapRequestUtxo)
  // FUNDING INPUT AND CHANGE OUTPUT
  //   // funding input P2PKH script (including taker address)
  //   const slockStrTaker1 = 'OP_DUP OP_HASH160 2a...................................444 OP_EQUALVERIFY OP_CHECKSIG'
  //   const lockScriptTaker1 = bsv.Script.fromASM(slockStrTaker1)
  tx.from(paymentUtxo)
  // change output P2PKH script (including taker address)
  //   const slockStrTaker2 = 'OP_DUP OP_HASH160 2a...................................444 OP_EQUALVERIFY OP_CHECKSIG'
  //   const lockScriptTaker2 = bsv.Script.fromASM(slockStrTaker2)
  tx.outputs[0].script = updatedOfferStasScript
  // amounts:

  const inputAmountTaker = tx.outputs[1] // second input providing requested assets
  const outputAmount1 = inputAmountTaker.satoshis // second output recieving offered assets

  console.log('outputAmount1', outputAmount1)
  //   // funding for the whole TX
  //   const inputAmountFunding = 10350000
  //   const outputAmount2 = 10350000 - 2000 // change

  //   // outpoint of input 1
  //   const outpoint_1_index = 0
  //   const split_TXID = fs.readFileSync(path.join(__dirname, 'split_for_swap_TXID_change.json'), { encoding: 'utf8' })

  //   // TX of outpoint of input 1 - to be put in unlocking script of input 0 at step 3 by maker
  //   const whole_tx_of_1 = fs.readFileSync(path.join(__dirname, 'split_for_swap_change_whole_tx.json'), { encoding: 'utf8' })

  //   // funding outpoint of taker
  //   const outpoint_change_index = 0
  //   const outpoint_change_TXID = '9b............................................................67'

  //   // taker adds the rest of his inputs and outputs to maker's partial transaction
  //   // OR alternatively he could construct maker's input and output here too

  //   // provided requested assets input and offered assets output by taker
  //   tx.addInput(new bsv.Transaction.Input({
  //     prevTxId: split_TXID,
  //     outputIndex: outpoint_1_index,
  //     script: new bsv.Script(lockingScriptMerge)
  //   }), lockingScriptMerge, inputAmountTaker)

  //   const newScriptSplit = lockingScriptSplit

  //   tx.addOutput(new bsv.Transaction.Output({
  //     script: newScriptSplit,
  //     satoshis: outputAmount1
  //   }))

  //   // funding input and change output of taker

  handleChangeForSwap(tx, paymentsPrivateKey.publicKey)

  //   tx.addInput(new bsv.Transaction.Input({
  //     prevTxId: outpoint_change_TXID,
  //     outputIndex: outpoint_change_index,
  //     script: new bsv.Script(lockScriptTaker1)
  //   }), lockScriptTaker1, inputAmountFunding)

  //   const newScriptPubKeyFarmer = lockScriptTaker2

  //   tx.addOutput(new bsv.Transaction.Output({
  //     script: newScriptPubKeyFarmer,
  //     satoshis: outputAmount2
  //   }))

  //   // create sighash preimage on behalf of the maker for first input (index 0)
  //   const preimageBuf = bsv.Transaction.sighash.sighashPreimage(tx, sighash, 0, lockingScript, new bsv.crypto.BN(inputAmount0), flags)
  //   const preimage = preimageBuf.toString('hex')

  //   // sighash preimage for taker's input (index 1)
  //   const preimageBufMerge = bsv.Transaction.sighash.sighashPreimage(tx, sighash, 1, lockingScriptMerge, new bsv.crypto.BN(inputAmountTaker), flags)
  //   const preimageMerge = preimageBufMerge.toString('hex')

  // TX of outpoint of input 0 - to be put in unlocking script of input 1 at step 2 by taker
  const wholeTxOf0 = swapOffer.inputTx.toString('hex')

  // TX of outpoint of input 1 - to be put in unlocking script of input 0 at step 3 by maker
  const wholeTxOf1 = swapRequestUtxo.tx.toString('hex')

  //   const privateKeyTaker = new bsv.PrivateKey('SS................................................p2')
  //   const publicKeyTaker = privateKeyTaker.publicKey

  //   // taker's input (index 1)
  //   const sigSmartTaker = bsv.Transaction.sighash.sign(tx, takerPrivateKey, sighash, 1, updatedOfferStasScript, new bsv.crypto.BN(inputAmountTaker), flags)
  //   const sigSmartTakerASM = sigSmartTaker.toTxFormat().toString('hex')

  // funding input (index 2)
  //   const sigFunding = bsv.Transaction.sighash.sign(tx, takerPrivateKey, sighash, 2, lockScriptTaker1, new bsv.crypto.BN(inputAmountFunding), flags)
  //   const sigFundingASM = sigFunding.toTxFormat().toString('hex')

  const preimageBuf = preimageFn(tx, sighash, 0, bsv.Script(lockingScript), new bsv.crypto.BN(tx.outputs[0].satoshis))
  const preimage = preimageBuf.buf.toString('hex')
  const preimageBufMerge = preimageFn(tx, sighash, 1, bsv.Script(lockingScript), new bsv.crypto.BN(tx.outputs[1].satoshis))
  const preimageMerge = preimageBufMerge.buf.toString('hex')

  // reverse funding TXID
  const reversedFundingTXID = reverseEndian(paymentUtxo.txid)
  const paymentPubKeyHash = bsv.crypto.Hash.sha256ripemd160(paymentsPrivateKey.publicKey.toBuffer()).toString('hex')

  tx.inputs.forEach((input, i) => {
    if (i === 0) {
      // STAS input
      // add maker's signature from step 1 with partial 'SIGHASH_SINGLE | SIGHASH_ANYONECANPAY' flags

      //   const signature = bsv.Transaction.sighash.sign(tx, tokenOwnerPrivateKey, sighash, i, input.output._script, input.output._satoshisBN)
      const sigASM = swapOffer.sig.toTxFormat().toString('hex')

      const s = numberToLESM(tx.outputs[0].satoshis) + ' ' + destinationPubkeyHash +
        ' ' + numberToLESM(tx.outputs[1].satoshis) + ' ' + paymentPubKeyHash +
        ' ' + `OP_${paymentUtxo.vout}` + ' ' + reversedFundingTXID +
        ' ' + `OP_${tx.inputs[0].outputIndex}` +
        ' ' + wholeTxOf1 + ' ' + 'OP_1' +
        ' ' + preimage +
        ' ' + sigASM + ' ' + takerPrivateKey.publicKey.toString('hex')

      console.log('script: ', s)

      /*
b8ca01 299da5de60c938db67086579d13cb3f5fe64d0c9
2c01 5b61e626b9fcd9bb9ab30735b6cf757be0196d83 OP_2 b012e2a5d3d1fecd0216f2f7de85410d637bed0cdc94f0d0f7909444f4249273 OP_undefined 0200000001fa2f450c42c317af7797092ec54638374fedbefc57ff77ace1d46f1f307f120c000000006b483045022100bd990e9f7f582d45b0c74be92c33cdb084bcf0b0a12e1e98365300131c31955d02207ac7ea73c19a4381195ae079728c3d66a9880094405b9f62281aec90c1abac344121029bc9f1286cc801ec36dab15c0c6000014e704be32431f4a9490e5bbbe2bfa067feffffff0240420f00000000001976a914299da5de60c938db67086579d13cb3f5fe64d0c988acd415e90f010000001976a9147763f9e921056029b9b0bf33470be236cbc2bfcc88ac858a0000 OP_1 01000000a31bb23b5eaabff1aa52de168f20cdcb1d1315c0c5d699d66900764eb9d78380752adad0a7b9ceca853768aebb6965eca126a62965f698a0c1bc43d83db632ad2873bc003b99e9161bbab08cd8e43c6a22ca8be6ee3303b936d18ac8aa8e560400000000fd9d0576a9145c129962415c1ac6da793e41929c185c4ac7e6c688ac6976aa607f5f7f7c5e7f7c5d7f7c5c7f7c5b7f7c5a7f7c597f7c587f7c577f7c567f7c557f7c547f7c537f7c527f7c517f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7c5f7f7c5e7f7c5d7f7c5c7f7c5b7f7c5a7f7c597f7c587f7c577f7c567f7c557f7c547f7c537f7c527f7c517f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e01007e818b21414136d08c5ed2bf3ba048afe6dcaebafeffffffffffffffffffffffffffffff007d976e7c5296a06394677768827601249301307c7e23022079be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798027e7c7e7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e01417e21038ff83d8cf12121491609c4939dc11c4aa35503508fe432dc5a5c1905608b9218ad547f7701207f01207f7701247f517f7801007e8102fd00a063546752687f7801007e817f727e7b01177f777b557a766471567a577a786354807e7e676d68aa880067765158a569765187645294567a5379587a7e7e78637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6867567a6876aa587a7d54807e577a597a5a7a786354807e6f7e7eaa727c7e676d6e7eaa7c687b7eaa587a7d877663516752687c72879b69537a647500687c7b547f77517f7853a0916901247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f77788c6301247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f777852946301247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f77686877517f7c52797d8b9f7c53a09b91697c76638c7c587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f777c6876638c7c587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f777c6863587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f7768587f517f7801007e817602fc00a06302fd00a063546752687f7801007e81727e7b7b687f75537f7c0376a9148801147f775379645579887567726881766968789263556753687a76026c057f7701147f8263517f7c766301007e817f7c6775006877686b537992635379528763547a6b547a6b677c6b567a6b537a7c717c71716868547a587f7c81547a557964936755795187637c686b687c547f7701207f75748c7a7669765880748c7a76567a876457790376a9147e7c7e557967041976a9147c7e0288ac687e7e5579636c766976748c7a9d58807e6c0376a9147e748c7a7e6c7e7e676c766b8263828c007c80517e846864745aa0637c748c7a76697d937b7b58807e56790376a9147e748c7a7e55797e7e6868686c567a5187637500678263828c007c80517e846868647459a0637c748c7a76697d937b7b58807e55790376a9147e748c7a7e55797e7e687459a0637c748c7a76697d937b7b58807e55790376a9147e748c7a7e55797e7e68687c537a9d547963557958807e041976a91455797e0288ac7e7e68aa87726d77776a14a5ba552c49cde63eb30519b99f5a080cdfc6d13101000374776fb8ca010000000000ffffffff2a134e792c73103d5aec25d739f4100ca215de09ce2262b9fbdc1e8dd6b8491d0000000041000000 3045022100b201becd3499eb047e5d225301638ada4ed750da2e26e48c711f3d97efb958cc02203f97aa9e1c1ce706c4656e6c0f520094ab9f9990e3d0cc80301ba815f4bd182ec3 02743928a8a4b0ca54d5773100f7846bec229b86e3562fad79e60602fdca525fab
      */
      tx.inputs[0].setScript(bsv.Script.fromASM(s))
    } else if (i === 1) {
      const signature = bsv.Transaction.sighash.sign(tx, takerPrivateKey, sighash, i, input.output._script, input.output._satoshisBN)
      const sigASM = signature.toTxFormat().toString('hex')

      const s = numberToLESM(tx.outputs[0].satoshis) + ' ' + destinationPubkeyHash +
        ' ' + numberToLESM(tx.outputs[1].satoshis) + ' ' + paymentPubKeyHash +
        ' ' + `OP_${paymentUtxo.vout}` + ' ' + reversedFundingTXID +
        ' ' + `OP_${tx.inputs[1].outputIndex}` +
        ' ' + wholeTxOf0 + ' ' + 'OP_1' +
        ' ' + preimageMerge +
        ' ' + sigASM + ' ' + takerPrivateKey.publicKey.toString('hex')

      tx.inputs[1].setScript(bsv.Script.fromASM(s))
    } else {
      const signature = bsv.Transaction.sighash.sign(tx, paymentsPrivateKey, sighash, i, input.output._script, input.output._satoshisBN)
      const unlockingScript = bsv.Script.fromASM(signature.toTxFormat().toString('hex') + ' ' + paymentsPrivateKey.publicKey.toString('hex'))
      input.setScript(unlockingScript)
    }
  })

  return tx.serialize(true)
  // add maker's signature from step 1 with partial 'SIGHASH_SINGLE | SIGHASH_ANYONECANPAY' flags
  //   const unlockScript = bsv.Script.fromASM(int2SM(outputAmount0) + ' ' + 'a5...................................493' +
  //   ' ' + int2SM(outputAmount1) + ' ' + '2a...................................444' +
  //    ' ' + int2SM(outputAmount2) + ' ' + '2a...................................444' +
  //    ' ' + int2SM(outpoint_change_index) + ' ' + reverseChangeTXID +
  //     ' ' + int2SM(outpoint_1_index) +
  //      ' ' + whole_tx_of_1 + ' ' + 'OP_1' +
  //     ' ' + preimage +
  //    ' ' + sigSmartASM + ' ' + publicKeyMaker.toString('hex'))

  //   const unlockScriptTaker = bsv.Script.fromASM(int2SM(outputAmount0) + ' ' + 'a5...................................493' +
  //   ' ' + int2SM(outputAmount1) + ' ' + '2a...................................444' +
  //    ' ' + int2SM(outputAmount2) + ' ' + '2a...................................444' +
  //    ' ' + int2SM(outpoint_change_index) + ' ' + reverseChangeTXID +
  //     ' ' + int2SM(outpoint0Index) +
  //     ' ' + wholeTxOf0 + ' ' + 'OP_1' +
  //     ' ' + preimageMerge +
  //    ' ' + sigSmartTakerASM + ' ' + publicKeyTaker.toString('hex'))

  //   const unlockScriptFunding = bsv.Script.fromASM(sigFundingASM + ' ' + publicKeyTaker.toString('hex'))

  //   tx.inputs[0].setScript(unlockScript)
  //   tx.inputs[1].setScript(unlockScriptTaker)
  //   tx.inputs[2].setScript(unlockScriptFunding)

  //   // serialize the FULL TX and transmit it to the blockchain

  //   hexTX = tx.serialize(true)

// // Taker transmits the hexTX with whatever function
}

function handleChangeForSwap (tx, publicKey) {
  // In this implementation, we will always add a change output...

  // Create a change output. The satoshi amount will be updated after we calculate the fees.
  // ---------------------------------------------------------------------------------------
  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer()).toString('hex')

  const changeScript = bsv.Script.fromASM(`OP_DUP OP_HASH160 ${publicKeyHash} OP_EQUALVERIFY OP_CHECKSIG`)
  tx.addOutput(new bsv.Transaction.Output({
    script: changeScript,
    satoshis: 0
  }))

  // Now we need to calculate the preimage of the transaction.  This will become part of the unlocking script
  // and therefore increases the size and cost of the overall TX.
  const image = preimageFn(tx, sighash, 0, tx.inputs[0].output.script, tx.inputs[0].output.satoshisBN)
  const preimageLen = new Varint().fromNumber(image.buf.length).toBuffer().length

  // Calculate the fee required
  // ---------------------------------------------------------------------------------------
  // The actual unlocking script for STAS will be:
  // STAS amount                                       Up to 9 bytes
  // pubkeyhash                                        21 bytes
  // OP_FALSE OP_FALSE OP_FALSE OP_FALSE (4 bytes)     4
  // Output funding index                              Up to 9 bytes
  // TXID                                              33 bytes
  // Output index                                      Up to 9 bytes
  // Pieces (Partly P2PSH)                             (passed in to function)
  // Size of the number of pieces                      1 byte
  // OP_PUSH(<len(preimage)                             preimageLen  // There are 2 preimages, 1 for input 0 and 1 for input 1
  // Preimage (len(preimage)                           len(preimage)
  // OP_PUSH_72                                           1 byte
  // <signature> DER-encoded signature (70-72 bytes) -   72 bytes
  // OP_PUSH_33                                           1 byte
  // <public key> - compressed SEC-encoded public key  - 33 bytes

  // Calculate the fees required...
  let txSizeInBytes = tx.toBuffer().length + 9 + 21 + 4 + 9 + 33 + 9 + ((preimageLen + image.buf.length) * 2) + 1 + 72 + 1 + 33
  txSizeInBytes += ((tx.inputs.length - 1) * P2PKH_UNLOCKING_SCRIPT_BYTES)

  // let satoshis = 0
  let totalInput = 0
  let totalOutput = 0
  tx.inputs.forEach((input, i) => {
    if (i > 0) { // Skip the STAS input...
      totalInput += input.output.satoshis
    }
  })
  tx.outputs.forEach((output) => {
    totalOutput += output.satoshis
  })

  const fee = Math.ceil(txSizeInBytes * sats / perByte)
  console.log('totalInput ', totalInput)
  console.log('totalOutput ', totalOutput)
  console.log('fee ', fee)
  tx.outputs[tx.outputs.length - 1].satoshis = totalInput - totalOutput - fee
}

module.exports = {
  offer,
  takeOffer
}
