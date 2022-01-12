// const expect = require('chai').expect
// const assert = require('chai').assert
const utils = require('../utils/test_utils')
const bsv = require('bsv')
// const assert = require('assert')
const expect = require('chai').expect

require('dotenv').config()

const {
//   createSwapOffer,
//   acceptSwapOffer,
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
  issue,
  split
} = require('../../index')

// const { sighash } = require('../../lib/stas')

let fundingPrivateKey
let bobPrivateKey
let alicePrivateKey
let bobAddr
let aliceAddr

let tokenAFundingUtxos
let tokenBFundingUtxos
let tokenAIssuerPrivateKey
let tokenBIssuerPrivateKey
let tokenAContractUtxos
let tokenBContractUtxos
let tokenAIssuerPublicKeyHash
let tokenBIssuerPublicKeyHash
let paymentPublicKeyHash
let tokenASplitTxid
let tokenBSplitTxid
let tokenASplitHex
let tokenBSplitHex
// let tokenASplitTx
let tokenBSplitTx
let tokenASplitTxObj
let tokenBSplitTxObj
let tokenAContractTxid
let tokenBContractTxid
let tokenAContractTx
let tokenBContractTx
let tokenAIssueTx
let tokenBIssueTx
let tokenAIssueTxid
let tokenBIssueTxid

beforeEach(async function () {
  await setup()
})

describe('atomic swap', function () {
  // this swap function won't be used but is here as a sanity check
  it('Swap - All in one swap', async function () {
    const makerStasTx = bsv.Transaction(tokenBSplitHex)
    const takerStasTx = bsv.Transaction(tokenASplitHex)
    const takerStasInputScriptHex = takerStasTx.outputs[0].script.toHex()
    const makerStasInputScript = makerStasTx.outputs[0].script

    const makerInputUtxo = {
      txId: tokenBSplitTxid,
      outputIndex: 0,
      script: makerStasInputScript,
      satoshis: tokenBSplitTxObj.outputs[0].satoshis
    }

    const wantedInfo = { scriptHex: takerStasInputScriptHex, satoshis: tokenASplitTxObj.outputs[0].satoshis }

    const fundingUTXO = {
      txid: tokenBSplitTxid,
      vout: 2,
      scriptPubKey: tokenBSplitTx.vout[2].scriptPubKey.hex,
      amount: Math.floor(tokenBSplitTx.vout[2].value * 1E8)
    }
    const allInOneSwapHex = allInOneSwap(alicePrivateKey, makerInputUtxo, wantedInfo, tokenBSplitHex, 0,
      bobPrivateKey, tokenASplitHex, 0, tokenASplitTxObj.outputs[0].satoshis, tokenBSplitTxObj.outputs[0].satoshis,
      fundingUTXO, fundingPrivateKey)

    const swapTxid = await broadcast(allInOneSwapHex)
    console.log('swaptxid', swapTxid)
    const tokenId = await utils.getToken(swapTxid)
    console.log(`Token ID:        ${tokenId}`)
    await new Promise(resolve => setTimeout(resolve, 5000))
    const response = await utils.getTokenWithSymbol(tokenId, 'TOKENA')
    expect(response.symbol).to.equal('TOKENA')
    // add second token check
  })

  // swap two STAS tokens
  it('Swap - 3 step token-token swap', async function () {
    const makerStasTx = bsv.Transaction(tokenBSplitHex)
    const takerStasTx = bsv.Transaction(tokenASplitHex)
    const takerStasInputScriptHex = takerStasTx.outputs[0].script.toHex()
    const makerStasInputScript = makerStasTx.outputs[0].script

    const makerInputSatoshis = tokenBSplitTxObj.outputs[0].satoshis
    const takerOutputSatoshis = makerInputSatoshis
    const makerOutputSatoshis = tokenASplitTxObj.outputs[0].satoshis
    const takerInputSatoshis = makerOutputSatoshis
    const makerInputUtxo = {
      txId: tokenBSplitTxid,
      outputIndex: 0,
      script: makerStasInputScript,
      satoshis: makerInputSatoshis
    }

    // console.log('t makerInputSatoshis: ', makerInputSatoshis)
    // console.log('t takerOutputSatoshis: ', takerOutputSatoshis)
    // console.log('t makerOutputSatoshis: ', makerOutputSatoshis)
    // console.log('t takerInputSatoshis: ', takerInputSatoshis)

    const wantedInfo = { scriptHex: takerStasInputScriptHex, satoshis: makerOutputSatoshis }

    const unsignedSwapOfferHex = createUnsignedSwapOffer(
      alicePrivateKey,
      makerInputUtxo,
      wantedInfo
    )

    // now bob takes the offer
    const fundingUTXO = {
      txid: tokenBSplitTxid,
      vout: 2,
      scriptPubKey: tokenBSplitTx.vout[2].scriptPubKey.hex,
      amount: Math.floor(tokenBSplitTx.vout[2].value * 1E8)
    }
    const alicePublicKeyHash = bsv.crypto.Hash.sha256ripemd160(alicePrivateKey.publicKey.toBuffer()).toString('hex')
    const bobPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(bobPrivateKey.publicKey.toBuffer()).toString('hex')

    const takerSignedSwapHex = acceptUnsignedSwapOffer(unsignedSwapOfferHex, makerInputSatoshis, tokenBSplitHex, 0,
      bobPrivateKey, tokenASplitHex, 0, takerInputSatoshis, takerOutputSatoshis, alicePublicKeyHash,
      fundingUTXO, fundingPrivateKey)

    const fullySignedSwapHex = makerSignSwapOffer(takerSignedSwapHex, tokenBSplitHex, tokenASplitHex, 0, alicePrivateKey, bobPublicKeyHash, paymentPublicKeyHash, fundingUTXO)

    const swapTxid = await broadcast(fullySignedSwapHex)
    console.log('swaptxid', swapTxid)
    const tokenId = await utils.getToken(swapTxid)
    console.log(`Token ID:        ${tokenId}`)
    await new Promise(resolve => setTimeout(resolve, 5000))
    const response = await utils.getTokenWithSymbol(tokenId, 'TOKENA')
    expect(response.symbol).to.equal('TOKENA')
    // add second token check
  })

  // the maker offers a token for sats
  it('Swap - 3 step token-p2pkh swap', async function () {
    const makerStasTx = bsv.Transaction(tokenBSplitHex)

    // first get some funds
    const bobUtxos = await getFundsFromFaucet(bobPrivateKey.toAddress(process.env.NETWORK).toString())
    // get input transaction
    const takerInputTx = await getRawTransaction(bobUtxos[0].txid)

    const makerInputSatoshis = tokenBSplitTxObj.outputs[0].satoshis
    const takerOutputSatoshis = makerInputSatoshis
    const makerOutputSatoshis = Math.floor(bobUtxos[0].amount * 1E8)
    const takerInputSatoshis = makerOutputSatoshis

    const alicePublicKeyHash = bsv.crypto.Hash.sha256ripemd160(alicePrivateKey.publicKey.toBuffer()).toString('hex')
    const bobPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(bobPrivateKey.publicKey.toBuffer()).toString('hex')

    const makerInputUtxo = {
      txId: tokenBSplitTxid,
      outputIndex: 0,
      script: makerStasTx.outputs[0].script,
      satoshis: makerInputSatoshis
    }

    // console.log('t makerInputSatoshis: ', makerInputSatoshis)
    // console.log('t takerOutputSatoshis: ', takerOutputSatoshis)
    // console.log('t makerOutputSatoshis: ', makerOutputSatoshis)
    // console.log('t takerInputSatoshis: ', takerInputSatoshis)

    const wantedInfo = { type: 'native', satoshis: makerOutputSatoshis }
    const takerInputInfo = { type: 'native', utxo: bobUtxos[0], satoshis: takerInputSatoshis }

    const unsignedSwapOfferHex = createUnsignedSwapOffer(
      alicePrivateKey,
      makerInputUtxo,
      wantedInfo
    )

    // now bob takes the offer
    const fundingUTXO = {
      txid: tokenBSplitTxid,
      vout: 2,
      scriptPubKey: tokenBSplitTx.vout[2].scriptPubKey.hex,
      amount: Math.floor(tokenBSplitTx.vout[2].value * 1E8)
    }

    const takerSignedSwapHex = acceptUnsignedNativeSwapOffer(unsignedSwapOfferHex, takerInputInfo, makerInputSatoshis, tokenBSplitHex, 0,
      bobPrivateKey, takerInputTx, bobUtxos[0].vout, takerOutputSatoshis, alicePublicKeyHash,
      fundingUTXO, fundingPrivateKey)

    const fullySignedSwapHex = makerSignSwapOffer(takerSignedSwapHex, tokenBSplitHex, takerInputTx, bobUtxos[0].vout, alicePrivateKey, bobPublicKeyHash, paymentPublicKeyHash, fundingUTXO)
    const swapTxid = await broadcast(fullySignedSwapHex)
    console.log('swaptxid', swapTxid)
    const tokenId = await utils.getToken(swapTxid)
    console.log(`Token ID:        ${tokenId}`)
    await new Promise(resolve => setTimeout(resolve, 5000))
    const response = await utils.getTokenWithSymbol(tokenId, 'TOKENA')
    expect(response.symbol).to.equal('TOKENA')
  })

  // the maker offers sats for a token
  it('Swap - 3 step p2pkh-token swap', async function () {
    const takerStasTx = bsv.Transaction(tokenASplitHex)
    const takerStasInputScriptHex = takerStasTx.outputs[0].script.toHex()
    // first get some funds
    const aliceUtxos = await getFundsFromFaucet(alicePrivateKey.toAddress(process.env.NETWORK).toString())
    // get input transaction
    const makerInputTx = await getRawTransaction(aliceUtxos[0].txid)

    const makerInputSatoshis = Math.floor(aliceUtxos[0].amount * 1E8)
    const takerOutputSatoshis = makerInputSatoshis
    const makerOutputSatoshis = tokenASplitTxObj.outputs[0].satoshis
    const takerInputSatoshis = makerOutputSatoshis

    const alicePublicKeyHash = bsv.crypto.Hash.sha256ripemd160(alicePrivateKey.publicKey.toBuffer()).toString('hex')
    const bobPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(bobPrivateKey.publicKey.toBuffer()).toString('hex')

    // console.log('t makerInputSatoshis: ', makerInputSatoshis)
    // console.log('t takerOutputSatoshis: ', takerOutputSatoshis)
    // console.log('t makerOutputSatoshis: ', makerOutputSatoshis)
    // console.log('t takerInputSatoshis: ', takerInputSatoshis)
    const wantedInfo = { scriptHex: takerStasInputScriptHex, satoshis: makerOutputSatoshis }

    const unsignedSwapOfferHex = createUnsignedSwapOffer(
      alicePrivateKey,
      aliceUtxos[0],
      wantedInfo
    )

    // now bob takes the offer
    const fundingUTXO = {
      txid: tokenBSplitTxid,
      vout: 2,
      scriptPubKey: tokenBSplitTx.vout[2].scriptPubKey.hex,
      amount: Math.floor(tokenBSplitTx.vout[2].value * 1E8)
    }

    const takerSignedSwapHex = acceptUnsignedSwapOffer(unsignedSwapOfferHex, makerInputSatoshis, makerInputTx, aliceUtxos[0].vout,
      bobPrivateKey, tokenASplitHex, 0, takerInputSatoshis, takerOutputSatoshis, alicePublicKeyHash,
      fundingUTXO, fundingPrivateKey)

    const fullySignedSwapHex = makerSignSwapOffer(takerSignedSwapHex, makerInputTx, tokenASplitHex, 0, alicePrivateKey, bobPublicKeyHash, paymentPublicKeyHash, fundingUTXO)
    // console.log(' p2pkh-token fullySignedSwapHex: ', fullySignedSwapHex)

    const swapTxid = await broadcast(fullySignedSwapHex)
    console.log('swaptxid', swapTxid)
    const tokenId = await utils.getToken(swapTxid)
    console.log(`Token ID:        ${tokenId}`)
    await new Promise(resolve => setTimeout(resolve, 5000))
    const response = await utils.getTokenWithSymbol(tokenId, 'TOKENA')
    expect(response.symbol).to.equal('TOKENA')
  })
})

/* setup:
    Token A:
    issue: aliceAddr: 7000, bobAddr: 3000
    split: bobAddr: 1500, 1500
    Token B:
    issue: aliceAddr: 5000
    split: aliceAddr: 2500, 2500
*/
async function setup () {
  tokenAIssuerPrivateKey = bsv.PrivateKey()
  //   tokenBIssuerPrivateKey = tokenAIssuerPrivateKey
  tokenBIssuerPrivateKey = bsv.PrivateKey()
  fundingPrivateKey = bsv.PrivateKey()
  paymentPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(fundingPrivateKey.publicKey.toBuffer()).toString('hex')
  alicePrivateKey = bsv.PrivateKey()
  bobPrivateKey = bsv.PrivateKey()
  //   console.log('tokenAIssuerPrivateKey.toWIF()', tokenAIssuerPrivateKey.toWIF())
  //   console.log('tokenBIssuerPrivateKey.toWIF()', tokenBIssuerPrivateKey.toWIF())
  //   console.log('fundingPrivateKey.toWIF()', fundingPrivateKey.toWIF())
  //   console.log('alicePrivateKey.toWIF()', alicePrivateKey.toWIF())
  //   console.log('bobPrivateKey.toWIF()', bobPrivateKey.toWIF())
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()

  tokenAContractUtxos = await getFundsFromFaucet(tokenAIssuerPrivateKey.toAddress(process.env.NETWORK).toString())
  tokenBContractUtxos = await getFundsFromFaucet(tokenBIssuerPrivateKey.toAddress(process.env.NETWORK).toString())
  tokenAFundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  tokenBFundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  tokenAIssuerPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(tokenAIssuerPrivateKey.publicKey.toBuffer()).toString('hex')
  tokenBIssuerPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(tokenBIssuerPrivateKey.publicKey.toBuffer()).toString('hex')

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
  tokenAContractTxid = await broadcast(tokenAContractHex)
  tokenAContractTx = await getTransaction(tokenAContractTxid)

  const tokenAIssueHex = issue(
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
  tokenAIssueTxid = await broadcast(tokenAIssueHex)
  tokenAIssueTx = await getTransaction(tokenAIssueTxid)

  const tokenAIssueOutFundingVout = tokenAIssueTx.vout.length - 1

  const tokenABobAmount1 = tokenAIssueTx.vout[0].value / 2
  const tokenABobAmount2 = tokenAIssueTx.vout[0].value - tokenABobAmount1
  const tokenASplitDestinations = []
  tokenASplitDestinations[0] = { address: bobAddr, amount: tokenABobAmount1 }
  tokenASplitDestinations[1] = { address: bobAddr, amount: tokenABobAmount2 }

  tokenASplitHex = split(
    bobPrivateKey,
    utils.getUtxo(tokenAIssueTxid, tokenAIssueTx, 0),
    tokenASplitDestinations,
    utils.getUtxo(tokenAIssueTxid, tokenAIssueTx, tokenAIssueOutFundingVout),
    fundingPrivateKey
  )
  tokenASplitTxid = await broadcast(tokenASplitHex)
  console.log('tokenASplitTxid', tokenASplitTxid)

  //   tokenASplitTx = await getTransaction(tokenASplitTxid)
  tokenASplitTxObj = new bsv.Transaction(tokenASplitHex)

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
  tokenBContractTxid = await broadcast(tokenBContractHex)
  tokenBContractTx = await getTransaction(tokenBContractTxid)

  const tokenBIssueHex = issue(
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

  const tokenBIssueOutFundingVout = tokenBIssueTx.vout.length - 1
  const tokenBAliceAmount1 = tokenBIssueTx.vout[0].value / 2
  const tokenBAliceAmount2 = tokenBIssueTx.vout[0].value - tokenBAliceAmount1
  const tokenBSplitDestinations = []
  tokenBSplitDestinations[0] = { address: aliceAddr, amount: tokenBAliceAmount1 }
  tokenBSplitDestinations[1] = { address: aliceAddr, amount: tokenBAliceAmount2 }

  tokenBSplitHex = split(
    alicePrivateKey,
    utils.getUtxo(tokenBIssueTxid, tokenBIssueTx, 0),
    tokenBSplitDestinations,
    utils.getUtxo(tokenBIssueTxid, tokenBIssueTx, tokenBIssueOutFundingVout),
    fundingPrivateKey
  )
  tokenBSplitTxid = await broadcast(tokenBSplitHex)

  tokenBSplitTx = await getTransaction(tokenBSplitTxid)
  tokenBSplitTxObj = new bsv.Transaction(tokenBSplitHex)
}
