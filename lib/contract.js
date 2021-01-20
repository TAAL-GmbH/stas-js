const bsv = require('bsv')
const {
  DEFAULT_FEES,
  P2PKH_UNLOCKING_SCRIPT_BYTES
} = require('./stas')

function contract (privateKey, paymentUtxos, schema, tokenSatoshis) {
  const tx = new bsv.Transaction()

  let satoshis = 0

  paymentUtxos.forEach(utxo => {
    tx.from(utxo)
    satoshis += (utxo.amount * 1e8)
  })

  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(privateKey.publicKey.toBuffer()).toString('hex')

  const contractScript = bsv.Script.fromASM(`OP_DUP OP_HASH160 ${publicKeyHash} OP_EQUALVERIFY OP_CHECKSIG`)

  contractScript.add(bsv.Script.buildDataOut(JSON.stringify(schema)))

  tx.addOutput(new bsv.Transaction.Output({
    script: contractScript,
    satoshis: tokenSatoshis
  }))

  const changeScript = bsv.Script.fromASM(`OP_DUP OP_HASH160 ${publicKeyHash} OP_EQUALVERIFY OP_CHECKSIG`)

  // Calculate the change amount
  const txSize = (tx.serialize(true).length / 2) + 1 + 8 + changeScript.toBuffer().length + (tx.inputs.length * P2PKH_UNLOCKING_SCRIPT_BYTES)
  const dataFee = Math.ceil(txSize * DEFAULT_FEES[0].miningFee.satoshis / DEFAULT_FEES[0].miningFee.bytes)

  tx.addOutput(new bsv.Transaction.Output({
    script: changeScript,
    satoshis: satoshis - (dataFee + tokenSatoshis)
  }))

  tx.sign(privateKey)

  return tx.serialize(true)
}

module.exports = contract
