const expect = require("chai").expect
const assert = require('chai').assert
const utils = require('./utils/test_utils')
const chai = require('chai')
const axios = require('axios')
const bsv = require('bsv')
const util = require('../lib/stas')
const mergeUtil = require('./utils/mergeWithoutValidation')

const {
  contract,
  issue,
  transfer,
  split,
  merge,
  mergeSplit,
  redeem

} = require('../index')

const {
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../index').utils

const issuerPrivateKey = bsv.PrivateKey()
const fundingPrivateKey = bsv.PrivateKey()
const bobPrivateKey = bsv.PrivateKey()
const alicePrivateKey = bsv.PrivateKey()
var contractTx
var contractTxid
var issueInfo
var aliceAddr
var bobAddr
var symbol
var issueTxid
var issueTx

beforeEach(async function () {


});


it("Merge Invalid Token", async function () {

  const issuerPrivateKey = bsv.PrivateKey()
  const fundingPrivateKey = bsv.PrivateKey()

  const alicePrivateKey = bsv.PrivateKey()
  const aliceAddr = alicePrivateKey.toAddress().toString()

  const bobPrivateKey = bsv.PrivateKey()
  const bobAddr = bobPrivateKey.toAddress().toString()

  const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress('testnet').toString())
  const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress('testnet').toString())

  const invalidTxUtxoPK = bsv.PrivateKey()
  let invalidTxUtxo = await getFundsFromFaucet(invalidTxUtxoPK.toAddress('testnet').toString())

  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  const supply = 10000
  const symbol = 'TAALT'

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

  // change goes back to the fundingPrivateKey
  const contractHex = contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  )
  const contractTxid = await broadcast(contractHex)
  console.log(`Contract TX:     ${contractTxid}`)
  const contractTx = await getTransaction(contractTxid)

  const issueInfo = [
    {
      addr: aliceAddr,
      satoshis: 7000,
      data: 'one'
    },
    {
      addr: bobAddr,
      satoshis: 3000,
      data: 'two'
    }
  ]
  let issueHex
  try {
    issueHex = issue(
      issuerPrivateKey,
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
      fundingPrivateKey,
      true, // isSplittable
      2 // STAS version
    )
  } catch (e) {
    console.log('error issuing token', e)
    return
  }
  const issueTxid = await broadcast(issueHex)
  console.log(`Issue TX:        ${issueTxid}`)
  const issueTx = await getTransaction(issueTxid)

  // const bobAmount1 = issueTx.vout[0].value / 2
  // const bobAmount2 = issueTx.vout[0].value - bobAmount1
  // const splitDestinations = []
  // splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
  // splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }

  // const splitHex = split(
  //     alicePrivateKey,
  //     issuerPrivateKey.publicKey,
  //     utils.getUtxo(issueTxid, issueTx, 0),
  //     splitDestinations,
  //     utils.getUtxo(issueTxid, issueTx, 2),
  //     fundingPrivateKey
  // )
  // const splitTxid = await broadcast(splitHex)
  // console.log(`Split TX:        ${splitTxid}`)
  // const splitTx = await getTransaction(splitTxid)

  // Now let's merge the last split back together
  const splitTxObj1 = new bsv.Transaction(issueHex)


  //======================================================

  invalidTxUtxo = invalidTxUtxo[0]
  const tx = new bsv.Transaction()
  tx.from(invalidTxUtxo)
  const stasScript = util.getStasScript(alicePrivateKey.publicKey, issuerPrivateKey.publicKey, 2, null, true)
  tx.addOutput(new bsv.Transaction.Output({
    script: stasScript,
    satoshis: (Math.round(invalidTxUtxo.amount * 1e8))
  }))
  tx.sign(invalidTxUtxoPK)

  //console.log(tx.serialize(true))

  const txId = await broadcast(tx.serialize(true))
  const txOut = await getTransaction(txId)

  const splitTxObj2 = new bsv.Transaction(tx.serialize(true))


  //===================================

  const mergeHex = mergeUtil.mergeWithoutValidation(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    [{
      tx: splitTxObj1,
      vout: 0
    },
    {
      tx: splitTxObj2,
      vout: 0
    }],
    aliceAddr,
    {
      txid: issueTxid,
      vout: 2,
      scriptPubKey: issueTx.vout[2].scriptPubKey.hex,
      amount: issueTx.vout[2].value
    },
    fundingPrivateKey
  )

    console.log(mergeHex)
   //const mergeTxid = await broadcast(mergeHex)
  // console.log(`Merge TX:        ${mergeTxid}`)
  // const mergeTx = await getTransaction(mergeTxid)



})