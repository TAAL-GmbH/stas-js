const bsv = require('bsv')
const {
  updateStasScript,
  getVersion,
  handleChange,
  partialSTASUnlockingScript,
  validateSplitDestinations,
  getPublicKeyHash,
  stasV2DataRegex,
  sighash
} = require('./stas')

const { addressToPubkeyhash } = require('./utils')

/* split will take an existing STAS UTXO and assign it to up to 4 addresses.
The tokenOwnerPrivateKey must own the existing STAS UTXO.
the paymentPrivateKey owns the paymentUtxo and will be the owner of any change from the fee.
*/
async function splitWithCallback(tokenOwnerPublicKey, stasUtxo, splitDestinations, paymentUtxo, paymentPublicKey, ownerSignatureCallback, paymentSignatureCallback) {
  let isUnsigned = false
  const signInfoList = [] // for unsigned tx

  if (splitDestinations === null || splitDestinations.length === 0) {
    throw new Error('split destinations array is null or empty')
  }

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
    throw new Error('Payment key provided but payment UTXO is null')
  }

  if (!isScriptSplitable(stasUtxo)){
    throw new Error('Cannot Split an NFT')
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
    const sats = sd.amount
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
  let signature

  for (let i = 0; i < tx.inputs.length; i++) {
    const input = tx.inputs[i]
    if (i === 0) {
      // STAS input

      partialSTASUnlockingScript(
        tx,
        segments,
        // signature,
        // tokenOwnerPublicKey.toString('hex'),
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
          script: input.output._script,
          satoshis: input.output.satoshis,
          type: 'stas'
        })
      }
    } else {
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
          script: input.output._script,
          satoshis: input.output.satoshis
        })
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

function isScriptSplitable(script){
  const b = bsv.Script.fromHex(script.scriptPubKey).toASM()
  const res = b.toString().match(stasV2DataRegex)

  if (res[1] === '00') {
    return true
  } else if (res[1] === '01'){
    return false
  } else {
    throw new Error('invalid script')
  }
}

module.exports = splitWithCallback
