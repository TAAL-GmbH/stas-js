const bsv = require('bsv')
const {
  DEFAULT_FEES,
  P2PKH_UNLOCKING_SCRIPT_BYTES
} = require('./stas')

// change will go back to the payment address
function contract (privateKey, contractUtxos, paymentUtxos, paymentPrivateKey, schema, tokenSatoshis) {
  const tx = new bsv.Transaction()
  const isZeroFee = (paymentUtxos === null)

  let satoshis = 0

  contractUtxos.forEach(utxo => {
    tx.from(utxo)
    satoshis += Math.round(utxo.amount * 1e8)
  })

  if (!isZeroFee) {
    paymentUtxos.forEach(utxo => {
      tx.from(utxo)
      satoshis += Math.round(utxo.amount * 1e8)
    })
  }

  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(privateKey.publicKey.toBuffer()).toString('hex')

  const contractScript = bsv.Script.fromASM(`OP_DUP OP_HASH160 ${publicKeyHash} OP_EQUALVERIFY OP_CHECKSIG`)

  contractScript.add(bsv.Script.buildDataOut(JSON.stringify(schema)))

  tx.addOutput(new bsv.Transaction.Output({
    script: contractScript,
    satoshis: tokenSatoshis
  }))

  if (!isZeroFee) {
    const paymentPubKeyHash = bsv.crypto.Hash.sha256ripemd160(paymentPrivateKey.publicKey.toBuffer()).toString('hex')
    const changeScript = bsv.Script.fromASM(`OP_DUP OP_HASH160 ${paymentPubKeyHash} OP_EQUALVERIFY OP_CHECKSIG`)

    // Calculate the change amount
    const txSize = (tx.serialize(true).length / 2) + 1 + 8 + changeScript.toBuffer().length + (tx.inputs.length * P2PKH_UNLOCKING_SCRIPT_BYTES)
    const dataFee = Math.ceil(txSize * DEFAULT_FEES[0].miningFee.satoshis / DEFAULT_FEES[0].miningFee.bytes)

    tx.addOutput(new bsv.Transaction.Output({
      script: changeScript,
      satoshis: Math.floor(satoshis - (dataFee + tokenSatoshis))
    }))
    tx.sign(paymentPrivateKey)
  }
  tx.sign(privateKey)

  return tx.serialize(true)
}

module.exports = contract
