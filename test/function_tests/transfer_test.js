const expect = require('chai').expect
const assert = require('chai').assert
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  transfer
} = require('../../index')

const {
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../../index').utils

let issuerPrivateKey
let fundingPrivateKey
let bobPrivateKey
let alicePrivateKey
let contractUtxos
let fundingUtxos
let publicKeyHash
let aliceAddr
let bobAddr
let symbol
let issueTxid
let issueTx
let issueOutFundingVout

beforeEach(async function () {
  await setup() // contract and issue
  issueOutFundingVout = issueTx.vout.length - 1
})

describe('regression, testnet', function () {
  it('Transfer - Successful With Fee 1', async function () {
    const incorrectPK = bsv.PrivateKey()

    const transferHex = transfer(
      bobPrivateKey,
      incorrectPK.publicKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    const transferTxid = await broadcast(transferHex)
    const tokenId = await utils.getToken(transferTxid)
    const response = await utils.getTokenResponse(tokenId)
    expect(response.symbol).to.equal(symbol)
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003)
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(10000)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(0)
  })

    it('Transfer - Successful With Fee 2', async function () {
      const transferHex = transfer(
        alicePrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(issueTxid, issueTx, 0),
        bobAddr,
        utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
        fundingPrivateKey
      )
      
      const transferTxid = await broadcast(transferHex)
      const tokenId = await utils.getToken(transferTxid)
      const response = await utils.getTokenResponse(tokenId)
      expect(response.symbol).to.equal(symbol)
      expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00007)
      console.log('Alice Balance ' + await utils.getTokenBalance(aliceAddr))
      console.log('Bob Balance ' + await utils.getTokenBalance(bobAddr))
      expect(await utils.getTokenBalance(aliceAddr)).to.equal(0)
      expect(await utils.getTokenBalance(bobAddr)).to.equal(10000)
    })

  it('Transfer - Successful With Fee 3', async function () {
    const davePrivateKey = bsv.PrivateKey()
    const daveAddr = davePrivateKey.toAddress(process.env.NETWORK).toString()
    const transferHex = transfer(
      bobPrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      daveAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    const transferTxid = await broadcast(transferHex)
    const tokenId = await utils.getToken(transferTxid)
    const response = await utils.getTokenResponse(tokenId)
    expect(response.symbol).to.equal(symbol)
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003)
    expect(await utils.getTokenBalance(daveAddr)).to.equal(3000)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(0)
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
  })

  it('Transfer - Successful With Fee 4', async function () {
    const transferHex = transfer(
      bobPrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      bobAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    const transferTxid = await broadcast(transferHex)
    const tokenId = await utils.getToken(transferTxid)
    const response = await utils.getTokenResponse(tokenId)
    expect(response.symbol).to.equal(symbol)
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
  })

  it('Transfer - Successful No Fee', async function () {
    const transferHex = transfer(
      bobPrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      aliceAddr,
      null,
      null
    )
    const transferTxid = await broadcast(transferHex)
    const tokenId = await utils.getToken(transferTxid)
    const response = await utils.getTokenResponse(tokenId)
    expect(response.symbol).to.equal(symbol)
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003)
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(10000)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(0)
  })

  it('Transfer -  Transfer To Issuer Address (Splitable) Throws Error', async function () {
    const issuerAddr = issuerPrivateKey.toAddress(process.env.NETWORK).toString()
    const transferHex = transfer(
      issuerPrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      issuerAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    try {
      await broadcast(transferHex)
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.response.data).to.contain('mandatory-script-verify-flag-failed')
    }
  })

  it('Transfer - Invalid Issuer Private Key Throws Error', async function () {
    const incorrectPK = bsv.PrivateKey()
    const transferHex = transfer(
      incorrectPK,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    try {
      await broadcast(transferHex)
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.response.data).to.contain('mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)')
    }
  })

  it('Transfer - Invalid Funding Private Key Throws Error', async function () {
    const incorrectPK = bsv.PrivateKey()
    const transferHex = transfer(
      bobPrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      incorrectPK
    )
    try {
      await broadcast(transferHex)
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.response.data).to.contain('mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)')
    }
  })

  it('Transfer - Address Validation - Too Few Chars', async function () {
    const invalidAddr = '1MSCReQT9E4GpxuK1K7uyD5q'
    try {
      transfer(
        bobPrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(issueTxid, issueTx, 1),
        invalidAddr,
        utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
        fundingPrivateKey
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Invalid destination address')
    }
  })

    it('Transfer -  Address Validation - Too Many Chars throws error', async function () {
      const invalidAddr = '1MSCReQT9E4GpxuK1K7uyD5qF1EmznXjkrmoFCgGtkmhyaL2frwff84p2bwTf3FDpkZcCgGtkmhyaL2frwff84p2bwTf3FDpkZcCgGtkmhy'
      try {
        transfer(
          bobPrivateKey,
          issuerPrivateKey.publicKey,
          utils.getUtxo(issueTxid, issueTx, 1),
          invalidAddr,
          utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
          fundingPrivateKey
        )
        assert(false)
        return
      } catch (e) {
        expect(e).to.be.instanceOf(Error)
        expect(e.message).to.eql('Invalid destination address')
      }
    })

  it('Transfer - Incorrect STAS UTXO Amount Throws Error', async function () {
    const transferHex = transfer(
      bobPrivateKey,
      issuerPrivateKey.publicKey,
      {
        txid: issueTxid,
        vout: 1,
        scriptPubKey: issueTx.vout[1].scriptPubKey.hex,
        amount: 0.0001
      },
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    try {
      await broadcast(transferHex)
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.response.data).to.contain('bad-txns-in-belowout')
    }
  })

  it('Transfer - Incorrect Payment UTXO Amount Throws Error', async function () {
    const transferHex = transfer(
      bobPrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      aliceAddr,
      {
        txid: issueTxid,
        vout: issueOutFundingVout,
        scriptPubKey: issueTx.vout[issueOutFundingVout].scriptPubKey.hex,
        amount: 0.01
      },
      fundingPrivateKey
    )
    try {
      await broadcast(transferHex)
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.response.data).to.contain('mandatory-script-verify-flag-failed (Signature must be zero for failed CHECK(MULTI)SIG operation)')
    }
  })

    it('Transfer - Null Token Owner Private Key Throws Error', async function () {
      try {
        transfer(
          null,
          issuerPrivateKey.publicKey,
          utils.getUtxo(issueTxid, issueTx, 1),
          aliceAddr,
          utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
          fundingPrivateKey
        )
        assert(false)
        return
      } catch (e) {
        expect(e).to.be.instanceOf(Error)
        expect(e.message).to.eql('Token owner private key is null')
      }
    })

  it('Transfer - Null STAS UTXO Throws Error', async function () {
    try {
      transfer(
        bobPrivateKey,
        issuerPrivateKey.publicKey,
        null,
        aliceAddr,
        utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
        fundingPrivateKey
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('stasUtxo is null')
    }
  })

  it('Transfer - Null Destination Address Throws Error', async function () {
    try {
      transfer(
        bobPrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(issueTxid, issueTx, 1),
        null,
        utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
        fundingPrivateKey
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.contains('destination address is null')
    }
  })

  it('Transfer - Null Funding Private Key Throws Error', async function () {
    try {
      transfer(
        bobPrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(issueTxid, issueTx, 1),
        aliceAddr,
        utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
        null
      )
      assert(false)
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Payment UTXO provided but payment private key is null')
    }
  })
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
