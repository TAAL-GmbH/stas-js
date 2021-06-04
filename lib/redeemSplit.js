const bsv = require('bsv')
const {
  getStasScript,
  getScriptData,
  isSplittable,
  sighash,
  handleChange,
  getVersion,
  completeSTASUnlockingScript
} = require('./stas')

const { addressToPubkeyhash } = require('./utils')

function redeemSplit (tokenOwnerPrivateKey, contractPublicKey, stasUtxo, splitDestinations, paymentUtxos, paymentsPrivateKey) {
  const isZeroFee = (paymentUtxos === null)

  const tx = new bsv.Transaction()

  tx.from(stasUtxo)
  if (!isZeroFee) {
    paymentUtxos.forEach(utxo => {
      tx.from(utxo)
    })
  }

  // The first output is the change
  const version = getVersion(stasUtxo.scriptPubKey)
  const totalOutSats = splitDestinations.reduce((a, b) => a + Math.round(b.amount * 1e8), 0)

  const redeemSats = Math.round(stasUtxo.amount * 1e8) - totalOutSats

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
    const sats = Math.round(sd.amount * 1e8)
    const stasScript = getStasScript(destinationPublicKeyHash, contractPublicKey, version, getScriptData(stasUtxo.scriptPubKey, version), isSplittable(stasUtxo.scriptPubKey))

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
