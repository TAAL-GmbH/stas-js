const bsv = require('bsv')
const {
  updateStasScript,
  handleChange,
  getVersion,
  partialSTASUnlockingScript,
  validateSplitDestinations,
  getPublicKeyHash,
  sighash
} = require('./stas')

const { addressToPubkeyhash, isSplitScriptSplitable } = require('./utils')

/*
 RedeemSplit splits the STAS input and sends tokens to the recipients specified in the
 splitDestinations parameter, the rest of the STAS tokens are converted back to BSV
 satoshis and sent to the redeem address that was specified when the token was created.

 The tokenOwnerPrivateKey must own the existing STAS UTXO (stasUtxo),
 splitDestinations is an array containg the address and amount of the recipients of the tokens, the rest or the input will
 be redeemed
 contractPublicKey is the redeem address
 paymentPrivateKey owns the paymentUtxo and will be the owner of any change from the fee.
*/
async function redeemSplitWithCallback(tokenOwnerPublicKey, contractPublicKey, stasUtxo, splitDestinations, paymentUtxo, paymentPublicKey, ownerSignatureCallback, paymentSignatureCallback) {
  let isUnsigned = false
  const signInfoList = [] // for unsigned tx
  if (contractPublicKey === null) {
    throw new Error('contract public key is null')
  }
  if (tokenOwnerPublicKey === null) {
    throw new Error('token owner public key is null')
  }
  if (splitDestinations === null || splitDestinations.length === 0) {
    throw new Error('split destinations array is null or empty')
  }
  
  if (stasUtxo === null) {
    throw new Error('stasUtxo is null')
  }

  if (paymentUtxo !== null && paymentPublicKey === null) {
    throw new Error('Payment UTXO provided but payment public key is null')
  }

  if (ownerSignatureCallback === null || ownerSignatureCallback === undefined) {
    isUnsigned = true
  }

  if (!isSplitScriptSplitable(stasUtxo)) {
    throw new Error('Cannot Split an NFT')
  }

  validateSplitDestinations(splitDestinations)

  const isZeroFee = (paymentUtxo === null)

  const tx = new bsv.Transaction()

  tx.from(stasUtxo)
  if (!isZeroFee) {
    tx.from(paymentUtxo)
  }

  // The first output is the change
  const version = getVersion(stasUtxo.scriptPubKey)
  const totalOutSats = splitDestinations.reduce((a, b) => a + b.satoshis, 0)

  const redeemSats = stasUtxo.satoshis - totalOutSats

  if (redeemSats <= 0) {
    throw new Error('Not enough input Satoshis to cover output. Trying to redeem ' + redeemSats + ' sats')
  }

  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(contractPublicKey.toBuffer()).toString('hex')

  const redeemScript = bsv.Script.fromASM(`OP_DUP OP_HASH160 ${publicKeyHash} OP_EQUALVERIFY OP_CHECKSIG`)

  tx.addOutput(new bsv.Transaction.Output({
    script: redeemScript,
    satoshis: redeemSats
  }))

  const segments = []
  segments.push({
    satoshis: redeemSats,
    publicKey: bsv.crypto.Hash.sha256ripemd160(contractPublicKey.toBuffer()).toString('hex')
  })

  splitDestinations.forEach(sd => {
    const destinationPublicKeyHash = addressToPubkeyhash(sd.address)
    // The other outputs are the STAS tokens remaining
    const pkh = addressToPubkeyhash(sd.address)
    const sats = sd.satoshis
    const stasScript = updateStasScript(destinationPublicKeyHash, stasUtxo.scriptPubKey)

    const issuerPublicKeyHash = getPublicKeyHash(stasScript)
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
  // Sign the inputs...
  for (let i = 0; i < tx.inputs.length; i++) {
    const input = tx.inputs[i]
    if (i === 0) {
      // STAS input
      partialSTASUnlockingScript(
        tx,
        segments,
        version,
        isZeroFee
      )
      if (!isUnsigned) {
        const signature = await ownerSignatureCallback(tx, i, input.output._script, input.output._satoshisBN)
        const endSscript = signature + ' ' + tokenOwnerPublicKey.toString('hex')
        const partialScript = input.script.toASM()
        input.setScript(bsv.Script.fromASM(partialScript + ' ' + endSscript))
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
    } else if (!isZeroFee) {
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
  if (isUnsigned) {
    return {
      hex: tx.toString(),
      json: JSON.stringify(tx),
      signingInfo: signInfoList
    }
  }
  return tx.serialize(true)
}

module.exports = redeemSplitWithCallback
