const expect = require('chai').expect
const assert = require('chai').assert
const utils = require('./utils/test_utils')
const bsv = require('bsv')

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

const issuerPrivateKey = bsv.PrivateKey()
const fundingPrivateKey = bsv.PrivateKey()
const bobPrivateKey = bsv.PrivateKey()
const alicePrivateKey = bsv.PrivateKey()
const bobAddr = bobPrivateKey.toAddress().toString()
const aliceAddr = alicePrivateKey.toAddress().toString()
let issueTxid
let issueTx

//broadcast failing for all tests- 16: mandatory-script-verify-flag-failed (Script failed an OP_VERIFY operation)

beforeEach(async function () {

  await setup()
})

it('Successful RedeemSplit With Fees', async function () {

  const bobAmount1 = issueTx.vout[0].value / 2
  const bobAmount2 = issueTx.vout[0].value - bobAmount1
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }
  const issueOutFundingVout = issueTx.vout.length - 1

  const redeemHex = redeemSplit(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    splitDestinations,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )
  console.log(redeemHex)
  const redeemSplitTxid = await broadcast(redeemHex)
})

it('Successful RedeemSplit With No Fees', async function () {

  const bobAmount1 = issueTx.vout[0].value / 2
  const bobAmount2 = issueTx.vout[0].value - bobAmount1
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }
  const issueOutFundingVout = issueTx.vout.length - 1

  const redeemHex = redeemSplit(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    splitDestinations,
    null,
    null
  )
  console.log(redeemHex)
  const redeemSplitTxid = await broadcast(redeemHex)
})

it("No Split Completes Successfully", async function () {

  const bobAmount = issueTx.vout[0].value
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount }
  const issueOutFundingVout = issueTx.vout.length - 1

  const redeemHex = redeemSplit(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    splitDestinations,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )
  const splitTxid = await broadcast(redeemHex)
  let noOfTokens = await countNumOfTokens(splitTxid, true)
  expect(splitDestinations).to.have.length(noOfTokens) //ensure that tx output contains 1 
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



async function setup () {
  const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress('testnet').toString())
  const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress('testnet').toString())
  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
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
