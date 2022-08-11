const mergeSplitWithCallback = require('./mergeSplitWithCallback')

// returns the unsigned transaction and signInfo[] {inputIndex, publicKey, sighash}
async function unsignedMergeSplit (tokenOwnerPublicKey, mergeUtxos, destination1Addr, amountSatoshis1, destination2Addr, amountSatoshis2, paymentUtxo, paymentPublicKey) {
  return mergeSplitWithCallback(tokenOwnerPublicKey, mergeUtxos, destination1Addr, amountSatoshis1, destination2Addr, amountSatoshis2, paymentUtxo, paymentPublicKey)
}

module.exports = unsignedMergeSplit
