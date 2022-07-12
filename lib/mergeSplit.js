const bsv = require('bsv')
require('dotenv').config()
const mergeSplitWithCallback = require('./mergeSplitWithCallback')

const { sighash } = require('./stas')

// mergeSplit will take 2 existing STAS UTXOs and combine them and split them as 2 UTXOs.
// The tokenOwnerPrivateKey must own the existing STAS UTXOs, the payment UTXOs and will be the owner of the change, if any.
async function mergeSplit (tokenOwnerPrivateKey, mergeUtxos, destination1Addr, amountSatoshis1, destination2Addr, amountSatoshis2, paymentUtxo, paymentPrivateKey) {
  if (tokenOwnerPrivateKey === null) {
    throw new Error('Token owner private key is null')
  }
  if (destination1Addr === null || destination2Addr === null) {
    throw new Error('Destination address is null')
  }
  if (amountSatoshis1 === null || amountSatoshis2 === null) {
    throw new Error('Satoshi value suppled is null')
  }
  const ownerSignatureCallback = async (tx, i, script, satoshis) => {
    return bsv.Transaction.sighash.sign(tx, tokenOwnerPrivateKey, sighash, i, script, satoshis).toTxFormat().toString('hex')
  }
  const paymentSignatureCallback = async (tx, i, script, satoshis) => {
    return bsv.Transaction.sighash.sign(tx, paymentPrivateKey, sighash, i, script, satoshis).toTxFormat().toString('hex')
  }

  return mergeSplitWithCallback(tokenOwnerPrivateKey.publicKey, mergeUtxos, destination1Addr, amountSatoshis1, destination2Addr, amountSatoshis2, paymentUtxo, paymentPrivateKey ? paymentPrivateKey.publicKey : null, ownerSignatureCallback, paymentSignatureCallback)
}

module.exports = mergeSplit
