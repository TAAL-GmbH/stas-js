const expect = require('chai').expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const { sighash } = require('../../lib/stas')

const {
  contract,
  contractWithCallback,
  issue,
  issueWithCallback,
  split,
  splitWithCallback,
  merge,
  mergeWithCallback,
  mergeSplit,
  mergeSplitWithCallback,
  redeem,
  redeemWithCallback,
  transfer,
  transferWithCallback
} = require('../../index')

const {

  createSwapOffer,
  acceptSwapOffer,
  createUnsignedSwapOffer,
  acceptUnsignedSwapOffer,
  makerSignSwapOffer
} = require('../../index').swap

const {
  getFundsFromFaucet,
  broadcast,
  getTransaction,
  bitcoinToSatoshis,
  getRawTransaction
} = require('../../index').utils

const ownerSignCallback = async (tx) => {
  tx.sign(issuerPrivateKey)
}

const paymentSignCallback = async (tx) => {
  tx.sign(fundingPrivateKey)
}
const issuerSignatureCallback = async (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash.sign(tx, issuerPrivateKey, sighash, i, script, satoshis).toTxFormat().toString('hex')
}
const paymentSignatureCallback = async (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash.sign(tx, fundingPrivateKey, sighash, i, script, satoshis).toTxFormat().toString('hex')
}
const bobSignatureCallback = async (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash.sign(tx, bobPrivateKey, sighash, i, script, satoshis).toTxFormat().toString('hex')
}
const aliceSignatureCallback = async (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash.sign(tx, alicePrivateKey, sighash, i, script, satoshis).toTxFormat().toString('hex')
}

let issuerPrivateKey
let fundingPrivateKey
let bobPrivateKey
let alicePrivateKey
let contractUtxos
let fundingUtxos
let publicKeyHash
let contractTx
let contractTxid
let issueTx
let issueTxid
let splitTxid
let splitTx
let splitTxObj
let schema
let aliceAddr
let bobAddr
let paymentPublicKeyHash
let tokenAIssueHex
let tokenBIssueHex
let tokenAObj
let tokenBObj
let tokenBIssueTx
let tokenAIssueTxid
let tokenBIssueTxid
let fundingUTXO
let alicePublicKeyHash
let bobPublicKeyHash
let tokenASymbol
let tokenBSymbol
const supply = 10000
const symbol = 'TAALT'
const wait = 5000 // due to delay in token issuance

it('Contract - Successful With Fees', async () => {
  await setupContract()
  const contractHex = await contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  )
  const contractTxid = await broadcast(contractHex)
  const amount = await utils.getVoutAmount(contractTxid, 0)
  expect(amount).to.equal(supply / 100000000)
})

it('Contract - Successful With Callback Fee', async () => {
  await setupContract()
  const contractHex = await contractWithCallback(
    issuerPrivateKey.publicKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey.publicKey,
    schema,
    supply,
    ownerSignCallback,
    paymentSignCallback
  )
  const contractTxid = await broadcast(contractHex)
  const amount = await utils.getVoutAmount(contractTxid, 0)
  expect(amount).to.equal(supply / 100000000)
})

it('Issue - Successful Issue Token With Split And Fee 1', async () => {
  await setupIssue()
  const issueHex = await issue(
    issuerPrivateKey,
    utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
    utils.getUtxo(contractTxid, contractTx, 0),
    utils.getUtxo(contractTxid, contractTx, 1),
    fundingPrivateKey,
    true,
    symbol
  )
  const issueTxid = await broadcast(issueHex)
  const tokenId = await utils.getToken(issueTxid)
  await new Promise(resolve => setTimeout(resolve, wait))
  const response = await utils.getTokenResponse(tokenId)
  expect(response.symbol).to.equal(symbol)
  expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007)
  expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003)
  await utils.isTokenBalance(aliceAddr, 7000)
  await utils.isTokenBalance(bobAddr, 3000)
})

it('Issue - Successful Issue Token With Split And Fee 2', async () => {
  await setupIssue()
  const issueInfo = [
    {
      addr: aliceAddr,
      satoshis: 10000,
      data: 'one'
    }
  ]
  const issueHex = await issue(
    issuerPrivateKey,
    issueInfo,
    utils.getUtxo(contractTxid, contractTx, 0),
    utils.getUtxo(contractTxid, contractTx, 1),
    fundingPrivateKey,
    true,
    symbol
  )
  const issueTxid = await broadcast(issueHex)
  const tokenId = await utils.getToken(issueTxid)
  await new Promise(resolve => setTimeout(resolve, wait))
  const response = await utils.getTokenResponse(tokenId)
  expect(response.symbol).to.equal(symbol)
  expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.0001)
  await utils.isTokenBalance(aliceAddr, 10000)
})

it('Issue - Successful Callback with Fee', async () => {
  await setupIssue()
  const issueHex = await issueWithCallback(
    issuerPrivateKey.publicKey,
    utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
    utils.getUtxo(contractTxid, contractTx, 0),
    utils.getUtxo(contractTxid, contractTx, 1),
    fundingPrivateKey.publicKey,
    true,
    symbol,
    issuerSignatureCallback,
    paymentSignatureCallback
  )
  const issueTxid = await broadcast(issueHex)
  const tokenId = await utils.getToken(issueTxid)
  await new Promise(resolve => setTimeout(resolve, wait))
  const response = await utils.getTokenResponse(tokenId)
  expect(response.symbol).to.equal(symbol)
  expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007)
  expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003)
  await utils.isTokenBalance(aliceAddr, 7000)
  await utils.isTokenBalance(bobAddr, 3000)
})

it('Merge - Successful Merge With Fee', async () => {
  await setupMerge()
  const mergeHex = await merge(
    bobPrivateKey,
    utils.getMergeUtxo(splitTxObj),
    aliceAddr,
    utils.getUtxo(splitTxid, splitTx, 2),
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

it('Merge - Successful Merge With Callback And Fee', async () => {
  await setupMerge()
  const mergeHex = await mergeWithCallback(
    bobPrivateKey.publicKey,
    utils.getMergeUtxo(splitTxObj),
    aliceAddr,
    utils.getUtxo(splitTxid, splitTx, 2),
    fundingPrivateKey.publicKey,
    bobSignatureCallback,
    paymentSignatureCallback
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

it('MergeSplit - Successful MergeSplit With Fees', async () => {
  await setupMerge() // contract, issue, transfer then split

  const issueOutFundingVout = splitTx.vout.length - 1

  const aliceAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) / 2
  const bobAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) + bitcoinToSatoshis(splitTx.vout[1].value) - aliceAmountSatoshis

  const mergeSplitHex = await mergeSplit(
    bobPrivateKey,
    utils.getMergeSplitUtxo(splitTxObj, splitTx),
    aliceAddr,
    aliceAmountSatoshis,
    bobAddr,
    bobAmountSatoshis,
    utils.getUtxo(splitTxid, splitTx, issueOutFundingVout),
    fundingPrivateKey
  )
  const mergeSplitTxid = await broadcast(mergeSplitHex)
  await new Promise(resolve => setTimeout(resolve, wait))
  expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.0000175)
  expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.0000525)
  await utils.isTokenBalance(aliceAddr, 1750)
  await utils.isTokenBalance(bobAddr, 8250)
})

it('MergeSplit - Successful MergeSplit With Callback And Fees',
  async () => {
    await setupMerge() // contract, issue, transfer then split

    const issueOutFundingVout = splitTx.vout.length - 1

    const aliceAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) / 2
    const bobAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) + bitcoinToSatoshis(splitTx.vout[1].value) - aliceAmountSatoshis

    const mergeSplitHex = await mergeSplitWithCallback(
      bobPrivateKey.publicKey,
      utils.getMergeSplitUtxo(splitTxObj, splitTx),
      aliceAddr,
      aliceAmountSatoshis,
      bobAddr,
      bobAmountSatoshis,
      utils.getUtxo(splitTxid, splitTx, issueOutFundingVout),
      fundingPrivateKey.publicKey,
      bobSignatureCallback,
      paymentSignatureCallback
    )
    const mergeSplitTxid = await broadcast(mergeSplitHex)
    await new Promise(resolve => setTimeout(resolve, wait))
    expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.0000175)
    expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.0000525)
    await utils.isTokenBalance(aliceAddr, 1750)
    await utils.isTokenBalance(bobAddr, 8250)
  }
)

it('Redeem - Successful Redeem', async () => {
  await setupRedeem()
  const redeemHex = await redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    utils.getUtxo(issueTxid, issueTx, 2),
    fundingPrivateKey
  )
  const redeemTxid = await broadcast(redeemHex)
  expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.00007)
  await utils.isTokenBalance(aliceAddr, 0)
  await utils.isTokenBalance(bobAddr, 3000)
})

it('Redeem - Successful Redeem With Callback and Fee', async () => {
  await setupRedeem()
  const redeemHex = await redeemWithCallback(
    alicePrivateKey.publicKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    utils.getUtxo(issueTxid, issueTx, 2),
    fundingPrivateKey.publicKey,
    aliceSignatureCallback,
    paymentSignatureCallback
  )
  const redeemTxid = await broadcast(redeemHex)
  expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.00007)
  await utils.isTokenBalance(aliceAddr, 0)
  await utils.isTokenBalance(bobAddr, 3000)
})

it('Split - Successful Split Into Two Tokens With Fee', async () => {
  await setupRedeem()
  const issueTxSats = issueTx.vout[0].value
  const bobAmount1 = issueTxSats / 2
  const bobAmount2 = issueTxSats - bobAmount1
  const splitDestinations = []
  splitDestinations[0] = { address: aliceAddr, amount: bitcoinToSatoshis(bobAmount1) } // 3500 tokens
  splitDestinations[1] = { address: bobAddr, amount: bitcoinToSatoshis(bobAmount2) } // 3500 tokens

  const splitHex = await split(
    alicePrivateKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    splitDestinations,
    utils.getUtxo(issueTxid, issueTx, 2),
    fundingPrivateKey
  )
  const splitTxid = await broadcast(splitHex)
  expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.000035)
  expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.000035)
  await utils.isTokenBalance(aliceAddr, 3500)
  await utils.isTokenBalance(bobAddr, 6500)
})

it('Split - Successful Split With Callback and Fee', async () => {
  await setupRedeem()
  const issueTxSats = issueTx.vout[0].value
  const bobAmount1 = issueTxSats / 2
  const bobAmount2 = issueTxSats - bobAmount1
  console.log(bobAmount1)
  console.log(bobAmount2)
  const splitDestinations = []
  splitDestinations[0] = { address: aliceAddr, amount: bitcoinToSatoshis(bobAmount1) } // 3500 tokens
  splitDestinations[1] = { address: bobAddr, amount: bitcoinToSatoshis(bobAmount2) } // 3500 tokens

  const splitHex = await splitWithCallback(
    alicePrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    splitDestinations,
    utils.getUtxo(issueTxid, issueTx, 2),
    fundingPrivateKey.publicKey,
    aliceSignatureCallback,
    paymentSignatureCallback
  )
  const splitTxid = await broadcast(splitHex)
  expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.000035)
  expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.000035)
  await utils.isTokenBalance(aliceAddr, 3500)
  await utils.isTokenBalance(bobAddr, 6500)
})

it('Transfer - Successful With Fee', async () => {
  await setupRedeem()
  const transferHex = await transfer(
    bobPrivateKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    aliceAddr,
    utils.getUtxo(issueTxid, issueTx, 2),
    fundingPrivateKey
  )
  const transferTxid = await broadcast(transferHex)
  expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003)
  await utils.isTokenBalance(aliceAddr, 10000)
  await utils.isTokenBalance(bobAddr, 0)
})

it('Transfer - Successful Callback With Fee', async () => {
  await setupRedeem()
  const transferHex = await transferWithCallback(
    bobPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    bobAddr,
    utils.getUtxo(issueTxid, issueTx, 2),
    fundingPrivateKey.publicKey,
    bobSignatureCallback,
    paymentSignatureCallback
  )
  const transferTxid = await broadcast(transferHex)
  expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003)
  await utils.isTokenBalance(bobAddr, 3000)
  await utils.isTokenBalance(aliceAddr, 7000)
})

// the maker offers a token for sats
it('Swap - 2 step token-p2pkh swap', async function () {
  await setupSwap()
  const makerVout = 0
  const takerVout = 0
  const makerStasTx = bsv.Transaction(tokenBIssueHex)
  const makerStasInputScript = makerStasTx.outputs[makerVout].script

  // taker gets some funds
  const bobUtxos = await getFundsFromFaucet(bobPrivateKey.toAddress(process.env.NETWORK).toString())
  // get input transaction
  const takerInputTxHex = await getRawTransaction(bobUtxos[0].txid)

  const alicePublicKeyHash = bsv.crypto.Hash.sha256ripemd160(alicePrivateKey.publicKey.toBuffer()).toString('hex')

  const makerInputSatoshis = tokenBObj.outputs[makerVout].satoshis
  const takerOutputSatoshis = makerInputSatoshis
  const makerOutputSatoshis = bobUtxos[0].amount
  const takerInputSatoshis = makerOutputSatoshis

  const makerInputUtxo = {
    txId: tokenBIssueTxid,
    outputIndex: takerVout,
    script: makerStasInputScript,
    satoshis: makerInputSatoshis
  }

  const wantedInfo = { type: 'native', satoshis: makerOutputSatoshis }

  const swapOfferHex = await createSwapOffer(
    alicePrivateKey,
    makerInputUtxo,
    wantedInfo
  )
  // now bob takes the offer
  const fundingUTXO = {
    txid: tokenBIssueTxid,
    vout: 1,
    scriptPubKey: tokenBIssueTx.vout[1].scriptPubKey.hex,
    amount: bitcoinToSatoshis(tokenBIssueTx.vout[1].value)
  }

  const takerInputUTXO = {
    txId: bobUtxos[0].txid,
    outputIndex: bobUtxos[0].vout,
    script: bsv.Script.fromHex(bobUtxos[0].scriptPubKey),
    satoshis: takerInputSatoshis
  }

  const fullySignedSwapHex = await acceptSwapOffer(swapOfferHex, tokenBIssueHex,
    bobPrivateKey, takerInputTxHex, takerInputUTXO, takerOutputSatoshis, alicePublicKeyHash,
    fundingUTXO, fundingPrivateKey)

  const swapTxid = await broadcast(fullySignedSwapHex)
  console.log('swaptxid', swapTxid)

  const tokenId = await utils.getToken(swapTxid, 1)
  const response = await utils.getTokenResponse(tokenId, tokenBSymbol)
  expect(response.symbol).to.equal(tokenBSymbol)
  expect(await utils.getVoutAmount(swapTxid, 0)).to.equal(0.01)
  expect(await utils.getVoutAmount(swapTxid, 1)).to.equal(0.00003)
})

// swap two STAS tokens
it('Swap - 3 step token-token swap', async function () {
  await setupSwap()
  const takerStasInputScriptHex = tokenAObj.outputs[0].script.toHex()
  const makerStasInputScript = tokenBObj.outputs[0].script

  const makerInputSatoshis = tokenBObj.outputs[0].satoshis
  const takerOutputSatoshis = makerInputSatoshis
  const makerOutputSatoshis = tokenAObj.outputs[0].satoshis
  const takerInputSatoshis = makerOutputSatoshis
  const makerInputUtxo = {
    txId: tokenBIssueTxid,
    outputIndex: 0,
    script: makerStasInputScript,
    satoshis: makerInputSatoshis
  }

  const wantedInfo = { scriptHex: takerStasInputScriptHex, satoshis: makerOutputSatoshis }

  const unsignedSwapOfferHex = await createUnsignedSwapOffer(
    alicePrivateKey,
    makerInputUtxo,
    wantedInfo
  )

  // now bob takes the offer
  const takerSignedSwapHex = await acceptUnsignedSwapOffer(unsignedSwapOfferHex, tokenBIssueHex,
    bobPrivateKey, tokenAIssueHex, 0, takerInputSatoshis, takerOutputSatoshis, alicePublicKeyHash,
    fundingUTXO, fundingPrivateKey)

  const fullySignedSwapHex = await makerSignSwapOffer(takerSignedSwapHex, tokenBIssueHex, tokenAIssueHex, alicePrivateKey, bobPublicKeyHash, paymentPublicKeyHash, fundingUTXO)
  const swapTxid = await broadcast(fullySignedSwapHex)
  console.log('swaptxid ', swapTxid)

  const tokenId = await utils.getToken(swapTxid, 0)
  const response = await utils.getTokenResponse(tokenId, tokenASymbol)
  expect(response.symbol).to.equal(tokenASymbol)
  const tokenId2 = await utils.getToken(swapTxid, 1)
  const response2 = await utils.getTokenResponse(tokenId2, tokenBSymbol)
  expect(response2.symbol).to.equal(tokenBSymbol)
  expect(await utils.getVoutAmount(swapTxid, 0)).to.equal(0.00006)
  expect(await utils.getVoutAmount(swapTxid, 1)).to.equal(0.00003)
})

async function setupContract () {
  issuerPrivateKey = bsv.PrivateKey()
  fundingPrivateKey = bsv.PrivateKey()
  contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  schema = utils.schema(publicKeyHash, symbol, supply)
}

async function setupIssue () {
  issuerPrivateKey = bsv.PrivateKey()
  fundingPrivateKey = bsv.PrivateKey()
  bobPrivateKey = bsv.PrivateKey()
  alicePrivateKey = bsv.PrivateKey()
  contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()
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
}

async function setupMerge () {
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

async function setupRedeem () {
  issuerPrivateKey = bsv.PrivateKey()
  fundingPrivateKey = bsv.PrivateKey()
  bobPrivateKey = bsv.PrivateKey()
  alicePrivateKey = bsv.PrivateKey()
  contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()
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

async function setupSwap () {
  const tokenAIssuerPrivateKey = bsv.PrivateKey()
  const tokenBIssuerPrivateKey = bsv.PrivateKey()
  fundingPrivateKey = bsv.PrivateKey()
  paymentPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(fundingPrivateKey.publicKey.toBuffer()).toString('hex')
  alicePrivateKey = bsv.PrivateKey()
  bobPrivateKey = bsv.PrivateKey()

  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()

  const tokenAContractUtxos = await getFundsFromFaucet(tokenAIssuerPrivateKey.toAddress(process.env.NETWORK).toString())
  const tokenBContractUtxos = await getFundsFromFaucet(tokenBIssuerPrivateKey.toAddress(process.env.NETWORK).toString())
  const tokenAFundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  const tokenBFundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  const tokenAIssuerPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(tokenAIssuerPrivateKey.publicKey.toBuffer()).toString('hex')
  const tokenBIssuerPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(tokenBIssuerPrivateKey.publicKey.toBuffer()).toString('hex')
  alicePublicKeyHash = bsv.crypto.Hash.sha256ripemd160(alicePrivateKey.publicKey.toBuffer()).toString('hex')
  bobPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(bobPrivateKey.publicKey.toBuffer()).toString('hex')

  // Token A
  tokenASymbol = 'TOKENA'
  const tokenASupply = 6000
  const tokenASchema = utils.schema(tokenAIssuerPublicKeyHash, tokenASymbol, tokenASupply)
  const tokenAContractHex = await contract(
    tokenAIssuerPrivateKey,
    tokenAContractUtxos,
    tokenAFundingUtxos,
    fundingPrivateKey,
    tokenASchema,
    tokenASupply
  )
  const tokenAContractTxid = await broadcast(tokenAContractHex)
  const tokenAContractTx = await getTransaction(tokenAContractTxid)

  tokenAIssueHex = await issue(
    tokenAIssuerPrivateKey,
    [{
      addr: bobAddr,
      satoshis: 6000,
      data: 'one'
    }],
    utils.getUtxo(tokenAContractTxid, tokenAContractTx, 0),
    utils.getUtxo(tokenAContractTxid, tokenAContractTx, 1),
    fundingPrivateKey,
    true,
    tokenASymbol,
    2
  )
  tokenAIssueTxid = await broadcast(tokenAIssueHex)
  tokenAObj = new bsv.Transaction(tokenAIssueHex)

  // Token B
  tokenBSymbol = 'TOKENB'
  const tokenBSupply = 3000
  const tokenBSchema = utils.schema(tokenBIssuerPublicKeyHash, tokenBSymbol, tokenBSupply)
  const tokenBContractHex = await contract(
    tokenBIssuerPrivateKey,
    tokenBContractUtxos,
    tokenBFundingUtxos,
    fundingPrivateKey,
    tokenBSchema,
    tokenBSupply
  )
  const tokenBContractTxid = await broadcast(tokenBContractHex)
  const tokenBContractTx = await getTransaction(tokenBContractTxid)

  tokenBIssueHex = await issue(
    tokenBIssuerPrivateKey,
    [{
      addr: aliceAddr,
      satoshis: 3000,
      data: 'one'
    }],
    utils.getUtxo(tokenBContractTxid, tokenBContractTx, 0),
    utils.getUtxo(tokenBContractTxid, tokenBContractTx, 1),
    fundingPrivateKey,
    true,
    tokenBSymbol,
    2
  )
  tokenBIssueTxid = await broadcast(tokenBIssueHex)
  tokenBIssueTx = await getTransaction(tokenBIssueTxid)
  tokenBObj = new bsv.Transaction(tokenBIssueHex)
  fundingUTXO = {
    txid: tokenBIssueTxid,
    vout: 1,
    scriptPubKey: tokenBIssueTx.vout[1].scriptPubKey.hex,
    amount: bitcoinToSatoshis(tokenBIssueTx.vout[1].value)
  }
}
