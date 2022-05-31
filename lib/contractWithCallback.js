const bsv = require('bsv')
require('dotenv').config()
const {
  P2PKH_UNLOCKING_SCRIPT_BYTES,
  validateSymbol
} = require('./stas')
const { SATS_PER_BITCOIN, bitcoinToSatoshis } = require('./utils')

const feeSettings = require('./constants')

/* create a contract transaction containing a JSON schema detailing the token and sign using the callbacks
publicKey is the publick key of the owner
inputUtxos are the UTXOs which the contract will spend
ownerSignCallback is the function that will sign the contract and will become the redeem address.
paymentUtxos and paymentSignCallback provide the fees for the transation
schema is the JSON schema describing the contract
tokenSatoshis are the amount of satoshis you will be issuing
*/
function contractWithCallback (publicKey, inputUtxos, paymentUtxos, paymentPublicKey, schema, tokenSatoshis, ownerSignCallback, paymentSignCallback) {
  if (inputUtxos === null || !Array.isArray(inputUtxos) || inputUtxos.length === 0) {
    throw new Error('inputUtxos is invalid')
  }
  if (tokenSatoshis === 0) {
    throw new Error('Token satoshis is zero')
  }
  if (publicKey === null) {
    throw new Error('Issuer public key is null')
  }
  if (ownerSignCallback === null) {
    throw new Error('ownerSignCallback is null')
  }
  if (paymentUtxos !== null && paymentUtxos.length > 0 && (paymentPublicKey === null || paymentSignCallback === null)) {
    throw new Error('Payment UTXOs provided but payment public key or paymentSignCallback is null')
  }

  if (schema === null) {
    throw new Error('Schema is null')
  }

  if ((typeof schema.symbol === 'undefined') || !validateSymbol(schema.symbol)) {
    throw new Error("Invalid Symbol. Must be between 1 and 128 long and contain alpahnumeric, '-', '_' chars.")
  }

  if ((typeof schema.satsPerToken === 'undefined') || schema.satsPerToken === 0) {
    throw new Error('Invalid satsPerToken. Must be over 0.')
  }

  if (schema.satsPerToken > tokenSatoshis) {
    throw new Error(`Token amount ${tokenSatoshis} is less than satsPerToken ${schema.satsPerToken}`)
  }

  if (tokenSatoshis % schema.satsPerToken !== 0) {
    throw new Error(`Token amount ${tokenSatoshis} must be divisible by satsPerToken ${schema.satsPerToken}`)
  }

  const tx = new bsv.Transaction()
  const isZeroFee = (paymentUtxos === null || (Array.isArray(paymentUtxos) && !paymentUtxos.length))

  let satoshis = 0

  inputUtxos.forEach(utxo => {
    satoshis += bitcoinToSatoshis(utxo.amount)
    tx.from(utxo)
  })

  if (!isZeroFee) {
    paymentUtxos.forEach(utxo => {
      satoshis += bitcoinToSatoshis(utxo.amount)
      tx.from(utxo)
    })
  }

  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer()).toString('hex')

  const contractScript = bsv.Script.fromASM(`OP_DUP OP_HASH160 ${publicKeyHash} OP_EQUALVERIFY OP_CHECKSIG`)

  contractScript.add(bsv.Script.buildDataOut(JSON.stringify(schema)))

  tx.addOutput(new bsv.Transaction.Output({
    script: contractScript,
    satoshis: tokenSatoshis
  }))

  if (!isZeroFee) {
    const paymentPubKeyHash = bsv.crypto.Hash.sha256ripemd160(paymentPublicKey.toBuffer()).toString('hex')
    const changeScript = bsv.Script.fromASM(`OP_DUP OP_HASH160 ${paymentPubKeyHash} OP_EQUALVERIFY OP_CHECKSIG`)

    // Calculate the change amount
    const txSize = (tx.serialize(true).length / 2) + 1 + 8 + changeScript.toBuffer().length + (tx.inputs.length * P2PKH_UNLOCKING_SCRIPT_BYTES)
    const dataFee = Math.ceil(txSize * feeSettings.Sats / feeSettings.PerByte)

    tx.addOutput(new bsv.Transaction.Output({
      script: changeScript,
      satoshis: Math.floor(satoshis - (dataFee + tokenSatoshis))
    }))
    paymentSignCallback(tx)
  }
  ownerSignCallback(tx)

  return tx.serialize(true)
}

module.exports = contractWithCallback
