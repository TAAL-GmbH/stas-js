const expect = require('chai').expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  transfer,
  transferWithCallback
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
let contractUtxos
let fundingUtxos
let publicKeyHash
let aliceAddr
let bobAddr
let fundingAddress
let symbol
let issueTxid
let issueTx
let issueOutFundingVout

const wait = 5000

const bobSignatureCallback = (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash.sign(tx, bobPrivateKey, sighash, i, script, satoshis)
}
const paymentSignatureCallback = (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash.sign(tx, fundingPrivateKey, sighash, i, script, satoshis)
}

beforeEach(async () => {
  await setup() // contract and issue
  issueOutFundingVout = issueTx.vout.length - 1
})

it('Transfer - Successful With Fee 1', async () => {
  const transferHex = transfer(
    bobPrivateKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    aliceAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )
  const transferTxid = await broadcast(transferHex)
  const tokenId = await utils.getToken(transferTxid)
  await new Promise(resolve => setTimeout(resolve, wait))
  console.log(tokenId)
  const response = await utils.getTokenResponse(tokenId)
  expect(response.symbol).to.equal(symbol)
  expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003)
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(10000)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(0)
})

it.only('Transfer - Successful With Fee 2', async () => {
  const transferHex = transfer(
    alicePrivateKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    bobAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )
  console.log(transferHex)
  const transferTxid = await broadcast(transferHex)
  const tokenId = await utils.getToken(transferTxid)
  await new Promise(resolve => setTimeout(resolve, wait))
  const response = await utils.getTokenResponse(tokenId)
  expect(response.symbol).to.equal(symbol)
  expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00007)
  console.log('Alice Balance ' + (await utils.getTokenBalance(aliceAddr)))
  console.log('Bob Balance ' + (await utils.getTokenBalance(bobAddr)))
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(0)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(10000)
})

it('Transfer - Successful With Fee 3', async () => {
  const davePrivateKey = bsv.PrivateKey()
  const daveAddr = davePrivateKey.toAddress(process.env.NETWORK).toString()
  const transferHex = transfer(
    bobPrivateKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    daveAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )
  const transferTxid = await broadcast(transferHex)
  const tokenId = await utils.getToken(transferTxid)
  await new Promise(resolve => setTimeout(resolve, wait))
  const response = await utils.getTokenResponse(tokenId)
  expect(response.symbol).to.equal(symbol)
  expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003)
  expect(await utils.getTokenBalance(daveAddr)).to.equal(3000)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(0)
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
})

it('Transfer - Successful With Fee 4', async () => {
  const transferHex = transfer(
    bobPrivateKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    bobAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )
  const transferTxid = await broadcast(transferHex)
  const tokenId = await utils.getToken(transferTxid)
  await new Promise(resolve => setTimeout(resolve, wait))
  const response = await utils.getTokenResponse(tokenId)
  expect(response.symbol).to.equal(symbol)
  expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
})

it('Transfer - Successful to Funding Address', async () => {
  const transferHex = transfer(
    bobPrivateKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    fundingAddress,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )
  const transferTxid = await broadcast(transferHex)
  const tokenId = await utils.getToken(transferTxid)
  await new Promise(resolve => setTimeout(resolve, wait))
  const response = await utils.getTokenResponse(tokenId)
  expect(response.symbol).to.equal(symbol)
  expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(0)
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
  expect(await utils.getTokenBalance(fundingAddress)).to.equal(3000)
})

// no fees disabled for tests
// it('Transfer - Successful No Fee', async () => {
//   const transferHex = transfer(
//     bobPrivateKey,
//     utils.getUtxo(issueTxid, issueTx, 1),
//     aliceAddr,
//     null,
//     null
//   )
//   const transferTxid = await broadcast(transferHex)
//   const tokenId = await utils.getToken(transferTxid)
//   await new Promise(resolve => setTimeout(resolve, wait))
//   const response = await utils.getTokenResponse(tokenId)
//   expect(response.symbol).to.equal(symbol)
//   expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003)
//   expect(await utils.getTokenBalance(aliceAddr)).to.equal(10000)
//   expect(await utils.getTokenBalance(bobAddr)).to.equal(0)
// })

// it('Transfer - Successful Callback With No Fee', async () => {
//   const transferHex = transferWithCallback(
//     bobPrivateKey.publicKey,
//     utils.getUtxo(issueTxid, issueTx, 1),
//     bobAddr,
//     null,
//     null,
//     bobSignatureCallback,
//     null
//   )
//   const transferTxid = await broadcast(transferHex)
//   const tokenId = await utils.getToken(transferTxid)
//   await new Promise(resolve => setTimeout(resolve, wait))
//   const response = await utils.getTokenResponse(tokenId)
//   expect(response.symbol).to.equal(symbol)
//   expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003)
//   expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
//   expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
// })

it('Transfer - Successful Callback With Fee', async () => {
  const transferHex = transferWithCallback(
    bobPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    bobAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey.publicKey,
    bobSignatureCallback,
    paymentSignatureCallback
  )
  const transferTxid = await broadcast(transferHex)
  const tokenId = await utils.getToken(transferTxid)
  await new Promise(resolve => setTimeout(resolve, wait))
  const response = await utils.getTokenResponse(tokenId)
  expect(response.symbol).to.equal(symbol)
  expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
})

it(
  'Transfer -  Transfer To Issuer Address (Splitable) Throws Error',
  async () => {
    const issuerAddr = issuerPrivateKey.toAddress(process.env.NETWORK).toString()
    const transferHex = transfer(
      issuerPrivateKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      issuerAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    try {
      await broadcast(transferHex)
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.response.data).to.contain('mandatory-script-verify-flag-failed')
    }
  }
)

it('Transfer - Invalid Issuer Private Key Throws Error', async () => {
  const incorrectPK = bsv.PrivateKey()
  const transferHex = transfer(
    incorrectPK,
    utils.getUtxo(issueTxid, issueTx, 1),
    aliceAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )
  try {
    await broadcast(transferHex)
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.response.data).to.contain('mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)')
  }
})

it('Transfer - Invalid Funding Private Key Throws Error', async () => {
  const incorrectPK = bsv.PrivateKey()
  const transferHex = transfer(
    bobPrivateKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    aliceAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    incorrectPK
  )
  try {
    await broadcast(transferHex)
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.response.data).to.contain('mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)')
  }
})

it('Transfer - Address Validation - Too Few Chars', async () => {
  const invalidAddr = '1MSCReQT9E4GpxuK1K7uyD5q'
  try {
    transfer(
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
      transfer(
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
      transfer(
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
    transfer(
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
    transfer(
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
    transfer(
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
    symbol,
    2
  )
  issueTxid = await broadcast(issueHex)
  issueTx = await getTransaction(issueTxid)
}
