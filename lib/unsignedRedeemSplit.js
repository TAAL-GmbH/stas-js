const redeemSplitWithCallback = require('./redeemSplitWithCallback')

// returns the unsigned transaction and signInfo[] {inputIndex, publicKey, sighash}
async function unsigneRedeemSplit (tokenOwnerPublicKey, contractPublicKey, stasUtxo, splitDestinations, paymentUtxo, paymentPublicKey) {
  return redeemSplitWithCallback(tokenOwnerPublicKey, contractPublicKey, stasUtxo, splitDestinations, paymentUtxo, paymentPublicKey)
}

module.exports = unsigneRedeemSplit
