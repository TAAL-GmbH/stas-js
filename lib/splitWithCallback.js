const bsv = require('bsv')
const {
  updateStasScript,
  getVersion,
  handleChange,
  completeSTASUnlockingScript,
  validateSplitDestinations,
  getPublicKeyHash
} = require('./stas')

const { addressToPubkeyhash, bitcoinToSatoshis } = require('./utils')

/* split will take an existing STAS UTXO and assign it to up to 4 addresses.
The tokenOwnerPrivateKey must own the existing STAS UTXO.
the paymentPrivateKey owns the paymentUtxo and will be the owner of any change from the fee.
*/
function splitWithCallback (tokenOwnerPublicKey, stasUtxo, splitDestinations, paymentUtxo, paymentPublicKey, ownerSignatureCallback, paymentSignatureCallback) {
  if (splitDestinations === null || splitDestinations.length === 0) {
    throw new Error('split destinations array is null or empty')
  }

  if (tokenOwnerPublicKey === null) {
    throw new Error('Token owner public key is null')
  }

  if (paymentUtxo !== null && paymentPublicKey === null) {
    throw new Error('Payment UTXO provided but payment key is null')
  }
  if (paymentUtxo === null && paymentPublicKey !== null) {
    throw new Error('Payment key provided but payment UTXO is null')
  }

  validateSplitDestinations(splitDestinations)

  const isZeroFee = paymentUtxo === null

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
    const sats = bitcoinToSatoshis(sd.amount)
    const stasScript = updateStasScript(pkh, stasUtxo.scriptPubKey)

    const issuerPublicKeyHash = getPublicKeyHash(stasScript)
    const destinationPublicKeyHash = addressToPubkeyhash(sd.address)
    if (issuerPublicKeyHash === destinationPublicKeyHash) {
      throw new Error('Token UTXO cannot be sent to issuer address')
    }

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
    handleChange(tx, paymentPublicKey)
    segments.push({
      satoshis: tx.outputs[tx.outputs.length - 1].satoshis,
      publicKey: bsv.crypto.Hash.sha256ripemd160(paymentPublicKey.toBuffer()).toString('hex')
    })
  }

  tx.inputs.forEach((input, i) => {
    if (i === 0) {
      // STAS input
      const signature = ownerSignatureCallback(tx, i, input.output._script, input.output._satoshisBN)

      completeSTASUnlockingScript(
        tx,
        segments,
        signature.toTxFormat().toString('hex'),
        tokenOwnerPublicKey.toString('hex'),
        version,
        isZeroFee
      )
    } else {
      const signature = paymentSignatureCallback(tx, i, input.output._script, input.output._satoshisBN)
      const unlockingScript = bsv.Script.fromASM(signature.toTxFormat().toString('hex') + ' ' + paymentPublicKey.toString('hex'))
      input.setScript(unlockingScript)
    }
  })

  return tx.serialize(true)
}

module.exports = splitWithCallback
