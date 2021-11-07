const expect = require('chai').expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  transfer,
  split,
  merge,
  mergeSplit,
  redeem
} = require('../../index')

const {
  SATS_PER_BITCOIN
} = require('../../index').utils


it('Mainnet /token & /token/unspent difference', async function () {

  const wait = 1000 //set wait before token balance check

  const aliceWif = process.env.ALICEWIF //the issuer of the contract and pays fees
  const bobWif = process.env.BOBWIF
  const emmaWif = process.env.EMMAWIF

  const alicePrivateKey = bsv.PrivateKey.fromWIF(aliceWif)
  const bobprivateKey = bsv.PrivateKey.fromWIF(bobWif)
  const emmaPrivateKey = bsv.PrivateKey.fromWIF(emmaWif)

  const aliceAddr = alicePrivateKey.toAddress('mainnet').toString()
  const bobAddr = bobprivateKey.toAddress('mainnet').toString()
  const emmaAddr = emmaPrivateKey.toAddress('mainnet').toString()

  console.log("Bob Address " + bobAddr)
  console.log("Emma Address " + emmaAddr)

  const inputUtxoid = '' // the input utxo 
  const inputUtxo = await utils.getTransactionMainNet(inputUtxoid)
  const inputUxoVout = 0

  const inputUtxoidFee = '' // the fee utxo 
  const inputUtxoFee = await utils.getTransactionMainNet(inputUtxoidFee)
  const inputUxoFeeVout = 0

  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(alicePrivateKey.publicKey.toBuffer()).toString('hex')
  const supply = 10000
  const symbol = 'NEW_1'  // Use a unique symbol every test run to ensure that token balances can be checked correctly

  const schema = {
    name: 'Taal Token',
    tokenId: `${publicKeyHash}`,
    protocolId: 'To be decided',
    symbol: symbol,
    description: 'Example token on private Taalnet',
    image: 'https://www.taal.com/wp-content/themes/taal_v2/img/favicon/favicon-96x96.png',
    totalSupply: supply,
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
  const contractHex = contract(
    alicePrivateKey,
    [{
      txid: inputUtxoid,
      vout: inputUxoVout,
      scriptPubKey: inputUtxo.vout[inputUxoVout].scriptPubKey.hex,
      amount: inputUtxo.vout[inputUxoVout].value
    }],
    [{
      txid: inputUtxoidFee,
      vout: inputUxoFeeVout,
      scriptPubKey: inputUtxoFee.vout[inputUxoFeeVout].scriptPubKey.hex,
      amount: inputUtxoFee.vout[inputUxoFeeVout].value
    }],
    alicePrivateKey,
    schema,
    supply
  )

  const contractTxid = await utils.broadcastToMainNet(contractHex)
  console.log(`Contract TX:     ${contractTxid}`)
  const contractTx = await utils.getTransactionMainNet(contractTxid)
  

  await new Promise(r => setTimeout(r, wait));

  const issueInfo = [
    {
      addr: bobAddr,
      satoshis: 6000,
      data: 'sent to bob'
    },
    {
      addr: emmaAddr,
      satoshis: 4000,
      data: 'sent to emma'
    }
  ]
  let issueHex
  try {
    issueHex = issue(
      alicePrivateKey,
      issueInfo,
      {
        txid: contractTxid,
        vout: 0,
        scriptPubKey: contractTx.vout[0].scriptPubKey.hex,
        amount: contractTx.vout[0].value
      },
      {
        txid: contractTxid,
        vout: 1,
        scriptPubKey: contractTx.vout[1].scriptPubKey.hex,
        amount: contractTx.vout[1].value
      },
      alicePrivateKey,
      true, // isSplittable
      symbol,
      2 // STAS version
    )
  } catch (e) {
    console.log('error issuing token', e)
    return
  }
  const issueTxid = await utils.broadcastToMainNet(issueHex)
  console.log(`Issue TX:        ${issueTxid}`)
  const issueTx = await utils.getTransactionMainNet(issueTxid)
  const tokenId = await utils.getTokenMainNet(issueTxid)
  console.log(`Token ID:        ${tokenId}`)
  const response = await utils.getTokenResponseMainNet(tokenId, symbol) 
  expect(response.symbol).to.equal(symbol)

  await new Promise(r => setTimeout(r, wait));

  const issueOutFundingVout = issueTx.vout.length - 1

  const transferHex = transfer(
    bobprivateKey,
    alicePrivateKey.publicKey,
    {
      txid: issueTxid,
      vout: 0,
      scriptPubKey: issueTx.vout[0].scriptPubKey.hex,
      amount: issueTx.vout[0].value
    },
    emmaAddr,
    {
      txid: issueTxid,
      vout: issueOutFundingVout,
      scriptPubKey: issueTx.vout[issueOutFundingVout].scriptPubKey.hex,
      amount: issueTx.vout[issueOutFundingVout].value
    },
    alicePrivateKey
  )
  const transferTxid = await utils.broadcastToMainNet(transferHex)
  console.log(`Transfer TX:     ${transferTxid}`)
  const transferTx = await utils.getTransactionMainNet(transferTxid)

})



