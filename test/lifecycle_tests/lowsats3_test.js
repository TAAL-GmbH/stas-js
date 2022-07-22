const expect = require('chai').expect
const utils = require('../utils/test_utils')

const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  transfer,
  split,
  merge,
  mergeSplit,
  redeem
} = require('../../index')

const {
  bitcoinToSatoshis,
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../../index').utils

it('Full Life Cycle Test Low Sats 3', async () => {
  const issuerPrivateKey = bsv.PrivateKey()
  const fundingPrivateKey = bsv.PrivateKey()

  const alicePrivateKey = bsv.PrivateKey()
  const aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()

  const bobPrivateKey = bsv.PrivateKey()
  const bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()

  const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())

  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  const supply = 2
  const symbol = 'TAALT'
  const schema = utils.schema(publicKeyHash, symbol, supply)
  const wait = 5000

  // change goes back to the fundingPrivateKey
  const contractHex = await contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  )
  const contractTxid = await broadcast(contractHex)
  console.log(`Contract TX:     ${contractTxid}`)
  const contractTx = await getTransaction(contractTxid)

  const issueHex = await issue(
    issuerPrivateKey,
    utils.getIssueInfo(aliceAddr, 1, bobAddr, 1),
    utils.getUtxo(contractTxid, contractTx, 0),
    utils.getUtxo(contractTxid, contractTx, 1),
    fundingPrivateKey,
    true,
    symbol,
    2
  )
  const issueTxid = await broadcast(issueHex)
  const issueTx = await getTransaction(issueTxid)
  await new Promise(resolve => setTimeout(resolve, wait))
  const tokenId = await utils.getToken(issueTxid)
  const response = await utils.getTokenResponse(tokenId)
  expect(response.symbol).to.equal(symbol)
  expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00000001)
  expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00000001)
  await utils.isTokenBalance(aliceAddr, 1)
  await utils.isTokenBalance(bobAddr, 1)

  const issueOutFundingVout = issueTx.vout.length - 1

  const transferHex = await transfer(
    bobPrivateKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    aliceAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )
  const transferTxid = await broadcast(transferHex)
  console.log(`Transfer TX:     ${transferTxid}`)
  const transferTx = await getTransaction(transferTxid)
  expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00000001)
  await utils.isTokenBalance(aliceAddr, 2)
  await utils.isTokenBalance(bobAddr, 0)

  const redeemHex = await redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(transferTxid, transferTx, 0),
    utils.getUtxo(transferTxid, transferTx, 1),
    fundingPrivateKey
  )
  const redeemTxid = await broadcast(redeemHex)
  console.log(`Redeem TX:       ${redeemTxid}`)
  const redeemTx = await getTransaction(redeemTxid)
  expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.00000001)
  await utils.isTokenBalance(aliceAddr, 1)
  await utils.isTokenBalance(bobAddr, 0)

  const redeemHex2 = await redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    utils.getUtxo(redeemTxid, redeemTx, 1),
    fundingPrivateKey
  )
  const redeemTxid2 = await broadcast(redeemHex2)
  console.log(`Redeem TX2:       ${redeemTxid2}`)
  expect(await utils.getVoutAmount(redeemTxid2, 0)).to.equal(0.00000001)
  await utils.isTokenBalance(aliceAddr, 0)
  await utils.isTokenBalance(bobAddr, 0)
})
