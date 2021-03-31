const bsv = require('bsv')
const {
  DEFAULT_FEES,
  P2PKH_UNLOCKING_SCRIPT_BYTES,
  getStasScript,
  sighash
} = require('./stas')
const { addressToPubkeyhash } = require('./utils')

function issue (privateKey, destinationAddresses, contractUtxo, paymentUtxos, version) {
  const tx = new bsv.Transaction()

  tx.from(contractUtxo)

  // Input satoshis
  let satoshis = 0

  paymentUtxos.forEach(utxo => {
    tx.from(utxo)
    satoshis += (utxo.amount * 1e8)
  })

  const stasOutCount = destinationAddresses.length
  const satsPerOut = (contractUtxo.amount * 1e8) / stasOutCount

  destinationAddresses.forEach(addr => {
    const pubKeyHash = addressToPubkeyhash(addr)
    // Add the issuing output
    const stasScript = getStasScript(pubKeyHash, privateKey.publicKey, version)

    tx.addOutput(new bsv.Transaction.Output({
      script: stasScript,
      satoshis: Math.floor(satsPerOut)
    }))
  })

  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(privateKey.publicKey.toBuffer()).toString('hex')

  const changeScript = bsv.Script.fromASM(`OP_DUP OP_HASH160 ${publicKeyHash} OP_EQUALVERIFY OP_CHECKSIG`)

  // Calculate the change amount
  const txSize = (tx.serialize(true).length / 2) + 1 + 8 + changeScript.toBuffer().length + (tx.inputs.length * P2PKH_UNLOCKING_SCRIPT_BYTES)
  const fee = Math.ceil(txSize * DEFAULT_FEES[0].miningFee.satoshis / DEFAULT_FEES[0].miningFee.bytes)

  tx.addOutput(new bsv.Transaction.Output({
    script: changeScript,
    satoshis: Math.floor(satoshis - fee)
  }))

  // bsv.js does not like signing non-standard inputs.  Therefore, we do this ourselves.
  tx.inputs.forEach((input, i) => {
    const signature = bsv.Transaction.sighash.sign(tx, privateKey, sighash, i, input.output._script, input.output._satoshisBN)
    const unlockingScript = bsv.Script.fromASM(signature.toTxFormat().toString('hex') + ' ' + privateKey.publicKey.toString('hex'))
    input.setScript(unlockingScript)
  })

  return tx.serialize(true)
}

module.exports = issue
