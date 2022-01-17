// const expect = require('chai').expect
// const assert = require('chai').assert
const utils = require('../utils/test_utils')
const bsv = require('bsv')
// const assert = require('assert')
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
  getTransaction,
  getRawTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../../index').utils

const {
  contract,
  issue
} = require('../../index')

// const { sighash } = require('../../lib/stas')

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
let tokenBIssueTxid
let fundingUTXO
let alicePublicKeyHash
let bobPublicKeyHash

beforeEach(async function () {
  await setup()
})

describe('atomic swap', function () {
  // this swap function won't be used but is here as a sanity check
  it('Swap - All in one swap', async function () {
    const takerStasInputScriptHex = tokenAObj.outputs[0].script.toHex()
    const makerStasInputScript = tokenBObj.outputs[0].script

    const makerInputUtxo = {
      txId: tokenBIssueTxid,
      outputIndex: 0,
      script: makerStasInputScript,
      satoshis: tokenBObj.outputs[0].satoshis
    }

    const wantedInfo = { scriptHex: takerStasInputScriptHex, satoshis: tokenAObj.outputs[0].satoshis }

    const allInOneSwapHex = allInOneSwap(alicePrivateKey, makerInputUtxo, wantedInfo, tokenBIssueHex, 0,
      bobPrivateKey, tokenAIssueHex, 0, tokenAObj.outputs[0].satoshis, tokenBObj.outputs[0].satoshis,
      fundingUTXO, fundingPrivateKey)

    const swapTxid = await broadcast(allInOneSwapHex)
    console.log('swaptxid', swapTxid)
    expect(await utils.getVoutAmount(swapTxid, 0)).to.equal(0.00006)
    expect(await utils.getVoutAmount(swapTxid, 1)).to.equal(0.00003)
    // expect(await utils.getTokenBalance(aliceAddr)).to.equal(3000)
    // expect(await utils.getTokenBalance(bobAddr)).to.equal(6000)
  })

  //   // the maker offers a token for sats
  it('Swap - 2 step token-p2pkh swap', async function () {
    const makerVout = 0
    const takerVout = 0
    const makerStasTx = bsv.Transaction(tokenBIssueHex)
    // const takerStasTx = bsv.Transaction(tokenASplitHex)
    // const takerStasInputScriptHex = takerStasTx.outputs[takerVout].script.toHex()
    const makerStasInputScript = makerStasTx.outputs[makerVout].script

    // taker gets some funds
    const bobUtxos = await getFundsFromFaucet(bobPrivateKey.toAddress(process.env.NETWORK).toString())
    //     // get input transaction
    const takerInputTxHex = await getRawTransaction(bobUtxos[0].txid)

    const alicePublicKeyHash = bsv.crypto.Hash.sha256ripemd160(alicePrivateKey.publicKey.toBuffer()).toString('hex')
    //     const bobPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(bobPrivateKey.publicKey.toBuffer()).toString('hex')

    const makerInputSatoshis = tokenBObj.outputs[makerVout].satoshis
    const takerOutputSatoshis = makerInputSatoshis
    const makerOutputSatoshis = Math.floor(bobUtxos[0].amount * 1E8)
    const takerInputSatoshis = makerOutputSatoshis

    const makerInputUtxo = {
      txId: tokenBIssueTxid,
      outputIndex: takerVout,
      script: makerStasInputScript,
      satoshis: makerInputSatoshis
    }

    console.log('t makerInputSatoshis: ', makerInputSatoshis)
    console.log('t takerOutputSatoshis: ', takerOutputSatoshis)
    console.log('t makerOutputSatoshis: ', makerOutputSatoshis)
    console.log('t takerInputSatoshis: ', takerInputSatoshis)

    const wantedInfo = { type: 'native', satoshis: makerOutputSatoshis }
    // const takerInputInfo = { type: 'native', utxo: bobUtxos[0], satoshis: takerInputSatoshis }

    //     const unsignedSwapOfferHex = createUnsignedSwapOffer(
    //       alicePrivateKey,
    //       makerInputUtxo,
    //       wantedInfo
    //     )
    // const wantedInfo = { scriptHex: takerStasInputScriptHex, satoshis: makerOutputSatoshis }

    const swapOfferHex = createSwapOffer(
      alicePrivateKey,
      makerInputUtxo,
      wantedInfo
    )
    // console.log('swapOfferHex:', swapOfferHex)
    // now bob takes the offer
    const fundingUTXO = {
      txid: tokenBIssueTxid,
      vout: 1,
      scriptPubKey: tokenBIssueTx.vout[1].scriptPubKey.hex,
      amount: Math.floor(tokenBIssueTx.vout[1].value * 1E8)
    }

    const takerInputUTXO = {
      txId: bobUtxos[0].txid,
      outputIndex: bobUtxos[0].vout,
      script: bsv.Script.fromHex(bobUtxos[0].scriptPubKey), // makerStasInputScript,
      satoshis: takerInputSatoshis
    }

    const fullySignedSwapHex = acceptSwapOffer(swapOfferHex, tokenBIssueHex,
      bobPrivateKey, takerInputTxHex, takerInputUTXO, takerOutputSatoshis, alicePublicKeyHash,
      fundingUTXO, fundingPrivateKey, alicePrivateKey)

    // console.log('fullySignedSwapHex: ', fullySignedSwapHex)
    const swapTxid = await broadcast(fullySignedSwapHex)
    console.log('swaptxid', swapTxid)
    // const tokenId = await utils.getToken(swapTxid)
    // console.log(`Token ID:        ${tokenId}`)
    expect(await utils.getVoutAmount(swapTxid, 0)).to.equal(0.01)
    expect(await utils.getVoutAmount(swapTxid, 1)).to.equal(0.00003)

    // add second token check
  })

  // swap two STAS tokens
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

    const unsignedSwapOfferHex = createUnsignedSwapOffer(
      alicePrivateKey,
      makerInputUtxo,
      wantedInfo
    )

    // now bob takes the offer
    const takerSignedSwapHex = acceptUnsignedSwapOffer(unsignedSwapOfferHex, tokenBIssueHex,
      bobPrivateKey, tokenAIssueHex, 0, takerInputSatoshis, takerOutputSatoshis, alicePublicKeyHash,
      fundingUTXO, fundingPrivateKey)

    const fullySignedSwapHex = makerSignSwapOffer(takerSignedSwapHex, tokenBIssueHex, tokenAIssueHex, alicePrivateKey, bobPublicKeyHash, paymentPublicKeyHash, fundingUTXO)
    const swapTxid = await broadcast(fullySignedSwapHex)
    expect(await utils.getVoutAmount(swapTxid, 0)).to.equal(0.00006)
    expect(await utils.getVoutAmount(swapTxid, 1)).to.equal(0.00003)
    // expect(await utils.getTokenBalance(aliceAddr)).to.equal(3000)
    // expect(await utils.getTokenBalance(bobAddr)).to.equal(6000)
  })

  // the maker offers a token for sats
  it('Swap - 3 step token-p2pkh swap', async function () {
    // first get some funds
    const bobUtxos = await getFundsFromFaucet(bobPrivateKey.toAddress(process.env.NETWORK).toString())
    // get input transaction
    const takerInputTx = await getRawTransaction(bobUtxos[0].txid)

    const makerInputSatoshis = tokenBObj.outputs[0].satoshis
    const takerOutputSatoshis = makerInputSatoshis
    const makerOutputSatoshis = Math.floor(bobUtxos[0].amount * 1E8)
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
    expect(await utils.getVoutAmount(swapTxid, 0)).to.equal(0.01)
    expect(await utils.getVoutAmount(swapTxid, 1)).to.equal(0.00003)
    // expect(await utils.getTokenBalance(aliceAddr)).to.equal(3000)
    // expect(await utils.getTokenBalance(bobAddr)).to.equal(6000)
  })

  // the maker offers sats for a token
  it('Swap - 3 step p2pkh-token swap', async function () {
    const takerStasInputScriptHex = tokenAObj.outputs[0].script.toHex()
    // first get some funds
    const aliceUtxos = await getFundsFromFaucet(alicePrivateKey.toAddress(process.env.NETWORK).toString())
    // get input transaction
    const makerInputTx = await getRawTransaction(aliceUtxos[0].txid)

    const makerInputSatoshis = Math.floor(aliceUtxos[0].amount * 1E8)
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

    const swapTxid = await broadcast(fullySignedSwapHex)
    console.log('swaptxid ', swapTxid)
    expect(await utils.getVoutAmount(swapTxid, 0)).to.equal(0.00006)
    expect(await utils.getVoutAmount(swapTxid, 1)).to.equal(0.01)
    // expect(await utils.getTokenBalance(aliceAddr)).to.equal(3000)
    // expect(await utils.getTokenBalance(bobAddr)).to.equal(6000)
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
  const tokenASymbol = 'TOKENA'
  const tokenASupply = 6000
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
  await broadcast(tokenAIssueHex)
  tokenAObj = new bsv.Transaction(tokenAIssueHex)

  // Token B
  const tokenBSymbol = 'TOKENB'
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

  tokenBIssueHex = issue(
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
    amount: Math.floor(tokenBIssueTx.vout[1].value * 1E8)
  }
}
