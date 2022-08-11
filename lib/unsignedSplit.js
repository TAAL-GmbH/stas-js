const splitWithCallback = require('./splitWithCallback')

// returns the unsigned transaction and signInfo[] {inputIndex, publicKey, sighash}
async function unsignedSplit (tokenOwnerPublicKey, stasUtxo, splitDestinations, paymentUtxo, paymentPublicKey) {
  return splitWithCallback(tokenOwnerPublicKey, stasUtxo, splitDestinations, paymentUtxo, paymentPublicKey)
}

module.exports = unsignedSplit
