const utils = require('../../utils/test_utils')
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
} = require('../../../index').swap

const {
  bitcoinToSatoshis,
  getTransaction,
  getRawTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../../../index').utils

const {
  contract,
  issue, 
    transfer, 
  redeem
} = require('../../../index')

let fundingPrivateKey
let bobPrivateKey
let alicePrivateKey
let tokenAIssuerPrivateKey
let tokenBIssuerPrivateKey
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
let alicePublicKeyHash
let bobPublicKeyHash
let tokenASymbol
let tokenBSymbol

beforeEach(async function () {
  await setup()
})

describe('atomic swap with commission', function () {

  it('Swap - 2 step token-p2pkh swap with commissionInfo', async function () {
    const makerVout = 0
    const takerVout = 0
    const makerStasTx = bsv.Transaction(tokenBIssueHex)
    const makerStasInputScript = makerStasTx.outputs[makerVout].script

    // taker gets some funds
    const bobUtxos = await getFundsFromFaucet(bobPrivateKey.toAddress(process.env.NETWORK).toString())
    // get input transaction
    const takerInputTxHex = await getRawTransaction(bobUtxos[0].txid)

    const alicePublicKeyHash = bsv.crypto.Hash.sha256ripemd160(alicePrivateKey.publicKey.toBuffer()).toString('hex')

    const makerInputSatoshis = tokenBObj.outputs[makerVout].satoshis
    const takerOutputSatoshis = makerInputSatoshis
    const makerOutputSatoshis = bobUtxos[0].satoshis
    const takerInputSatoshis = makerOutputSatoshis

    const makerInputUtxo = {
      txId: tokenBIssueTxid,
      outputIndex: takerVout,
      script: makerStasInputScript,
      satoshis: makerInputSatoshis
    }

    const wantedInfo = { type: 'native', satoshis: makerOutputSatoshis }

    const swapOfferHex = await createSwapOffer(
      alicePrivateKey,
      makerInputUtxo,
      wantedInfo
    )
    // now bob takes the offer
    const fundingUTXO = {
      txid: tokenBIssueTxid,
      vout: 1,
      scriptPubKey: tokenBIssueTx.vout[1].scriptPubKey.hex,
      satoshis: bitcoinToSatoshis(tokenBIssueTx.vout[1].value)
    }

    const takerInputUTXO = {
      txId: bobUtxos[0].txid,
      outputIndex: bobUtxos[0].vout,
      script: bsv.Script.fromHex(bobUtxos[0].scriptPubKey),
      satoshis: takerInputSatoshis
    }
    commissionInfo = [{
      address: aliceAddr,
      satoshis: 100
    }]
    const fullySignedSwapHex = await acceptSwapOffer(swapOfferHex, tokenBIssueHex,
      bobPrivateKey, takerInputTxHex, takerInputUTXO, takerOutputSatoshis, alicePublicKeyHash,
      fundingUTXO, fundingPrivateKey, commissionInfo)

    const swapTxid = await broadcast(fullySignedSwapHex)
      console.log('swaptxid', swapTxid)
      console.log(aliceAddr)
      console.log(bobAddr)
    const swapTx = await getTransaction(swapTxid)
    expect(await utils.getBsvBalance(aliceAddr, 1000000))
    expect(await utils.getBsvBalance(bobAddr, 0))
    const tokenId = await utils.getToken(swapTxid, 1)
    const response = await utils.getTokenResponse(tokenId, tokenBSymbol)
    expect(response.symbol).to.equal(tokenBSymbol)
    expect(await utils.getVoutAmount(swapTxid, 0)).to.equal(0.01)
    expect(await utils.getVoutAmount(swapTxid, 1)).to.equal(0.00003)
    await utils.isTokenBalance(aliceAddr, 0)
    await utils.isTokenBalanceTwoTokens(bobAddr, 9000)

    const transferHex = await transfer(
      bobPrivateKey,
      utils.getUtxo(swapTxid, swapTx, 1),
      aliceAddr,
      utils.getUtxo(swapTxid, swapTx, 2),
      fundingPrivateKey
    )
    const transferTxid = await broadcast(transferHex)
      console.log('TransferTxId: ', transferTxid)
      const transferTx = await getTransaction(transferTxid)
      await utils.isTokenBalance(aliceAddr, 3000)
      await utils.isTokenBalance(bobAddr, 6000)
  
      const redeemHex = await redeem(
        alicePrivateKey,
        tokenBIssuerPrivateKey.publicKey,
        utils.getUtxo(transferTxid, transferTx, 0),
        utils.getUtxo(transferTxid, transferTx, 1),
        fundingPrivateKey
      )
      const redeemTxid = await broadcast(redeemHex)
      await utils.isTokenBalance(aliceAddr, 0)
      await utils.isTokenBalance(bobAddr, 6000)
  })




})

async function setup() {
   tokenAIssuerPrivateKey = bsv.PrivateKey()
    tokenBIssuerPrivateKey = bsv.PrivateKey()
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
  tokenAObj = new bsv.Transaction(tokenAIssueHex)

  // Token B
  tokenBSymbol = 'TOKENB'
  const tokenBSupply = 3000
  const tokenBSchema = utils.schema(tokenBIssuerPublicKeyHash, tokenBSymbol, tokenBSupply)
  const tokenBContractHex = await contract(
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
    satoshis: bitcoinToSatoshis(tokenBIssueTx.vout[1].value)
  }
}
