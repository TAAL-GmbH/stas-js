const redeemWithCallback = require('./redeemWithCallback')

// returns the unsigned transaction and signInfo[] {inputIndex, publicKey, sighash}
async function unsigneRedeem (tokenOwnerPublicKey, contractPublicKey, stasUtxo, paymentUtxo, paymentPublicKey) {
  return redeemWithCallback(tokenOwnerPublicKey, contractPublicKey, stasUtxo, paymentUtxo, paymentPublicKey)
}

module.exports = unsigneRedeem
