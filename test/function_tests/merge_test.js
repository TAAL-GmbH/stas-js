const expect = require('chai').expect
const assert = require('chai').assert
const utils = require('../utils/test_utils')
const bsv = require('bsv')
const mergeUtil = require('../utils/mergeWithoutValidation')
require('dotenv').config()

const {
  contract,
  issue,
  split,
  merge,
  mergeWithCallback
} = require('../../index')

const {
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
let splitTxid
let splitTx
let splitTxObj
let contractTxid
let contractTx
let issueTx
let issueTxid


const issuerSignatureCallback = (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash.sign(tx, issuerPrivateKey, sighash, i, script, satoshis)
}
const aliceSignatureCallback = (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash.sign(tx, alicePrivateKey, sighash, i, script, satoshis)
}
const bobSignatureCallback = (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash.sign(tx, bobPrivateKey, sighash, i, script, satoshis)
}
const paymentSignatureCallback = (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash.sign(tx, fundingPrivateKey, sighash, i, script, satoshis)
}

beforeEach(async function () {
  await setup()
})

describe('regression, testnet', function () {

  it('Merge - Successful Merge With Fee', async function () {
    const mergeHex = merge(
      bobPrivateKey,
      issuerPrivateKey.publicKey,
      utils.getMergeUtxo(splitTxObj),
      aliceAddr,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    const mergeTxid = await broadcast(mergeHex)
    const tokenIdMerge = await utils.getToken(mergeTxid)
    const response = await utils.getTokenResponse(tokenIdMerge)
    expect(response.symbol).to.equal('TAALT')
    expect(response.contract_txs).to.contain(contractTxid)
    expect(response.issuance_txs).to.contain(issueTxid)
    expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00007)
    console.log('Alice Balance ' + await utils.getTokenBalance(aliceAddr))
    console.log('Bob Balance ' + await utils.getTokenBalance(bobAddr))
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
  })
})

it('Merge - Successful Merge With Fee 2', async function () {
  const mergeHex = merge(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getMergeUtxo(splitTxObj),
    bobAddr,
    utils.getUtxo(splitTxid, splitTx, 2),
    fundingPrivateKey
  )
  const mergeTxid = await broadcast(mergeHex)
  const tokenIdMerge = await utils.getToken(mergeTxid)
  const response = await utils.getTokenResponse(tokenIdMerge)
  expect(response.symbol).to.equal('TAALT')
  expect(response.contract_txs).to.contain(contractTxid)
  expect(response.issuance_txs).to.contain(issueTxid)
  expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00007)
  console.log('Alice Balance ' + await utils.getTokenBalance(aliceAddr))
  console.log('Bob Balance ' + await utils.getTokenBalance(bobAddr))
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(0)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(10000)
})

it('Merge - Merge With No Fee', async function () {
  const mergeHex = merge(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getMergeUtxo(splitTxObj),
    aliceAddr,
    null,
    null
  )
  const mergeTxid = await broadcast(mergeHex)
  const tokenIdMerge = await utils.getToken(mergeTxid)
  const response = await utils.getTokenResponse(tokenIdMerge)
  expect(response.symbol).to.equal('TAALT')
  expect(response.contract_txs).to.contain(contractTxid)
  expect(response.issuance_txs).to.contain(issueTxid)
  console.log('Alice Balance ' + await utils.getTokenBalance(aliceAddr))
  console.log('Bob Balance ' + await utils.getTokenBalance(bobAddr))
  expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00007)
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
})

it('Merge - Successful Merge With Callback And Fee', async function () {

  const mergeHex = mergeWithCallback(
    bobPrivateKey.publicKey,
    utils.getMergeUtxo(splitTxObj),
    aliceAddr,
    utils.getUtxo(splitTxid, splitTx, 2),
    fundingPrivateKey.publicKey,
    bobSignatureCallback,
    paymentSignatureCallback
  )
  const mergeTxid = await broadcast(mergeHex)
  const tokenIdMerge = await utils.getToken(mergeTxid)
  const response = await utils.getTokenResponse(tokenIdMerge)
  expect(response.symbol).to.equal('TAALT')
  expect(response.contract_txs).to.contain(contractTxid)
  expect(response.issuance_txs).to.contain(issueTxid)
  expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00007)
  console.log('Alice Balance ' + await utils.getTokenBalance(aliceAddr))
  console.log('Bob Balance ' + await utils.getTokenBalance(bobAddr))
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
})

it('Merge - Successful Merge With Callback And No Fee', async function () {

  const mergeHex = mergeWithCallback(
    bobPrivateKey.publicKey,
    utils.getMergeUtxo(splitTxObj),
    aliceAddr,
    null,
    null,
    bobSignatureCallback,
    null
    )
  const mergeTxid = await broadcast(mergeHex)
  const tokenIdMerge = await utils.getToken(mergeTxid)
  const response = await utils.getTokenResponse(tokenIdMerge)
  expect(response.symbol).to.equal('TAALT')
  expect(response.contract_txs).to.contain(contractTxid)
  expect(response.issuance_txs).to.contain(issueTxid)
  expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00007)
  console.log('Alice Balance ' + await utils.getTokenBalance(aliceAddr))
  console.log('Bob Balance ' + await utils.getTokenBalance(bobAddr))
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
})



it('Merge - Incorrect Owner Private Key Throws Error', async function () {
  const incorrectPrivateKey = bsv.PrivateKey()
  const mergeHex = merge(
    incorrectPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getMergeUtxo(splitTxObj),
    aliceAddr,
    utils.getUtxo(splitTxid, splitTx, 2),
    fundingPrivateKey
  )
  try {
    await broadcast(mergeHex)
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.response.data).to.contain('mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)')
  }
})

it('Merge - Incorrect Funding Private Key Throws Error', async function () {
  const incorrectPrivateKey = bsv.PrivateKey()
  const mergeHex = merge(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getMergeUtxo(splitTxObj),
    aliceAddr,
    utils.getUtxo(splitTxid, splitTx, 2),
    incorrectPrivateKey
  )
  try {
    await broadcast(mergeHex)
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.response.data).to.contain('mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)')
  }
})

it('Merge - Attempt to Merge More Than 2 Tokens', async function () {
  try {
    merge(
      bobPrivateKey,
      issuerPrivateKey.publicKey,
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
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('This function can only merge exactly 2 STAS tokens')
  }
})

it('Merge - Attempt to Merge More Than 2 Tokens Without SDK Validation', async function () {
  const mergeHex = mergeUtil.mergeWithoutValidation(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
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
  try {
    await broadcast(mergeHex)
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it('Merge - Attempt to Merge Less Than Two Tokens', async function () {
  try {
    merge(
      bobPrivateKey,
      issuerPrivateKey.publicKey,
      [{
        tx: splitTxObj,
        vout: 0
      }],
      aliceAddr,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('This function can only merge exactly 2 STAS tokens')
  }
})

it('Merge - Null Token Owner Private Key Throws Error', async function () {
  try {
    merge(
      null,
      issuerPrivateKey.publicKey,
      utils.getMergeUtxo(splitTxObj),
      aliceAddr,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Token owner private key is null')
  }
})

it('Merge - Null Merge STAS UTXO Throws Error', async function () {
  try {
    merge(
      bobPrivateKey,
      issuerPrivateKey.publicKey,
      null,
      aliceAddr,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('MergeUtxos is invalid')
  }
})

it('Merge - Null Destination Address Throws Error', async function () {
  try {
    merge(
      bobPrivateKey,
      issuerPrivateKey.publicKey,
      utils.getMergeUtxo(splitTxObj),
      null,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.contains('Destination address is null')
  }
})

it('Merge - Null Funding Private Key Throws Error', async function () {
  try {
    merge(
      bobPrivateKey,
      issuerPrivateKey.publicKey,
      utils.getMergeUtxo(splitTxObj),
      aliceAddr,
      utils.getUtxo(splitTxid, splitTx, 2),
      null
    )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Payment UTXO provided but payment key is null')
  }
})

async function setup() {
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
  splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }

  const splitHex = split(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    splitDestinations,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )
  splitTxid = await broadcast(splitHex)
  splitTx = await getTransaction(splitTxid)
  splitTxObj = new bsv.Transaction(splitHex)
}
