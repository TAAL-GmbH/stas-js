const bsv = require('bsv')
const {
  handleChange,
  getVersion,
  partialSTASUnlockingScript,
  sighash
} = require('./stas')

const { bitcoinToSatoshis } = require('./utils')

/*
 Redeem converts the STAS tokens back to BSV satoshis and sends them to the redeem address that was
 specified when the token was created.
 The tokenOwnerPrivateKey must own the existing STAS UTXO (stasUtxo),
 contractPublicKey is the redeem address
 paymentPrivateKey owns the paymentUtxo and will be the owner of any change from the fee.
*/
async function redeemWithCallback(tokenOwnerPublicKey, contractPublicKey, stasUtxo, paymentUtxo, paymentPublicKey, ownerSignatureCallback, paymentSignatureCallback) {
  let isUnsigned = false
  const signInfoList = [] // for unsigned tx

  if (tokenOwnerPublicKey === null) {
    throw new Error('Token owner public key is null')
  }

  if (contractPublicKey === null) {
    throw new Error('contract public key is null')
  }

  if (stasUtxo === null) {
    throw new Error('stasUtxo is null')
  }

  if (paymentUtxo !== null && paymentPublicKey === null) {
    throw new Error('Payment UTXO provided but payment key is null')
  }
  if (paymentUtxo === null && paymentPublicKey !== null) {
    throw new Error('Payment key provided but payment UTXO is null')
  }

  if (ownerSignatureCallback === null || ownerSignatureCallback === undefined) {
    isUnsigned = true
  }

  const isZeroFee = (paymentUtxo === null)

  const tx = new bsv.Transaction()

  tx.from(stasUtxo)

  if (!isZeroFee) {
    tx.from(paymentUtxo)
  }

  // Now pay the satoshis that are tied up in the STAS token to the redeemPublicKey...
  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(contractPublicKey.toBuffer()).toString('hex')

  const redeemScript = bsv.Script.fromASM(`OP_DUP OP_HASH160 ${publicKeyHash} OP_EQUALVERIFY OP_CHECKSIG`)
  tx.addOutput(new bsv.Transaction.Output({
    script: redeemScript,
    satoshis: stasUtxo.satoshis
  }))

  if (!isZeroFee) {
    handleChange(tx, paymentPublicKey)
  }

  // Sign the inputs...
  for (let i = 0; i < tx.inputs.length; i++) {
    const input = tx.inputs[i]
    if (i === 0) {
      // STAS input
      const segments = []
      segments.push(
        {
          satoshis: stasUtxo.satoshis,
          publicKey: bsv.crypto.Hash.sha256ripemd160(contractPublicKey.toBuffer()).toString('hex')
        })
      segments.push(null)

      if (tx.outputs.length > 1 && !isZeroFee) {
        segments.push({
          satoshis: tx.outputs[1].satoshis,
          publicKey: bsv.crypto.Hash.sha256ripemd160(paymentPublicKey.toBuffer()).toString('hex')
        })
      }

      partialSTASUnlockingScript(
        tx,
        segments,
        getVersion(stasUtxo.scriptPubKey),
        isZeroFee
      )

      if (!isUnsigned) {
        const signature = await ownerSignatureCallback(tx, i, input.output._script, input.output._satoshisBN)
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

module.exports = redeemWithCallback
