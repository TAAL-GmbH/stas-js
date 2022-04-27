const expect = require('chai').expect
const utils = require('../../utils/test_utils')
const bsv = require('bsv')
const axios = require('axios')
require('dotenv').config()

const {
  contract,
  issue,
  transfer,
  split,
  merge,
  mergeSplit,
  redeem
} = require('../../../index')

const { bitcoinToSatoshis } = require('../../../index').utils

// eslint-disable-next-line no-undef
it('Mainnet LifeCycle Test 1 broadcast via WOC', async () => {
  // per-run modifiable values
  const contractUtxo = await utils.getUtxoMainNet('17WYiaND4U88fKkt1tSa142gFSquRsXkpP', true)
  const feeUtxo = await utils.getUtxoMainNet('17WYiaND4U88fKkt1tSa142gFSquRsXkpP', false)

  const inputUtxoid = contractUtxo[0] // the input utxo
  const inputUtxoIdVoutIndex = contractUtxo[1]
  const inputUtxoidFee = feeUtxo[0] // the fee utxo
  const inputUtxoIdFeeVoutIndex = feeUtxo[1]
  const symbol = 'test-' + randomSymbol(10) // Use a unique symbol every test run to ensure that token balances can be checked correctly

  console.log('token symbol:', symbol)

  const supply = 10000
  const bobsInitialSathoshis = 6000
  const aliceInitialSatoshis = supply - bobsInitialSathoshis

  const wait = 1000 // set wait before token balance check in case of delay

  const issuerWif = process.env.ISSUERWIF // the issuer of the contract and pays fees
  const bobWif = process.env.BOBWIF
  const aliceWif = process.env.ALICEWIF

  const issuerPrivateKey = bsv.PrivateKey.fromWIF(issuerWif)
  const bobsPrivateKey = bsv.PrivateKey.fromWIF(bobWif)
  const alicePrivateKey = bsv.PrivateKey.fromWIF(aliceWif)

  const bobAddr = bobsPrivateKey.toAddress('mainnet').toString()
  const aliceAddr = alicePrivateKey.toAddress('mainnet').toString()
  console.log('Bob Address ' + bobAddr)
  console.log('Alice Address ' + aliceAddr)

  const inputUtxo = await utils.getTransactionMainNet(inputUtxoid)
  const inputUtxoFee = await utils.getTransactionMainNet(inputUtxoidFee)
  console.log(inputUtxo)

  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  const schema = utils.schema(publicKeyHash, symbol, supply)

  const contractHex = contract(
    issuerPrivateKey,
    [{
      txid: inputUtxoid,
      vout: inputUtxoIdVoutIndex,
      scriptPubKey: inputUtxo.vout[inputUtxoIdVoutIndex].scriptPubKey.hex,
      amount: inputUtxo.vout[inputUtxoIdVoutIndex].value
    }],
    [{
      txid: inputUtxoidFee,
      vout: inputUtxoIdFeeVoutIndex,
      scriptPubKey: inputUtxoFee.vout[inputUtxoIdFeeVoutIndex].scriptPubKey.hex,
      amount: inputUtxoFee.vout[inputUtxoIdFeeVoutIndex].value
    }],
    issuerPrivateKey,
    schema,
    supply
  )
  const contractTxid = await utils.broadcastToMainNet(contractHex)
  console.log(`Contract TX:     ${contractTxid}`)
  const contractTx = await utils.getTransactionMainNet(contractTxid)

  // eslint-disable-next-line promise/param-names
  await new Promise(resolve => setTimeout(resolve, wait))

  const issueHex = issue(
    issuerPrivateKey,
    utils.getIssueInfo(bobAddr, bobsInitialSathoshis, aliceAddr, aliceInitialSatoshis),
    utils.getUtxo(contractTxid, contractTx, 0),
    utils.getUtxo(contractTxid, contractTx, 1),
    issuerPrivateKey,
    true,
    symbol,
    2
  )
  const issueTxid = await utils.broadcastToMainNet(issueHex)
  console.log(`Issue TX:        ${issueTxid}`)
  const issueTx = await utils.getTransactionMainNet(issueTxid)
  const tokenId = await utils.getTokenMainNet(issueTxid)
  console.log(`Token ID:        ${tokenId}`)
  const response = await utils.getTokenResponseMainNet(tokenId, symbol)
  expect(response.symbol).to.equal(symbol)
  console.log('token issued')
  // eslint-disable-next-line promise/param-names
  await new Promise(resolve => setTimeout(resolve, wait))

  expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(6000)
  expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(4000)
  console.log('Bob Balance  ' + (await utils.getTokenBalanceMainNet(bobAddr, symbol)))
  console.log('Alice Balance  ' + (await utils.getTokenBalanceMainNet(aliceAddr, symbol)))

  const issueOutFundingVout = issueTx.vout.length - 1

  const transferHex = transfer(
    bobsPrivateKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    aliceAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    issuerPrivateKey
  )
  const transferTxid = await utils.broadcastToMainNet(transferHex)
  console.log(`Transfer TX:     ${transferTxid}`)
  const transferTx = await utils.getTransactionMainNet(transferTxid)

  await new Promise(resolve => setTimeout(resolve, wait))
  expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(0)
  expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(10000)
  console.log('Bob Balance  ' + (await utils.getTokenBalanceMainNet(bobAddr, symbol)))
  console.log('Alice Balance  ' + (await utils.getTokenBalanceMainNet(aliceAddr, symbol)))

  // Split tokens into 2 - both payable to Bob...
  const bobAmount1 = transferTx.vout[0].value / 2

  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount1 }

  const splitHex = split(
    alicePrivateKey,
    utils.getUtxo(transferTxid, transferTx, 0),
    splitDestinations,
    utils.getUtxo(transferTxid, transferTx, 1),
    issuerPrivateKey
  )
  const splitTxid = await utils.broadcastToMainNet(splitHex)
  console.log(`Split TX:        ${splitTxid}`)
  const splitTx = await utils.getTransactionMainNet(splitTxid)
  await new Promise(resolve => setTimeout(resolve, wait))

  expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(6000)
  expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(4000)
  console.log('Bob Balance  ' + (await utils.getTokenBalanceMainNet(bobAddr, symbol)))
  console.log('Alice Balance  ' + (await utils.getTokenBalanceMainNet(aliceAddr, symbol)))

  // Now let's merge the last split back together
  const splitTxObj = new bsv.Transaction(splitHex)

  const mergeHex = merge(
    bobsPrivateKey,
    utils.getMergeUtxo(splitTxObj),
    aliceAddr,
    utils.getUtxo(splitTxid, splitTx, 2),
    issuerPrivateKey
  )
  const mergeTxid = await utils.broadcastToMainNet(mergeHex)
  console.log(`Merge TX:        ${mergeTxid}`)
  const mergeTx = await utils.getTransactionMainNet(mergeTxid)

  await new Promise(resolve => setTimeout(resolve, wait))
  expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(0)
  expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(10000)
  console.log('Bob Balance  ' + (await utils.getTokenBalanceMainNet(bobAddr, symbol)))
  console.log('Alice Balance  ' + (await utils.getTokenBalanceMainNet(aliceAddr, symbol)))

  // Split again - both payable to Bob...
  const amount = bitcoinToSatoshis(mergeTx.vout[0].value / 2)

  const split2Destinations = []
  split2Destinations[0] = { address: bobAddr, amount: amount }
  split2Destinations[1] = { address: bobAddr, amount: amount }

  const splitHex2 = split(
    alicePrivateKey,
    utils.getUtxo(mergeTxid, mergeTx, 0),
    split2Destinations,
    utils.getUtxo(mergeTxid, mergeTx, 1),
    issuerPrivateKey
  )
  const splitTxid2 = await utils.broadcastToMainNet(splitHex2)
  console.log(`Split TX2:       ${splitTxid2}`)
  const splitTx2 = await utils.getTransactionMainNet(splitTxid2)

  await new Promise(resolve => setTimeout(resolve, wait))
  expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(6000)
  expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(4000)
  console.log('Bob Balance  ' + (await utils.getTokenBalanceMainNet(bobAddr, symbol)))
  console.log('Alice Balance  ' + (await utils.getTokenBalanceMainNet(aliceAddr, symbol)))

  // Now mergeSplit
  const splitTxObj2 = new bsv.Transaction(splitHex2)

  const aliceAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[0].value) / 2
  const bobAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[0].value) + bitcoinToSatoshis(splitTx2.vout[1].value) - aliceAmountSatoshis

  const mergeSplitHex = mergeSplit(
    bobsPrivateKey,
    utils.getMergeSplitUtxo(splitTxObj2, splitTx2),
    bobAddr,
    bobAmountSatoshis,
    aliceAddr,
    aliceAmountSatoshis,
    utils.getUtxo(splitTxid2, splitTx2, 2),
    issuerPrivateKey
  )

  const mergeSplitTxid = await utils.broadcastToMainNet(mergeSplitHex)
  console.log(`MergeSplit TX:   ${mergeSplitTxid}`)
  const mergeSplitTx = await utils.getTransactionMainNet(mergeSplitTxid)

  await new Promise(resolve => setTimeout(resolve, wait))
  expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(4500)
  expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(5500)
  console.log('Bob Balance  ' + (await utils.getTokenBalanceMainNet(bobAddr, symbol)))
  console.log('Alice Balance  ' + (await utils.getTokenBalanceMainNet(aliceAddr, symbol)))

  const redeemHex = redeem(
    bobsPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(mergeSplitTxid, mergeSplitTx, 0),
    utils.getUtxo(mergeSplitTxid, mergeSplitTx, 2),
    issuerPrivateKey
  )
  const redeemTxid = await utils.broadcastToMainNet(redeemHex)
  console.log(`Redeem TX:       ${redeemTxid}`)
  expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(0)
  expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(5500)
  console.log('Bob Balance  ' + (await utils.getTokenBalanceMainNet(bobAddr, symbol)))
  console.log('Alice Balance  ' + (await utils.getTokenBalanceMainNet(aliceAddr, symbol)))
})

function randomSymbol (length) {
  let result = ''
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() *
      charactersLength))
  }
  return result
}
