const bsv = require('bsv')
const {
  getStasScript,
  getVersion,
  getScriptData,
  isSplittable,
  sighash,
  handleChange,
  completeSTASUnlockingScript
} = require('./stas')

const { addressToPubkeyhash, SATS_PER_BITCOIN } = require('./utils')

/* transfer will take an existing STAS UTXO and assign it to another address.
 The tokenOwnerPrivateKey must own the existing STAS UTXO (stasUtxo),
 the paymentsPrivateKey owns the paymentUtxo and will be the owner of any change from the fee.
*/
function transfer (tokenOwnerPrivateKey, contractPublicKey, stasUtxo, destinationAddress, paymentUtxo, paymentsPrivateKey) {
  const isZeroFee = (paymentUtxo === null)

  const tx = new bsv.Transaction()

  const destinationPublicKey = addressToPubkeyhash(destinationAddress)

  tx.from(stasUtxo)

  if (!isZeroFee) {
    tx.from(paymentUtxo)
  }

  // Add the issuing output
  const version = getVersion(stasUtxo.scriptPubKey)

  const stasScript = getStasScript(destinationPublicKey, contractPublicKey, version, getScriptData(stasUtxo.scriptPubKey, version), isSplittable(stasUtxo.scriptPubKey))

  tx.addOutput(new bsv.Transaction.Output({
    script: stasScript,
    satoshis: (Math.round(stasUtxo.amount * SATS_PER_BITCOIN))
  }))

  let paymentSegment = null
  if (!isZeroFee) {
    handleChange(tx, paymentsPrivateKey.publicKey)
    paymentSegment = {
      satoshis: tx.outputs[1].satoshis,
      publicKey: bsv.crypto.Hash.sha256ripemd160(paymentsPrivateKey.publicKey.toBuffer()).toString('hex')
    }
  }

  tx.inputs.forEach((input, i) => {
    if (i === 0) {
      // STAS input
      const signature = bsv.Transaction.sighash.sign(tx, tokenOwnerPrivateKey, sighash, i, input.output._script, input.output._satoshisBN)

      completeSTASUnlockingScript(
        tx,
        [
          {
            satoshis: (Math.round(stasUtxo.amount * SATS_PER_BITCOIN)),
            publicKey: destinationPublicKey
          },
          null,
          paymentSegment
        ],
        signature.toTxFormat().toString('hex'),
        tokenOwnerPrivateKey.publicKey.toString('hex'),
        version,
        isZeroFee
      )
    } else {
      if (!isZeroFee) {
        const signature = bsv.Transaction.sighash.sign(tx, paymentsPrivateKey, sighash, i, input.output._script, input.output._satoshisBN)
        const unlockingScript = bsv.Script.fromASM(signature.toTxFormat().toString('hex') + ' ' + paymentsPrivateKey.publicKey.toString('hex'))
        input.setScript(unlockingScript)
      }
    }
  })

  return tx.serialize(true)
}

module.exports = transfer
