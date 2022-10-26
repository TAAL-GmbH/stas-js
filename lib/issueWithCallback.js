const bsv = require('bsv')
require('dotenv').config()
const {
  P2PKH_UNLOCKING_SCRIPT_BYTES,
  getStasScript,
  validateSymbol,
  sighash
} = require('./stas')
const { addressToPubkeyhash } = require('./utils')

const feeSettings = require('./constants')

// the minimum length of a bitcoin address
const ADDRESS_MIN_LENGTH = 26
// the maximum length of a bitcoin address
const ADDRESS_MAX_LENGTH = 35

/* The issueWithCallback function issues one or more token outputs by spending the outputs from the contract
   privateKey is the key that can spend the contract
   issueInfo contains the addresses to issue to, the amount in satoshis and optional arbitrary extra data that will accompany the token throughout its life.
   contractUtxo is the contract output,
   paymentUtxo pays the fees for the issue transaction
   isSplittable is a flag which sets whether the token can be split into further parts.
   version is the version of the STAS script, currently only version 2 is available.
*/
async function issueWithCallback(publicKey, issueInfo, contractUtxo, paymentUtxo, paymentPublicKey, isSplittable, symbol, ownerSignatureCallback, paymentSignatureCallback) {
  let isUnsigned = false
  const signInfoList = [] // for unsigned tx

  if (publicKey === null) {
    throw new Error('Issuer public key is null')
  }
  if (ownerSignatureCallback === null || ownerSignatureCallback === undefined) {
    isUnsigned = true
  }
  if (!isIssueInfoValid(issueInfo)) {
    throw new Error('issueInfo is invalid')
  }
  if (!isUtxoValid(contractUtxo)) {
    throw new Error('contractUtxo is invalid')
  }
  if (paymentUtxo !== null && (paymentPublicKey === null || paymentSignatureCallback === null)) {
    throw new Error('Payment UTXO provided but payment publc key or paymentSignCallback is null')
  }
  if (!validateSymbol(symbol)) {
    throw new Error("Invalid Symbol. Must be between 1 and 128 long and contain alpahnumeric, '-', '_' chars.")
  }
  if (getSymbolFromContract(contractUtxo.scriptPubKey) !== symbol) {
    throw new Error('The symbol in the contract must equal symbol passed to issue')
  }
  if (isSplittable === null) {
    throw new Error('isSplittable must be a boolean value')
  }

  // if the payment UTXO is null then we treat this as a zero fee transaction
  const isZeroFee = (paymentUtxo === null)

  // check that we are spending all the input STAS tokens in the outputs.
  const totalOutSats = issueInfo.reduce((a, b) => a + b.satoshis, 0)
  const totalInSats = contractUtxo.satoshis
  if (totalOutSats !== contractUtxo.satoshis) {
    throw new Error(`total out amount ${totalOutSats} must equal total in amount ${totalInSats}`)
  }

  // create a new transaction
  const tx = new bsv.Transaction()

  // add the STAS input
  tx.from(contractUtxo)

  // Variable to count the input satoshis
  let satoshis = 0

  if (!isZeroFee) {
    // add the payment utxos to the transaction
    satoshis += paymentUtxo.satoshis
    tx.from(paymentUtxo)
  }

  issueInfo.forEach(is => {
    const pubKeyHash = addressToPubkeyhash(is.addr)
    let data
    if (is.data) {
      data = Buffer.from(is.data).toString('hex')
    }
    let hexSymbol
    if (symbol) {
      hexSymbol = Buffer.from(symbol).toString('hex')
    }
    // Add the issuing output
    const stasScript = getStasScript(pubKeyHash, publicKey, data, isSplittable, hexSymbol)

    tx.addOutput(new bsv.Transaction.Output({
      script: stasScript,
      satoshis: is.satoshis
    }))
  })

  if (!isZeroFee) {
    const paymentPubKeyHash = bsv.crypto.Hash.sha256ripemd160(paymentPublicKey.toBuffer()).toString('hex')

    const changeScript = bsv.Script.fromASM(`OP_DUP OP_HASH160 ${paymentPubKeyHash} OP_EQUALVERIFY OP_CHECKSIG`)
    // Calculate the change amount
    const txSize = (tx.serialize(true).length / 2) + 1 + 8 + changeScript.toBuffer().length + (tx.inputs.length * P2PKH_UNLOCKING_SCRIPT_BYTES)
    const fee = Math.ceil(txSize * feeSettings.Sats / feeSettings.PerByte)

    const outputSats = Math.floor(satoshis - fee)
    if (outputSats < 1) {
      throw new Error(`The Fee for transaction of ${fee} is higher than the amount of satoshis supplied ${satoshis} for funding`)
    }

    tx.addOutput(new bsv.Transaction.Output({
      script: changeScript,
      satoshis: outputSats
    }))
  }

  // bsv.js does not like signing non-standard inputs.  Therefore, we do this ourselves.
  for (let i = 0; i < tx.inputs.length; i++) {
    const input = tx.inputs[i]
    let pubKey
    let sig
    if (i === 0) {
      // first input is contract
      pubKey = publicKey
      if (!isUnsigned) {
        sig = await ownerSignatureCallback(tx, i, input.output._script, input.output._satoshisBN)
      } else {
        // add to signInfo
        signInfoList.push({
          inputIndex: i,
          publicKey: pubKey,
          sighash: sighash,
          script: input.output._script.toString('hex'),
          satoshis: input.output.satoshis
        })
      }
    } else {
      // remaining inputs are payment utxos
      pubKey = paymentPublicKey
      if (!isUnsigned) {
        sig = await paymentSignatureCallback(tx, i, input.output._script, input.output._satoshisBN)
      } else {
        // add to signInfo
        signInfoList.push({
          inputIndex: i,
          publicKey: pubKey,
          sighash: sighash,
          script: input.output._script.toString('hex'),
          satoshis: input.output.satoshis
        })
      }
    }
    if (!isUnsigned) {
      const unlockingScript = bsv.Script.fromASM(sig + ' ' + pubKey.toString('hex'))
      input.setScript(unlockingScript)
    }
  }

  if (isUnsigned) {
    return {
      hex: tx.toString(),
      json: JSON.stringify(tx),
      signingInfo: signInfoList
    }
  }
  return tx.serialize(true)
}

// make sure issueInfo array contains the required objects
function isIssueInfoValid(issueInfo) {
  if (issueInfo === null || !Array.isArray(issueInfo) || issueInfo.length < 1) {
    return false
  }
  issueInfo.forEach(info => {
    if (!('addr' in info) || !('satoshis' in info)) {
      throw new Error('issueInfo requires values for \'addr\' and \'satoshis\'')
    }
    if (info.addr.length < ADDRESS_MIN_LENGTH || info.addr.length > ADDRESS_MAX_LENGTH) {
      throw new Error(`issueInfo address must be between ${ADDRESS_MIN_LENGTH} and ${ADDRESS_MAX_LENGTH}`)
    }
    if (!(info.satoshis >= 0 && Math.floor(info.satoshis) === +info.satoshis)) {
      throw new Error('issueInfo Satoshis must be a natural number')
    }
    if (info.satoshis < 1) {
      throw new Error('issueInfo satoshis < 1')
    }
  })
  return true
}

function getSymbolFromContract(contractScript) {
  const ix = contractScript.indexOf('7b22') // {"
  if (ix < 0) {
    return
  }
  const or = contractScript.substring(ix)
  const schemaBuf = Buffer.from(or, 'hex')
  const schema = JSON.parse(schemaBuf.toString())
  return schema.symbol
}

// make sure issueInfo array contains the required objects
function isUtxoValid(utxo) {
  if ((!utxo) || (!utxo.constructor == Object)) {
    return false
  }
  if (!Object.prototype.hasOwnProperty.call(utxo, 'txid') ||
    !Object.prototype.hasOwnProperty.call(utxo, 'satoshis') ||
    !Object.prototype.hasOwnProperty.call(utxo, 'scriptPubKey') ||
    !Object.prototype.hasOwnProperty.call(utxo, 'vout')) {
    return false
  }
  return true
}
module.exports = issueWithCallback
