const expect = require("chai").expect
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
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../../index').utils


it("Full Life Cycle Test With No Fees", async function () {

  const issuerPrivateKey = bsv.PrivateKey()
  const alicePrivateKey = bsv.PrivateKey()
  const aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()
  const bobPrivateKey = bsv.PrivateKey()
  const bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()
  const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  const supply = 10000
  const symbol = 'TAALT'
  const schema = utils.schema(publicKeyHash, symbol, supply)

  const contractHex = contract(
    issuerPrivateKey,
    contractUtxos,
    null,
    null,
    schema,
    supply
  )
  const contractTxid = await broadcast(contractHex)
  console.log(`Contract TX:     ${contractTxid}`)
  const contractTx = await getTransaction(contractTxid)
  expect(await utils.areFeesProcessed(contractTxid, 2)).to.be.false

  const issueHex = issue(
    issuerPrivateKey,
    utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
    utils.getUtxo(contractTxid, contractTx, 0),
    null,
    null,
    true,
    symbol,
    2
  )
  
  const issueTxid = await broadcast(issueHex)
  const issueTx = await getTransaction(issueTxid)
  console.log(issueTxid)
  const tokenId = await utils.getToken(issueTxid)
  console.log(`Token ID:        ${tokenId}`)
  let response = await utils.getTokenResponse(tokenId)  //token issuance fails intermittingly
  expect(await utils.areFeesProcessed(issueTxid, 3)).to.be.false
  expect(response.symbol).to.equal(symbol) 
  expect(response.contract_txs).to.contain(contractTxid)
  expect(response.issuance_txs).to.contain(issueTxid)
  expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007)
  expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003)
  await new Promise(r => setTimeout(r, 5000));
  console.log("Alice Balance "   + await utils.getTokenBalance(aliceAddr))
  console.log("Bob Balance "   + await utils.getTokenBalance(bobAddr))
  // expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000) 
  // expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)

  const transferHex = transfer(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    aliceAddr,
    null,
    null
  )
  const transferTxid = await broadcast(transferHex)
  const transferTx = await getTransaction(transferTxid)
  expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003)


  // Split tokens into 2 - both payable to Bob...
  const bobAmount1 = transferTx.vout[0].value / 2
  const bobAmount2 = transferTx.vout[0].value - bobAmount1
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }

  const splitHex = split(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(transferTxid, transferTx, 0),
    splitDestinations,
    null,
    null
  )
  const splitTxid = await broadcast(splitHex)
  const splitTx = await getTransaction(splitTxid)
  expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.000015)
  expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.000015)
  expect(await utils.areFeesProcessed(splitTxid, 2)).to.be.false;

  // Now let's merge the last split back together
  const splitTxObj = new bsv.Transaction(splitHex)

  const mergeHex = merge(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getMergeUtxo(splitTxObj),
    aliceAddr,
    null,
    null
  )

  const mergeTxid = await broadcast(mergeHex)
  const mergeTx = await getTransaction(mergeTxid)
  expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00003)
  // const tokenIdMerge = await utils.getToken(issueTxid)
  // let responseMerge = await utils.getTokenResponse(tokenIdMerge)
  // console.log(responseMerge.token)
  // expect(responseMerge.token.symbol).to.equal(symbol)
  // expect(responseMerge.token.contract_txs).to.contain(contractTxid)
  // expect(responseMerge.token.issuance_txs).to.contain(issueTxid)

  // Split again - both payable to Alice...
  const aliceAmount1 = mergeTx.vout[0].value / 2
  const aliceAmount2 = mergeTx.vout[0].value - aliceAmount1

  const split2Destinations = []
  split2Destinations[0] = { address: aliceAddr, amount: aliceAmount1 }
  split2Destinations[1] = { address: aliceAddr, amount: aliceAmount2 }

  const splitHex2 = split(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(mergeTxid, mergeTx, 0),
    split2Destinations,
    null,
    null
  )
  const splitTxid2 = await broadcast(splitHex2)
  const splitTx2 = await getTransaction(splitTxid2)
  expect(await utils.getVoutAmount(splitTxid2, 0)).to.equal(0.000015)
  expect(await utils.getVoutAmount(splitTxid2, 1)).to.equal(0.000015)
  expect(await utils.areFeesProcessed(splitTxid2, 2)).to.be.false;

  // Now mergeSplit
  const splitTxObj2 = new bsv.Transaction(splitHex2)

  const aliceAmountSatoshis = Math.floor(splitTx2.vout[0].value * 1e8) / 2
  const bobAmountSatoshis = Math.floor(splitTx2.vout[0].value * 1e8) + Math.floor(splitTx2.vout[1].value * 1e8) - aliceAmountSatoshis

  const mergeSplitHex = mergeSplit(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getMergeSplitUtxo(splitTxObj2, splitTx2),
    aliceAddr,
    aliceAmountSatoshis,
    bobAddr,
    bobAmountSatoshis,
    null,
    null
  )

  const mergeSplitTxid = await broadcast(mergeSplitHex)
  const mergeSplitTx = await getTransaction(mergeSplitTxid)
  expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.0000075)
  expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.0000225)
  expect(await utils.areFeesProcessed(mergeSplitTxid, 2)).to.be.false;


  // Alice wants to redeem the money from bob...
  const redeemHex = redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(mergeSplitTxid, mergeSplitTx, 0),
    null,
    null
  )
  const redeemTxid = await broadcast(redeemHex)
  expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.0000075)
  expect(await utils.areFeesProcessed(redeemTxid, 1)).to.be.false;
})
