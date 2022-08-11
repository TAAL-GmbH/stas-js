const mergeWithCallback = require('./mergeWithCallback')

// returns the unsigned transaction and signInfo[] {inputIndex, publicKey, sighash}
async function unsignedMerge (tokenOwnerPublicKey, stasUtxos, destinationAddr, paymentUtxo, paymentPublicKey) {
  return mergeWithCallback(tokenOwnerPublicKey, stasUtxos, destinationAddr, paymentUtxo, paymentPublicKey)
}

module.exports = unsignedMerge
