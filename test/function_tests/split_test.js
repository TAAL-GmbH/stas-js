const expect = require('chai').expect
const assert = require('chai').assert
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  split,
  splitWithCallback
} = require('../../index')

const {
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../../index').utils

const { sighash } = require('../../lib/stas')

let issuerPrivateKey
let fundingPrivateKey
let contractUtxos
let fundingUtxos
let publicKeyHash
let bobPrivateKey
let alicePrivateKey
let bobAddr
let aliceAddr
let issueTxid
let issueTx


const aliceSignatureCallback = (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash.sign(tx, alicePrivateKey, sighash, i, script, satoshis)
}
const paymentSignatureCallback = (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash.sign(tx, fundingPrivateKey, sighash, i, script, satoshis)
}

beforeEach(async function () {
  await setup() // contract and issue
})

describe('regression, testnet', function () {

  it('Split - Successful Split Into Two Tokens With Fee', async function () {

    const bobAmount1 = issueTx.vout[0].value / 2
    const bobAmount2 = issueTx.vout[0].value - bobAmount1
    console.log(bobAmount1)
    console.log(bobAmount2)
    const splitDestinations = []
    splitDestinations[0] = { address: aliceAddr, amount: bobAmount1 } // 3500 tokens
    splitDestinations[1] = { address: bobAddr, amount: bobAmount2 } // 3500 tokens

    const splitHex = split(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    )
    const splitTxid = await broadcast(splitHex)
    const noOfTokens = await utils.countNumOfTokens(splitTxid, true)
    expect(splitDestinations).to.have.length(noOfTokens) // ensure that tx output contains 2 values
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.000035)
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.000035)
    console.log('Alice Balance ' + await utils.getTokenBalance(aliceAddr))
    console.log('Bob Balance ' + await utils.getTokenBalance(bobAddr))
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(3500)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(6500)
  })


  it('Split - Successful Split Into Three Tokens', async function () {
    const bobAmount = issueTx.vout[0].value / 2
    const bobAmount2 = bobAmount / 2
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }
    splitDestinations[2] = { address: aliceAddr, amount: bobAmount2 }

    const splitHex = split(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    )
    const splitTxid = await broadcast(splitHex)
    const noOfTokens = await utils.countNumOfTokens(splitTxid, true)
    expect(splitDestinations).to.have.length(noOfTokens) // ensure that tx output contains 4 values
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.000035)
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.0000175)
    expect(await utils.getVoutAmount(splitTxid, 2)).to.equal(0.0000175)
    console.log('Alice Balance ' + await utils.getTokenBalance(aliceAddr))
    console.log('Bob Balance ' + await utils.getTokenBalance(bobAddr))
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(1750)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(8250)
  })


  it('Split - Successful Split Into Four Tokens 1', async function () {
    const amount = issueTx.vout[0].value / 4
    const splitDestinations = []
    splitDestinations[0] = { address: aliceAddr, amount: amount }
    splitDestinations[1] = { address: bobAddr, amount: amount }
    splitDestinations[2] = { address: bobAddr, amount: amount }
    splitDestinations[3] = { address: bobAddr, amount: amount }

    const splitHex = split(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    )
    const splitTxid = await broadcast(splitHex)
    const noOfTokens = await utils.countNumOfTokens(splitTxid, true)
    expect(splitDestinations).to.have.length(noOfTokens) // ensure that tx output contains 4 values
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.0000175)
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.0000175)
    expect(await utils.getVoutAmount(splitTxid, 2)).to.equal(0.0000175)
    expect(await utils.getVoutAmount(splitTxid, 3)).to.equal(0.0000175)
    console.log('Alice Balance ' + await utils.getTokenBalance(aliceAddr))
    console.log('Bob Balance ' + await utils.getTokenBalance(bobAddr))
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(1750)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(8250)
  })


  it('Split - Successful Split Into Four Tokens 2', async function () {
    const davePrivateKey = bsv.PrivateKey()
    daveAddr = davePrivateKey.toAddress(process.env.NETWORK).toString()
    const emmaPrivateKey = bsv.PrivateKey()
    emmaAddr = emmaPrivateKey.toAddress(process.env.NETWORK).toString()

    const bobAmount = issueTx.vout[0].value / 4
    const splitDestinations = []
    splitDestinations[0] = { address: daveAddr, amount: bobAmount }
    splitDestinations[1] = { address: emmaAddr, amount: bobAmount }
    splitDestinations[2] = { address: bobAddr, amount: bobAmount }
    splitDestinations[3] = { address: aliceAddr, amount: bobAmount }

    const splitHex = split(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    )
    const splitTxid = await broadcast(splitHex)
    const noOfTokens = await utils.countNumOfTokens(splitTxid, true)
    expect(splitDestinations).to.have.length(noOfTokens) // ensure that tx output contains 4 values
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.0000175)
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.0000175)
    expect(await utils.getVoutAmount(splitTxid, 2)).to.equal(0.0000175)
    expect(await utils.getVoutAmount(splitTxid, 3)).to.equal(0.0000175)
    console.log('Alice Balance ' + await utils.getTokenBalance(aliceAddr))
    console.log('Bob Balance ' + await utils.getTokenBalance(bobAddr))
    console.log('Dave Balance ' + await utils.getTokenBalance(daveAddr))
    console.log('Emma Balance ' + await utils.getTokenBalance(emmaAddr))
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(1750)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(4750)
    expect(await utils.getTokenBalance(daveAddr)).to.equal(1750)
    expect(await utils.getTokenBalance(emmaAddr)).to.equal(1750)
  })

  it('Split - No Split Completes Successfully', async function () {

    const bobAmount = issueTx.vout[0].value
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount }

    const splitHex = split(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    )
    const splitTxid = await broadcast(splitHex)
    const noOfTokens = await utils.countNumOfTokens(splitTxid, true)
    expect(splitDestinations).to.have.length(noOfTokens) // ensure that tx output contains 1
  })


  it('Split - Successful Split Into Two Tokens With No Fee', async function () {

    const bobAmount1 = issueTx.vout[0].value / 2
    const bobAmount2 = issueTx.vout[0].value - bobAmount1
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }

    const splitHex = split(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      null,
      null
    )
    const splitTxid = await broadcast(splitHex)
    const noOfTokens = await utils.countNumOfTokens(splitTxid, false)
    expect(splitDestinations).to.have.length(noOfTokens) // ensure that tx output contains 2 values
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.000035)
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.000035)
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(0)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(10000)
  })


  it('Split - Successful Split Into Two Tokens With No Fee Empty Array', async function () {

    const bobAmount1 = issueTx.vout[0].value / 2
    const bobAmount2 = issueTx.vout[0].value - bobAmount1
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }

    const splitHex = split(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      null,
      null
    )
    const splitTxid = await broadcast(splitHex)
    const noOfTokens = await utils.countNumOfTokens(splitTxid, false)
    expect(splitDestinations).to.have.length(noOfTokens) // ensure that tx output contains 2 values
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.000035)
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.000035)
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(0)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(10000)
  })

  it('Split - Successful Split With Callback and Fee ', async function () {

    const bobAmount1 = issueTx.vout[0].value / 2
    const bobAmount2 = issueTx.vout[0].value - bobAmount1
    console.log(bobAmount1)
    console.log(bobAmount2)
    const splitDestinations = []
    splitDestinations[0] = { address: aliceAddr, amount: bobAmount1 } // 3500 tokens
    splitDestinations[1] = { address: bobAddr, amount: bobAmount2 } // 3500 tokens

    const splitHex = splitWithCallback(
      alicePrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey.publicKey,
      aliceSignatureCallback,
      paymentSignatureCallback
    )
    const splitTxid = await broadcast(splitHex)
    const noOfTokens = await utils.countNumOfTokens(splitTxid, true)
    expect(splitDestinations).to.have.length(noOfTokens) // ensure that tx output contains 2 values
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.000035)
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.000035)
    console.log('Alice Balance ' + await utils.getTokenBalance(aliceAddr))
    console.log('Bob Balance ' + await utils.getTokenBalance(bobAddr))
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(3500)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(6500)
  })


  it('Split - Successful Split With Callback and No Fee ', async function () {

    const bobAmount1 = issueTx.vout[0].value / 2
    const bobAmount2 = issueTx.vout[0].value - bobAmount1
    console.log(bobAmount1)
    console.log(bobAmount2)
    const splitDestinations = []
    splitDestinations[0] = { address: aliceAddr, amount: bobAmount1 } // 3500 tokens
    splitDestinations[1] = { address: bobAddr, amount: bobAmount2 } // 3500 tokens

    const splitHex = splitWithCallback(
      alicePrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      null,
      null,
      aliceSignatureCallback,
      null
      )
    const splitTxid = await broadcast(splitHex)
    const noOfTokens = await utils.countNumOfTokens(splitTxid, false)
    expect(splitDestinations).to.have.length(noOfTokens) // ensure that tx output contains 2 values
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.000035)
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.000035)
    console.log('Alice Balance ' + await utils.getTokenBalance(aliceAddr))
    console.log('Bob Balance ' + await utils.getTokenBalance(bobAddr))
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(3500)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(6500)
  })

  it('Split - Splitting Into Too Many Tokens Throws Error', async function () {
    const bobAmount = issueTx.vout[0].value / 5
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount }
    splitDestinations[2] = { address: bobAddr, amount: bobAmount }
    splitDestinations[3] = { address: bobAddr, amount: bobAmount }
    splitDestinations[4] = { address: bobAddr, amount: bobAmount }
    try {
      split(
        alicePrivateKey,
        utils.getUtxo(issueTxid, issueTx, 0),
        splitDestinations,
        utils.getUtxo(issueTxid, issueTx, 2),
        fundingPrivateKey
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Must have less than 5 segments')
    }
  })

  it('Split - Empty Array Split Throws Error', async function () {
    const splitDestinations = []
    try {
      split(
        alicePrivateKey,
        utils.getUtxo(issueTxid, issueTx, 0),
        splitDestinations,
        utils.getUtxo(issueTxid, issueTx, 2),
        fundingPrivateKey
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('split destinations array is null or empty')
    }
  })

  it('Split - Add Zero Sats to Split Throws Error', async function () {
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: 0 }
    splitDestinations[1] = { address: bobAddr, amount: 0 }

    try {
      split(
        alicePrivateKey,
        utils.getUtxo(issueTxid, issueTx, 0),
        splitDestinations,
        utils.getUtxo(issueTxid, issueTx, 2),
        fundingPrivateKey
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Invalid ammount in split destination')
    }
  })

  it('Split - Negative Integer Sats to Split Throws Error', async function () {
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: -0.00015 }
    splitDestinations[1] = { address: bobAddr, amount: 0.00015 }

    try {
      split(
        alicePrivateKey,
        utils.getUtxo(issueTxid, issueTx, 0),
        splitDestinations,
        utils.getUtxo(issueTxid, issueTx, 2),
        fundingPrivateKey
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Invalid ammount in split destination')
    }
  })

  it('Split - Add Too Much To Split Throws Error', async function () {
    const bobAmount = issueTx.vout[0].value * 2
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount }

    const splitHex = split(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    )
    try {
      await broadcast(splitHex)
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Request failed with status code 400')
    }
  })

  it('Split - Address Too Long Throws Error', async function () {
    const bobAmount1 = issueTx.vout[0].value / 2
    const bobAmount2 = issueTx.vout[0].value - bobAmount1
    console.log(bobAddr)
    const splitDestinations = []
    splitDestinations[0] = { address: '1LF2wNCBT9dp5jN7fa6xSAaUGjJ5Pyz5VGaUG', amount: bobAmount1 }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }
    try {
      split(
        alicePrivateKey,
        utils.getUtxo(issueTxid, issueTx, 0),
        splitDestinations,
        utils.getUtxo(issueTxid, issueTx, 2),
        fundingPrivateKey
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Invalid Address in split destination')
    }
  })

  it('Split - Send to Issuer Address Throws Error', async function () {
    const bobAmount1 = issueTx.vout[0].value / 2
    const bobAmount2 = issueTx.vout[0].value - bobAmount1
    const issuerAddr = issuerPrivateKey.toAddress(process.env.NETWORK).toString()
    const splitDestinations = []
    splitDestinations[0] = { address: issuerAddr, amount: bobAmount1 }
    splitDestinations[1] = { address: issuerAddr, amount: bobAmount2 }
    try {
      const splitHex = split(
        alicePrivateKey,
        utils.getUtxo(issueTxid, issueTx, 0),
        splitDestinations,
        utils.getUtxo(issueTxid, issueTx, 2),
        fundingPrivateKey
      )
      await broadcast(splitHex)
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.response.data).to.contain('mandatory-script-verify-flag-failed (Script evaluated without error but finished with a false/empty top stack element)')
    }
  })

  it('Split - Incorrect Owner Private Key Throws Error', async function () {
    const bobAmount1 = issueTx.vout[0].value / 2
    const bobAmount2 = issueTx.vout[0].value - bobAmount1
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }
    const incorrectPrivateKey = bsv.PrivateKey()

    const splitHex = split(
      incorrectPrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    )
    try {
      await broadcast(splitHex)
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Request failed with status code 400')
    }
  })

  it('Split - Incorrect Owner Private Key Throws Error', async function () {
    const bobAmount1 = issueTx.vout[0].value / 2
    const bobAmount2 = issueTx.vout[0].value - bobAmount1
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }
    const incorrectPrivateKey = bsv.PrivateKey()

    const splitHex = split(
      incorrectPrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    )
    try {
      await broadcast(splitHex)
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Request failed with status code 400')
    }
  })

  it('Split - Incorrect Payments Private Key Throws Error', async function () {
    const bobAmount1 = issueTx.vout[0].value / 2
    const bobAmount2 = issueTx.vout[0].value - bobAmount1
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }
    const incorrectPrivateKey = bsv.PrivateKey()

    const splitHex = split(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      incorrectPrivateKey
    )
    try {
      await broadcast(splitHex)
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Request failed with status code 400')
    }
  })

  it('Split - Null Token Owner Private Key Throws Error', async function () {
    const bobAmount1 = issueTx.vout[0].value / 2
    const bobAmount2 = issueTx.vout[0].value - bobAmount1
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }
    try {
      split(
        null,
        utils.getUtxo(issueTxid, issueTx, 0),
        splitDestinations,
        utils.getUtxo(issueTxid, issueTx, 2),
        fundingPrivateKey
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Token owner private key is null')
    }
  })

  it('Split - Null  STAS UTXO Throws Error', async function () {
    const bobAmount1 = issueTx.vout[0].value / 2
    const bobAmount2 = issueTx.vout[0].value - bobAmount1
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }
    try {
      split(
        alicePrivateKey,
        null,
        splitDestinations,
        utils.getUtxo(issueTxid, issueTx, 2),
        fundingPrivateKey
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Invalid Argument: Must provide an object from where to extract data')
    }
  })

  it('Split - Null Split Addresses Throws Error', async function () {
    try {
      split(
        alicePrivateKey,
        utils.getUtxo(issueTxid, issueTx, 0),
        null,
        utils.getUtxo(issueTxid, issueTx, 2),
        fundingPrivateKey
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('split destinations array is null or empty')
    }
  })

  it('Split - Null Funding Private Key Throws Error', async function () {
    const bobAmount1 = issueTx.vout[0].value / 2
    const bobAmount2 = issueTx.vout[0].value - bobAmount1
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }
    try {
      split(
        alicePrivateKey,
        utils.getUtxo(issueTxid, issueTx, 0),
        splitDestinations,
        utils.getUtxo(issueTxid, issueTx, 2),
        null
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Payment UTXO provided but payment key is null')
    }
  })
})

async function setup() {
  issuerPrivateKey = bsv.PrivateKey()
  fundingPrivateKey = bsv.PrivateKey()
  contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  bobPrivateKey = bsv.PrivateKey()
  alicePrivateKey = bsv.PrivateKey()
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()

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
    symbol,
    2
  )
  issueTxid = await broadcast(issueHex)
  issueTx = await getTransaction(issueTxid)
}