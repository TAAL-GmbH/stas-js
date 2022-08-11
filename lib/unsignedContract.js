const contractWithCallback = require('./contractWithCallback')

// returns the unsigned contract and signInfo[] {inputIndex, publicKey, sighash}
async function unsignedContract (publicKey, inputUtxos, paymentUtxos, paymentPublicKey, schema, tokenSatoshis) {
  const r = await contractWithCallback(publicKey, inputUtxos, paymentUtxos, paymentPublicKey, schema, tokenSatoshis)
  return r
}

module.exports = unsignedContract
