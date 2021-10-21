const expect = require("chai").expect
const assert = require('chai').assert
const utils = require('./utils/test_utils')
const bsv = require('bsv')
const issueUtil = require('./utils/issueWithoutValidation')
require('dotenv').config()


const {
    contract,
    issue
} = require('../index')

const {
    getTransaction,
    getFundsFromFaucet,
    broadcast
} = require('../index').utils

/*
These tests bypass the issue amount checks in the sdk
Test 1 attempts to issue more than supply - the broadcast fails as expected
Test 2 attempts to issue less than supply - Broadcast is successful and the token is issued - needs fixed
*/

const issuerPrivateKey = bsv.PrivateKey()
const fundingPrivateKey = bsv.PrivateKey()
let contractTx
let contractTxid
let aliceAddr
let bobAddr
let symbol
const issueAddr = issuerPrivateKey.toAddress(process.env.NETWORK).toString()
const fundingAddr = fundingPrivateKey.toAddress(process.env.NETWORK).toString()


beforeEach(async function () {

    await setup() // set up contract
})

it("Attempt to Issue More Tokens Than Supply", async function () {

    issueUtil.issueWithoutValiation
    let issueHex
    try {
        issueHex = issueUtil.issueWithoutValiation(
            issuerPrivateKey,
            utils.getIssueInfo(aliceAddr, 10000, bobAddr, 3000),
            utils.getUtxo(contractTxid, contractTx, 0),
            utils.getUtxo(contractTxid, contractTx, 1),
            fundingPrivateKey,
            false,
            2
        )
    } catch (e) {
        console.log('error issuing token', e)
        return
    }
    try {
        await broadcast(issueHex)
        assert(false)
        return
    } catch (e) {
        expect(e).to.be.instanceOf(Error)
        expect(e.message).to.eql('Request failed with status code 400')
    }
})

//needs fixed - Token is issued when issued with less token than supply
it("Attempt to Issue Less Tokens Than Supply", async function () {

    issueUtil.issueWithoutValiation
    let issueHex
    try {
        issueHex = issueUtil.issueWithoutValiation(
            issuerPrivateKey,
            utils.getIssueInfo(aliceAddr, 1000, bobAddr, 3000),
            utils.getUtxo(contractTxid, contractTx, 0),
            utils.getUtxo(contractTxid, contractTx, 1),
            fundingPrivateKey,
            false,
            2
        )
    } catch (e) {
        console.log('error issuing token', e)
        return
    }
      const issueTxid = await broadcast(issueHex)
      const issueTx = await getTransaction(issueTxid)
      const tokenId = await utils.getToken(issueTxid)
      console.log(`Token ID:        ${tokenId}`)
      let response = await utils.getTokenResponse(tokenId)  //token issuance fails intermittingly
      expect(response.symbol).to.equal(symbol)
      expect(response.contract_txs).to.contain(contractTxid)
      expect(response.issuance_txs).to.contain(issueTxid)
      expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00001) //reduced amounts
      expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003) //reduced amounts
      console.log("Alice Balance "   + await utils.getTokenBalance(aliceAddr))
      console.log("Bob Balance "   + await utils.getTokenBalance(bobAddr))
      console.log(issueAddr)
      console.log(fundingAddr)
//    try {
//        await broadcast(issueHex)
//        assert(false)
//        return
//    } catch (e) {
//        expect(e).to.be.instanceOf(Error)
//        expect(e.message).to.eql('Request failed with status code 400')
//    }
})


async function setup() {
  const bobPrivateKey = bsv.PrivateKey()
  const alicePrivateKey = bsv.PrivateKey()
  const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  symbol = 'TAALT'
  supply = 10000
  schema = utils.schema(publicKeyHash, symbol, supply)
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()


  const contractHex = contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  )
  contractTxid = await broadcast(contractHex)
  contractTx = await getTransaction(contractTxid)
}