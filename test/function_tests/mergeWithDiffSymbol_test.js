const expect = require('chai').expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  split,
  merge,
  mergeWithCallback
} = require('../../index')

const {
  bitcoinToSatoshis,
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../../index').utils

const { sighash } = require('../../lib/stas')

let issuerPrivateKey
let fundingPrivateKey
let bobPrivateKey
let alicePrivateKey
let bobAddr
let aliceAddr
let contractUtxos
let fundingUtxos
let publicKeyHash
let contractTxid
let contractTx
let issueTxid
let issueTx
let issueObj1
let issueObj2
const wait = 5000

beforeEach(async () => {
  await setup()
})

// failing due to https://taaltech.atlassian.net/browse/BPAAS-64
it('Merge - Successful Merge With Fee', async () => {
  const mergeHex = merge(
    bobPrivateKey,
    [{
      tx: issueObj1,
      vout: 0
    },
    {
      tx: issueObj2,
      vout: 0
    }],
    aliceAddr,
    utils.getUtxo(issueTxid, issueTx, 1),
    fundingPrivateKey
  )
  const mergeTxid = await broadcast(mergeHex)
  await new Promise(resolve => setTimeout(resolve, wait))
  const tokenIdMerge = await utils.getToken(mergeTxid)
  const response = await utils.getTokenResponse(tokenIdMerge)
  expect(response.symbol).to.equal('TAALT')
  expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00007)
  await utils.isTokenBalance(aliceAddr, 7000)
  await utils.isTokenBalance(bobAddr, 3000)
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
  const contractUtxos2 = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  const fundingUtxos2 = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  const symbol = 'TAALT'
  const symbol2 = 'TAALT2'
  const supply = 10000
  const schema = utils.schema(publicKeyHash, symbol, supply)
  const schema2 = utils.schema(publicKeyHash, symbol2, supply)
  const issueInfo = [
    {
      addr: aliceAddr,
      satoshis: 10000,
      data: 'one'
    }
  ]

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

  const issueHex = issue(
    issuerPrivateKey,
    issueInfo,
    utils.getUtxo(contractTxid, contractTx, 0),
    utils.getUtxo(contractTxid, contractTx, 1),
    fundingPrivateKey,
    true,
    symbol,
    2
  )
  issueTxid = await broadcast(issueHex)
  issueTx = await getTransaction(issueTxid)
  issueObj1 = bsv.Transaction(issueHex)

  const contractHex2 = contract(
    issuerPrivateKey,
    contractUtxos2,
    fundingUtxos2,
    fundingPrivateKey,
    schema2,
    supply
  )
  const contractTxid2 = await broadcast(contractHex2)
  const contractTx2 = await getTransaction(contractTxid2)

  const issueHex2 = issue(
    issuerPrivateKey,
    issueInfo,
    utils.getUtxo(contractTxid2, contractTx2, 0),
    utils.getUtxo(contractTxid2, contractTx2, 1),
    fundingPrivateKey,
    true,
    symbol2,
    2
  )
  const issueTxid2 = await broadcast(issueHex2)
  issueObj2 = bsv.Transaction(issueHex2)
}
