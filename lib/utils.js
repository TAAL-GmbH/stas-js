const axios = require('axios')
const bsv = require('bsv')

// numberToLESM converts a number into a little endian byte slice representation,
// using the minimum number of bytes possible, in sign magnitude format.
function numberToLESM (num) {
  const n = bsv.crypto.BN.fromNumber(num)
  return n.toSM({ endian: 'little' }).toString('hex')
}

// replaceAll is used for node versions < 15, where the STRING.replaceAll function is built in.
function replaceAll(string, search, replace) {
  const pieces = string.split(search)
  return pieces.join(replace)
}

// getTransaction gets a bitcoin transaction from Taalnet.
async function getTransaction (txid) {
  const url = `https://taalnet.whatsonchain.com/v1/bsv/taalnet/tx/hash/${txid}`

  const response = await axios({
    method: 'get',
    url,
    auth: {
      username: 'taal_private',
      password: 'dotheT@@l007'
    }
  })

  return response.data
}

// getRawTransaction gets a bitcoin transaction from Taalnet in raw / hex format.
async function getRawTransaction (txid) {
  const url = `https://taalnet.whatsonchain.com/v1/bsv/taalnet/tx/${txid}/hex`

  const response = await axios({
    method: 'get',
    url,
    auth: {
      username: 'taal_private',
      password: 'dotheT@@l007'
    }
  })

  return response.data
}

// getFundsFromFaucet gets satoshis from the Taalnet faucet.
async function getFundsFromFaucet (address) {
  const url = `https://taalnet.whatsonchain.com/faucet/send/${address}`

  const response = await axios.get(url, {
    auth: {
      username: 'taal_private',
      password: 'dotheT@@l007'
    }
  })

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
    amount: faucetTx.vout[vout].value
  }]
}

// broadcast will send a transaction to Taalnet.
async function broadcast (tx) {
  if (Buffer.isBuffer(tx)) {
    tx = tx.toString('hex')
  }

  const url = 'https://taalnet.whatsonchain.com/v1/bsv/taalnet/tx/raw'

  const response = await axios({
    method: 'post',
    url,
    auth: {
      username: 'taal_private',
      password: 'dotheT@@l007'
    },
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

module.exports = {
  numberToLESM,
  replaceAll,
  getTransaction,
  getRawTransaction,
  getFundsFromFaucet,
  broadcast
}
