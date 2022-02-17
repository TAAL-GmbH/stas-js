require('dotenv').config()
const contractWithCallback = require('./contractWithCallback')
/* create a contract transaction containing a JSON schema detailing the token
privateKey is the key that will sign the contract and will become the redeem address.
inputUtxos are the UTXOs which the contract will spend
paymentUtxos and paymentPrivateKey provide the fees for the transation
schema is the JSON schema describing the contract
tokenSatoshis are the amount of satoshis you will be issuing
*/
function contract (privateKey, inputUtxos, paymentUtxos, paymentPrivateKey, schema, tokenSatoshis) {
  if (privateKey === null) {
    throw new Error('Issuer private key is null')
  }
  const ownerSignCallback = (tx) => {
    tx.sign(privateKey)
  }
  let paymentSignCallback

  if (paymentPrivateKey) {
    paymentSignCallback = (tx) => {
      tx.sign(paymentPrivateKey)
    }
  }
  return contractWithCallback(privateKey.publicKey, inputUtxos, paymentUtxos, paymentPrivateKey ? paymentPrivateKey.publicKey : null, schema, tokenSatoshis, ownerSignCallback, paymentSignCallback)
}

module.exports = contract
