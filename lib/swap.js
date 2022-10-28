const bsv = require('bsv')

const { reverseEndian, numberToLESM, addressToPubkeyhash } = require('./utils')
const { isStasScript, P2PKH_UNLOCKING_SCRIPT_BYTES } = require('./stas')
const preimageFn = require('./preimage')
const { Varint } = bsv.encoding
const p2pkhRegexStr = '^76a914[0-9a-fA-F]{40}88ac$'
const p2pkhRegex = new RegExp(p2pkhRegexStr)
const sighash = bsv.crypto.Signature.SIGHASH_ALL | bsv.crypto.Signature.SIGHASH_FORKID

const feeSettings = require('./constants')

/*
The maker provides, or publishes publically to anyone interested,
a partial transaction including his/her input-output pair, with a signature (related to the ownership relay)
in input’s unlocking script signed with ‘SINGLE | ANYONECANPAY’ flags
makerInputUtxo: the utxo the maker is offering to swap
wantedInfo: the script and amount the maker wants for the mmakerInputUtxo.
*/
function createSwapOffer(makerPrivateKey, makerInputUTXO, wantedInfo) {
  //   console.log('creating swap offer')
  if (makerPrivateKey === null) {
    throw new Error('Maker private key is null')
  }
  if (makerInputUTXO === null) {
    throw new Error('Maker input UTXO is null')
  } else if (makerInputUTXO.satoshis < 0 || makerInputUTXO.script === '' || makerInputUTXO.outputIndex < 0 || makerInputUTXO.txId === '') {
    throw new Error('Invalid maker input UTXO')
  }
  if (typeof makerInputUTXO.script !== 'object') {
    throw new Error('makerInputUtxo.script must be an object')
  }

  const makerPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(makerPrivateKey.publicKey.toBuffer()).toString('hex')
  const wantedType = (wantedInfo.type !== undefined && wantedInfo.type === 'native') ? 'native' : 'token'

  // the makers offered input
  const tx = new bsv.Transaction().from(makerInputUTXO)

  let makerWantedLockingScript
  if (wantedType === 'token') {
    // console.log('creating maker token output script')
    const wantedScriptAsm = bsv.Script.fromHex(wantedInfo.scriptHex).toString()
    const wantedSlice1 = wantedScriptAsm.slice(0, 23)
    const wantedSlice2 = wantedScriptAsm.slice(63)
    const makerWantedScriptAsm = wantedSlice1.concat(makerPublicKeyHash).concat(wantedSlice2)
    const makerWantedScript = bsv.Script.fromString(makerWantedScriptAsm).toHex()
    makerWantedLockingScript = bsv.Script.fromHex(makerWantedScript)
  } else {
    makerWantedLockingScript = bsv.Script.fromASM(`OP_DUP OP_HASH160 ${makerPublicKeyHash} OP_EQUALVERIFY OP_CHECKSIG`)
  }

  // the makers wanted output
  tx.addOutput(new bsv.Transaction.Output({
    script: makerWantedLockingScript,
    satoshis: wantedInfo.satoshis
  }))

  const flags = bsv.Script.Interpreter.SCRIPT_ENABLE_SIGHASH_FORKID | bsv.Script.Interpreter.SCRIPT_ENABLE_MAGNETIC_OPCODES | bsv.Script.Interpreter.SCRIPT_ENABLE_MONOLITH_OPCODES
  const sighashSingleAnyoneCanPay = bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_ANYONECANPAY | bsv.crypto.Signature.SIGHASH_FORKID
  //   const sighash = bsv.crypto.Signature.SIGHASH_ALL | bsv.crypto.Signature.SIGHASH_FORKID

  const isMakerOutputStasScript = isStasScript(makerInputUTXO.script.toHex())

  let makerUnlockScript
  if (isMakerOutputStasScript) {
    // console.log('creating maker stas unlocking script')

    const makerSignature = bsv.Transaction.sighash.sign(tx, makerPrivateKey, sighashSingleAnyoneCanPay, 0, makerInputUTXO.script, new bsv.crypto.BN(makerInputUTXO.satoshis), flags)
    const makerSignatureHex = makerSignature.toTxFormat().toString('hex')
    makerUnlockScript = bsv.Script.fromASM(makerSignatureHex + ' ' + makerPrivateKey.publicKey.toString('hex'))
  } else {
    // console.log('creating maker p2pkh unlocking script')
    const makerSignature = bsv.Transaction.sighash.sign(tx, makerPrivateKey, sighashSingleAnyoneCanPay, 0, makerInputUTXO.script, new bsv.crypto.BN(makerInputUTXO.satoshis), flags)
    const makerSignatureASM = makerSignature.toTxFormat().toString('hex')
    makerUnlockScript = bsv.Script.fromASM(makerSignatureASM + ' ' + makerPrivateKey.publicKey.toString('hex'))
  }

  tx.inputs[0].setScript(makerUnlockScript)

  return tx.serialize(true)
}

/*

    You can swap two tokens, a token for satoshis or satoshis for a token.
    How does it work?
    There are 2 players:
    1. The maker initiates the swap
    2. The taker accepts the swap

    For the token-token swap there are 3 steps.
    1. The maker creates an unsigned tx containing the output he wants and the input he's offering.
        He publishes this somewhere.
    2. The taker adds an input which matches the makers output, and an output that matches the makers input.
        He also adds the funding tx.
        He returns this tx to the maker.
    3. The maker signs the tx and submits it to the blockchain

    At a lower level the taker signs for each of the rest of the transaction inputs (both funding and
    spending ones of standard P2PKH type) with ‘ALL’ flag, and completes the 3 missing linking fields
    in the preimage pushed into unlocking script of maker’s input with exactly the same values as in
    the preimage of his spending input, then completes the unlocking script parameters of unlocking
    script of maker’s input either needed to be parsed and used for swapped forward-persistence
    enforcement or simply part of concatenation for verification of others,
*/

/*
    offerTxHex: the offer tx created in createSwapOffer()
    -
    makerInputTxHex: the whole tx hex containing the output the maker is offering
    -
    takerInputTxHex: the whole tx hex containing the output the taker is offering
    takerInputUtxo: the utxo the taker is offering
 */
function acceptSwapOffer(offerTxHex, makerInputTxHex,
  takerPrivateKey, takerInputTxHex, takerInputUTXO, takerOutputSatoshis, makerPublicKeyHash, paymentUtxo, paymentPrivateKey, commissionInfo) {
  
  if (offerTxHex === null) {
    throw new Error("offerTxHex is null")
  }
  if (makerInputTxHex === null) {
    throw new Error("makerInputTxHex is null")
  }
  if (takerPrivateKey === null) {
    throw new Error("takerPrivateKey is null")
  }
  if (takerInputTxHex === null) {
    throw new Error("takerInputTxHex is null")
  }
  if (takerInputUTXO === null) {
    throw new Error("takerInputUTXO is null")
  }
  if (takerOutputSatoshis === null || takerOutputSatoshis < 1) {
    throw new Error("takerOutputSatoshis must be greater than zero")
  }
  if (makerPublicKeyHash === null) {
    throw new Error("makerPublicKeyHash is null")
  }
  if (paymentUtxo === null) {
    throw new Error("paymentUtxo is null")
  }
  if (paymentPrivateKey === null) {
    throw new Error("paymentPrivateKey is null")
  }

  let hasCommission = false
  if (commissionInfo != null && commissionInfo.address !== null && commissionInfo.satoshis > 0) {
    // console.log('setting hasCommission to true: ', JSON.stringify(commissionInfo))
    hasCommission = true
  }
  // this is the makers offer tx
  const tx = new bsv.Transaction(offerTxHex)
  const makerInputTx = new bsv.Transaction(makerInputTxHex)
  const makerInputVout = tx.inputs[0].outputIndex

  const takerPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(takerPrivateKey.publicKey.toBuffer()).toString('hex')
  const paymentPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(paymentPrivateKey.publicKey.toBuffer()).toString('hex')

  const makerInputScript = makerInputTx.outputs[makerInputVout].script
  const makerInputScriptASM = makerInputScript.toString()

  const takerInputTx = bsv.Transaction(takerInputTxHex)

  const takerInputScript = takerInputTx.outputs[takerInputUTXO.outputIndex].script

  const takerInputTxid = bsv.Transaction(takerInputTx).hash

  const makerSlice1 = makerInputScriptASM.slice(0, 23)
  const makerSlice2 = makerInputScriptASM.slice(63)
  const takerWantedScriptAsm = makerSlice1.concat(takerPublicKeyHash).concat(makerSlice2)
  const takerWantedScript = bsv.Script.fromString(takerWantedScriptAsm)

  const flags = bsv.Script.Interpreter.SCRIPT_ENABLE_SIGHASH_FORKID | bsv.Script.Interpreter.SCRIPT_ENABLE_MAGNETIC_OPCODES | bsv.Script.Interpreter.SCRIPT_ENABLE_MONOLITH_OPCODES

  const isTakerInputStasScript = isStasScript(takerInputScript.toHex())
  const isMakerInputStasScript = isStasScript(makerInputScript.toHex())

  // add taker input
  tx.addInput(new bsv.Transaction.Input({
    prevTxId: takerInputTxid,
    outputIndex: takerInputUTXO.outputIndex,
    script: takerInputScript
  }), takerInputScript, takerInputUTXO.satoshis)

  // add taker output
  tx.addOutput(new bsv.Transaction.Output({
    script: takerWantedScript,
    satoshis: takerOutputSatoshis
  }))

  let commissionPublicKeyHash
  if (hasCommission) {
    commissionPublicKeyHash = addressToPubkeyhash(commissionInfo.address)
    const commisionLockingScript = bsv.Script.fromASM(`OP_DUP OP_HASH160 ${commissionPublicKeyHash} OP_EQUALVERIFY OP_CHECKSIG`)

    tx.addOutput(new bsv.Transaction.Output({
      script: commisionLockingScript,
      satoshis: commissionInfo.satoshis
    }))
  }

  // add funding input
  tx.addInput(new bsv.Transaction.Input({
    prevTxId: paymentUtxo.txid,
    outputIndex: paymentUtxo.vout,
    script: bsv.Script.fromHex(paymentUtxo.scriptPubKey)
  }), paymentUtxo.scriptPubKey, paymentUtxo.satoshis)

  // add change
  let extraBytesForPieces = 0

  if (isMakerInputStasScript) {
    extraBytesForPieces += makerInputScript.toHex().length / 2
  }
  if (isTakerInputStasScript) {
    extraBytesForPieces += takerInputScript.toHex().length / 2
  }
  handleChangeForSwap(tx, extraBytesForPieces, paymentPrivateKey.publicKey, commissionInfo ? commissionInfo.satoshis : 0)

  const publicKeyTaker = takerPrivateKey.publicKey

  const preimageTakerBuf = preimageFn(tx, sighash, 1, takerInputScript, new bsv.crypto.BN(takerInputUTXO.satoshis))
  const preimageTaker = preimageTakerBuf.buf.toString('hex')

  const takerSignature = bsv.Transaction.sighash.sign(tx, takerPrivateKey, sighash, 1, takerInputScript, new bsv.crypto.BN(takerInputUTXO.satoshis), flags)
  const takerSignatureASM = takerSignature.toTxFormat().toString('hex')

  const reversedFundingTXID = reverseEndian(paymentUtxo.txid)
  // taker completes the 3 missing linking fields in the preimage pushed into unlocking script of maker’s input
  // with exactly the same values as in the preimage of his spending input
  if (isMakerInputStasScript) {
    const preimageMakerBuf = preimageFn(tx, sighash, 0, makerInputScript, new bsv.crypto.BN(takerOutputSatoshis), flags)
    const preimageMaker = preimageMakerBuf.buf.toString('hex')
    let makerUnlockScript
    if (hasCommission) {
      console.log('one')
      makerUnlockScript = bsv.Script.fromASM(
        numberToLESM(tx.outputs[0].satoshis) + ' ' + makerPublicKeyHash +
        ' ' + numberToLESM(tx.outputs[1].satoshis) + ' ' + takerPublicKeyHash +
        ' ' + numberToLESM(tx.outputs[2].satoshis) + ' ' + commissionPublicKeyHash +
        ' ' + numberToLESM(tx.outputs[3].satoshis) + ' ' + paymentPublicKeyHash +
        ' ' + `OP_${paymentUtxo.vout}` + ' ' + reversedFundingTXID +
        ' ' + `OP_${takerInputUTXO.outputIndex}` +
        ' ' + takerInputTxHex + ' ' + 'OP_1' +
        ' ' + preimageMaker)
    } else {
      console.log('two')

      makerUnlockScript = bsv.Script.fromASM(
        numberToLESM(tx.outputs[0].satoshis) + ' ' + makerPublicKeyHash +
        ' ' + numberToLESM(tx.outputs[1].satoshis) + ' ' + takerPublicKeyHash +
        ' ' + numberToLESM(tx.outputs[2].satoshis) + ' ' + paymentPublicKeyHash +
        ' ' + `OP_${paymentUtxo.vout}` + ' ' + reversedFundingTXID +
        ' ' + `OP_${takerInputUTXO.outputIndex}` +
        ' ' + takerInputTxHex + ' ' + 'OP_1' +
        ' ' + preimageMaker)
    }
    makerUnlockScript.add(tx.inputs[0].script)

    tx.inputs[0].setScript(makerUnlockScript)
  }

  let takerUnlockScript
  if (isTakerInputStasScript) {
    if (hasCommission) {
      console.log('three')

      takerUnlockScript = bsv.Script.fromASM(
        numberToLESM(tx.outputs[0].satoshis) + ' ' + makerPublicKeyHash +
        ' ' + numberToLESM(tx.outputs[1].satoshis) + ' ' + takerPublicKeyHash +
        ' ' + numberToLESM(tx.outputs[2].satoshis) + ' ' + commissionPublicKeyHash +
        ' ' + numberToLESM(tx.outputs[3].satoshis) + ' ' + paymentPublicKeyHash +
        ' ' + `OP_${paymentUtxo.vout}` + ' ' + reversedFundingTXID +
        ' ' + `OP_${makerInputVout}` + // an index of output of that tx, which is attempted to be spent by an input of current spending tx
        ' ' + makerInputTxHex +
        ' ' + 'OP_1' + // type of TX: basic, swap or merging
        ' ' + preimageTaker +
        ' ' + takerSignatureASM + ' ' + publicKeyTaker.toString('hex'))
    } else {
      console.log('four')

      takerUnlockScript = bsv.Script.fromASM(
        numberToLESM(tx.outputs[0].satoshis) + ' ' + makerPublicKeyHash +
        ' ' + numberToLESM(tx.outputs[1].satoshis) + ' ' + takerPublicKeyHash +
        ' ' + numberToLESM(tx.outputs[2].satoshis) + ' ' + paymentPublicKeyHash +
        ' ' + `OP_${paymentUtxo.vout}` + ' ' + reversedFundingTXID +
        ' ' + `OP_${makerInputVout}` + // an index of output of that tx, which is attempted to be spent by an input of current spending tx
        ' ' + makerInputTxHex +
        ' ' + 'OP_1' + // type of TX: basic, swap or merging
        ' ' + preimageTaker +
        ' ' + takerSignatureASM + ' ' + publicKeyTaker.toString('hex'))
    }
  } else if (isP2PKHScript(takerInputScript.toHex())) {
    console.log('five')

    const takerSignature = bsv.Transaction.sighash.sign(tx, takerPrivateKey, sighash, 1, takerInputScript, new bsv.crypto.BN(takerInputUTXO.satoshis), flags)
    const takerSignatureASM = takerSignature.toTxFormat().toString('hex')
    takerUnlockScript = bsv.Script.fromASM(takerSignatureASM + ' ' + takerPrivateKey.publicKey.toString('hex'))
  }

  const paymentSignature = bsv.Transaction.sighash.sign(tx, paymentPrivateKey, sighash, 2, paymentUtxo.scriptPubKey, new bsv.crypto.BN(paymentUtxo.satoshis), flags)
  const paymentSignatureASM = paymentSignature.toTxFormat().toString('hex')
  const paymentUnlockScript = bsv.Script.fromASM(paymentSignatureASM + ' ' + paymentPrivateKey.publicKey.toString('hex'))

  tx.inputs[1].setScript(takerUnlockScript)
  tx.inputs[2].setScript(paymentUnlockScript)

  return tx.serialize(true)
}

/*
The maker provides, or publishes publically to anyone interested,
an unsigned partial transaction including his/her input-output pair
*/
function createUnsignedSwapOffer(makerPrivateKey, makerInputUTXO, wantedInfo) {
  if (makerPrivateKey === null) {
    throw new Error("makerPrivateKey is null")
  }

  if (makerInputUTXO === null) {
    throw new Error("makerInputUTXO is null")
  }

  if (wantedInfo === null) {
    throw new Error("wantedInfo is null")
  }

  if (wantedInfo.type !== undefined && wantedInfo.type !== 'native') {
    throw new Error('wantedInfo.type must be undefined or "native"')
  }

  const makerPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(makerPrivateKey.publicKey.toBuffer()).toString('hex')
  const wantedType = (wantedInfo.type !== undefined && wantedInfo.type === 'native') ? 'native' : 'token'

  // the makers offered input
  const tx = new bsv.Transaction().from(makerInputUTXO)

  let makerWantedLockingScript
  if (wantedType === 'token') {
    const wantedScriptAsm = bsv.Script.fromHex(wantedInfo.scriptHex).toString()
    const wantedSlice1 = wantedScriptAsm.slice(0, 23)
    const wantedSlice2 = wantedScriptAsm.slice(63)
    const makerWantedScriptAsm = wantedSlice1.concat(makerPublicKeyHash).concat(wantedSlice2)
    const makerWantedScript = bsv.Script.fromString(makerWantedScriptAsm).toHex()
    makerWantedLockingScript = bsv.Script.fromHex(makerWantedScript)
  } else {
    makerWantedLockingScript = bsv.Script.fromASM(`OP_DUP OP_HASH160 ${makerPublicKeyHash} OP_EQUALVERIFY OP_CHECKSIG`)
  }
  tx.addOutput(new bsv.Transaction.Output({
    script: makerWantedLockingScript,
    satoshis: wantedInfo.satoshis
  }))

  return tx.serialize(true)
}

function acceptUnsignedSwapOffer(offerTxHex, makerInputTxHex,
  takerPrivateKey, takerInputTxHex, takerInputVout, takerInputSatoshis, takerOutputSatoshis, makerPublicKeyHash, paymentUtxo, paymentPrivateKey) {

    if (offerTxHex === null) {
      throw new Error("offerTxHex is null")
    }
    if (makerInputTxHex === null) {
      throw new Error("makerInputTxHex is null")
    }
    if (takerPrivateKey === null) {
      throw new Error("takerPrivateKey is null")
    }
    if (takerInputTxHex === null) {
      throw new Error("takerInputTxHex is null")
    }
    if (takerInputVout === null) {
      throw new Error("takerInputVout is null")
    }
    if (takerInputSatoshis === null || takerInputSatoshis < 1) {
      throw new Error("takerInputSatoshis must be greater than zero")
    }
    if (takerOutputSatoshis === null || takerOutputSatoshis < 1) {
      throw new Error("takerOutputSatoshis must be greater than zero")
    }
    if (makerPublicKeyHash === null) {
      throw new Error("makerPublicKeyHash is null")
    }
    if (paymentUtxo === null) {
      throw new Error("paymentUtxo is null")
    }
    if (paymentPrivateKey === null) {
      throw new Error("paymentPrivateKey is null")
    }
  
  // this is the offer tx
  const tx = new bsv.Transaction(offerTxHex)
  const makerInputTx = new bsv.Transaction(makerInputTxHex)
  const makerInputVout = tx.inputs[0].outputIndex

  const makerOutputSatoshis = tx.outputs[0].satoshis

  const takerPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(takerPrivateKey.publicKey.toBuffer()).toString('hex')

  const paymentPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(paymentPrivateKey.publicKey.toBuffer()).toString('hex')
  const makerInputScript = makerInputTx.outputs[makerInputVout].script
  const makerStasInputScriptASM = makerInputScript.toString()

  const takerInputTx = bsv.Transaction(takerInputTxHex)
  const takerInputScript = takerInputTx.outputs[takerInputVout].script

  const takerInputTxid = bsv.Transaction(takerInputTx).hash

  const isTakerInputStasScript = isStasScript(takerInputScript.toHex())
  const isMakerInputStasScript = isStasScript(makerInputScript.toHex())

  // if tx.outputs[0] is a p2pkh then we need to add an appropriate input
  let takerWantedScript
  if (isTakerInputStasScript) {
    const makerSlice1 = makerStasInputScriptASM.slice(0, 23)
    const makerSlice2 = makerStasInputScriptASM.slice(63)
    const takerWantedScriptAsm = makerSlice1.concat(takerPublicKeyHash).concat(makerSlice2)
    takerWantedScript = bsv.Script.fromString(takerWantedScriptAsm).toHex()
  } else if (isP2PKHScript(takerInputScript.toHex())) {
    const makerSlice1 = makerInputTx.outputs[makerInputVout].script.slice(0, 6)
    const makerSlice2 = makerInputTx.outputs[makerInputVout].script.slice(46)
    takerWantedScript = makerSlice1.concat(takerPublicKeyHash).concat(makerSlice2)
  }

  const flags = bsv.Script.Interpreter.SCRIPT_ENABLE_SIGHASH_FORKID | bsv.Script.Interpreter.SCRIPT_ENABLE_MAGNETIC_OPCODES | bsv.Script.Interpreter.SCRIPT_ENABLE_MONOLITH_OPCODES

  const lockingScriptSplit = bsv.Script.fromHex(takerWantedScript)

  const takerInput = new bsv.Transaction.Input({
    prevTxId: takerInputTxid,
    outputIndex: takerInputVout,
    script: takerInputScript
  })

  tx.addInput(takerInput, takerInputScript, takerInputSatoshis)

  // add taker output - wrong
  tx.addOutput(new bsv.Transaction.Output({
    script: lockingScriptSplit,
    satoshis: takerOutputSatoshis
  }))

  // add funding
  tx.addInput(new bsv.Transaction.Input({
    prevTxId: paymentUtxo.txid,
    outputIndex: paymentUtxo.vout,
    script: bsv.Script.fromHex(paymentUtxo.scriptPubKey)
  }), paymentUtxo.scriptPubKey, paymentUtxo.satoshis)

  // add change
  let extraBytesForPieces = 0

  if (isMakerInputStasScript) {
    extraBytesForPieces += makerInputTxHex.length / 2
  }
  if (isTakerInputStasScript) {
    extraBytesForPieces += takerInputTxHex.length / 2
  }
  handleChangeForSwap(tx, extraBytesForPieces, paymentPrivateKey.publicKey)

  const reversedFundingTXID = reverseEndian(paymentUtxo.txid)

  const publicKeyTaker = takerPrivateKey.publicKey

  const preimageTakerBuf = preimageFn(tx, sighash, 1, takerInputScript, new bsv.crypto.BN(takerInputSatoshis))
  const preimageTaker = preimageTakerBuf.buf.toString('hex')

  const takerSignature = bsv.Transaction.sighash.sign(tx, takerPrivateKey, sighash, 1, takerInputScript, new bsv.crypto.BN(takerInputSatoshis), flags)
  const takerSignatureASM = takerSignature.toTxFormat().toString('hex')
  let takerUnlockScript

  if (isTakerInputStasScript) {
    // console.log('creating stas takerUnlockScript')
    takerUnlockScript = bsv.Script.fromASM(
      numberToLESM(tx.outputs[0].satoshis) + ' ' + makerPublicKeyHash +
      ' ' + numberToLESM(tx.outputs[1].satoshis) + ' ' + takerPublicKeyHash +
      ' ' + numberToLESM(tx.outputs[2].satoshis) + ' ' + paymentPublicKeyHash +
      ' ' + `OP_${paymentUtxo.vout}` + ' ' + reversedFundingTXID +
      ' ' + `OP_${makerInputVout}` + // an index of output of that tx, which is attempted to be spent by an input of current spending tx
      ' ' + makerInputTxHex +
      ' ' + 'OP_1' + // type of TX: basic, swap or merging
      ' ' + preimageTaker +
      ' ' + takerSignatureASM + ' ' + publicKeyTaker.toString('hex'))
  } else if (isP2PKHScript(takerInputScript.toHex())) {
    // console.log('maker script is p2pkh')
    const takerP2pkhSignature = bsv.Transaction.sighash.sign(tx, takerPrivateKey, sighash, 1, makerInputScript, new bsv.crypto.BN(makerOutputSatoshis), flags)
    const takerP2pkhSignatureASM = takerP2pkhSignature.toTxFormat().toString('hex')

    takerUnlockScript = bsv.Script.fromASM(takerP2pkhSignatureASM + ' ' + takerPrivateKey.publicKey.toString('hex'))
  }

  const paymentSignature = bsv.Transaction.sighash.sign(tx, paymentPrivateKey, sighash, 2, paymentUtxo.scriptPubKey, new bsv.crypto.BN(paymentUtxo.satoshis), flags)
  const paymentSignatureASM = paymentSignature.toTxFormat().toString('hex')

  const paymentUnlockScript = bsv.Script.fromASM(paymentSignatureASM + ' ' + paymentPrivateKey.publicKey.toString('hex'))

  //   tx.inputs[0].setScript(unlockScript1)
  tx.inputs[1].setScript(takerUnlockScript)
  tx.inputs[2].setScript(paymentUnlockScript)

  return tx.serialize(true)
}

// here the taker is supplying a p2pkh utxo
function acceptUnsignedNativeSwapOffer(offerTxHex, takerInputInfo, makerInputTxHex,
  takerPrivateKey, takerInputTxHex, takerInputVout, takerOutputSatoshis, makerPublicKeyHash, paymentUtxo, paymentPrivateKey) {
  
  if (offerTxHex === null) {
    throw new Error("offerTxHex is null")
  }
  if (takerInputInfo === null) {
    throw new Error("takerInputInfo is null")
  }
  if (makerInputTxHex === null) {
    throw new Error("makerInputTxHex is null")
  }
  if (takerPrivateKey === null) {
    throw new Error("takerPrivateKey is null")
  }
  if (takerInputTxHex === null) {
    throw new Error("takerInputTxHex is null")
  }
  if (takerInputVout === null) {
    throw new Error("takerInputVout is null")
  }
  if (takerOutputSatoshis === null || takerOutputSatoshis < 1) {
    throw new Error("takerOutputSatoshis must be greater than zero")
  }
  if (paymentUtxo === null) {
    throw new Error("paymentUtxo is null")
  }
  if (paymentPrivateKey === null) {
    throw new Error("paymentPrivateKey is null")
  }

  // this is the offer tx
  const tx = new bsv.Transaction(offerTxHex)
  const makerInputVout = tx.inputs[0].outputIndex

  const makerInputTx = new bsv.Transaction(makerInputTxHex)

  const takerPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(takerPrivateKey.publicKey.toBuffer()).toString('hex')

  const makerStasInputScript = makerInputTx.outputs[makerInputVout].script
  const makerStasInputScriptASM = makerStasInputScript.toString()

  const takerInputTx = bsv.Transaction(takerInputTxHex)

  const takerOutputScript = takerInputTx.outputs[takerInputVout].script

  const isMakerInputStasScript = isStasScript(makerStasInputScript.toHex())
  const isTakerInputStasScript = isStasScript(takerOutputScript.toHex())

  // if tx.outputs[0] is a p2pkh then we need to add an appropriate input
  let takerWantedScript
  if (isTakerInputStasScript) {
    const makerSlice1 = makerStasInputScriptASM.slice(0, 23)
    const makerSlice2 = makerStasInputScriptASM.slice(63)
    const takerWantedScriptAsm = makerSlice1.concat(takerPublicKeyHash).concat(makerSlice2)
    takerWantedScript = bsv.Script.fromString(takerWantedScriptAsm).toHex()
  } else if (isP2PKHScript(takerOutputScript.toHex())) {
    const makerSlice1 = makerInputTx.outputs[makerInputVout].script.toHex().slice(0, 6)
    const makerSlice2 = makerInputTx.outputs[makerInputVout].script.toHex().slice(46)
    takerWantedScript = makerSlice1.concat(takerPublicKeyHash).concat(makerSlice2)
  }

  const flags = bsv.Script.Interpreter.SCRIPT_ENABLE_SIGHASH_FORKID | bsv.Script.Interpreter.SCRIPT_ENABLE_MAGNETIC_OPCODES | bsv.Script.Interpreter.SCRIPT_ENABLE_MONOLITH_OPCODES

  const lockingScriptSplit = bsv.Script.fromHex(takerWantedScript)

  // add taker input
  tx.from(takerInputInfo.utxo)

  // add taker output - wrong
  tx.addOutput(new bsv.Transaction.Output({
    script: lockingScriptSplit,
    satoshis: takerOutputSatoshis
  }))

  // add funding
  tx.addInput(new bsv.Transaction.Input({
    prevTxId: paymentUtxo.txid,
    outputIndex: paymentUtxo.vout,
    script: bsv.Script.fromHex(paymentUtxo.scriptPubKey)
  }), paymentUtxo.scriptPubKey, paymentUtxo.satoshis)

  // add change
  let extraBytesForPieces = 0

  if (isMakerInputStasScript) {
    extraBytesForPieces += makerInputTxHex.length / 2
  }
  if (isTakerInputStasScript) {
    extraBytesForPieces += takerInputTxHex.length / 2
  }
  handleChangeForSwap(tx, extraBytesForPieces, paymentPrivateKey.publicKey)

  const takerSignature = bsv.Transaction.sighash.sign(tx, takerPrivateKey, sighash, 1, takerInputInfo.utxo.scriptPubKey, new bsv.crypto.BN(takerInputInfo.utxo.satoshis), flags)
  const takerSignatureASM = takerSignature.toTxFormat().toString('hex')
  const takerUnlockScript = bsv.Script.fromASM(takerSignatureASM + ' ' + takerPrivateKey.publicKey.toString('hex'))

  const paymentSignature = bsv.Transaction.sighash.sign(tx, paymentPrivateKey, sighash, 2, paymentUtxo.scriptPubKey, new bsv.crypto.BN(paymentUtxo.satoshis), flags)
  const paymentSignatureASM = paymentSignature.toTxFormat().toString('hex')
  const paymentUnlockScript = bsv.Script.fromASM(paymentSignatureASM + ' ' + paymentPrivateKey.publicKey.toString('hex'))

  tx.inputs[1].setScript(takerUnlockScript)
  tx.inputs[2].setScript(paymentUnlockScript)

  return tx.serialize(true)
}

function makerSignSwapOffer(offerTxHex, makerInputTxHex, takerInputTx, makerPrivateKey, takerPublicKeyHash, paymentPublicKeyHash, paymentUtxo) {
  const flags = bsv.Script.Interpreter.SCRIPT_ENABLE_SIGHASH_FORKID | bsv.Script.Interpreter.SCRIPT_ENABLE_MAGNETIC_OPCODES | bsv.Script.Interpreter.SCRIPT_ENABLE_MONOLITH_OPCODES

  if (offerTxHex === null) {
    throw new Error("offerTxHex is null")
  }
  if (makerInputTxHex === null) {
    throw new Error("makerInputTxHex is null")
  }
  if (takerInputTx === null) {
    throw new Error("takerInputTx is null")
  }
  if (makerPrivateKey === null) {
    throw new Error("makerPrivateKey is null")
  }
  if (takerPublicKeyHash === null) {
    throw new Error("takerPublicKeyHash is null")
  }
  if (paymentPublicKeyHash === null) {
    throw new Error("paymentPublicKeyHash is null")
  }
  if (paymentUtxo === null) {
    throw new Error("paymentUtxo is null")
  }

  // partially signed tx
  const tx = bsv.Transaction(offerTxHex)
  const makerPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(makerPrivateKey.publicKey.toBuffer()).toString('hex')
  const makerInputTx = bsv.Transaction(makerInputTxHex)
  const makerInputVout = tx.inputs[0].outputIndex
  const takerInputVout = tx.inputs[1].outputIndex
  const makerOutputScript = makerInputTx.outputs[makerInputVout].script

  const isMakerOutputStasScript = isStasScript(makerOutputScript.toHex())

  const preimageMakerBuf = preimageFn(tx, sighash, 0, makerOutputScript, new bsv.crypto.BN(tx.outputs[1].satoshis))
  const preimageMaker = preimageMakerBuf.buf.toString('hex')
  const makerSignature = bsv.Transaction.sighash.sign(tx, makerPrivateKey, sighash, 0, makerOutputScript, new bsv.crypto.BN(tx.outputs[1].satoshis), flags)
  const makerSignatureASM = makerSignature.toTxFormat().toString('hex')

  const reversedFundingTXID = reverseEndian(paymentUtxo.txid)

  let makerUnlockScript
  if (isMakerOutputStasScript) {
    makerUnlockScript = bsv.Script.fromASM(
      numberToLESM(tx.outputs[0].satoshis) + ' ' + makerPublicKeyHash +
      ' ' + numberToLESM(tx.outputs[1].satoshis) + ' ' + takerPublicKeyHash +
      ' ' + numberToLESM(tx.outputs[2].satoshis) + ' ' + paymentPublicKeyHash +
      ' ' + `OP_${paymentUtxo.vout}` + ' ' + reversedFundingTXID +
      ' ' + `OP_${takerInputVout}` +
      ' ' + takerInputTx + ' ' + 'OP_1' + ' ' + // type of TX: basic, swap or merging
      preimageMaker + ' ' + makerSignatureASM + ' ' + makerPrivateKey.publicKey.toString('hex'))
  } else {
    const makerSignature = bsv.Transaction.sighash.sign(tx, makerPrivateKey, sighash, 0, makerInputTx.outputs[makerInputVout].script, new bsv.crypto.BN(tx.outputs[1].satoshis), flags)
    const makerSignatureASM = makerSignature.toTxFormat().toString('hex')
    makerUnlockScript = bsv.Script.fromASM(makerSignatureASM + ' ' + makerPrivateKey.publicKey.toString('hex'))
  }
  tx.inputs[0].setScript(makerUnlockScript)

  return tx.serialize(true)
}
/*
Depricated: don't use allInOneSwap
*/
function allInOneSwap(makerPrivateKey, makerInputUtxo, wantedInfo, makerInputTxHex, makerInputVout,
  takerPrivateKey, takerInputTxHex, takerInputVout, takerInputSatoshis, takerOutputSatoshis, paymentUtxo, paymentPrivateKey) {
  if (makerPrivateKey === null) {
    throw new Error('Maker private key is null')
  }
  if (takerPrivateKey === null) {
    throw new Error('Taker private key is null')
  }
  if (makerInputUtxo === null) {
    throw new Error('Maker input UTXO is null')
  } else if (makerInputUtxo.satoshis < 0 || makerInputUtxo.script === '' || makerInputUtxo.outputIndex < 0 || makerInputUtxo.txId === '') {
    throw new Error('Invalid maker input UTXO')
  }
  if (typeof makerInputUtxo.script !== 'object') {
    throw new Error('makerInputUtxo.script must be an object')
  }
  if (makerInputUtxo.satoshis !== takerOutputSatoshis) {
    throw new Error('makerInputUtxo.satoshis should equal takerOutputSatoshis')
  }
  if (wantedInfo.satoshis !== takerInputSatoshis) {
    throw new Error('wantedInfo.satoshis should equal takerInputSatoshis')
  }

  if (makerInputTxHex === null || makerInputTxHex.length < 100) {
    throw new Error('Invalid makerInputTxHex')
  }
  if (takerInputTxHex === null || takerInputTxHex.length < 100) {
    throw new Error('Invalid takerInputTxHex')
  }
  if (paymentUtxo.txid === null || typeof paymentUtxo.txid.length < 1) {
    throw new Error('paymentUtxo.txid must be a string')
  }
  if (paymentUtxo.scriptPubKey === null || typeof paymentUtxo.scriptPubKey !== 'string') {
    throw new Error('paymentUtxo.scriptPubKey must be a string')
  }

  const makerPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(makerPrivateKey.publicKey.toBuffer()).toString('hex')
  const takerPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(takerPrivateKey.publicKey.toBuffer()).toString('hex')
  const paymentPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(paymentPrivateKey.publicKey.toBuffer()).toString('hex')

  const wantedScriptAsm = bsv.Script.fromHex(wantedInfo.scriptHex).toString()

  const wantedSlice1 = wantedScriptAsm.slice(0, 23)
  const wantedSlice2 = wantedScriptAsm.slice(63)
  const makerWantedScriptAsm = wantedSlice1.concat(makerPublicKeyHash).concat(wantedSlice2)
  const makerWantedScript = bsv.Script.fromString(makerWantedScriptAsm).toHex()
  const makerWantedLockingScript = bsv.Script.fromHex(makerWantedScript)

  // the makers offered input
  const tx = new bsv.Transaction().from(makerInputUtxo)

  // the makers wanted output
  tx.addOutput(new bsv.Transaction.Output({
    script: makerWantedLockingScript,
    satoshis: wantedInfo.satoshis
  }))

  const makerInputTx = JSON.parse(JSON.stringify(bsv.Transaction(makerInputTxHex)))
  const makerStasInputScript = bsv.Script.fromHex(makerInputTx.outputs[makerInputVout].script)
  const makerStasInputScriptASM = makerStasInputScript.toString()

  const takerInputTx = bsv.Transaction(takerInputTxHex)
  const takerStasInputScript = takerInputTx.outputs[takerInputVout].script

  const takerInputTxid = bsv.Transaction(takerInputTx).hash

  const makerSlice1 = makerStasInputScriptASM.slice(0, 23)
  const makerSlice2 = makerStasInputScriptASM.slice(63)
  const takerWantedScriptAsm = makerSlice1.concat(takerPublicKeyHash).concat(makerSlice2)
  const takerWantedScript = bsv.Script.fromString(takerWantedScriptAsm)// .toHex()

  const isMakerInputStasScript = isStasScript(makerStasInputScript.toHex())
  const isTakerInputStasScript = isStasScript(takerStasInputScript.toHex())

  tx.addInput(new bsv.Transaction.Input({
    prevTxId: takerInputTxid,
    outputIndex: takerInputVout,
    script: takerStasInputScript
  }), takerStasInputScript, takerInputSatoshis)

  // add taker output
  tx.addOutput(new bsv.Transaction.Output({
    script: takerWantedScript,
    satoshis: takerOutputSatoshis
  }))

  // add funding
  tx.addInput(new bsv.Transaction.Input({
    prevTxId: paymentUtxo.txid,
    outputIndex: paymentUtxo.vout,
    script: bsv.Script.fromHex(paymentUtxo.scriptPubKey)
  }), paymentUtxo.scriptPubKey, paymentUtxo.satoshis)

  // add change
  let extraBytesForPieces = 0

  if (isMakerInputStasScript) {
    extraBytesForPieces += makerInputTxHex.length / 2
  }
  if (isTakerInputStasScript) {
    extraBytesForPieces += takerInputTxHex.length / 2
  }
  handleChangeForSwap(tx, extraBytesForPieces, paymentPrivateKey.publicKey)

  const preimageBuf = preimageFn(tx, sighash, 0, makerInputUtxo.script, new bsv.crypto.BN(makerInputUtxo.satoshis))
  const preimage = preimageBuf.buf.toString('hex')
  const sigSmart = bsv.Transaction.sighash.sign(tx, makerPrivateKey, sighash, 0, makerInputUtxo.script, new bsv.crypto.BN(makerInputUtxo.satoshis))
  const sigSmartHex = sigSmart.toTxFormat().toString('hex')

  const preimageTakerBuf = preimageFn(tx, sighash, 1, takerStasInputScript, new bsv.crypto.BN(takerInputSatoshis))
  const preimageTaker = preimageTakerBuf.buf.toString('hex')
  const takerSignature = bsv.Transaction.sighash.sign(tx, takerPrivateKey, sighash, 1, takerStasInputScript, new bsv.crypto.BN(takerInputSatoshis))
  const takerSignatureHex = takerSignature.toTxFormat().toString('hex')

  const paymentSignature = bsv.Transaction.sighash.sign(tx, paymentPrivateKey, sighash, 2, bsv.Script.fromHex(paymentUtxo.scriptPubKey), new bsv.crypto.BN(paymentUtxo.satoshis))
  const paymentSignatureHex = paymentSignature.toTxFormat().toString('hex')

  const reversedFundingTXID = reverseEndian(paymentUtxo.txid)

  // taker completes the 3 missing linking fields in the preimage pushed into unlocking script of maker’s input
  // with exactly the same values as in the preimage of his spending input
  const makerUnlockScript = bsv.Script.fromASM(
    numberToLESM(tx.outputs[0].satoshis) + ' ' + makerPublicKeyHash +
    ' ' + numberToLESM(tx.outputs[1].satoshis) + ' ' + takerPublicKeyHash +
    ' ' + numberToLESM(tx.outputs[2].satoshis) + ' ' + paymentPublicKeyHash +
    ' ' + `OP_${paymentUtxo.vout}` + ' ' + reversedFundingTXID +
    ' ' + `OP_${takerInputVout}` +
    ' ' + takerInputTxHex + ' ' + 'OP_1' + ' ' + // type of TX: basic, swap or merging
    preimage + ' ' + sigSmartHex + ' ' + makerPrivateKey.publicKey.toString('hex'))

  const publicKeyTaker = takerPrivateKey.publicKey
  const publicKeyPayment = paymentPrivateKey.publicKey

  // type of TX: basic, swap or merging
  const takerUnlockScript = bsv.Script.fromASM(
    numberToLESM(tx.outputs[0].satoshis) + ' ' + makerPublicKeyHash +
    ' ' + numberToLESM(tx.outputs[1].satoshis) + ' ' + takerPublicKeyHash +
    ' ' + numberToLESM(tx.outputs[2].satoshis) + ' ' + paymentPublicKeyHash +
    ' ' + `OP_${paymentUtxo.vout}` + ' ' + reversedFundingTXID +
    ' ' + `OP_${makerInputVout}` + // an index of output of that tx, which is attempted to be spent by an input of current spending tx
    ' ' + makerInputTxHex + ' ' + 'OP_1' + // type of TX: basic, swap or merging
    ' ' + preimageTaker + ' ' + takerSignatureHex + ' ' + publicKeyTaker.toString('hex'))

  const paymentUnlockScript = bsv.Script.fromASM(paymentSignatureHex + ' ' + publicKeyPayment.toString('hex'))

  tx.inputs[0].setScript(makerUnlockScript)
  tx.inputs[1].setScript(takerUnlockScript)
  tx.inputs[2].setScript(paymentUnlockScript)

  return tx.serialize(true)
}

function isP2PKHScript(script) {
  if (p2pkhRegex.test(script)) {
    return true
  }
  return false
}

function handleChangeForSwap(tx, extraDataBytes, publicKey, commissionSats = 0) {
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
  // we won't have the output script of tx.inputs[0].output if the maker hasn't signed yet.
  // workaround is to estimate it.
  let preimageLen = 0
  let imageBufLength = 0
  let stasInputCount = 0

  // remember commission output
  tx.outputs.forEach((output, i) => {
    if (isStasScript(output.script.toHex())) {
      if (tx.inputs[i === 0 ? 1 : 0].output === undefined) {
        const image = preimageFn(tx, sighash, i, output.script, output.satoshisBN)
        preimageLen += new Varint().fromNumber(image.buf.length).toBuffer().length
        imageBufLength += image.buf.length
        // preimageLen += 3206 // estimate the preimage size
        // imageBufLength += 0
        stasInputCount++
      } else if (isStasScript(tx.inputs[i === 0 ? 1 : 0].output.script.toHex())) {
        const image = preimageFn(tx, sighash, i, tx.inputs[i === 0 ? 1 : 0].output.script, tx.inputs[i === 0 ? 1 : 0].output.satoshisBN)
        preimageLen += new Varint().fromNumber(image.buf.length).toBuffer().length
        imageBufLength += image.buf.length
        stasInputCount++
        // console.log(' image.buf.length:', image.buf.length)
      }
    }
  })
  // console.log('preimageLen: ', preimageLen)
  // console.log('extraDataBytes: ', extraDataBytes)

  // console.log('stasInputCount: ', stasInputCount)
  //
  // Calculate the fee required
  // ---------------------------------------------------------------------------------------
  // The actual unlocking script for STAS will be:
  // STAS amount                                       Up to 9 bytes
  // pubkeyhash                                        21 bytes
  // STAS amount 2                                      Up to 9 bytes
  // pubkeyhash 2                                       21 bytes
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
  let txSizeInBytes = tx.toBuffer().length + (stasInputCount * (9 + 21 + 9 + 21 + 4 + 9 + 33 + 9 + 1 + 72 + 1 + 33)) + extraDataBytes + preimageLen + imageBufLength
  txSizeInBytes += ((tx.inputs.length - stasInputCount) * P2PKH_UNLOCKING_SCRIPT_BYTES)

  let satoshis = 0
  tx.inputs.forEach((input, i) => {
    if (i > 1) { // Skip the 2 STAS inputs...
      satoshis += input.output.satoshis
    }
  })

  satoshis -= commissionSats

  const fee = Math.ceil(txSizeInBytes * feeSettings.Sats / feeSettings.PerByte)
  const outputSats = satoshis - fee
  if (outputSats < 1) {
    throw new Error(`The Fee for transaction of ${fee} is higher than the amount of satoshis supplied ${satoshis} for funding`)
  }
  console.log('handleChangeForSwap: txSizeInBytes:', txSizeInBytes)
  console.log('                   : fee:', fee)
  tx.outputs[tx.outputs.length - 1].satoshis = satoshis - fee
}

module.exports = {
  createSwapOffer,
  acceptSwapOffer,
  allInOneSwap,
  createUnsignedSwapOffer,
  acceptUnsignedSwapOffer,
  acceptUnsignedNativeSwapOffer,
  makerSignSwapOffer
}
