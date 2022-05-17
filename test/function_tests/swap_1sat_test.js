const utils = require('../utils/test_utils')
const bsv = require('bsv')
const expect = require('chai').expect

require('dotenv').config()

const {

  createSwapOffer,
  acceptSwapOffer,
  allInOneSwap,
  createUnsignedSwapOffer,
  acceptUnsignedSwapOffer,
  acceptUnsignedNativeSwapOffer,
  makerSignSwapOffer
} = require('../../index').swap

const {
  bitcoinToSatoshis,
  getTransaction,
  getRawTransaction,
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
let aliceAddr
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

beforeEach(async function () {
  await setup()
})

describe('atomic swap', function () {
  it('Swap - 3 step token-p2pkh swap', async function () {
    // first get some funds
    const bobUtxos = await getFundsFromFaucet(bobPrivateKey.toAddress(process.env.NETWORK).toString())
    // get input transaction
    const takerInputTx = await getRawTransaction(bobUtxos[0].txid)

    const makerInputSatoshis = tokenBObj.outputs[0].satoshis
    const takerOutputSatoshis = makerInputSatoshis
    const makerOutputSatoshis = bobUtxos[0].amount
    const takerInputSatoshis = makerOutputSatoshis

    const makerInputUtxo = {
      txId: tokenBIssueTxid,
      outputIndex: 0,
      script: tokenBObj.outputs[0].script,
      satoshis: makerInputSatoshis
    }

    const wantedInfo = { type: 'native', satoshis: makerOutputSatoshis }
    const takerInputInfo = { type: 'native', utxo: bobUtxos[0], satoshis: takerInputSatoshis }

    const unsignedSwapOfferHex = createUnsignedSwapOffer(
      alicePrivateKey,
      makerInputUtxo,
      wantedInfo
    )

    const takerSignedSwapHex = acceptUnsignedNativeSwapOffer(unsignedSwapOfferHex, takerInputInfo, tokenBIssueHex,
      bobPrivateKey, takerInputTx, bobUtxos[0].vout, takerOutputSatoshis, alicePublicKeyHash,
      fundingUTXO, fundingPrivateKey)

    const fullySignedSwapHex = makerSignSwapOffer(takerSignedSwapHex, tokenBIssueHex, takerInputTx, alicePrivateKey, bobPublicKeyHash, paymentPublicKeyHash, fundingUTXO)
    const swapTxid = await broadcast(fullySignedSwapHex)
    console.log('swaptxid', swapTxid)
    const tokenId = await utils.getToken(swapTxid, 1)
    const response = await utils.getTokenResponse(tokenId, tokenBSymbol)
    expect(response.symbol).to.equal(tokenBSymbol)
    expect(await utils.getVoutAmount(swapTxid, 0)).to.equal(0.01)
    expect(await utils.getVoutAmount(swapTxid, 1)).to.equal(0.0000001)
  })

  // the maker offers sats for a token
  it('Swap - 3 step p2pkh-token swap', async function () {
    const takerStasInputScriptHex = tokenAObj.outputs[0].script.toHex()
    // first get some funds
    const aliceUtxos = await getFundsFromFaucet(alicePrivateKey.toAddress(process.env.NETWORK).toString())
    // get input transaction
    const makerInputTx = await getRawTransaction(aliceUtxos[0].txid)

    const makerInputSatoshis = aliceUtxos[0].amount
    const takerOutputSatoshis = makerInputSatoshis
    const makerOutputSatoshis = tokenAObj.outputs[0].satoshis
    const takerInputSatoshis = makerOutputSatoshis

    const wantedInfo = { scriptHex: takerStasInputScriptHex, satoshis: makerOutputSatoshis }

    const unsignedSwapOfferHex = createUnsignedSwapOffer(
      alicePrivateKey,
      aliceUtxos[0],
      wantedInfo
    )

    // now bob takes the offer
    const takerSignedSwapHex = acceptUnsignedSwapOffer(unsignedSwapOfferHex, makerInputTx,
      bobPrivateKey, tokenAIssueHex, 0, takerInputSatoshis, takerOutputSatoshis, alicePublicKeyHash,
      fundingUTXO, fundingPrivateKey)

    const fullySignedSwapHex = makerSignSwapOffer(takerSignedSwapHex, makerInputTx, tokenAIssueHex, alicePrivateKey, bobPublicKeyHash, paymentPublicKeyHash, fundingUTXO)
    console.log(fullySignedSwapHex)
    const swapTxid = await broadcast(fullySignedSwapHex)
    console.log('swaptxid ', swapTxid)
    const tokenId = await utils.getToken(swapTxid, 0)
    const response = await utils.getTokenResponse(tokenId, tokenASymbol)
    expect(response.symbol).to.equal(tokenASymbol)
    expect(await utils.getVoutAmount(swapTxid, 0)).to.equal(0.0000001)
    expect(await utils.getVoutAmount(swapTxid, 1)).to.equal(0.01)
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
  const tokenASupply = 1
  const tokenASchema = utils.schema(tokenAIssuerPublicKeyHash, tokenASymbol, tokenASupply)
  const tokenAContractHex = contract(
    tokenAIssuerPrivateKey,
    tokenAContractUtxos,
    tokenAFundingUtxos,
    fundingPrivateKey,
    tokenASchema,
    tokenASupply
  )
  const tokenAContractTxid = await broadcast(tokenAContractHex)
  const tokenAContractTx = await getTransaction(tokenAContractTxid)

  tokenAIssueHex = issue(
    tokenAIssuerPrivateKey,
    [{
      addr: bobAddr,
      satoshis: 1,
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
  const tokenBSupply = 1
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

  tokenBIssueHex = issue(
    tokenBIssuerPrivateKey,
    [{
      addr: aliceAddr,
      satoshis: 1,
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
