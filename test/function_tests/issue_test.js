const expect = require('chai').expect
const assert = require('chai').assert
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  issueWithCallback
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
let contractTx
let contractTxid
let issueInfo
let aliceAddr
let bobAddr
let symbol

beforeEach(async function () {
  await setup() // set up contract
})

describe('regression, testnet', function () {
  it('Issue - Successful Issue Token With Split And Fee 1', async function () {
    const issueHex = issue(
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
    const response = await utils.getTokenResponse(tokenId)
    expect(response.symbol).to.equal(symbol)
    expect(response.contract_txs).to.contain(contractTxid)
    console.log(response)
    expect(response.issuance_txs).to.contain(issueTxid)
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007)
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003)
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
  })
 
  it('Issue - Successful Issue Token With Split And Fee 2', async function () {
    const issueInfo = [
      {
        addr: aliceAddr,
        satoshis: 10000,
        data: 'one'
      }
    ]
    const issueHex = issue(
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
    const response = await utils.getTokenResponse(tokenId)
    expect(response.symbol).to.equal(symbol)
    expect(response.contract_txs).to.contain(contractTxid)
    expect(response.issuance_txs).to.contain(issueTxid)
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.0001)
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(10000)
  })

  it('Issue - Successful Issue Token With Split And Fee 3', async function () {
    const davePrivateKey = bsv.PrivateKey()
    const daveAddr = davePrivateKey.toAddress(process.env.NETWORK).toString()

    const issueInfo = [
      {
        addr: aliceAddr,
        satoshis: 6000,
        data: 'one'
      },
      {
        addr: bobAddr,
        satoshis: 2000,
        data: 'two'
      },
      {
        addr: daveAddr,
        satoshis: 2000,
        data: 'three'
      }
    ]
    const issueHex = issue(
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
    const response = await utils.getTokenResponse(tokenId)
    expect(response.symbol).to.equal(symbol)
    expect(response.contract_txs).to.contain(contractTxid)
    expect(response.issuance_txs).to.contain(issueTxid)
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00006)
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00002)
    expect(await utils.getVoutAmount(issueTxid, 2)).to.equal(0.00002)
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(6000)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(2000)
    expect(await utils.getTokenBalance(daveAddr)).to.equal(2000)
  })

  it('Issue - Successful Issue Token With Split And Fee 4', async function () {
    const davePrivateKey = bsv.PrivateKey()
    const daveAddr = davePrivateKey.toAddress(process.env.NETWORK).toString()
    const emmaPrivateKey = bsv.PrivateKey()
    const emmaAddr = emmaPrivateKey.toAddress(process.env.NETWORK).toString()
    const issueInfo = [
      {
        addr: aliceAddr,
        satoshis: 4000,
        data: 'one'
      },
      {
        addr: bobAddr,
        satoshis: 3000,
        data: 'two'
      },
      {
        addr: daveAddr,
        satoshis: 2000,
        data: 'three'
      },
      {
        addr: emmaAddr,
        satoshis: 1000,
        data: 'three'
      }
    ]
    const issueHex = issue(
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
    const response = await utils.getTokenResponse(tokenId)
    expect(response.symbol).to.equal(symbol)
    expect(response.contract_txs).to.contain(contractTxid)
    expect(response.issuance_txs).to.contain(issueTxid)
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00004)
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003)
    expect(await utils.getVoutAmount(issueTxid, 2)).to.equal(0.00002)
    expect(await utils.getVoutAmount(issueTxid, 3)).to.equal(0.00001)
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(4000)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
    expect(await utils.getTokenBalance(daveAddr)).to.equal(2000)
    expect(await utils.getTokenBalance(emmaAddr)).to.equal(1000)
  })

  it('Issue - Successful Issue Token To Same Address', async function () {
    const issueHex = issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000, aliceAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol
    )
    const issueTxid = await broadcast(issueHex)
    const tokenId = await utils.getToken(issueTxid)
    const response = await utils.getTokenResponse(tokenId)
    expect(response.symbol).to.equal(symbol)
    expect(response.contract_txs).to.contain(contractTxid)
    expect(response.issuance_txs).to.contain(issueTxid)
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007)
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003)
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(10000)
  })

  it('Issue - Successful Issue Token Non Split', async function () {
    const issueHex = issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      false,
      symbol
    )
    const issueTxid = await broadcast(issueHex)
    const tokenId = await utils.getToken(issueTxid)
    const response = await utils.getTokenResponse(tokenId)
    expect(response.symbol).to.equal(symbol)
    expect(response.contract_txs).to.contain(contractTxid)
    expect(response.issuance_txs).to.contain(issueTxid)
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007)
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003)
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
  })

  it('Issue - Issue to Issuer Address', async function () {
    const issuerAddr = issuerPrivateKey.toAddress(process.env.NETWORK).toString()
    const issueHex = issue(
      issuerPrivateKey,
      utils.getIssueInfo(issuerAddr, 7000, bobAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      false,
      symbol
    )
    const issueTxid = await broadcast(issueHex)
    const tokenId = await utils.getToken(issueTxid)
    const response = await utils.getTokenResponse(tokenId)
    expect(response.symbol).to.equal(symbol)
    expect(response.contract_txs).to.contain(contractTxid)
    expect(response.issuance_txs).to.contain(issueTxid)
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007)
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003)
    expect(await utils.getTokenBalance(issuerAddr)).to.equal(7000)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
  })

  it('Issue - Successful Issue Token With Split No Fee', async function () {
    const issueHex = issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      null,
      null,
      true,
      symbol
    )
    const issueTxid = await broadcast(issueHex)
    const tokenId = await utils.getToken(issueTxid)
    const response = await utils.getTokenResponse(tokenId)
    expect(response.symbol).to.equal(symbol)
    expect(response.contract_txs).to.contain(contractTxid)
    // expect(response.issuance_txs).to.contain(issueTxid)
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007)
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003)
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
  })


  it('Issue - Succesful Empty Funding UTXO', async function () {
    const issueHex = issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      null,
      null,
      true,
      symbol
    )
    const issueTxid = await broadcast(issueHex)
    const tokenId = await utils.getToken(issueTxid)
    const response = await utils.getTokenResponse(tokenId)
    expect(response.symbol).to.equal(symbol)
    expect(response.contract_txs).to.contain(contractTxid)
    expect(response.issuance_txs).to.contain(issueTxid)
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007)
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003)
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
  })

  it('Issue - Succesful Empty Funding UTXO with callback', async function () {
    const ownerSignatureCallback = (tx, i, script, satoshis) => {
      return bsv.Transaction.sighash.sign(tx, issuerPrivateKey, sighash, i, script, satoshis)
    }

    const issueHex = issueWithCallback(
      issuerPrivateKey.publicKey,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      null,
      null,
      true,
      symbol,
      ownerSignatureCallback,
      null
    )
    let issueTxid
    try {
      issueTxid = await broadcast(issueHex)
    } catch (e) {
      console.log(e)
    }
    const tokenId = await utils.getToken(issueTxid)
    const response = await utils.getTokenResponse(tokenId)
    expect(response.symbol).to.equal(symbol)
    expect(response.contract_txs).to.contain(contractTxid)
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007)
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003)
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
  })

  it('Issue - Successful Issue Token 10 Addresses', async function () {
    const pk1 = bsv.PrivateKey()
    const add1 = pk1.toAddress(process.env.NETWORK).toString()
    const pk2 = bsv.PrivateKey()
    const add2 = pk2.toAddress(process.env.NETWORK).toString()
    const pk3 = bsv.PrivateKey()
    const add3 = pk3.toAddress(process.env.NETWORK).toString()
    const pk4 = bsv.PrivateKey()
    const add4 = pk4.toAddress(process.env.NETWORK).toString()
    const pk5 = bsv.PrivateKey()
    const add5 = pk5.toAddress(process.env.NETWORK).toString()
    const pk6 = bsv.PrivateKey()
    const add6 = pk6.toAddress(process.env.NETWORK).toString()
    const pk7 = bsv.PrivateKey()
    const add7 = pk7.toAddress(process.env.NETWORK).toString()
    const pk8 = bsv.PrivateKey()
    const add8 = pk8.toAddress(process.env.NETWORK).toString()

    const issueHex = issue(
      issuerPrivateKey,
      utils.getTenIssueInfo(add1, add2, add3, add4, add5, add6, add7, add8, aliceAddr, bobAddr),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      'TAALT'
    )
    const issueTxid = await broadcast(issueHex)
    const tokenId = await utils.getToken(issueTxid)
    const response = await utils.getTokenResponse(tokenId)
    expect(response.symbol).to.equal(symbol)
    expect(response.contract_txs).to.contain(contractTxid)
    expect(response.issuance_txs).to.contain(issueTxid)

    for (let i = 1; i < 10; i++) {
      expect(await utils.getVoutAmount(issueTxid, i)).to.equal(0.00001)
    }
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(1000)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(1000)
  })

  it('Issue - Incorrect Issue Different Symbol 1', async function () {
    const newSymbol = 'TEST'
    try {
      issue(
        issuerPrivateKey,
        utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        newSymbol
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.contain('The symbol in the contract must equal symbol passed to issue')
    }
  })

  it('Issue - Incorrect Issue Private Key Throws Error', async function () {
    const incorrectPrivateKey = bsv.PrivateKey()
    const issueHex = issue(
      incorrectPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol
    )
    try {
      await broadcast(issueHex)
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.response.data).to.contain('mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)')
    }
  })

  it('Issue - Incorrect Funding Private Key Throws Error', async function () {
    const incorrectPrivateKey = bsv.PrivateKey()
    const issueHex = issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      incorrectPrivateKey,
      true,
      symbol
    )
    try {
      await broadcast(issueHex)
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.response.data).to.contain('mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)')
    }
  })

  it('Issue - Issue to Address with a negative token amount(?)', async function () {
    try {
      issue(
        issuerPrivateKey,
        utils.getIssueInfo(aliceAddr, 13000, bobAddr, -3000),
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        symbol
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('issueInfo satoshis < 1')
    }
  })

  it('Issue - Issue to Address with Zero Tokens Throws Errror', async function () {
    try {
      issue(
        issuerPrivateKey,
        utils.getIssueInfo(aliceAddr, 10000, bobAddr, 0),
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        symbol
      )
      assert(false, 'Issue should have failed')
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('issueInfo satoshis < 1')
    }
  })

  it('Issue - Issue with Incorrect Balance (Less Than) Throws Error', async function () {
    try {
      issue(
        issuerPrivateKey,
        utils.getIssueInfo(aliceAddr, 5000, bobAddr, 4000),
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        symbol
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('total out amount 9000 must equal total in amount 10000')
    }
  })

  it('Issue - Issue with Incorrect Balance (More Than) Throws Error', async function () {
    try {
      issue(
        issuerPrivateKey,
        utils.getIssueInfo(aliceAddr, 10000, bobAddr, 3000),
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        symbol
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('total out amount 13000 must equal total in amount 10000')
    }
  })

  it('Issue - Empty Issue Info Throws Error', async function () {
    try {
      issue(
        issuerPrivateKey,
        [],
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        2
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('issueInfo is invalid')
    }
  })

  it('Issue - Invalid Issue Address (Too Short) throws error', async function () {
    issueInfo = [
      {
        addr: '1bc1qxy2kgdygjrsqtzq2',
        satoshis: 7000,
        data: 'One'
      },
      {
        addr: bobAddr,
        satoshis: 3000,
        data: 'Two'
      }
    ]
    try {
      issue(
        issuerPrivateKey,
        issueInfo,
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        symbol
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('issueInfo address must be between 26 and 35')
    }
  })

  it('Issue - Invalid Issue Address (Too Long) throws error', async function () {
    issueInfo = [
      {
        addr: '1zP1eP5QGefi2DMPTfTL5SLmv7DivfNabc1qxymv7',
        satoshis: 7000,
        data: 'One'
      },
      {
        addr: bobAddr,
        satoshis: 3000,
        data: 'Two'
      }
    ]
    try {
      issue(
        issuerPrivateKey,
        issueInfo,
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        symbol
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('issueInfo address must be between 26 and 35')
    }
  })

  it('Issue - Issue Amount Decimal Throws Error', async function () {
    try {
      issue(
        issuerPrivateKey,
        utils.getIssueInfo(aliceAddr, 7000.5, bobAddr, 2999.5),
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        symbol
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Invalid Argument: Output satoshis is not a natural number')
    }
  })

  it('Issue - Non Array Issue Info Throws Error', async function () {
    try {
      issue(
        issuerPrivateKey,
        {
          addr: bobAddr,
          satoshis: 7000,
          data: 'one'
        },
        {
          addr: aliceAddr,
          satoshis: 3000,
          data: 'two'
        },
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        symbol
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('issueInfo is invalid')
    }
  })

  it('Issue - Empty Contract UTXO Info Throws Error', async function () {
    try {
      issue(
        issuerPrivateKey,
        utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
        [],
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        symbol
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('contractUtxo is invalid')
    }
  })

  it('Issue - Null Issuer Private Key Throws Error', async function () {
    try {
      issue(
        null,
        utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        symbol
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Issuer private key is null')
    }
  })

  it('Issue - Null Issue Info Throws Error', async function () {
    try {
      issue(
        issuerPrivateKey,
        null,
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        symbol
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('issueInfo is invalid')
    }
  })

  it('Issue - Null Contract UTXO Throws Error', async function () {
    try {
      issue(
        issuerPrivateKey,
        utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
        null,
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        symbol,
        2
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('contractUtxo is invalid')
    }
  })

  it('Issue - Null Payment Private Key Throws Error', async function () {
    try {
      issue(
        issuerPrivateKey,
        utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        null,
        true,
        symbol
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Payment UTXO provided but payment private key is null')
    }
  })

  it('Issue - Null isSplittable Throws Error', async function () {
    try {
      issue(
        issuerPrivateKey,
        utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        null,
        symbol
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('isSplittable must be a boolean value')
    }
  })

  it('Issue - Null Symbol Throws Error', async function () {
    try {
      issue(
        issuerPrivateKey,
        utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        null
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Invalid Symbol. Must be between 1 and 128 long and contain alpahnumeric, \'-\', \'_\' chars.')
    }
  })

})

async function setup() {
  issuerPrivateKey = bsv.PrivateKey()
  fundingPrivateKey = bsv.PrivateKey()
  bobPrivateKey = bsv.PrivateKey()
  alicePrivateKey = bsv.PrivateKey()
  contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()
  symbol = 'TAALT'
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
}
