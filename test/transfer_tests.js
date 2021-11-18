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

let issuerPrivateKey
let fundingPrivateKey
let bobPrivateKey
let alicePrivateKey
let contractUtxos
let fundingUtxos
let publicKeyHash
let aliceAddr
let bobAddr
let symbol
let issueTxid
let issueTx

beforeEach(async function () {

  await setup() //contract and issue
});


it("Transfer - Successful With Fee 1", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1

  const transferHex = transfer(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    aliceAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )
  console.log()
  const transferTxid = await broadcast(transferHex)
  const tokenId = await utils.getToken(transferTxid)
  let response = await utils.getTokenResponse(tokenId)
  expect(response.symbol).to.equal(symbol)
  expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003)
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(10000)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(0)
})

it("Transfer - Successful With Fee 2", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1

  const transferHex = transfer(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    aliceAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )
  const transferTxid = await broadcast(transferHex)
  const tokenId = await utils.getToken(transferTxid)
  let response = await utils.getTokenResponse(tokenId)
  expect(response.symbol).to.equal(symbol)
  expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00007)
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(4000)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(6000)
})

it("Transfer - Successful With Fee 3", async function () {

  const davePrivateKey = bsv.PrivateKey()
  const daveAddr = davePrivateKey.toAddress(process.env.NETWORK).toString()
  const issueOutFundingVout = issueTx.vout.length - 1

  const transferHex = transfer(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    daveAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )
  const transferTxid = await broadcast(transferHex)
  const tokenId = await utils.getToken(transferTxid)
  let response = await utils.getTokenResponse(tokenId)
  expect(response.symbol).to.equal(symbol)
  expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003)
  expect(await utils.getTokenBalance(daveAddr)).to.equal(3000)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(0)
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
})


it("Transfer - Successful With Fee 4", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1

  const transferHex = transfer(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    bobAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )
  const transferTxid = await broadcast(transferHex)
  const tokenId = await utils.getToken(transferTxid)
  let response = await utils.getTokenResponse(tokenId)
  expect(response.symbol).to.equal(symbol)
  expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(6000)
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(4000)
})


it("Transfer - Successful No Fee", async function () {

  const transferHex = transfer(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    aliceAddr,
    null,
    null
  )
  const transferTxid = await broadcast(transferHex)
  const tokenId = await utils.getToken(transferTxid)
  let response = await utils.getTokenResponse(tokenId)
  expect(response.symbol).to.equal(symbol)
  expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003)
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(10000)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(0)
})


it("Transfer - Invalid Issuer Private Key Throws Error", async function () {

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
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.response.data).to.contain('mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)')
  }
})

it("Transfer - Invalid Funding Private Key Throws Error", async function () {

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
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.response.data).to.contain('mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)')
  }
})

it("Transfer -  Invalid Contract Public Key Throws Error", async function () {

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
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.response.data).to.contain('mandatory-script-verify-flag-failed')
  }
})

it("Transfer - Address Validation - Too Few Chars", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1
  const invalidAddr = '1MSCReQT9E4GpxuK1K7uyD5q'
  try {
     transferHex = transfer(
      bobPrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      invalidAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Address string provided')
  }
})

//needs fixed - throwing 'Checksum mismatch'  - can we validate address similar to issue?
it("Transfer -  Address Validation - Too Many Chars", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1
  const invalidAddr = '1MSCReQT9E4GpxuK1K7uyD5qF1EmznXjkrmoFCgGtkmhyaL2frwff84p2bwTf3FDpkZcCgGtkmhyaL2frwff84p2bwTf3FDpkZcCgGtkmhy'

  try {
     transferHex = transfer(
      bobPrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      invalidAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Address string provided')
  }
})


it("Transfer - Incorrect STAS UTXO Amount Throws Error", async function () {

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
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.response.data).to.contain('bad-txns-in-belowout')
  }
})

it("Transfer - Incorrect Payment UTXO Amount Throws Error", async function () {

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
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.response.data).to.contain('mandatory-script-verify-flag-failed (Signature must be zero for failed CHECK(MULTI)SIG operation)')
  }
})
//needs fixed
it("Transfer - Null Token Owner Private Key Throws Error", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1
  try {
     transferHex = transfer(
      null,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Some Error')
  }
})
//needs fixed
it("Transfer - Null Contract Public Key Throws Error", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1
  try {
     transferHex = transfer(
      bobPrivateKey,
      null,
      utils.getUtxo(issueTxid, issueTx, 1),
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Needs Fixed')
  }
})

it("Transfer - Null STAS UTXO Throws Error", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1
  try {
     transferHex = transfer(
      bobPrivateKey,
      issuerPrivateKey.publicKey,
      null,
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Argument: Must provide an object from where to extract data')
  }
})

it("Transfer - Null Destination Address Throws Error", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1
  try {
     transferHex = transfer(
      bobPrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      null,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.contains('data parameter supplied is not a string')
  }
})

it("Transfer - Null Funding Private Key Throws Error", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1
  try {
     transferHex = transfer(
      bobPrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      null
    )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Cannot read property \'publicKey\' of null')
  }
})


async function setup() {

  issuerPrivateKey = bsv.PrivateKey()
  fundingPrivateKey = bsv.PrivateKey()
  bobPrivateKey = bsv.PrivateKey()
  alicePrivateKey = bsv.PrivateKey()
  contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  symbol = 'CHANGED_TOKEN'
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
    symbol,
    2
  )
  issueTxid = await broadcast(issueHex)
  issueTx = await getTransaction(issueTxid)

}