const bsv = require('bsv')
const {
  Varint
} = bsv.encoding
const preimageFn = require('./preimage')
const {
  getStasScript,
  getVersion,
  sighash,
  P2PKH_UNLOCKING_SCRIPT_BYTES
} = require('./stas')
const {
  numberToLESM,
  replaceAll
} = require('./utils')

// merge will take 2 existing STAS UTXOs and combine them and assign the single UTXO to another address.
// The tokenOwnerPrivateKey must own the existing STAS UTXOs, the payment UTXOs and will be the owner of the change, if any.
function merge (tokenOwnerPrivateKey, contractPublicKey, mergeUtxos, destinationPublicKey, paymentUtxo, paymentsPrivateKey) {
  const BN = bsv.crypto.BN

  if (mergeUtxos.length !== 2) {
    throw new Error('This function can only merge exactly 2 STAS tokens.')
  }

  if (mergeUtxos[0].tx.outputs[mergeUtxos[0].vout].script.toHex() !== mergeUtxos[1].tx.outputs[mergeUtxos[1].vout].script.toHex()) {
    throw new Error('This function only merges STAS tokens with the same owner')
  }

  // Get the locking script (they are the same in each outpoint)...
  const lockingScript = mergeUtxos[0].tx.outputs[mergeUtxos[0].vout].script.toHex()
  const scriptToCut = lockingScript.slice(46)

  let stasAmount = 0

  mergeUtxos.forEach(mutxo => {
    const s = replaceAll(mutxo.tx.serialize(true), scriptToCut, ' ')
    const parts = s.split(' ')
    mutxo.piece = parts.reverse().join(' ')
    mutxo.numberOfPieces = parts.length
    stasAmount += mutxo.tx.outputs[mutxo.vout].satoshis
  })

  const stasScript = getStasScript(destinationPublicKey, contractPublicKey, getVersion(lockingScript))

  const tx = new bsv.Transaction()

  const stasUtxos = mergeUtxos.map(mutxo => {
    return {
      txid: mutxo.tx.id,
      vout: mutxo.vout,
      scriptPubKey: mutxo.tx.outputs[mutxo.vout].script.toHex(),
      satoshis: mutxo.tx.outputs[mutxo.vout].satoshis
    }
  })

  tx.from(stasUtxos)

  tx.from(paymentUtxo)

  tx.addOutput(new bsv.Transaction.Output({
    script: stasScript,
    satoshis: stasAmount
  }))

  const extraBytesForPieces = mergeUtxos[0].piece.length + 8 + mergeUtxos[1].piece.length + 8

  handleChangeForMerge(tx, extraBytesForPieces, paymentsPrivateKey.publicKey)

  const preimageBuf = preimageFn(tx, sighash, 0, bsv.Script(lockingScript), new bsv.crypto.BN(mergeUtxos[0].tx.outputs[mergeUtxos[0].vout].satoshis))
  const preimage = preimageBuf.buf.toString('hex')
  const preimageBufMerge = preimageFn(tx, sighash, 1, bsv.Script(lockingScript), new bsv.crypto.BN(mergeUtxos[1].tx.outputs[mergeUtxos[1].vout].satoshis))
  const preimageMerge = preimageBufMerge.buf.toString('hex')

  function reverseEndian (str) {
    const num = new BN(str, 'hex')
    const buf = num.toBuffer()
    return buf.toString('hex').match(/.{2}/g).reverse().join('')
  }

  const reversedFundingTXID = reverseEndian(paymentUtxo.txid)

  const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(destinationPublicKey.toBuffer()).toString('hex')
  const paymentPubKeyHash = bsv.crypto.Hash.sha256ripemd160(paymentsPrivateKey.publicKey.toBuffer()).toString('hex')

  tx.inputs.forEach((input, i) => {
    if (i === 0) {
      // STAS input
      const signature = bsv.Transaction.sighash.sign(tx, tokenOwnerPrivateKey, sighash, i, input.output._script, input.output._satoshisBN)
      const sigASM = signature.toTxFormat().toString('hex')

      const s = numberToLESM(stasAmount) + ' ' + pubKeyHash +
        ' ' + 'OP_FALSE' + ' ' + 'OP_FALSE' +
        ' ' + numberToLESM(tx.outputs[1].satoshis) + ' ' + paymentPubKeyHash +
        ' ' + `OP_${paymentUtxo.vout}` + ' ' + reversedFundingTXID +
        ' ' + `OP_${mergeUtxos[1].vout}` +
        ' ' + mergeUtxos[1].piece + ' ' + `OP_${mergeUtxos[1].numberOfPieces}` +
        ' ' + preimage +
        ' ' + sigASM + ' ' + tokenOwnerPrivateKey.publicKey.toString('hex')

      tx.inputs[0].setScript(bsv.Script.fromASM(s))
    } else if (i === 1) {
      const signature = bsv.Transaction.sighash.sign(tx, tokenOwnerPrivateKey, sighash, i, input.output._script, input.output._satoshisBN)
      const sigASM = signature.toTxFormat().toString('hex')

      const s = numberToLESM(stasAmount) + ' ' + pubKeyHash +
        ' ' + 'OP_FALSE' + ' ' + 'OP_FALSE' +
        ' ' + numberToLESM(tx.outputs[1].satoshis) + ' ' + paymentPubKeyHash +
        ' ' + `OP_${paymentUtxo.vout}` + ' ' + reversedFundingTXID +
        ' ' + `OP_${mergeUtxos[0].vout}` +
        ' ' + mergeUtxos[0].piece + ' ' + `OP_${mergeUtxos[0].numberOfPieces}` +
        ' ' + preimageMerge +
        ' ' + sigASM + ' ' + tokenOwnerPrivateKey.publicKey.toString('hex')

      tx.inputs[1].setScript(bsv.Script.fromASM(s))
    } else {
      const signature = bsv.Transaction.sighash.sign(tx, paymentsPrivateKey, sighash, i, input.output._script, input.output._satoshisBN)
      const unlockingScript = bsv.Script.fromASM(signature.toTxFormat().toString('hex') + ' ' + paymentsPrivateKey.publicKey.toString('hex'))
      input.setScript(unlockingScript)
    }
  })

  return tx.serialize(true)
}

function handleChangeForMerge (tx, extraDataBytes, publicKey) {
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
  let txSizeInBytes = tx.toBuffer().length + 9 + 21 + 4 + 9 + 33 + 9 + extraDataBytes + ((preimageLen + image.buf.length) * 2) + 1 + 72 + 1 + 33
  txSizeInBytes += ((tx.inputs.length - 1) * P2PKH_UNLOCKING_SCRIPT_BYTES)

  let satoshis = 0
  tx.inputs.forEach((input, i) => {
    if (i > 1) { // Skip the 2 STAS inputs...
      satoshis += input.output.satoshis
    }
  })

  const sats = 500
  const perByte = 1000

  const fee = Math.ceil(txSizeInBytes * sats / perByte)

  tx.outputs[tx.outputs.length - 1].satoshis = satoshis - fee
}

module.exports = merge
