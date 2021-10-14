const expect = require("chai").expect
const assert = require('chai').assert
const utils = require('./utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  transfer
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
let aliceAddr
let bobAddr
let symbol
let issueTxid
let issueTx

beforeEach(async function () {

  await setup() //contract and issue
});


it("Successful Transfer With Fee", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1

  const transferHex = transfer(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    aliceAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )
  const transferTxid = await broadcast(transferHex)
  console.log(transferTxid)
  const tokenId = await utils.getToken(issueTxid)
  let response = await utils.getTokenResponse(tokenId) //tokengeneration is failing intermittingly 
  expect(response.data.token.symbol).to.equal(symbol)
  expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003)
  expect(await utils.areFeesProcessed(transferTxid, 1)).to.be.true
})


it("Successful No Fee Transfer", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1

  const transferHex = transfer(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    aliceAddr,
    null,
    null
  )
  const transferTxid = await broadcast(transferHex)
  const tokenId = await utils.getToken(issueTxid)
  let response = await utils.getTokenResponse(tokenId)
  expect(response.data.token.symbol).to.equal(symbol)
  expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003)
  expect(await utils.areFeesProcessed(transferTxid, 1)).to.be.false
})

//should empty array be accepted as no fees?
it("Successful No Fee Transfer Payment UTXO Empty Array", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1

  const transferHex = transfer(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    aliceAddr,
    [],
    null
  )
  const transferTxid = await broadcast(transferHex)
  console.log(transferTxid)

  const tokenId = await utils.getToken(issueTxid)
  let response = await utils.getTokenResponse(tokenId)
  expect(response.data.token.symbol).to.equal(symbol)
  expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003)
  expect(await utils.areFeesProcessed(transferTxid, 1)).to.be.false
})


it("Transfer With Invalid Issuer PK Throws Error", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1
  const incorrectPK = bsv.PrivateKey()

  const transferHex = transfer(
    incorrectPK,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    aliceAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )
  try {
    await broadcast(transferHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it("Transfer With Invalid Funding PK Throws Error", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1
  const incorrectPK = bsv.PrivateKey()

  const transferHex = transfer(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    aliceAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    incorrectPK
  )
  try {
    await broadcast(transferHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it("Transfer With Invalid Contract Public Key Throws Error", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1
  const incorrectPrivateKey = bsv.PrivateKey()

  const transferHex = transfer(
    bobPrivateKey,
    incorrectPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    aliceAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )
  try {
    await broadcast(transferHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it("Address Validation - Too Few Chars", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1
  const incorrectPK = bsv.PrivateKey()
  const invalidAddr = '1MSCReQT9E4GpxuK1K7'

  try {
    const transferHex = transfer(
      incorrectPK,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      invalidAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Address string provided')
  }
})

//needs fixed - throwing 'Checksum mismatch'  - can we validate address similar to issue?
it("Address Validation - Too May Chars", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1
  const incorrectPK = bsv.PrivateKey()
  const invalidAddr = '1MSCReQT9E4GpxuK1K7uyD5qF1EmznXjkrmoFCgGtkmhyaL2frwff84p2bwTf3FDpkZcCgGtkmhyaL2frwff84p2bwTf3FDpkZcCgGtkmhy'

  try {
    const transferHex = transfer(
      incorrectPK,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      invalidAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Address string provided')
  }
})


it("Incorrect STAS UTXO Amount Throws Error", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1

  const transferHex = transfer(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    {
      txid: issueTxid,
      vout: 1,
      scriptPubKey: issueTx.vout[1].scriptPubKey.hex,
      amount: 0.0001
    },
    aliceAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )
  try {
    await broadcast(transferHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it("Incorrect Payment UTXO Amount Throws Error", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1


  const transferHex = transfer(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    aliceAddr,
    {
      txid: issueTxid,
      vout: issueOutFundingVout,
      scriptPubKey: issueTx.vout[issueOutFundingVout].scriptPubKey.hex,
      amount: 0.01
    },
    fundingPrivateKey
  )
  try {
    await broadcast(transferHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})



async function setup() {

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
  const contractTxid = await broadcast(contractHex)
  const contractTx = await getTransaction(contractTxid)

  const issueHex = issue(
    issuerPrivateKey,
    utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
    utils.getUtxo(contractTxid, contractTx, 0),
    utils.getUtxo(contractTxid, contractTx, 1),
    fundingPrivateKey,
    true,
    2
  )
  issueTxid = await broadcast(issueHex)
  issueTx = await getTransaction(issueTxid)

}