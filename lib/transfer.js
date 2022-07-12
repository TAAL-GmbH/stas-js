const bsv = require('bsv')
const transferWithCallback = require('./transferWithCallback')

const { sighash } = require('./stas')

/* transfer will take an existing STAS UTXO and assign it to another address.
 The tokenOwnerPrivateKey must own the existing STAS UTXO (stasUtxo),
 the paymentPrivateKey owns the paymentUtxo and will be the owner of any change from the fee.
*/
async function transfer (tokenOwnerPrivateKey, stasUtxo, destinationAddress, paymentUtxo, paymentPrivateKey) {
  if (tokenOwnerPrivateKey === null) {
    throw new Error('Token owner private key is null')
  }
  const ownerSignatureCallback = async (tx, i, script, satoshis) => {
    return bsv.Transaction.sighash.sign(tx, tokenOwnerPrivateKey, sighash, i, script, satoshis).toTxFormat().toString('hex')
  }
  const paymentSignatureCallback = async (tx, i, script, satoshis) => {
    return bsv.Transaction.sighash.sign(tx, paymentPrivateKey, sighash, i, script, satoshis).toTxFormat().toString('hex')
  }

  return transferWithCallback(tokenOwnerPrivateKey.publicKey, stasUtxo, destinationAddress, paymentUtxo, paymentPrivateKey ? paymentPrivateKey.publicKey : null, ownerSignatureCallback, paymentSignatureCallback)
}

module.exports = transfer
