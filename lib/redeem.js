const bsv = require('bsv')
const redeemWithCallback = require('./redeemWithCallback')

const { sighash } = require('./stas')

/*
 Redeem converts the STAS tokens back to BSV satoshis and sends them to the redeem address that was
 specified when the token was created.
 The tokenOwnerPrivateKey must own the existing STAS UTXO (stasUtxo),
 contractPublicKey is the redeem address
 paymentPrivateKey owns the paymentUtxo and will be the owner of any change from the fee.
*/
async function redeem (tokenOwnerPrivateKey, contractPublicKey, stasUtxo, paymentUtxo, paymentPrivateKey) {
  if (tokenOwnerPrivateKey === null) {
    throw new Error('Token owner private key is null')
  }
  const ownerSignatureCallback = async (tx, i, script, satoshis) => {
    return bsv.Transaction.sighash.sign(tx, tokenOwnerPrivateKey, sighash, i, script, satoshis).toTxFormat().toString('hex')
  }
  const paymentSignatureCallback = async (tx, i, script, satoshis) => {
    return bsv.Transaction.sighash.sign(tx, paymentPrivateKey, sighash, i, script, satoshis).toTxFormat().toString('hex')
  }

  return redeemWithCallback(tokenOwnerPrivateKey.publicKey, contractPublicKey, stasUtxo, paymentUtxo, paymentPrivateKey ? paymentPrivateKey.publicKey : null, ownerSignatureCallback, paymentSignatureCallback)
}

module.exports = redeem
