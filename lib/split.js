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

/* split will take an existing STAS UTXO and assign it to up to 4 addresses.
The tokenOwnerPrivateKey must own the existing STAS UTXO.
the paymentsPrivateKey owns the paymentUtxo and will be the owner of any change from the fee.
*/
function split (tokenOwnerPrivateKey, contractPublicKey, stasUtxo, splitDestinations, paymentUtxo, paymentsPrivateKey) {
  const isZeroFee = (paymentUtxo === null)

  const tx = new bsv.Transaction()

  // const destination1PublicKeyHash = addressToPubkeyhash(destination1Addr)
  // const destination2PublicKeyHash = addressToPubkeyhash(destination2Addr)

  tx.from(stasUtxo)

  if (!isZeroFee) {
    tx.from(paymentUtxo)
  }

  const segments = []
  const version = getVersion(stasUtxo.scriptPubKey)

  splitDestinations.forEach(sd => {
    const pkh = addressToPubkeyhash(sd.address)
    const sats = Math.round(sd.amount * SATS_PER_BITCOIN)
    const stasScript = getStasScript(pkh, contractPublicKey, version, getScriptData(stasUtxo.scriptPubKey, version), isSplittable(stasUtxo.scriptPubKey))

    tx.addOutput(new bsv.Transaction.Output({
      script: stasScript,
      satoshis: sats
    }))
    segments.push({
      satoshis: sats,
      publicKey: pkh
    })
  })
  if (!isZeroFee) {
    handleChange(tx, paymentsPrivateKey.publicKey)
    segments.push({
      satoshis: tx.outputs[tx.outputs.length - 1].satoshis,
      publicKey: bsv.crypto.Hash.sha256ripemd160(paymentsPrivateKey.publicKey.toBuffer()).toString('hex')
    })
  }

  tx.inputs.forEach((input, i) => {
    if (i === 0) {
      // STAS input
      const signature = bsv.Transaction.sighash.sign(tx, tokenOwnerPrivateKey, sighash, i, input.output._script, input.output._satoshisBN)

      completeSTASUnlockingScript(
        tx,
        segments,
        signature.toTxFormat().toString('hex'),
        tokenOwnerPrivateKey.publicKey.toString('hex'),
        version,
        isZeroFee
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
