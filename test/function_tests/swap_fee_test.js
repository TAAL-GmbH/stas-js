const utils = require('../utils/test_utils')
const bsv = require('bsv')
const expect = require('chai').expect

require('dotenv').config()

const {

  createUnsignedSwapOffer,
  acceptUnsignedSwapOffer,
  makerSignSwapOffer
} = require('../../index').swap

const {
  bitcoinToSatoshis,
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../../index').utils

const {
  contract,
  issue
} = require('../../index')

let fundingPrivateKey
let bobPrivateKey
let alicePrivateKey
let bobAddr
let paymentPublicKeyHash
let tokenAIssueHex
let tokenBIssueHex
let tokenAObj
let tokenBObj
let tokenBIssueTx
let tokenBIssueTxid
let fundingUTXO
let alicePublicKeyHash
let bobPublicKeyHash
let tokenASymbol
let tokenBSymbol

beforeEach(async function () {
  await setup()
})

describe('atomic swap', function () {
  it('Swap - 3 step token-token swap', async function () {
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
    console.log('funding ' + fundingUTXO.amount)

    // now bob takes the offer
    const takerSignedSwapHex = await acceptUnsignedSwapOffer(unsignedSwapOfferHex, tokenBIssueHex,
      bobPrivateKey, tokenAIssueHex, 0, takerInputSatoshis, takerOutputSatoshis, alicePublicKeyHash,
      fundingUTXO, fundingPrivateKey)

    const fullySignedSwapHex = await makerSignSwapOffer(takerSignedSwapHex, tokenBIssueHex, tokenAIssueHex, alicePrivateKey, bobPublicKeyHash, paymentPublicKeyHash, fundingUTXO)
    console.log(fullySignedSwapHex)
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
})

async function setup () {
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
      satoshis: 1200,
      data: 'one'
    },
    {
      addr: bobAddr,
      satoshis: 1200,
      data: 'one'
    },
    {
      addr: bobAddr,
      satoshis: 1200,
      data: 'one'
    },
    {
      addr: bobAddr,
      satoshis: 1200,
      data: 'one'
    },
    {
      addr: bobAddr,
      satoshis: 1200,
      data: 'one'
    }],
    utils.getUtxo(tokenAContractTxid, tokenAContractTx, 0),
    utils.getUtxo(tokenAContractTxid, tokenAContractTx, 1),
    fundingPrivateKey,
    false,
    tokenASymbol,
    2
  )
  tokenAIssueTxid = await broadcast(tokenAIssueHex)
  tokenAObj = new bsv.Transaction(tokenAIssueHex)

  // Token B
  tokenBSymbol = 'TOKENB'
  const tokenBSupply = 3000
  const tokenBSchema = utils.schema(tokenBIssuerPublicKeyHash, tokenBSymbol, tokenBSupply)
  const tokenBContractHex = contract(
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
      addr: bobAddr,
      satoshis: 600,
      data: 'one'
    },
    {
      addr: bobAddr,
      satoshis: 600,
      data: 'one'
    },
    {
      addr: bobAddr,
      satoshis: 600,
      data: 'one'
    },
    {
      addr: bobAddr,
      satoshis: 600,
      data: 'one'
    },
    {
      addr: bobAddr,
      satoshis: 600,
      data: 'one'
    }],
    utils.getUtxo(tokenBContractTxid, tokenBContractTx, 0),
    utils.getUtxo(tokenBContractTxid, tokenBContractTx, 1),
    fundingPrivateKey,
    false,
    tokenBSymbol,
    2
  )
  tokenBIssueTxid = await broadcast(tokenBIssueHex)
  tokenBIssueTx = await getTransaction(tokenBIssueTxid)
  tokenBObj = new bsv.Transaction(tokenBIssueHex)
  fundingUTXO = {
    txid: tokenBIssueTxid,
    vout: 5,
    scriptPubKey: tokenBIssueTx.vout[5].scriptPubKey.hex,
    amount: bitcoinToSatoshis(tokenBIssueTx.vout[5].value)
  }
}
