const issueWithCallback = require('./issueWithCallback')

// returns the unsigned transaction and signInfo[] {inputIndex, publicKey, sighash}
async function unsignedIssue (publicKey, issueInfo, contractUtxo, paymentUtxo, paymentPublicKey, isSplittable, symbol) {
  // const ownerSignatureCallback = async (tx, i, script, satoshis) => {
  //   return bsv.Transaction.sighash.sign(tx, privateKey, sighash, i, script, satoshis).toTxFormat().toString('hex')
  // }
  // const paymentSignatureCallback = async (tx, i, script, satoshis) => {
  //   return bsv.Transaction.sighash.sign(tx, paymentPrivateKey, sighash, i, script, satoshis).toTxFormat().toString('hex')
  // }
  return issueWithCallback(publicKey, issueInfo, contractUtxo, paymentUtxo, paymentPublicKey, isSplittable, symbol)
}

module.exports = unsignedIssue
