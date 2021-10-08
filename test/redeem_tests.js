const expect = require('chai').expect
const assert = require('chai').assert
const utils = require('./test_utils')
const chai = require('chai')
const axios = require('axios')
const bsv = require('bsv')

const {
  contract,
  issue,
  transfer,
  split,
  merge,
  mergeSplit,
  redeem
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
let mergeSplitTxid
let mergeSplitTx

beforeEach(async function () {
  await setup()
})


it('Successful Redeem', async function () {
  const redeemHex = redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(mergeSplitTxid, mergeSplitTx, 0),
    utils.getUtxo(mergeSplitTxid, mergeSplitTx, 2),
    fundingPrivateKey
  )
  const redeemTxid = await broadcast(redeemHex)
  expect(await getAmount(redeemTxid, 0)).to.equal(0.0000075)
  expect(await getAmount(redeemTxid, 1)).to.equal(0.01971258)
})

it('Successful Redeem No Fee', async function () {
  const redeemHex = redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(mergeSplitTxid, mergeSplitTx, 0),
    null,
    fundingPrivateKey
  )
  const redeemTxid = await broadcast(redeemHex)
  expect(await getAmount(redeemTxid, 0)).to.equal(0.0000075) // grab programmatically
  expect(await getAmount(redeemTxid, 1)).to.equal(0.01971258) // grab programmatically
})

it('Successful Redeem No Fee Empty Array', async function () {
  const redeemHex = redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(mergeSplitTxid, mergeSplitTx, 0),
    [],
    fundingPrivateKey
  )
  await broadcast(redeemHex)
})

it('Incorrect Stas UTXO Amount Throws Error', async function () {
  const redeemHex = redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    {
      txid: mergeSplitTxid,
      vout: 0,
      scriptPubKey: mergeSplitTx.vout[0].scriptPubKey.hex,
      amount: 0.1
    },
    {
      txid: mergeSplitTxid,
      vout: 2,
      scriptPubKey: mergeSplitTx.vout[2].scriptPubKey.hex,
      amount: mergeSplitTx.vout[2].value
    },
    fundingPrivateKey
  )
  try {
    await broadcast(redeemHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it('Incorrect Stas UTXO Amount Throws Error', async function () {
  const redeemHex = redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    {
      txid: mergeSplitTxid,
      vout: 0,
      scriptPubKey: mergeSplitTx.vout[0].scriptPubKey.hex,
      amount: mergeSplitTx.vout[0].value
    },
    {
      txid: mergeSplitTxid,
      vout: 2,
      scriptPubKey: mergeSplitTx.vout[2].scriptPubKey.hex,
      amount: 0.1
    },
    fundingPrivateKey
  )
  try {
    await broadcast(redeemHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it('Attempt To Unlock With Incorrect Public Key Throws Error', async function () {
  incorrectKey = bsv.PrivateKey()

  const redeemHex = redeem(
    alicePrivateKey,
    incorrectKey.publicKey,
    utils.getUtxo(mergeSplitTxid, mergeSplitTx, 0),
    utils.getUtxo(mergeSplitTxid, mergeSplitTx, 2),
    fundingPrivateKey
  )
  try {
    await broadcast(redeemHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it('Attempt To Redeem with Incorrect Owner Private Key Throws Error', async function () {
  incorrectKey = bsv.PrivateKey()

  const redeemHex = redeem(
    incorrectKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(mergeSplitTxid, mergeSplitTx, 0),
    utils.getUtxo(mergeSplitTxid, mergeSplitTx, 2),
    fundingPrivateKey
  )
  try {
    await broadcast(redeemHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it('Attempt To Redeem with Incorrect Payment Private Key Throws Error', async function () {
  incorrectKey = bsv.PrivateKey()

  const redeemHex = redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(mergeSplitTxid, mergeSplitTx, 0),
    utils.getUtxo(mergeSplitTxid, mergeSplitTx, 2),
    incorrectKey
  )
  try {
    await broadcast(redeemHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
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
  const issueTxid = await broadcast(issueHex)
  const issueTx = await getTransaction(issueTxid)

  const issueOutFundingVout = issueTx.vout.length - 1

  const transferHex = transfer(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    aliceAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )
  const transferTxid = await broadcast(transferHex)
  const transferTx = await getTransaction(transferTxid)

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
    utils.getUtxo(transferTxid, transferTx, 1),
    fundingPrivateKey
  )
  splitTxidMerge = await broadcast(splitHex)
  splitTxMerge = await getTransaction(splitTxidMerge)
  splitTxObjMerge = new bsv.Transaction(splitHex)

  const mergeHex = merge(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getMergeUtxo(splitTxObjMerge),
    aliceAddr,
    utils.getUtxo(splitTxidMerge, splitTxMerge, 2),
    fundingPrivateKey
  )

  const mergeTxid = await broadcast(mergeHex)
  const mergeTx = await getTransaction(mergeTxid)

  const aliceAmount1 = mergeTx.vout[0].value / 2
  const aliceAmount2 = mergeTx.vout[0].value - aliceAmount1

  const split2Destinations = []
  split2Destinations[0] = { address: aliceAddr, amount: aliceAmount1 }
  split2Destinations[1] = { address: aliceAddr, amount: aliceAmount2 }

  const splitHex2 = split(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    {
      txid: mergeTxid,
      vout: 0,
      scriptPubKey: mergeTx.vout[0].scriptPubKey.hex,
      amount: mergeTx.vout[0].value
    },
    split2Destinations,
    {
      txid: mergeTxid,
      vout: 1,
      scriptPubKey: mergeTx.vout[1].scriptPubKey.hex,
      amount: mergeTx.vout[1].value
    },
    fundingPrivateKey
  )
  const splitTxid = await broadcast(splitHex2)
  const splitTx = await getTransaction(splitTxid)

  const splitTxObj = new bsv.Transaction(splitHex2)

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis

  const mergeSplitHex = mergeSplit(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    [{
      tx: splitTxObj,
      scriptPubKey: splitTx.vout[0].scriptPubKey.hex,
      vout: 0,
      amount: splitTx.vout[0].value
    },
    {
      tx: splitTxObj,
      scriptPubKey: splitTx.vout[1].scriptPubKey.hex,
      vout: 1,
      amount: splitTx.vout[1].value

    }],
    aliceAddr,
    aliceAmountSatoshis,
    bobAddr,
    bobAmountSatoshis,
    {
      txid: splitTxid,
      vout: 2,
      scriptPubKey: splitTx.vout[2].scriptPubKey.hex,
      amount: splitTx.vout[2].value
    },
    fundingPrivateKey
  )

  mergeSplitTxid = await broadcast(mergeSplitHex)
  console.log(`MergeSplit TX:   ${mergeSplitTxid}`)
  mergeSplitTx = await getTransaction(mergeSplitTxid)
}

async function getAmount (txid, vout) {
  const url = 'https://taalnet.whatsonchain.com/v1/bsv/taalnet/tx/hash/' + txid
  const response = await axios({
    method: 'get',
    url,
    auth: {
      username: 'taal_private',
      password: 'dotheT@@l007'
    }
  })
  console.log(response.data.vout[vout].value)
  const amount = response.data.vout[vout].value
  return amount
}
