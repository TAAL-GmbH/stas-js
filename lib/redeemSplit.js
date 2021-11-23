const bsv = require('bsv')
const {
  updateStasScript,
  sighash,
  handleChange,
  getVersion,
  completeSTASUnlockingScript
} = require('./stas')

const { addressToPubkeyhash, SATS_PER_BITCOIN } = require('./utils')

/*
 RedeemSplit splits the STAS input and sends tokens to the recipients specified in the
 splitDestinations parameter, the rest of the STAS tokens are converted back to BSV
 satoshis and sent to the redeem address that was specified when the token was created.

 The tokenOwnerPrivateKey must own the existing STAS UTXO (stasUtxo),
 splitDestinations is an array contains the address and amount of the recipients of the tokens, the rest or the input will
 be redeemed
 contractPublicKey is the redeem address
 paymentsPrivateKey owns the paymentUtxo and will be the owner of any change from the fee.
*/
function redeemSplit (tokenOwnerPrivateKey, contractPublicKey, stasUtxo, splitDestinations, paymentUtxo, paymentsPrivateKey) {
  if (contractPublicKey === null) {
    throw new Error('contract public key is null')
  }
  if (tokenOwnerPrivateKey === null) {
    throw new Error('issuer private key is null')
  }
  if (splitDestinations === null) {
    throw new Error('split destinations is null')
  }
  if (paymentsPrivateKey === null) {
    throw new Error('payment private key is null')
  }

  const isZeroFee = (paymentUtxo === null)

  const tx = new bsv.Transaction()

  tx.from(stasUtxo)
  if (!isZeroFee) {
    tx.from(paymentUtxo)
  }

  // The first output is the change
  const version = getVersion(stasUtxo.scriptPubKey)
  const totalOutSats = splitDestinations.reduce((a, b) => a + Math.round(b.amount * SATS_PER_BITCOIN), 0)
  const totalInSats = stasUtxo.amount
  const redeemSats = Math.round(stasUtxo.amount * SATS_PER_BITCOIN) - totalOutSats
  if (totalOutSats >= totalInSats) {
    throw new Error('Output satoshis cannot be greater or equal than total input satoshis')
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
    const sats = Math.round(sd.amount * SATS_PER_BITCOIN)
    const stasScript = updateStasScript(destinationPublicKeyHash, stasUtxo.scriptPubKey)

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
  // Sign the inputs...
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
    } else if (!isZeroFee) {
      const signature = bsv.Transaction.sighash.sign(tx, paymentsPrivateKey, sighash, i, input.output._script, input.output._satoshisBN)
      const unlockingScript = bsv.Script.fromASM(signature.toTxFormat().toString('hex') + ' ' + paymentsPrivateKey.publicKey.toString('hex'))
      input.setScript(unlockingScript)
    }
  })

  return tx.serialize(true)
}

module.exports = redeemSplit
