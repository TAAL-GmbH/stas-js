const axios = require('axios')
const { completeSTASUnlockingScript } = require('../../lib/stas')
require('dotenv').config()


function schema(publicKeyHash, symbol, supply) {
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


function getIssueInfo(addr1, sat1, addr2, sat2) {
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


function getUtxo(txid, tx, vout) {
  return {
    txid: txid,
    vout: vout,
    scriptPubKey: tx.vout[vout].scriptPubKey.hex,
    amount: tx.vout[vout].value
  }
}


function getMergeUtxo(splitTxObj) {

  return [{
    tx: splitTxObj,
    vout: 0
  },
  {
    tx: splitTxObj,
    vout: 1
  }]
}

function getMergeSplitUtxo(splitTxObj, splitTx) {
  return [{
    tx: splitTxObj,
    scriptPubKey: splitTx.vout[0].scriptPubKey.hex,
    vout: 0,
  },
  {
    tx: splitTxObj,
    scriptPubKey: splitTx.vout[1].scriptPubKey.hex,
    vout: 1,
  }]
}


function getTenIssueInfo(add1, add2, add3, add4, add5, add6, add7, add8, add9, add10){
return  [
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
          },
        ]

}

async function getVoutAmount(txid, vout) {

  const url = 'https://taalnet.whatsonchain.com/v1/bsv/taalnet/tx/hash/' + txid
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

async function getToken(txid) {
  const url = 'https://taalnet.whatsonchain.com/v1/bsv/taalnet/tx/hash/' + txid
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

async function getTokenResponse(tokenId) {

  const url = 'https://taalnet.whatsonchain.com/v1/bsv/taalnet/token/' + tokenId + '/TAALT'
  const response = await axios({
    method: 'get',
    url,
    auth: {
      username: process.env.API_USERNAME,
      password: process.env.API_PASSWORD
    }
  })
  return response.data.token
}

async function areFeesProcessed(txid, vout) {

  const url = 'https://taalnet.whatsonchain.com/v1/bsv/taalnet/tx/hash/' + txid
  const response = await axios({
    method: 'get',
    url,
    auth: {
      username: process.env.API_USERNAME,
      password: process.env.API_PASSWORD
    }
  })

  if (response.data.vout[vout] != null)
    return true
  else
    return false
}


async function getTokenBalance(address) {

  const url = 'https://taalnet.whatsonchain.com/v1/bsv/taalnet/address/' + address + '/tokens'
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

module.exports = {
  schema,
  getIssueInfo,
  getUtxo,
  getMergeUtxo,
  getMergeSplitUtxo,
  getVoutAmount,
  getToken,
  getTokenResponse,
  areFeesProcessed,
  getTokenBalance,
  getTenIssueInfo
}