const expect = require('chai').expect
const assert = require('chai').assert
const utils = require('./utils/test_utils')
const bsv = require('bsv')
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

const issuerPrivateKey = bsv.PrivateKey()
const fundingPrivateKey = bsv.PrivateKey()
let contractTx
let contractTxid
let issueInfo
let aliceAddr
let bobAddr
let symbol

beforeEach(async function () {

 await setup() // set up contract
})

it('Successful Issue Token With Split And Fee', async function () {

  const issueHex = issue(
    issuerPrivateKey,
    utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
    utils.getUtxo(contractTxid, contractTx, 0),
    utils.getUtxo(contractTxid, contractTx, 1),
    fundingPrivateKey,
    true,
    2
  )
  const issueTxid = await broadcast(issueHex)
  const tokenId = await utils.getToken(issueTxid)
  let response = await utils.getTokenResponse(tokenId)
  expect(response.symbol).to.equal(symbol) 
  expect(response.contract_txs).to.contain(contractTxid)
  expect(response.issuance_txs).to.contain(issueTxid)
  expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007)
  expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003)
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
  expect(await utils.areFeesProcessed(issueTxid, 2)).to.be.true
})

it('Successful Issue Token Non Split', async function () {

  const issueHex = issue(
    issuerPrivateKey,
    utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
    utils.getUtxo(contractTxid, contractTx, 0),
    utils.getUtxo(contractTxid, contractTx, 1),
    fundingPrivateKey,
    false,
    2
  )
  const issueTxid = await broadcast(issueHex)
  const tokenId = await utils.getToken(issueTxid)
  let response = await utils.getTokenResponse(tokenId)
  expect(response.symbol).to.equal(symbol)
  expect(response.contract_txs).to.contain(contractTxid)
  expect(response.issuance_txs).to.contain(issueTxid)
  expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007)
  expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003)
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
})

it('Successful Issue Token With Split No Fee', async function () {

  const issueHex = issue(
    issuerPrivateKey,
    utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
    utils.getUtxo(contractTxid, contractTx, 0),
    null,
    null,
    true,
    2
  )
  const issueTxid = await broadcast(issueHex)
  const tokenId = await utils.getToken(issueTxid) //token issuance currently delayed
  let response = await utils.getTokenResponse(tokenId)
  expect(response.symbol).to.equal(symbol)
  expect(response.contract_txs).to.contain(contractTxid)
  expect(response.issuance_txs).to.contain(issueTxid)
  expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007)
  expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003)
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
  expect(await utils.areFeesProcessed(issueTxid, 2)).to.be.false
})

it('Incorrect Issue Private Key Throws Error', async function () {

  const incorrectPrivateKey = bsv.PrivateKey()
  const issueHex = issue(
    incorrectPrivateKey,
    utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
    utils.getUtxo(contractTxid, contractTx, 0),
    utils.getUtxo(contractTxid, contractTx, 1),
    fundingPrivateKey,
    true,
    2
  )
  try {
    await broadcast(issueHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.response.data).to.contain('mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)')
  }
})

it('Incorrect Funding Private Key Throws Error', async function () {
  const incorrectPrivateKey = bsv.PrivateKey()
  const issueHex = issue(
    issuerPrivateKey,
    utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
    utils.getUtxo(contractTxid, contractTx, 0),
    utils.getUtxo(contractTxid, contractTx, 1),
    incorrectPrivateKey,
    true,
    2
  )
  try {
    await broadcast(issueHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.response.data).to.contain('mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)')
  }
})


it('Issue with Incorrect Balance (Less Than) Throws Error', async function () {
  try {
    issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 0, bobAddr, 0),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      2
    )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('total out amount 0 must equal total in amount 10000')
  }
})

it('Issue with Incorrect Balance (More Than) Throws Error', async function () {
  try {
    issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 10000, bobAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      2
    )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('total out amount 13000 must equal total in amount 10000')
  }
})


it('Empty Issue Info Throws Error', async function () {
  try {
    issue(
      issuerPrivateKey,
      [],
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      2
    )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('issueInfo is invalid')
  }
})

it('Invalid Issue Address (Too Short) throws error', async function () {
  issueInfo = [
    {
      addr: '1bc1qxy2kgdygjrsqtzq2',
      satoshis: 7000,
      data: 'One'
    },
    {
      addr: bobAddr,
      satoshis: 3000,
      data: 'Two'
    }
  ]
  try {
    issue(
      issuerPrivateKey,
      issueInfo,
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      2
    )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Address string provided')
  }
})

//throwing a 'Checksum mismatch' error - if i am reading code correctly it should validate address first 
//and trigger > ADDRESS_MAX_LENGTH  error
it('Invalid Issue Address (Too Long) throws error', async function () {
  issueInfo = [
    {
      addr: '1zP1eP5QGefi2DMPTfTL5SLmv7DivfNabc1qxymv7',
      satoshis: 7000,
      data: 'One'
    },
    {
      addr: bobAddr,
      satoshis: 3000,
      data: 'Two'
    }
  ]
  try {
    issue(
      issuerPrivateKey,
      issueInfo,
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      2
    )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Some Error')
  }
})


it('Non Array Issue Info Throws Error', async function () {
  try {
    issue(
      issuerPrivateKey,
      {
        addr: bobAddr,
        satoshis: 7000,
        data: 'one'
      },
      {
        addr: aliceAddr,
        satoshis: 3000,
        data: 'two'
      },
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      2
    )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('issueInfo is invalid')
  }
})



it('Empty Contract UTXO Info Throws Error', async function () {
  try {
    issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      [],
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      2
    )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('contractUtxo is invalid')
  }
})

it('Empty Payment UTXO Info Throws Error', async function () {
  try {
    issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      [],
      fundingPrivateKey,
      true,
      2
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Argument: Output satoshis is not a natural number')
  }
})


it('Increase Contract UTXO Amount Throws Error (when matching info amounts)', async function () {

  const issueHex = issue(
    issuerPrivateKey,
    utils.getIssueInfo(aliceAddr, 700000, bobAddr, 300000),
    {
      txid: contractTxid,
      vout: 0,
      scriptPubKey: contractTx.vout[0].scriptPubKey.hex,
      amount: 0.01
    },
    utils.getUtxo(contractTxid, contractTx, 1),
    fundingPrivateKey,
    true,
    2
  )
  try {
    await broadcast(issueHex)
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
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
