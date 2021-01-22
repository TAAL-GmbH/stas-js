const bsv = require('bsv')
const {
  DEFAULT_FEES,
  P2PKH_UNLOCKING_SCRIPT_BYTES,
  getStasScript,
  sighash
} = require('./stas')

function issue (privateKey, contractUtxo, paymentUtxos, version) {
  const tx = new bsv.Transaction()

  tx.from(contractUtxo)

  let satoshis = 0

  paymentUtxos.forEach(utxo => {
    tx.from(utxo)
    satoshis += (utxo.amount * 1e8)
  })

  // Add the issuing output
  const stasScript = getStasScript(privateKey.publicKey, privateKey.publicKey, version)

  tx.addOutput(new bsv.Transaction.Output({
    script: stasScript,
    satoshis: (contractUtxo.amount * 1e8)
  }))

  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(privateKey.publicKey.toBuffer()).toString('hex')

  const changeScript = bsv.Script.fromASM(`OP_DUP OP_HASH160 ${publicKeyHash} OP_EQUALVERIFY OP_CHECKSIG`)

  // Calculate the change amount
  const txSize = (tx.serialize(true).length / 2) + 1 + 8 + changeScript.toBuffer().length + (tx.inputs.length * P2PKH_UNLOCKING_SCRIPT_BYTES)
  const fee = Math.ceil(txSize * DEFAULT_FEES[0].miningFee.satoshis / DEFAULT_FEES[0].miningFee.bytes)

  tx.addOutput(new bsv.Transaction.Output({
    script: changeScript,
    satoshis: satoshis - fee
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
