const expect = require('chai').expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  transfer
} = require('../../index')

const {
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../../index').utils


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
let issueOutFundingVout

beforeAll(async () => {
  await setup() // contract and issue
  issueOutFundingVout = issueTx.vout.length - 1
})

it('Transfer - Address Validation - Too Few Chars', async () => {
  const invalidAddr = '1MSCReQT9E4GpxuK1K7uyD5q'
  try {
    await transfer(
      bobPrivateKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      invalidAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid destination address')
  }
})

it(
  'Transfer -  Address Validation - Too Many Chars throws error',
  async () => {
    const invalidAddr = '1MSCReQT9E4GpxuK1K7uyD5qF1EmznXjkrmoFCgGtkmhyaL2frwff84p2bwTf3FDpkZcCgGtkmhyaL2frwff84p2bwTf3FDpkZcCgGtkmhy'
    try {
      await transfer(
        bobPrivateKey,
        utils.getUtxo(issueTxid, issueTx, 1),
        invalidAddr,
        utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
        fundingPrivateKey
      )
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Invalid destination address')
    }
  }
)

it(
  'Transfer - Null Token Owner Private Key Throws Error',
  async () => {
    try {
      await transfer(
        null,
        utils.getUtxo(issueTxid, issueTx, 1),
        aliceAddr,
        utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
        fundingPrivateKey
      )
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Token owner private key is null')
    }
  }
)

it('Transfer - Null STAS UTXO Throws Error', async () => {
  try {
    await transfer(
      bobPrivateKey,
      null,
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('stasUtxo is null')
  }
})

it('Transfer - Null Destination Address Throws Error', async () => {
  try {
    await transfer(
      bobPrivateKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      null,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.contains('destination address is null')
  }
})

it('Transfer - Null Funding Private Key Throws Error', async () => {
  try {
    await transfer(
      bobPrivateKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      null
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Payment UTXO provided but payment key is null')
  }
})

async function setup () {
  issuerPrivateKey = bsv.PrivateKey()
  fundingPrivateKey = bsv.PrivateKey()
  bobPrivateKey = bsv.PrivateKey()
  alicePrivateKey = bsv.PrivateKey()
  contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  symbol = 'TAALT'
  const supply = 10000
  const schema = utils.schema(publicKeyHash, symbol, supply)
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()
  fundingAddress = fundingPrivateKey.toAddress(process.env.NETWORK).toString()

  const contractHex = await contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  )
  const contractTxid = await broadcast(contractHex)
  const contractTx = await getTransaction(contractTxid)

  const issueHex = await issue(
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
