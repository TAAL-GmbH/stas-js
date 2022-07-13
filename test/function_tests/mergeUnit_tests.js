const expect = require('chai').expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  split,
  merge
} = require('../../index')

const {
  bitcoinToSatoshis,
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../../index').utils

let issuerPrivateKey
let fundingPrivateKey
let bobPrivateKey
let alicePrivateKey
let bobAddr
let aliceAddr
let contractUtxos
let fundingUtxos
let publicKeyHash
let splitTxid
let splitTx
let splitTxObj
let contractTxid
let contractTx
let issueTx
let issueTxid

beforeAll(async () => {
  await setup()
})

it('Merge - Attempt to Merge More Than 2 Tokens', async () => {
  try {
    await merge(
      bobPrivateKey,
      [{
        tx: splitTxObj,
        vout: 0
      },
      {
        tx: splitTxObj,
        vout: 1
      },
      {
        tx: splitTxObj,
        vout: 2
      }],
      aliceAddr,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('This function can only merge exactly 2 STAS tokens')
  }
})

it('Merge - Attempt to Merge Less Than Two Tokens', async () => {
  try {
    await merge(
      bobPrivateKey,
      [{
        tx: splitTxObj,
        vout: 0
      }],
      aliceAddr,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('This function can only merge exactly 2 STAS tokens')
  }
})

it('Merge - Send Merged UTXO to issuer throws error', async () => {
  const issuerAddress = issuerPrivateKey.toAddress(process.env.NETWORK).toString()
  try {
    await merge(
      bobPrivateKey,
      utils.getMergeUtxo(splitTxObj),
      issuerAddress,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Token UTXO cannot be sent to issuer address')
  }
})

it('Merge - Null Token Owner Private Key Throws Error', async () => {
  try {
    await merge(
      null,
      utils.getMergeUtxo(splitTxObj),
      aliceAddr,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Token owner private key is null')
  }
})

it('Merge - Null Merge STAS UTXO Throws Error', async () => {
  try {
    await merge(
      bobPrivateKey,
      null,
      aliceAddr,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('MergeUtxos is invalid')
  }
})

it('Merge - Null Destination Address Throws Error', async () => {
  try {
    await merge(
      bobPrivateKey,
      utils.getMergeUtxo(splitTxObj),
      null,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.contains('Destination address is null')
  }
})

it('Merge - Null Funding Private Key Throws Error', async () => {
  try {
    await merge(
      bobPrivateKey,
      utils.getMergeUtxo(splitTxObj),
      aliceAddr,
      utils.getUtxo(splitTxid, splitTx, 2),
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
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()
  contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  const symbol = 'TAALT'
  const supply = 10000
  const schema = utils.schema(publicKeyHash, symbol, supply)

  const contractHex = await contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  )
  contractTxid = await broadcast(contractHex)
  contractTx = await getTransaction(contractTxid)

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

  const issueOutFundingVout = issueTx.vout.length - 1

  const bobAmount1 = issueTx.vout[0].value / 2
  const bobAmount2 = issueTx.vout[0].value - bobAmount1
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bitcoinToSatoshis(bobAmount1) }
  splitDestinations[1] = { address: bobAddr, amount: bitcoinToSatoshis(bobAmount2) }

  const splitHex = await split(
    alicePrivateKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    splitDestinations,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )
  splitTxid = await broadcast(splitHex)
  splitTx = await getTransaction(splitTxid)
  splitTxObj = new bsv.Transaction(splitHex)
}
