const bsv = require('bsv')
const {
  getStasScript,
  sighash,
  handleChange,
  getVersion,
  completeSTASUnlockingScript
} = require('./stas')

const { addressToPubkeyhash } = require('./utils')

function redeemSplit (tokenOwnerPrivateKey, contractPublicKey, stasUtxo, destinationAddress, amount, paymentUtxos, paymentsPrivateKey) {
  const destinationPublicKeyHash = addressToPubkeyhash(destinationAddress)

  const tx = new bsv.Transaction()

  tx.from(stasUtxo)

  paymentUtxos.forEach(utxo => {
    tx.from(utxo)
  })

  // The first output is the change
  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(contractPublicKey.toBuffer()).toString('hex')

  const redeemScript = bsv.Script.fromASM(`OP_DUP OP_HASH160 ${publicKeyHash} OP_EQUALVERIFY OP_CHECKSIG`)
  tx.addOutput(new bsv.Transaction.Output({
    script: redeemScript,
    satoshis: (stasUtxo.amount - amount) * 1e8
  }))

  // The second output is the STAS tokens remaining
  const stasScript = getStasScript(destinationPublicKeyHash, contractPublicKey, getVersion(stasUtxo.scriptPubKey))

  tx.addOutput(new bsv.Transaction.Output({
    script: stasScript,
    satoshis: amount * 1e8
  }))

  handleChange(tx, paymentsPrivateKey.publicKey)

  // Sign the inputs...
  tx.inputs.forEach((input, i) => {
    if (i === 0) {
      // STAS input
      const signature = bsv.Transaction.sighash.sign(tx, tokenOwnerPrivateKey, sighash, i, input.output._script, input.output._satoshisBN)

      completeSTASUnlockingScript(
        tx,
        [
          {
            satoshis: (stasUtxo.amount - amount) * 1e8,
            publicKey: bsv.crypto.Hash.sha256ripemd160(contractPublicKey.toBuffer()).toString('hex')
          },
          {
            satoshis: amount * 1e8,
            publicKey: destinationPublicKeyHash
          },
          {
            satoshis: tx.outputs[2].satoshis,
            publicKey: bsv.crypto.Hash.sha256ripemd160(paymentsPrivateKey.publicKey.toBuffer()).toString('hex')
          }
        ],
        signature.toTxFormat().toString('hex'),
        tokenOwnerPrivateKey.publicKey.toString('hex'),
        getVersion(stasUtxo.scriptPubKey)
      )
    } else {
      const signature = bsv.Transaction.sighash.sign(tx, paymentsPrivateKey, sighash, i, input.output._script, input.output._satoshisBN)
      const unlockingScript = bsv.Script.fromASM(signature.toTxFormat().toString('hex') + ' ' + paymentsPrivateKey.publicKey.toString('hex'))
      input.setScript(unlockingScript)
    }
  })

  return tx.serialize(true)
}

module.exports = redeemSplit
