const axios = require('axios')
const bsv = require('bsv')
require('dotenv').config()

const BN = bsv.crypto.BN

const MIN_SYMBOL_SIZE = 1
const MAX_SYMBOL_SIZE = 128

// the amount of satoshis in a bitcoin
const SATS_PER_BITCOIN = 1e8

// group 1: isSplittable flag, group 2: symbol, group 3: data
const stasV2DataRegex = /OP_RETURN [0-9a-fA-F]{40} (00|01)([\s]?[\S]*[\s]?)([a-f0-9]*)+$/

// numberToLESM converts a number into a little endian byte slice representation,
// using the minimum number of bytes possible, in sign magnitude format.
function numberToLESM(num) {
  if (num === 0) {
    return 'OP_0'
  }
  if (num === 1) {
    return 'OP_1'
  }
  if (num < 17) {
    return `OP_${num}`
  }
  const n = bsv.crypto.BN.fromNumber(num)
  return n.toSM({ endian: 'little' }).toString('hex')
}

// replaceAll is used for node versions < 15, where the STRING.replaceAll function is built in.
function replaceAll(string, search, replace) {
  const pieces = string.split(search)
  return pieces.join(replace)
}

// getTransaction gets a bitcoin transaction from testnet.
async function getTransaction(txid) {
  const url = `https://api.whatsonchain.com/v1/bsv/test/tx/hash/${txid}`

  const response = await axios({
    method: 'get',
    url
  })

  return response.data
}

// getRawTransaction gets a bitcoin transaction from testnet in raw / hex format.
async function getRawTransaction(txid) {
  const url = `https://api.whatsonchain.com/v1/bsv/test/tx/${txid}/hex`

  const response = await axios({
    method: 'get',
    url
  })

  return response.data
}

// getFundsFromFaucet gets satoshis from the testnet faucet.
async function getFundsFromFaucet(address) {
  const url = `https://api.whatsonchain.com/v1/bsv/test/faucet/send/${address}`

  const response = await axios.get(url)

  const txid = response.data

  // Check this is a valid hex string
  if (!txid.match(/^[0-9a-fA-F]{64}$/)) {
    throw new Error(`Failed to get funds: ${txid}`)
  }

  const faucetTx = await getTransaction(txid)

  let vout = 0
  if (faucetTx.vout[0].value !== 0.01) {
    vout = 1
  }
  return [{
    txid,
    vout,
    scriptPubKey: faucetTx.vout[vout].scriptPubKey.hex,
    satoshis: bitcoinToSatoshis(faucetTx.vout[vout].value)
  }]
}

// broadcast will send a transaction to testnet.
async function broadcast(tx) {
  if (Buffer.isBuffer(tx)) {
    tx = tx.toString('hex')
  }
  const url = 'https://api.whatsonchain.com/v1/bsv/test/tx/raw'

  const response = await axios({
    method: 'post',
    url,
    data: {
      txhex: tx
    }
  })

  let txid = response.data

  if (txid[0] === '"') {
    txid = txid.slice(1)
  }

  if (txid.slice(-1) === '\n') {
    txid = txid.slice(0, -1)
  }

  if (txid.slice(-1) === '"') {
    txid = txid.slice(0, -1)
  }

  // Check this is a valid hex string
  if (!txid.match(/^[0-9a-fA-F]{64}$/)) {
    throw new Error(`Failed to broadcast: ${txid}`)
  }

  return txid
}
// now decode addr to pubKeyHash
function addressToPubkeyhash(addr) {
  const address = bsv.Address.fromString(addr)
  return address.hashBuffer.toString('hex')
}

function reverseEndian(str) {
  const num = new BN(str, 'hex')
  const buf = num.toBuffer()
  return buf.toString('hex').match(/.{2}/g).reverse().join('')
}

function bitcoinToSatoshis(amount) {
  return Math.round(amount * SATS_PER_BITCOIN)
}

function finaliseSTASUnlockingScript(tx, index, publicKeyHex, signature) {
  const partialScript = tx.inputs[index].script.toASM()
  const endScript = signature + ' ' + publicKeyHex
  const fullScriptAsm = partialScript + ' ' + endScript
  return fullScriptAsm
}

function isSplitScriptSplitable(script) {
  const b = bsv.Script.fromHex(script.scriptPubKey).toASM()
  const res = b.toString().match(stasV2DataRegex)
  if (res[1] === '00') {
    return true
  } else if (res[1] === '01') {
    return false
  } else {
    throw new Error('invalid script')
  }
}

function isMergeScriptSplittable(utxo) {
  for (let i in utxo) {
    const b = bsv.Script.fromHex(utxo[i].tx.outputs[utxo[i].vout].script.toHex()).toASM()
    const res = b.toString().match(stasV2DataRegex)
    if (res[1] === '01') {
      return false
    }
  }
  return true
}

module.exports = {
  numberToLESM,
  replaceAll,
  getTransaction,
  getRawTransaction,
  getFundsFromFaucet,
  broadcast,
  addressToPubkeyhash,
  reverseEndian,
  bitcoinToSatoshis,
  finaliseSTASUnlockingScript,
  isSplitScriptSplitable,
  isMergeScriptSplittable,
  SATS_PER_BITCOIN,
  MIN_SYMBOL_SIZE,
  MAX_SYMBOL_SIZE
}
