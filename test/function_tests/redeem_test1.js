const expect = require('chai').expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  redeem
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
let bobAddr
let aliceAddr
let issueTxid
let issueTx

beforeAll(async () => {
  await setup()
})

it('Redeem - Null Token Owner Private Key Throws Error', async () => {
  try {
    await redeem(
      null,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Token owner private key is null')
  }
})

it('Redeem - Null STAS UTXO Throws Error', async () => {
  try {
    await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      null,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('stasUtxo is null')
  }
})

it(
  'Redeem -  No Fee UTXO but funding pk provided throws error',
  async () => {
    try {
      await redeem(
        alicePrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(issueTxid, issueTx, 0),
        null,
        fundingPrivateKey
      )
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Payment key provided but payment UTXO is null')
    }
  }
)

it('Redeem - Null Funding Private Key Throws Error', async () => {
  try {
    await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 2),
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
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()
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
