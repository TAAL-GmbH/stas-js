const bsv = require('bsv')
const {
  getVersion,
  handleChange,
  completeSTASUnlockingScript,
  updateStasScript,
  getPublicKeyHash
} = require('./stas')

const { bitcoinToSatoshis, addressToPubkeyhash } = require('./utils')

/* transfer will take an existing STAS UTXO and assign it to another address.
 The tokenOwnerPrivateKey must own the existing STAS UTXO (stasUtxo),
 the paymentPrivateKey owns the paymentUtxo and will be the owner of any change from the fee.
*/
async function transferWithCallback (tokenOwnerPublicKey, stasUtxo, destinationAddress, paymentUtxo, paymentPublicKey, ownerSignatureCallback, paymentSignatureCallback) {
  if (tokenOwnerPublicKey === null) {
    throw new Error('Token owner public key is null')
  }
  if (ownerSignatureCallback === null) {
    throw new Error('ownerSignatureCallback is null')
  }
  if (paymentUtxo !== null && paymentPublicKey === null) {
    throw new Error('Payment UTXO provided but payment key is null')
  }
  if (paymentUtxo === null && paymentPublicKey !== null) {
    throw new Error('Payment public key provided but payment UTXO is null')
  }

  if (stasUtxo === null) {
    throw new Error('stasUtxo is null')
  }
  if (destinationAddress === null) {
    throw new Error('destination address is null')
  }

  try {
    bsv.Address.fromString(destinationAddress)
  } catch (e) {
    throw new Error('Invalid destination address')
  }

  const isZeroFee = (paymentUtxo === null)

  const tx = new bsv.Transaction()

  const destinationPublicKey = addressToPubkeyhash(destinationAddress)

  tx.from(stasUtxo)

  if (!isZeroFee) {
    tx.from(paymentUtxo)
  }

  // Add the issuing output
  const version = getVersion(stasUtxo.scriptPubKey)

  const stasScript = updateStasScript(destinationPublicKey, stasUtxo.scriptPubKey)
  tx.addOutput(new bsv.Transaction.Output({
    script: stasScript,
    satoshis: bitcoinToSatoshis(stasUtxo.amount)
  }))

  const issuerPublicKeyHash = getPublicKeyHash(stasScript)
  const destinationPublicKeyHash = addressToPubkeyhash(destinationAddress)

  if (issuerPublicKeyHash === destinationPublicKeyHash) {
    throw new Error('Token UTXO cannot be sent to issuer address')
  }
  let paymentSegment = null
  if (!isZeroFee) {
    handleChange(tx, paymentPublicKey)
    paymentSegment = {
      satoshis: tx.outputs[1].satoshis,
      publicKey: bsv.crypto.Hash.sha256ripemd160(paymentPublicKey.toBuffer()).toString('hex')
    }
  }

  for (let i = 0; i < tx.inputs.length; i++) {
    const input = tx.inputs[i]
    if (i === 0) {
      // STAS input
      const signature = await ownerSignatureCallback(tx, i, input.output._script, input.output._satoshisBN)

      completeSTASUnlockingScript(
        tx,
        [
          {
            satoshis: bitcoinToSatoshis(stasUtxo.amount),
            publicKey: destinationPublicKey
          },
          null,
          paymentSegment
        ],
        signature,
        tokenOwnerPublicKey.toString('hex'),
        version,
        isZeroFee
      )
    } else {
      if (!isZeroFee) {
        const signature = await paymentSignatureCallback(tx, i, input.output._script, input.output._satoshisBN)
        const unlockingScript = bsv.Script.fromASM(signature + ' ' + paymentPublicKey.toString('hex'))
        input.setScript(unlockingScript)
      }
    }
  }

  return tx.serialize(true)
}

module.exports = transferWithCallback
