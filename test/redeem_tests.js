const expect = require('chai').expect
const assert = require('chai').assert
const utils = require('./utils/test_utils')
const axios = require('axios')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  redeem
} = require('../index')

const {
  getTransaction,
  getFundsFromFaucet,
  broadcast,
  SATS_PER_BITCOIN
} = require('../index').utils

let issuerPrivateKey
let fundingPrivateKey
let bobPrivateKey
let alicePrivateKey
let contractUtxos
let fundingUtxos
let publicKeyHash
let bobAddr
let aliceAddr
let issueTxid
let issueTx

beforeEach(async function () {
  await setup()
})


it('Redeem - Successful Redeem 1', async function () {

  const redeemHex = redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    utils.getUtxo(issueTxid, issueTx, 2),
    fundingPrivateKey
  )
  const redeemTxid = await broadcast(redeemHex)
  expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.00007)
  expect(await utils.areFeesProcessed(redeemTxid, 1)).to.be.true
  //add token checks
})

it('Redeem - Successful Redeem 2', async function () {

  const redeemHex = redeem(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    utils.getUtxo(issueTxid, issueTx, 2),
    fundingPrivateKey
  )
  const redeemTxid = await broadcast(redeemHex)
  expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.00003)
  expect(await utils.areFeesProcessed(redeemTxid, 1)).to.be.true
  //add token checks
})

it('Redeem - Successful Redeem No Fee', async function () {
  const redeemHex = redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    null,
    fundingPrivateKey
  )
  const redeemTxid = await broadcast(redeemHex)
  expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.00007) // grab programmatically
  expect(await utils.areFeesProcessed(redeemTxid, 1)).to.be.false
  //add token checks
})

//Needs fixed
it('Redeem - Successful Redeem No Fee Empty Array', async function () {
  const redeemHex = redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    [],
    null
  )
  const redeemTxid = await broadcast(redeemHex)
  expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.0000075) 
  expect(await utils.areFeesProcessed(redeemTxid, 1)).to.be.false
})

it('Redeem - Incorrect Stas UTXO Amount Throws Error', async function () {
  const redeemHex = redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    {
      txid: issueTxid,
      vout: 0,
      scriptPubKey: issueTx.vout[0].scriptPubKey.hex,
      amount: 0.1
    },
    {
      txid: issueTxid,
      vout: 2,
      scriptPubKey: issueTx.vout[2].scriptPubKey.hex,
      amount: issueTx.vout[2].value
    },
    fundingPrivateKey
  )
  try {
    await broadcast(redeemHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it('Redeem - Incorrect Funding UTXO Amount Throws Error', async function () {
  const redeemHex = redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    {
      txid: issueTxid,
      vout: 0,
      scriptPubKey: issueTx.vout[0].scriptPubKey.hex,
      amount: issueTx.vout[0].value
    },
    {
      txid: issueTxid,
      vout: 2,
      scriptPubKey: issueTx.vout[2].scriptPubKey.hex,
      amount: 0.1
    },
    fundingPrivateKey
  )
  try {
    await broadcast(redeemHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it('Redeem - Attempt To Unlock With Incorrect Public Key Throws Error', async function () {
  incorrectKey = bsv.PrivateKey()

  const redeemHex = redeem(
    alicePrivateKey,
    incorrectKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    utils.getUtxo(issueTxid, issueTx, 2),
    fundingPrivateKey
  )
  try {
    await broadcast(redeemHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it('Redeem - Attempt To Redeem with Incorrect Owner Private Key Throws Error', async function () {
  incorrectKey = bsv.PrivateKey()

  const redeemHex = redeem(
    incorrectKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    utils.getUtxo(issueTxid, issueTx, 2),
    fundingPrivateKey
  )
  try {
    await broadcast(redeemHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it('Redeem - Attempt To Redeem with Incorrect Payment Private Key Throws Error', async function () {
  incorrectKey = bsv.PrivateKey()

  const redeemHex = redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    utils.getUtxo(issueTxid, issueTx, 2),
    incorrectKey
  )
  try {
    await broadcast(redeemHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

//needs fixed
it('Redeem - Null Token Owner Private Key Throws Error', async function () {

  try {
   redeemHex = redeem(
    null,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    utils.getUtxo(issueTxid, issueTx, 2),
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
it('Redeem - Null Contract Public Key Throws Error', async function () {

  try {
   redeemHex = redeem(
    alicePrivateKey,
    null,
    utils.getUtxo(issueTxid, issueTx, 0),
    utils.getUtxo(issueTxid, issueTx, 2),
    fundingPrivateKey
  )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Some Error')
  }
})

it('Redeem - Null STAS UTXO Throws Error', async function () {

  try {
   redeemHex = redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    null,
    utils.getUtxo(issueTxid, issueTx, 2),
    fundingPrivateKey
  )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Argument: Must provide an object from where to extract data')
  }
})

it('Redeem - Funding Private Key Throws Error', async function () {

  try {
   redeemHex = redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    utils.getUtxo(issueTxid, issueTx, 2),
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
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()
  const symbol = 'TAALT'
  const supply = 10000
  const schema = utils.schema(publicKeyHash, symbol, supply)

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
