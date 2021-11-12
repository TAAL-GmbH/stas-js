const axios = require('axios')
require('dotenv').config()

function schema (publicKeyHash, symbol, supply) {
  const schema = {
    name: 'Taal Token',
    tokenId: `${publicKeyHash}`,
    protocolId: 'To be decided',
    symbol: `${symbol}`,
    description: 'Example token on private Taalnet',
    image: 'https://www.taal.com/wp-content/themes/taal_v2/img/favicon/favicon-96x96.png',
    totalSupply: `${supply}`,
    decimals: 0,
    satsPerToken: 1,
    properties: {
      legal: {
        terms: '© 2020 TAAL TECHNOLOGIES SEZC\nALL RIGHTS RESERVED. ANY USE OF THIS SOFTWARE IS SUBJECT TO TERMS AND CONDITIONS OF LICENSE. USE OF THIS SOFTWARE WITHOUT LICENSE CONSTITUTES INFRINGEMENT OF INTELLECTUAL PROPERTY. FOR LICENSE DETAILS OF THE SOFTWARE, PLEASE REFER TO: www.taal.com/stas-token-license-agreement',
        licenceId: '1234'
      },
      issuer: {
        organisation: 'Taal Technologies SEZC',
        legalForm: 'Limited Liability Public Company',
        governingLaw: 'CA',
        mailingAddress: '1 Volcano Stret, Canada',
        issuerCountry: 'CYM',
        jurisdiction: '',
        email: 'info@taal.com'
      },
      meta: {
        schemaId: 'token1',
        website: 'https://taal.com',
        legal: {
          terms: 'blah blah'
        },
        media: {
          type: 'mp4'
        }
      }
    }
  }
  return schema
}

function getIssueInfo (addr1, sat1, addr2, sat2) {
  return [
    {
      addr: addr1,
      satoshis: sat1,
      data: 'one'
    },
    {
      addr: addr2,
      satoshis: sat2,
      data: 'two'
    }
  ]
}

function getUtxo (txid, tx, vout) {
  return {
    txid: txid,
    vout: vout,
    scriptPubKey: tx.vout[vout].scriptPubKey.hex,
    amount: tx.vout[vout].value
  }
}

function getMergeUtxo (splitTxObj) {
  return [{
    tx: splitTxObj,
    vout: 0
  },
  {
    tx: splitTxObj,
    vout: 1
  }]
}

function getMergeSplitUtxo (splitTxObj, splitTx) {
  return [{
    tx: splitTxObj,
    scriptPubKey: splitTx.vout[0].scriptPubKey.hex,
    vout: 0
  },
  {
    tx: splitTxObj,
    scriptPubKey: splitTx.vout[1].scriptPubKey.hex,
    vout: 1
  }]
}

function getTenIssueInfo (add1, add2, add3, add4, add5, add6, add7, add8, add9, add10) {
  return [
    {
      addr: add1,
      satoshis: 1000,
      data: 'one'
    },
    {
      addr: add2,
      satoshis: 1000,
      data: 'two'
    },
    {
      addr: add3,
      satoshis: 1000,
      data: 'two'
    },
    {
      addr: add4,
      satoshis: 1000,
      data: 'two'
    },
    {
      addr: add5,
      satoshis: 1000,
      data: 'two'
    },
    {
      addr: add6,
      satoshis: 1000,
      data: 'two'
    },
    {
      addr: add7,
      satoshis: 1000,
      data: 'two'
    },
    {
      addr: add8,
      satoshis: 1000,
      data: 'two'
    },
    {
      addr: add9,
      satoshis: 1000,
      data: 'two'
    },
    {
      addr: add10,
      satoshis: 1000,
      data: 'two'
    }
  ]
}

async function getVoutAmount (txid, vout) {
  const url = `https://${process.env.API_NETWORK}.whatsonchain.com/v1/bsv/${process.env.API_NETWORK}/tx/hash/${txid}`
  const response = await axios({
    method: 'get',
    url,
    auth: {
      username: process.env.API_USERNAME,
      password: process.env.API_PASSWORD
    }
  })
  return response.data.vout[vout].value
}

async function getToken (txid) {
  const url = `https://${process.env.API_NETWORK}.whatsonchain.com/v1/bsv/${process.env.API_NETWORK}/tx/hash/${txid}`
  const response = await axios({
    method: 'get',
    url,
    auth: {
      username: process.env.API_USERNAME,
      password: process.env.API_PASSWORD
    }
  })

  const temp = response.data.vout[0].scriptPubKey.asm
  const split = temp.split('OP_RETURN')[1]
  const tokenId = split.split(' ')[1]
  return tokenId
}

async function getTokenResponse (tokenId) {
  let response
  try {
    const url = `https://${process.env.API_NETWORK}.whatsonchain.com/v1/bsv/${process.env.API_NETWORK}/token/${tokenId}/TAALT`
    response = await axios({
      method: 'get',
      url,
      auth: {
        username: process.env.API_USERNAME,
        password: process.env.API_PASSWORD
      }
    })
  } catch (e) {
    console.log('Token Not Found: ' + e)
    return
  }
  return response.data.token
}

async function getTokenWithSymbol (tokenId, symbol) {
  const url = `https://${process.env.API_NETWORK}.whatsonchain.com/v1/bsv/${process.env.API_NETWORK}/token/${tokenId}/${symbol}`
  console.log(url)
  let response
  try {
    response = await axios({
      method: 'get',
      url,
      auth: {
        username: process.env.API_USERNAME,
        password: process.env.API_PASSWORD
      }
    })
  } catch (e) {
    console.log('Token Not Found: ' + e)
    return
  }
  return response.data.token
}

async function getTokenBalance (address) {
  const url = `https://${process.env.API_NETWORK}.whatsonchain.com/v1/bsv/${process.env.API_NETWORK}/address/${address}/tokens`
  const response = await axios({
    method: 'get',
    url,
    auth: {
      username: process.env.API_USERNAME,
      password: process.env.API_PASSWORD
    }
  })

  return response.data.tokens[0].balance
}

async function countNumOfTokens (txid, isThereAFee) {
  const url = `https://${process.env.API_NETWORK}.whatsonchain.com/v1/bsv/${process.env.API_NETWORK}/tx/hash/${txid}`
  const response = await axios({
    method: 'get',
    url,
    auth: {
      username: process.env.API_USERNAME,
      password: process.env.API_PASSWORD
    }
  })

  let count = 0
  for (let i = 0; i < response.data.vout.length; i++) {
    if (response.data.vout[i].value != null) {
      count++
    }
  }
  if (isThereAFee === true) { // output decreased by 1 if fees charged
    return count - 1
  } else { return count }
}

async function getAmount (txid, vout) {
  const url = `https://${process.env.API_NETWORK}.whatsonchain.com/v1/bsv/${process.env.API_NETWORK}/tx/hash/${txid}`
  const response = await axios({
    method: 'get',
    url,
    auth: {
      username: process.env.API_USERNAME,
      password: process.env.API_PASSWORD
    }
  })
  console.log(response.data.vout[vout].value)
  const amount = response.data.vout[vout].value
  return amount
}

function addData (sizeIn1000bytes) {
  let data
  for (let i = 0; i < sizeIn1000bytes; i++) {
    data += 'CallmeIshmaelSomeyearsagonevermindhowlongpreciselyhavinglittleornomoneyinmypurseandnothingparticulartointerestmeonshoreIthoughtIwouldsailaboutalittleandseethewaterypartoftheworldItisawayIhaveofdrivingoffthespleenandregulatingthecirculationWheneverIfindmyselfgrowinggrimaboutthemouthwheneveritisadampdrizzlyNovemberinmysoulwheneverIfindmyselfinvoluntarilypausingbeforecoffinwarehousesandbringinguptherearofeveryfuneralImeetandespeciallywhenevermyhyposgetsuchanupperhandofmethatitrequiresastrongmoralprincipletopreventmefromdeliberatelysteppingintothestreetandmethodicallyknockingpeopleshatsoffthenIaccountithightimetozzgettoseaassoonasIcan.Thisismysubstituteforpistolandball.WithaphilosophicalflourishCatothrowshimselfuponhisswordIquietlytaketotheshipThereisnothingsurprisinginthisIftheybutknewit,almostallmenintheirdegreesometimeorothercherishverynearlythesamefeelingstowardstheoceanwithmeCallmeIshmaelSomeyearsagonevermindhowlongpreciselyhavinglittleornomoneyinmypurseCallmeIshmaelSomeyears'
  }
  return data
}

function byteCount (s) {
  return encodeURI(s).split(/%..|./).length - 1
}

async function broadcastToMainNet (tx) {
  if (Buffer.isBuffer(tx)) {
    tx = tx.toString('hex')
  }
  const url = 'https://api.whatsonchain.com/v1/bsv/main/tx/raw?dontcheckfee=true'

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

async function broadcastMapi (tx) {
  const url = 'https://mapi.taal.com/mapi/tx'
  let response
  try {
    response = await
    axios({
      headers: {
        Authorization: process.env.MAPI_KEY,
        'Content-Type': 'application/json'
      },
      method: 'post',
      url,
      data: {
        rawTx: tx
      }
    })
  } catch (error) {
    console.log(error)
  }
  console.log(response)
  return response
}

async function getTransactionMainNet (txid) {
  const url = `https://api.whatsonchain.com/v1/bsv/main/tx/hash/${txid}`

  const response = await axios({
    method: 'get',
    url
  })

  return response.data
}

async function getTokenBalanceMainNet (address, symbolIn) {
  const url = `https://api.whatsonchain.com/v1/bsv/main/address/${address}/tokens`
  const response = await axios({
    method: 'get',
    url
  })
  const result = response.data.tokens.find(({ symbol }) => symbol === `${symbolIn}`)
  return result.balance
}

async function getTokenMainNet (txid) {
  const url = `https://api.whatsonchain.com/v1/bsv/main/tx/hash/${txid}`
  const response = await axios({
    method: 'get',
    url
  })

  const temp = response.data.vout[0].scriptPubKey.asm
  const split = temp.split('OP_RETURN')[1]
  const tokenId = split.split(' ')[1]
  return tokenId
}

async function getTokenResponseMainNet (tokenId, symbol) {
  let response
  try {
    const url = `https://api.whatsonchain.com/v1/bsv/main/token/${tokenId}/${symbol}`
    response = await axios({
      method: 'get',
      url
    })
  } catch (e) {
    console.log('Token Not Found: ' + e)
    return
  }
  return response.data.token
}

module.exports = {
  schema,
  getIssueInfo,
  getUtxo,
  getMergeUtxo,
  getMergeSplitUtxo,
  getVoutAmount,
  getToken,
  getTokenResponse,
  getTokenBalance,
  getTenIssueInfo,
  getTokenWithSymbol,
  addData,
  byteCount,
  countNumOfTokens,
  getAmount,
  broadcastToMainNet,
  getTransactionMainNet,
  getTokenBalanceMainNet,
  broadcastMapi,
  getTokenMainNet,
  getTokenResponseMainNet
}
