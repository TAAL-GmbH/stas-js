const transferWithCallback = require('./transferWithCallback')

// returns the unsigned transaction and signInfo[] {inputIndex, publicKey, sighash}
async function unsignedTransfer (tokenOwnerPublicKey, stasUtxo, destinationAddress, paymentUtxo, paymentPublicKey) {
  return transferWithCallback(tokenOwnerPublicKey, stasUtxo, destinationAddress, paymentUtxo, paymentPublicKey)
}

module.exports = unsignedTransfer
