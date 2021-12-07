const bsv = require('bsv')
const {
  getVersion,
  sighash,
  handleChange,
  completeSTASUnlockingScript,
  updateStasScript
} = require('./stas')

const { addressToPubkeyhash, SATS_PER_BITCOIN } = require('./utils')

/* transfer will take an existing STAS UTXO and assign it to another address.
 The tokenOwnerPrivateKey must own the existing STAS UTXO (stasUtxo),
 the paymentPrivateKey owns the paymentUtxo and will be the owner of any change from the fee.
*/
function transfer (tokenOwnerPrivateKey, contractPublicKey, stasUtxo, destinationAddress, paymentUtxo, paymentPrivateKey) {
  if (tokenOwnerPrivateKey === null) {
    throw new Error('Token owner private key is null')
  }
  if (paymentUtxo !== null && paymentPrivateKey === null) {
    throw new Error('Payment UTXO provided but payment private key is null')
  }
  if (paymentUtxo === null && paymentPrivateKey !== null) {
    throw new Error('Payment private key provided but payment UTXO is null')
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
    satoshis: (Math.round(stasUtxo.amount * SATS_PER_BITCOIN))
  }))

  let paymentSegment = null
  if (!isZeroFee) {
    handleChange(tx, paymentPrivateKey.publicKey)
    paymentSegment = {
      satoshis: tx.outputs[1].satoshis,
      publicKey: bsv.crypto.Hash.sha256ripemd160(paymentPrivateKey.publicKey.toBuffer()).toString('hex')
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
        const signature = bsv.Transaction.sighash.sign(tx, paymentPrivateKey, sighash, i, input.output._script, input.output._satoshisBN)
        const unlockingScript = bsv.Script.fromASM(signature.toTxFormat().toString('hex') + ' ' + paymentPrivateKey.publicKey.toString('hex'))
        input.setScript(unlockingScript)
      }
    }
  })

  return tx.serialize(true)
}

module.exports = transfer
