const bsv = require('bsv')
const { sighash } = require('./stas')
const issueWithCallback = require('./issueWithCallback')

/* The issue function issues one or more token outputs by spending the outputs from the contract
   privateKey is the key that can spend the contract
   issueInfo contains the addresses to issue to, the amount in satoshis and optional arbitrary extra data that will accompany the token throughout its life.
   contractUtxo is the contract output,
   paymentUtxo pays the fees for the issue transaction
   isSplittable is a flag which sets whether the token can be split into further parts.
   version is the version of the STAS script, currently only version 2 is available.
*/
async function issue (privateKey, issueInfo, contractUtxo, paymentUtxo, paymentPrivateKey, isSplittable, symbol) {
  if (privateKey === null) {
    throw new Error('Issuer private key is null')
  }
  if (paymentUtxo !== null && paymentPrivateKey === null) {
    throw new Error('Payment UTXO provided but payment private key is null')
  }

  const ownerSignatureCallback = async (tx, i, script, satoshis) => {
    // await is to test async
    // await new Promise(resolve => setTimeout(resolve, 10))
    return bsv.Transaction.sighash.sign(tx, privateKey, sighash, i, script, satoshis).toTxFormat().toString('hex')
  }
  const paymentSignatureCallback = async (tx, i, script, satoshis) => {
    // await is to test async
    // await new Promise(resolve => setTimeout(resolve, 10))
    return bsv.Transaction.sighash.sign(tx, paymentPrivateKey, sighash, i, script, satoshis).toTxFormat().toString('hex')
  }
  return issueWithCallback(privateKey.publicKey, issueInfo,
    contractUtxo, paymentUtxo, (paymentPrivateKey ? paymentPrivateKey.publicKey : null),
    isSplittable, symbol, ownerSignatureCallback, paymentSignatureCallback)
}

module.exports = issue
