const bsv = require('bsv')
const {
  getStasScript,
  getVersion,
  sighash,
  handleChange,
  completeSTASUnlockingScript
} = require('./stas')

// transfer will take an existing STAS UTXO and assign it to another address.
// The tokenOwnerPrivateKey must own the existing STAS UTXO, the payment UTXOs and will be the owner of the change, if any.
function transfer (tokenOwnerPrivateKey, contractPublicKey, stasUtxo, destinationPublicKey, paymentUtxos, paymentsPrivateKey) {
  const tx = new bsv.Transaction()

  tx.from(stasUtxo)

  paymentUtxos.forEach(utxo => {
    tx.from(utxo)
  })

  // Add the issuing output
  const stasScript = getStasScript(destinationPublicKey, contractPublicKey, getVersion(stasUtxo.scriptPubKey))

  tx.addOutput(new bsv.Transaction.Output({
    script: stasScript,
    satoshis: (stasUtxo.amount * 1e8)
  }))

  handleChange(tx, paymentsPrivateKey.publicKey)

  tx.inputs.forEach((input, i) => {
    if (i === 0) {
      // STAS input
      const signature = bsv.Transaction.sighash.sign(tx, tokenOwnerPrivateKey, sighash, i, input.output._script, input.output._satoshisBN)

      completeSTASUnlockingScript(
        tx,
        [
          {
            satoshis: stasUtxo.amount * 1e8,
            publicKey: destinationPublicKey
          },
          null,
          {
            satoshis: tx.outputs[1].satoshis,
            publicKey: paymentsPrivateKey.publicKey
          }
        ],
        signature.toTxFormat().toString('hex'),
        tokenOwnerPrivateKey.publicKey.toString('hex'),
        getVersion(stasUtxo.scriptPubKey)
      )
    } else {
      const signature = bsv.Transaction.sighash.sign(tx, paymentsPrivateKey, sighash, i, input.output._script, input.output._satoshisBN)
      const unlockingScript = bsv.Script.fromASM(signature.toTxFormat().toString('hex') + ' ' + paymentsPrivateKey.publicKey.toString('hex'))
      input.setScript(unlockingScript)
    }
  })

  return tx.serialize(true)
}

module.exports = transfer
