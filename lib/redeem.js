const bsv = require('bsv')
const {
  sighash,
  handleChange,
  getVersion,
  completeSTASUnlockingScript
} = require('./stas')

function redeem (tokenOwnerPrivateKey, contractPublicKey, stasUtxo, paymentUtxos, paymentsPrivateKey) {
  const isZeroFee = (paymentUtxos === null)

  const tx = new bsv.Transaction()

  tx.from(stasUtxo)

  if (!isZeroFee) {
    paymentUtxos.forEach(utxo => {
      tx.from(utxo)
    })
  }

  // Now pay the satoshis that are tied up in the STAS token to the redeemPublicKey...
  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(contractPublicKey.toBuffer()).toString('hex')

  const redeemScript = bsv.Script.fromASM(`OP_DUP OP_HASH160 ${publicKeyHash} OP_EQUALVERIFY OP_CHECKSIG`)
  tx.addOutput(new bsv.Transaction.Output({
    script: redeemScript,
    satoshis: Math.round(stasUtxo.amount * 1e8)
  }))

  if (!isZeroFee) {
    handleChange(tx, paymentsPrivateKey.publicKey)
  }

  // Sign the inputs...
  tx.inputs.forEach((input, i) => {
    if (i === 0) {
      // STAS input
      const signature = bsv.Transaction.sighash.sign(tx, tokenOwnerPrivateKey, sighash, i, input.output._script, input.output._satoshisBN)
      const segments = []
      segments.push(
        {
          satoshis: Math.round(stasUtxo.amount * 1e8),
          publicKey: bsv.crypto.Hash.sha256ripemd160(contractPublicKey.toBuffer()).toString('hex')
        })
      segments.push(null)

      if (tx.outputs.length > 1 && !isZeroFee) {
        segments.push({
          satoshis: tx.outputs[1].satoshis,
          publicKey: bsv.crypto.Hash.sha256ripemd160(paymentsPrivateKey.publicKey.toBuffer()).toString('hex')
        })
      }

      completeSTASUnlockingScript(
        tx,
        segments,
        signature.toTxFormat().toString('hex'),
        tokenOwnerPrivateKey.publicKey.toString('hex'),
        getVersion(stasUtxo.scriptPubKey),
        isZeroFee
      )
    } else if (!isZeroFee) {
      const signature = bsv.Transaction.sighash.sign(tx, paymentsPrivateKey, sighash, i, input.output._script, input.output._satoshisBN)
      const unlockingScript = bsv.Script.fromASM(signature.toTxFormat().toString('hex') + ' ' + paymentsPrivateKey.publicKey.toString('hex'))
      input.setScript(unlockingScript)
    }
  })

  return tx.serialize(true)
}

module.exports = redeem
