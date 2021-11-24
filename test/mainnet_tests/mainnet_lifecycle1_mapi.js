const expect = require('chai').expect
const utils = require('../utils/test_utils')
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
} = require('../../index')

const {
  SATS_PER_BITCOIN
} = require('../../index').utils

// eslint-disable-next-line no-undef
it('Mainnet LifeCycle Test 1 broadcast via MAPI', async function () {

  const wait = 5000 // set wait to ensure mapi tx has reached woc

  address = ''
  rsp = await utils.getUnspentMainNet(address)
  let array = []
  for (var key in rsp.data) {
    if (rsp.data[key].value > 1200000) {
      array.push(rsp.data[key].tx_hash)
      array.push(rsp.data[key].tx_pos)
      array.push(rsp.data[key].value)
    }
  }
  console.log(array)
  const amount3 = (Math.round(array[2] / 2)) - 5000 //5000 removed to cover tx fee

  const inputTxID = array[0] // id of tx to be used as UTXO
  const destinationAddress = address // address we are sending sats to 
  const changeAddress = address // address that change from tx is returned to
  const satAmount = amount3 // the amount in satoshes we are sending
  const senderPrivateKey = process.env.ISSUERWIF // private key of owner of UTXO to sign transaction

  const inputTx = await utils.getTransactionMainNet(inputTxID)
  const inputVout = array[1]  // which output of UTXO we are consuming

  const utxo = new bsv.Transaction.UnspentOutput({
    txId: inputTxID,
    outputIndex: inputVout,
    address: inputTx.vout[inputVout].scriptPubKey.addresses[0],
    script: inputTx.vout[inputVout].scriptPubKey.hex,
    satoshis: array[2]
  })
  const transaction = new bsv.Transaction()
    .from(utxo)
    .to(destinationAddress, satAmount)
    .change(changeAddress)
    .sign(senderPrivateKey)
  console.log(transaction.toString()) // if broadcast fails goto 'https://whatsonchain.com/broadcast' and put in tx hex to check error

  const txid = await utils.broadcastMapi(transaction.toString())
  await new Promise(r => setTimeout(r, wait))
  const tx = await utils.getTransactionMainNet(txid)
  console.log(tx)
  console.log(Math.round(tx.vout[0].value * SATS_PER_BITCOIN))

  response2 = await utils.getUnspentMainNet(address)

  let contractArray = []
  for (var key in response2.data) {
    if (response2.data[key].value == Math.round(tx.vout[0].value * SATS_PER_BITCOIN)) {
      contractArray.push(response2.data[key].tx_hash)
      contractArray.push(response2.data[key].tx_pos)
      break
    }
  }

  response3 = await utils.getUnspentMainNet(address)
  let feeArray = []
  for (var key in response3.data) {
    if (response3.data[key].value > Math.round(tx.vout[1].value * SATS_PER_BITCOIN)) {
      feeArray.push(response3.data[key].tx_hash)
      feeArray.push(response3.data[key].tx_pos)
      break
    }
  }



  console.log(contractArray)
  console.log(feeArray)

  const inputUtxoid = contractArray[0] // the input utxo
  const inputUtxoIdVoutIndex = contractArray[1]
  const inputUtxoidFee = feeArray[0] // the fee utxo
  const inputUtxoIdFeeVoutIndex = feeArray[1]
  const symbol = 'test-' + randomSymbol(10) // Use a unique symbol every test run to ensure that token balances can be checked correctly

  console.log('token symbol:', symbol)

  const supply = 10000
  const bobsInitialSathoshis = 6000
  const aliceInitialSatoshis = supply - bobsInitialSathoshis

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
  const contractTxid = await utils.broadcastMapi(contractHex)
  console.log(`Contract TX:     ${contractTxid}`)
  await new Promise(r => setTimeout(r, wait))
  const contractTx = await utils.getTransactionMainNet(contractTxid)

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
  const issueTxid = await utils.broadcastMapi(issueHex)
  console.log(`Issue TX:        ${issueTxid}`)
  await new Promise(r => setTimeout(r, wait))
  const issueTx = await utils.getTransactionMainNet(issueTxid)
  const tokenId = await utils.getTokenMainNet(issueTxid)
  console.log(`Token ID:        ${tokenId}`)
  await new Promise(r => setTimeout(r, wait))
  const response = await utils.getTokenResponseMainNet(tokenId, symbol)
  expect(response.symbol).to.equal(symbol)
  console.log("token issued")
  expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(6000)
  expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(4000)
  console.log('Bob Balance  ' + await utils.getTokenBalanceMainNet(bobAddr, symbol))
  console.log('Alice Balance  ' + await utils.getTokenBalanceMainNet(aliceAddr, symbol))

  const issueOutFundingVout = issueTx.vout.length - 1

  const transferHex = transfer(
    bobsPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    aliceAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    issuerPrivateKey
  )
  const transferTxid = await utils.broadcastMapi(transferHex)
  console.log(`Transfer TX:     ${transferTxid}`)
  await new Promise(r => setTimeout(r, wait))
  const transferTx = await utils.getTransactionMainNet(transferTxid)
  expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(0)
  expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(10000)
  console.log('Bob Balance  ' + await utils.getTokenBalanceMainNet(bobAddr, symbol))
  console.log('Alice Balance  ' + await utils.getTokenBalanceMainNet(aliceAddr, symbol))

  // Split tokens into 2 - both payable to Bob...
  const bobAmount1 = transferTx.vout[0].value / 2

  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount1 }

  const splitHex = split(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(transferTxid, transferTx, 0),
    splitDestinations,
    utils.getUtxo(transferTxid, transferTx, 1),
    issuerPrivateKey
  )
  const splitTxid = await utils.broadcastMapi(splitHex)
  await new Promise(r => setTimeout(r, wait))
  console.log(`Split TX:        ${splitTxid}`)
  const splitTx = await utils.getTransactionMainNet(splitTxid)
  expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(6000)
  expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(4000)
  console.log('Bob Balance  ' + await utils.getTokenBalanceMainNet(bobAddr, symbol))
  console.log('Alice Balance  ' + await utils.getTokenBalanceMainNet(aliceAddr, symbol))

  // Now let's merge the last split back together
  const splitTxObj = new bsv.Transaction(splitHex)

  const mergeHex = merge(
    bobsPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getMergeUtxo(splitTxObj),
    aliceAddr,
    utils.getUtxo(splitTxid, splitTx, 2),
    issuerPrivateKey
  )
  const mergeTxid = await utils.broadcastMapi(mergeHex)
  console.log(`Merge TX:        ${mergeTxid}`)
  await new Promise(r => setTimeout(r, wait))
  const mergeTx = await utils.getTransactionMainNet(mergeTxid)
  expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(0)
  expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(10000)
  console.log('Bob Balance  ' + await utils.getTokenBalanceMainNet(bobAddr, symbol))
  console.log('Alice Balance  ' + await utils.getTokenBalanceMainNet(aliceAddr, symbol))

  // Split again - both payable to Bob...
  const amount = mergeTx.vout[0].value / 2

  const split2Destinations = []
  split2Destinations[0] = { address: bobAddr, amount: amount }
  split2Destinations[1] = { address: bobAddr, amount: amount }

  const splitHex2 = split(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(mergeTxid, mergeTx, 0),
    split2Destinations,
    utils.getUtxo(mergeTxid, mergeTx, 1),
    issuerPrivateKey
  )
  const splitTxid2 = await utils.broadcastMapi(splitHex2)
  await new Promise(r => setTimeout(r, wait))
  console.log(`Split TX2:       ${splitTxid2}`)
  const splitTx2 = await utils.getTransactionMainNet(splitTxid2)
  expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(6000)
  expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(4000)
  console.log('Bob Balance  ' + await utils.getTokenBalanceMainNet(bobAddr, symbol))
  console.log('Alice Balance  ' + await utils.getTokenBalanceMainNet(aliceAddr, symbol))

  // Now mergeSplit
  const splitTxObj2 = new bsv.Transaction(splitHex2)

  const bobAmountSatoshis = Math.floor(splitTx2.vout[0].value * SATS_PER_BITCOIN)
  const aliceAmountSatoshis = Math.floor(splitTx2.vout[1].value * SATS_PER_BITCOIN)

  const mergeSplitHex = mergeSplit(
    bobsPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getMergeSplitUtxo(splitTxObj2, splitTx2),
    bobAddr,
    bobAmountSatoshis,
    aliceAddr,
    aliceAmountSatoshis,
    utils.getUtxo(splitTxid2, splitTx2, 2),
    issuerPrivateKey
  )
  const mergeSplitTxid = await utils.broadcastMapi(mergeSplitHex)
  console.log(`MergeSplit TX:   ${mergeSplitTxid}`)
  await new Promise(r => setTimeout(r, wait))
  const mergeSplitTx = await utils.getTransactionMainNet(mergeSplitTxid)
  // expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(3000)
  // expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(3000)
  console.log('Bob Balance  ' + await utils.getTokenBalanceMainNet(bobAddr, symbol))
  console.log('Alice Balance  ' + await utils.getTokenBalanceMainNet(aliceAddr, symbol))

  //redeem Bon's Token
  const redeemHex = redeem(
    bobsPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(mergeSplitTxid, mergeSplitTx, 0),
    utils.getUtxo(mergeSplitTxid, mergeSplitTx, 2),
    issuerPrivateKey
  )
  const redeemTxid = await utils.broadcastMapi(redeemHex)
  console.log(`Redeem TX:       ${redeemTxid}`)
  await new Promise(r => setTimeout(r, wait))
  const redeemTx = await utils.getTransactionMainNet(redeemTxid)
  // expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(0)
  // expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(5500)
  console.log('Bob Balance  ' + await utils.getTokenBalanceMainNet(bobAddr, symbol))
  console.log('Alice Balance  ' + await utils.getTokenBalanceMainNet(aliceAddr, symbol))

  //redeem Alice's Token
  const redeemHex2 = redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(mergeSplitTxid, mergeSplitTx, 1),
    utils.getUtxo(redeemTxid, redeemTx, 1),
    issuerPrivateKey
  )
  const redeemTxid2 = await utils.broadcastMapi(redeemHex2)
  console.log(`Redeem TX2:       ${redeemTxid2}`)
  await new Promise(r => setTimeout(r, wait))

  // expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(0)
  // expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(0)
  console.log('Bob Balance  ' + await utils.getTokenBalanceMainNet(bobAddr, symbol))
  console.log('Alice Balance  ' + await utils.getTokenBalanceMainNet(aliceAddr, symbol))
})

function randomSymbol(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() *
      charactersLength));
  }
  return result;
}



