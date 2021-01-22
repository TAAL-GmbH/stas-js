const bsv = require('bsv')
const {
  getStasScript,
  getVersion,
  sighash,
  handleChange,
  completeSTASUnlockingScript
} = require('./stas')

// split will take an existing STAS UTXO and assign it to 2 addresses.
// The tokenOwnerPrivateKey must own the existing STAS UTXO, the payment UTXOs and will be the owner of the change, if any.
function split (tokenOwnerPrivateKey, contractPublicKey, stasUtxo, destination1PublicKey, amount1, destination2PublicKey, amount2, paymentUtxos, paymentsPrivateKey) {
  const tx = new bsv.Transaction()

  tx.from(stasUtxo)

  paymentUtxos.forEach(utxo => {
    tx.from(utxo)
  })

  // The first output is the 1st destination STAS output
  const stasScript1 = getStasScript(destination1PublicKey, contractPublicKey, getVersion(stasUtxo.scriptPubKey))

  tx.addOutput(new bsv.Transaction.Output({
    script: stasScript1,
    satoshis: amount1 * 1e8
  }))

  // The second output is the 2nd destination STAS output
  const stasScript2 = getStasScript(destination2PublicKey, contractPublicKey, getVersion(stasUtxo.scriptPubKey))

  tx.addOutput(new bsv.Transaction.Output({
    script: stasScript2,
    satoshis: amount2 * 1e8
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
            satoshis: amount1 * 1e8,
            publicKey: destination1PublicKey
          },
          {
            satoshis: amount2 * 1e8,
            publicKey: destination2PublicKey
          },
          {
            satoshis: tx.outputs[2].satoshis,
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

module.exports = split
