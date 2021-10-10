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
  mergeSplit
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
let splitTxid
let splitTx
let splitTxObj

it('Successful MergeSplit With Fees', async function () {
  await setup() // contract, issue, transfer then split

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis

  const mergeSplitHex = mergeSplit(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getMergeSplitUtxo(splitTxObj, splitTx),
    aliceAddr,
    aliceAmountSatoshis,
    bobAddr,
    bobAmountSatoshis,
    utils.getUtxo(splitTxid, splitTx, 2),
    fundingPrivateKey
  )
  const mergeSplitTxid = await broadcast(mergeSplitHex)
  expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.0000075)
  expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.0000225)
  expect(await utils.areFeesProcessed(mergeSplitTxid, 2)).to.be.true
})

it('Successful MergeSplit No Fees', async function () {
  await setup() // contract, issue, transfer then split

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis

  const mergeSplitHex = mergeSplit(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getMergeSplitUtxo(splitTxObj, splitTx),
    aliceAddr,
    aliceAmountSatoshis,
    bobAddr,
    bobAmountSatoshis,
    null,
    fundingPrivateKey
  )
  const mergeSplitTxid = await broadcast(mergeSplitHex)
  expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.0000075)
  expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.0000225)
  expect(await utils.areFeesProcessed(mergeSplitTxid, 2)).to.be.false
})

// needs fixed
it('Successful MergeSplit No Fees Empty Array', async function () {
  await setup() // contract, issue, transfer then split

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis

  const mergeSplitHex = mergeSplit(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getMergeSplitUtxo(splitTxObj, splitTx),
    aliceAddr,
    aliceAmountSatoshis,
    bobAddr,
    bobAmountSatoshis,
    [],
    fundingPrivateKey
  )
  await broadcast(mergeSplitHex)
})

// Should fail as token amount has been changed?
it('Incorrect Satoshi Merge Amount Throws Error', async function () {
  await setup() // contract, issue, transfer then split

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis

  const mergeSplitHex = mergeSplit(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    [{
      tx: splitTxObj,
      scriptPubKey: splitTx.vout[0].scriptPubKey.hex,
      vout: 0,
      amount: 1000
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
    utils.getUtxo(splitTxid, splitTx, 2),
    fundingPrivateKey
  )
  try {
    await broadcast(mergeSplitHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }

})

it('Incorrect Destination 1 Satoshi Amount', async function () {
  await setup() // contract, issue, transfer then split

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis

  const mergeSplitHex = mergeSplit(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getMergeSplitUtxo(splitTxObj, splitTx),
    aliceAddr,
    100,
    bobAddr,
    bobAmountSatoshis,
    utils.getUtxo(splitTxid, splitTx, 2),
    fundingPrivateKey
  )
  try {
    await broadcast(mergeSplitHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it('Incorrect Destination 2 Satoshi Amount', async function () {
  await setup() // contract, issue, transfer then split

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis

  const mergeSplitHex = mergeSplit(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getMergeSplitUtxo(splitTxObj, splitTx),
    aliceAddr,
    aliceAmountSatoshis,
    bobAddr,
    100,
    utils.getUtxo(splitTxid, splitTx, 2),
    fundingPrivateKey
  )
  try {
    await broadcast(mergeSplitHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it('Incorrect Owner Private Key Throws Error', async function () {
  await setup() // contract, issue, transfer then split

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis
  const incorrectPrivateKey = bsv.PrivateKey()

  const mergeSplitHex = mergeSplit(
    incorrectPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getMergeSplitUtxo(splitTxObj, splitTx),
    aliceAddr,
    aliceAmountSatoshis,
    bobAddr,
    bobAmountSatoshis,
    utils.getUtxo(splitTxid, splitTx, 2),
    fundingPrivateKey
  )
  try {
    await broadcast(mergeSplitHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it('Incorrect Payments Private Key Throws Error', async function () {
  await setup() // contract, issue, transfer then split

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis
  const incorrectPrivateKey = bsv.PrivateKey()

  const mergeSplitHex = mergeSplit(
    issuerPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getMergeSplitUtxo(splitTxObj, splitTx),
    aliceAddr,
    aliceAmountSatoshis,
    bobAddr,
    bobAmountSatoshis,
    utils.getUtxo(splitTxid, splitTx, 2),
    incorrectPrivateKey
  )
  try {
    await broadcast(mergeSplitHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it('Incorrect Contract Public Key Throws Error', async function () {
  await setup() // contract, issue, transfer then split

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis
  const incorrectPrivateKey = bsv.PrivateKey()

  const mergeSplitHex = mergeSplit(
    issuerPrivateKey,
    incorrectPrivateKey.publicKey,
    utils.getMergeSplitUtxo(splitTxObj, splitTx),
    aliceAddr,
    aliceAmountSatoshis,
    bobAddr,
    bobAmountSatoshis,
    utils.getUtxo(splitTxid, splitTx, 2),
    fundingPrivateKey
  )
  try {
    await broadcast(mergeSplitHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it('Attempt to MergeSplit More Than Two Tokens Throws Error', async function () {
  await setup() // contract, issue, transfer then split

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis
  const incorrectPrivateKey = bsv.PrivateKey()
  try {
    const mergeSplitHex = mergeSplit(
      incorrectPrivateKey,
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

      },
      {
        tx: splitTxObj,
        scriptPubKey: splitTx.vout[2].scriptPubKey.hex,
        vout: 2,
        amount: splitTx.vout[2].value

      }],
      aliceAddr,
      aliceAmountSatoshis,
      bobAddr,
      bobAmountSatoshis,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('This function can only merge exactly 2 STAS tokens')
  }
})

it('Attempt to MergeSplit Less Than Two Tokens Throws Error', async function () {
  await setup() // contract, issue, transfer then split

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis
  const incorrectPrivateKey = bsv.PrivateKey()
  try {
    const mergeSplitHex = mergeSplit(
      incorrectPrivateKey,
      issuerPrivateKey.publicKey,
      [{
        tx: splitTxObj,
        scriptPubKey: splitTx.vout[0].scriptPubKey.hex,
        vout: 0,
        amount: splitTx.vout[0].value
      }],
      aliceAddr,
      aliceAmountSatoshis,
      bobAddr,
      bobAmountSatoshis,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('This function can only merge exactly 2 STAS tokens')
  }
})

it('Invalid Address Destination Address 1 Throws Error', async function () {
  await setup() // contract, issue, transfer then split

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis
  const invalidAddr = '1MSCReQT9E4GpxuK1K'

  try {
    const mergeSplitHex = mergeSplit(
      issuerPrivateKey,
      issuerPrivateKey.publicKey,
      utils.getMergeSplitUtxo(splitTxObj, splitTx),
      invalidAddr,
      aliceAmountSatoshis,
      bobAddr,
      bobAmountSatoshis,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Address string provided')
  }
})

it('Invalid Address Destination Address 2 Throws Error', async function () {
  await setup() // contract, issue, transfer then split

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis
  const invalidAddr = '1MSCReQT9E4GpxuK1K'

  try {
    const mergeSplitHex = mergeSplit(
      issuerPrivateKey,
      issuerPrivateKey.publicKey,
        utils.getMergeSplitUtxo(splitTxObj, splitTx),
      aliceAddr,
      aliceAmountSatoshis,
      invalidAddr,
      bobAmountSatoshis,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Address string provided')
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
    utils.getUtxo(mergeTxid, mergeTx, 0),
    split2Destinations,
    utils.getUtxo(mergeTxid, mergeTx, 1),
    fundingPrivateKey
  )
  splitTxid = await broadcast(splitHex2)
  splitTx = await getTransaction(splitTxid)

  splitTxObj = new bsv.Transaction(splitHex2)
}
