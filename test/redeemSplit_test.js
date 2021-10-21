const expect = require('chai').expect
const assert = require('chai').assert
const utils = require('./utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  redeemSplit
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
let bobAddr
let aliceAddr
let contractUtxos
let fundingUtxos
let publicKeyHash
let issueTxid
let issueTx


beforeEach(async function () {

  await setup()
})

it('Successful RedeemSplit With Fees', async function () {

  const rsBobAmount = issueTx.vout[0].value / 3
  const rsAliceAmount1 = issueTx.vout[0].value / 3
  const rSplitDestinations = []
  rSplitDestinations[0] = { address: bobAddr, amount: rsBobAmount }
  rSplitDestinations[1] = { address: aliceAddr, amount: rsAliceAmount1 }

  const redeemSplitHex = redeemSplit(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    rSplitDestinations,
    utils.getUtxo(issueTxid, issueTx, 2),
    fundingPrivateKey
  )
  const redeemTxid = await broadcast(redeemSplitHex)
  expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.00002334)
  expect(await utils.getVoutAmount(redeemTxid, 1)).to.equal(0.00002333)
  expect(await utils.getVoutAmount(redeemTxid, 2)).to.equal(0.00002333)
  expect(await utils.areFeesProcessed(redeemTxid, 3)).to.be.true
})

it('Successful RedeemSplit With No Fees', async function () {

  const rsBobAmount = issueTx.vout[0].value / 3
  const rsAliceAmount1 = issueTx.vout[0].value / 3
  const rSplitDestinations = []
  rSplitDestinations[0] = { address: bobAddr, amount: rsBobAmount }
  rSplitDestinations[1] = { address: aliceAddr, amount: rsAliceAmount1 }

  const redeemSplitHex = redeemSplit(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    rSplitDestinations,
    null,
    null
  )
  const redeemTxid = await broadcast(redeemSplitHex)
  expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.00002334)
  expect(await utils.getVoutAmount(redeemTxid, 1)).to.equal(0.00002333)
  expect(await utils.getVoutAmount(redeemTxid, 2)).to.equal(0.00002333)
  expect(await utils.areFeesProcessed(redeemTxid, 3)).to.be.false
})

//Needs fixed
it("No Split Completes Successfully", async function () {

  const bobAmount = issueTx.vout[0].value
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount }
  const issueOutFundingVout = issueTx.vout.length - 1

  const redeemSplitHex = redeemSplit(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    splitDestinations,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )

  const redeemTxid = await broadcast(redeemSplitHex)

  //   expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.00002334)
  //   let noOfTokens = await countNumOfTokens(redeemTxid, true)
  //   expect(splitDestinations).to.have.length(noOfTokens) //ensure that tx output contains 1 
})

//needs fixed - throwing 'Output satoshis is not a natural number' 
it("Add Too Much To Split Throws Error", async function () {

  const bobAmount = issueTx.vout[0].value * 2
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount }
  const issueOutFundingVout = issueTx.vout.length - 1
  try {
    const redeemHex = redeemSplit(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
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

it("Address Too Short Throws Error", async function () {

  const bobAmount1 = issueTx.vout[0].value / 2
  const bobAmount2 = issueTx.vout[0].value - bobAmount1
  const splitDestinations = []
  splitDestinations[0] = { address: '1LF2wNCBT9dp5jN7fa6xSAaU', amount: bobAmount1 }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }
  const issueOutFundingVout = issueTx.vout.length - 1
  try {
    const redeemHex = redeemSplit(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
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

//throwing a 'Checksum mismatch' error - if i am reading code correctly it should validate address first 
//and trigger > ADDRESS_MAX_LENGTH  error
it("Address Too Long Throws Error", async function () {

  const bobAmount1 = issueTx.vout[0].value / 2
  const bobAmount2 = issueTx.vout[0].value - bobAmount1
  console.log(bobAddr)
  const splitDestinations = []
  splitDestinations[0] = { address: '1LF2wNCBT9dp5jN7fa6xSAaUGjJ5Pyz5VGaUG', amount: bobAmount1 }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }
  const issueOutFundingVout = issueTx.vout.length - 1
  try {
    const redeemHex = redeemSplit(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
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


it('Incorrect Owner Private Key Throws Error', async function () {

  const bobAmount1 = issueTx.vout[0].value / 2
  const bobAmount2 = issueTx.vout[0].value - bobAmount1
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }
  const issueOutFundingVout = issueTx.vout.length - 1
  const incorrectPrivateKey = bsv.PrivateKey()

  const redeemHex = redeemSplit(
    incorrectPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    splitDestinations,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )

  try {
    await broadcast(redeemHex)
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it('Incorrect Funding Private Key Throws Error', async function () {

  const bobAmount1 = issueTx.vout[0].value / 2
  const bobAmount2 = issueTx.vout[0].value - bobAmount1
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }
  const issueOutFundingVout = issueTx.vout.length - 1
  const incorrectPrivateKey = bsv.PrivateKey()

  const redeemHex = redeemSplit(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    splitDestinations,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    incorrectPrivateKey
  )

  try {
    await broadcast(redeemHex)
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it('Incorrect Public Key Throws Error', async function () {

  const bobAmount1 = issueTx.vout[0].value / 2
  const bobAmount2 = issueTx.vout[0].value - bobAmount1
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }
  const issueOutFundingVout = issueTx.vout.length - 1
  const incorrectPrivateKey = bsv.PrivateKey()

  const redeemHex = redeemSplit(
    alicePrivateKey,
    incorrectPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    splitDestinations,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )

  try {
    await broadcast(redeemHex)
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})


it("Splitting Into Too Many Tokens Throws Error", async function () {

  const bobAmount = issueTx.vout[0].value / 5
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount }
  splitDestinations[2] = { address: bobAddr, amount: bobAmount }
  splitDestinations[3] = { address: bobAddr, amount: bobAmount }
  splitDestinations[4] = { address: bobAddr, amount: bobAmount }
  const issueOutFundingVout = issueTx.vout.length - 1
  try {
    const redeemHex = redeemSplit(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Must have less than 5 segments')
  }
})



async function setup() {

  issuerPrivateKey = bsv.PrivateKey()
  fundingPrivateKey = bsv.PrivateKey()
  bobPrivateKey = bsv.PrivateKey()
  alicePrivateKey = bsv.PrivateKey()
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()
  contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
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
    2
  )
  issueTxid = await broadcast(issueHex)
  issueTx = await getTransaction(issueTxid)
}
