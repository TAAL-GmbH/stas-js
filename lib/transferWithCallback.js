const bsv = require('bsv')
const {
  getVersion,
  handleChange,
  partialSTASUnlockingScript,
  updateStasScript,
  getPublicKeyHash,
  sighash
} = require('./stas')

const { addressToPubkeyhash } = require('./utils')

/* transfer will take an existing STAS UTXO and assign it to another address.
 The tokenOwnerPrivateKey must own the existing STAS UTXO (stasUtxo),
 the paymentPrivateKey owns the paymentUtxo and will be the owner of any change from the fee.
*/
async function transferWithCallback(tokenOwnerPublicKey, stasUtxo, destinationAddress, paymentUtxo, paymentPublicKey, ownerSignatureCallback, paymentSignatureCallback) {
  let isUnsigned = false
  const signInfoList = [] // for unsigned tx

  if (tokenOwnerPublicKey === null) {
    throw new Error('Token owner public key is null')
  }
  if (ownerSignatureCallback === null || ownerSignatureCallback === undefined) {
    isUnsigned = true
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
    satoshis: stasUtxo.satoshis
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

  let signature
  for (let i = 0; i < tx.inputs.length; i++) {
    const input = tx.inputs[i]
    if (i === 0) {
      // STAS input
      partialSTASUnlockingScript(
        tx,
        [
          {
            satoshis: stasUtxo.satoshis,
            publicKey: destinationPublicKey
          },
          null,
          paymentSegment
        ],
        version,
        isZeroFee
      )
      if (!isUnsigned) {
        signature = await ownerSignatureCallback(tx, i, input.output._script, input.output._satoshisBN)
        const endSscript = signature + ' ' + tokenOwnerPublicKey.toString('hex')
        const partialScript = tx.inputs[0].script.toASM()
        tx.inputs[0].setScript(bsv.Script.fromASM(partialScript + ' ' + endSscript))
      } else {
        // add to signInfo
        signInfoList.push({
          inputIndex: i,
          publicKey: tokenOwnerPublicKey,
          sighash: sighash,
          // have to pass in script and satoshis because of serialisation bug in BSV.js
          script: input.output._script.toString('hex'),
          satoshis: input.output.satoshis,
          type: 'stas'
        })
      }
    } else {
      if (!isZeroFee) {
        if (!isUnsigned) {
          const signature = await paymentSignatureCallback(tx, i, input.output._script, input.output._satoshisBN)
          const unlockingScript = bsv.Script.fromASM(signature + ' ' + paymentPublicKey.toString('hex'))
          input.setScript(unlockingScript)
        } else {
          // add to signInfo
          signInfoList.push({
            inputIndex: i,
            publicKey: paymentPublicKey,
            sighash: sighash,
            script: input.output._script.toString('hex'),
            satoshis: input.output.satoshis
          })
        }
      }
    }
  }
  if (isUnsigned) {
    return {
      hex: tx.toString(),
      json: JSON.stringify(tx),
      signingInfo: signInfoList
    }
  }
  return tx.serialize(true)
}

module.exports = transferWithCallback
