const bsv = require('bsv')
require('dotenv').config()
const mergeWithCallbackWithoutValidation = require('./mergeWithCallbackWithoutValidation')

const { sighash } = require('../../lib/stas')

// merge will take 2 existing STAS UTXOs and combine them and assign the single UTXO to another address.
// The tokenOwnerPrivateKey must own the existing STAS UTXOs, the payment UTXOs and will be the owner of the change, if any.
function mergeWithOutValidation (tokenOwnerPrivateKey, mergeUtxos, destinationAddr, paymentUtxo, paymentPrivateKey) {
  if (tokenOwnerPrivateKey === null) {
    throw new Error('Token owner private key is null')
  }
  const ownerSignatureCallback = (tx, i, script, satoshis) => {
    return bsv.Transaction.sighash.sign(tx, tokenOwnerPrivateKey, sighash, i, script, satoshis)
  }
  const paymentSignatureCallback = (tx, i, script, satoshis) => {
    return bsv.Transaction.sighash.sign(tx, paymentPrivateKey, sighash, i, script, satoshis)
  }

  return mergeWithCallbackWithoutValidation(tokenOwnerPrivateKey.publicKey, mergeUtxos, destinationAddr, paymentUtxo, paymentPrivateKey ? paymentPrivateKey.publicKey : null, ownerSignatureCallback, paymentSignatureCallback)
}

module.exports = { mergeWithOutValidation }
