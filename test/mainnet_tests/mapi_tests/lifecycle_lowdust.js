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

it('Mainnet LifeCycle Test With Low Dust', async () => {
  const wait = 10000 // set wait to ensure mapi tx has reached woc

  //   const address = ''
  //   const satsAmountForContract_and_Fees = 0 // use exact amount to match utxo
  //   const responseArray = await utils.setupMainNetTest(address, wait, satsAmountForContract_and_Fees)

  //   const inputUtxoid = responseArray[0] // the input utxo
  //   const inputUtxoIdVoutIndex = responseArray[1]
  //   const inputUtxoidFee = responseArray[2] // the fee utxo
  //   const inputUtxoIdFeeVoutIndex = responseArray[3]

  const inputUtxoid = '5ecadc0860eb2013ccbc2404ed4faf7ccb23ec521ed5508cbd455050c823df2a'
  const inputUtxoIdVoutIndex = 1

  const inputUtxoidFee = '3ae77093e8fb64ac438cd3e2b020608d56ae963ed9adbb1ed5c218388056c0c4'
  const inputUtxoIdFeeVoutIndex = 0

  const symbol = 'test-' + utils.randomSymbol(10) // Use a unique symbol every test run to ensure that token balances can be checked correctly

  console.log('token symbol:', symbol)

  const supply = 1000
  const bobsInitialSathoshis = 300
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

  const contractHex = await contract(
    issuerPrivateKey,
    [{
      txid: inputUtxoid,
      vout: inputUtxoIdVoutIndex,
      scriptPubKey: inputUtxo.vout[inputUtxoIdVoutIndex].scriptPubKey.hex,
      amount: bitcoinToSatoshis(inputUtxo.vout[inputUtxoIdVoutIndex].value)
    }],
    [{
      txid: inputUtxoidFee,
      vout: inputUtxoIdFeeVoutIndex,
      scriptPubKey: inputUtxoFee.vout[inputUtxoIdFeeVoutIndex].scriptPubKey.hex,
      amount: bitcoinToSatoshis(inputUtxoFee.vout[inputUtxoIdFeeVoutIndex].value)
    }],
    issuerPrivateKey,
    schema,
    supply
  )
  const contractTxid = await utils.broadcastMapi(contractHex)
  console.log(`Contract TX:     ${contractTxid}`)
  await new Promise(resolve => setTimeout(resolve, wait))
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
  console.log(issueHex)
  const issueTxid = await utils.broadcastMapi(issueHex)
  console.log(`Issue TX:        ${issueTxid}`)
  await new Promise(resolve => setTimeout(resolve, wait))
  const issueTx = await utils.getTransactionMainNet(issueTxid)
  const tokenId = await utils.getTokenMainNet(issueTxid)
  console.log(`Token ID:        ${tokenId}`)
  await new Promise(resolve => setTimeout(resolve, wait))
  const response = await utils.getTokenResponseMainNet(tokenId, symbol)
  expect(response.symbol).to.equal(symbol)
  console.log('token issued')
  //   expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(6000)
  //   expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(4000)
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
  const transferTxid = await utils.broadcastMapi(transferHex)
  console.log(`Transfer TX:     ${transferTxid}`)
  await new Promise(resolve => setTimeout(resolve, wait))
  const transferTx = await utils.getTransactionMainNet(transferTxid)
  //   expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(0)
  //   expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(10000)
  console.log('Bob Balance  ' + (await utils.getTokenBalanceMainNet(bobAddr, symbol)))
  console.log('Alice Balance  ' + (await utils.getTokenBalanceMainNet(aliceAddr, symbol)))

  // Split tokens into 2 - both payable to Bob...
  const bobAmount1 = transferTx.vout[0].value / 2

  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bitcoinToSatoshis(bobAmount1) }
  splitDestinations[1] = { address: bobAddr, amount: bitcoinToSatoshis(bobAmount1) }

  const splitHex = split(
    alicePrivateKey,
    utils.getUtxo(transferTxid, transferTx, 0),
    splitDestinations,
    utils.getUtxo(transferTxid, transferTx, 1),
    issuerPrivateKey
  )
  const splitTxid = await utils.broadcastMapi(splitHex)
  await new Promise(resolve => setTimeout(resolve, wait))
  console.log(`Split TX:        ${splitTxid}`)
  const splitTx = await utils.getTransactionMainNet(splitTxid)
  //   expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(6000)
  //   expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(4000)
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
  const mergeTxid = await utils.broadcastMapi(mergeHex)
  console.log(`Merge TX:        ${mergeTxid}`)
  await new Promise(resolve => setTimeout(resolve, wait))
  const mergeTx = await utils.getTransactionMainNet(mergeTxid)
  //   expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(0)
  //   expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(10000)
  console.log('Bob Balance  ' + (await utils.getTokenBalanceMainNet(bobAddr, symbol)))
  console.log('Alice Balance  ' + (await utils.getTokenBalanceMainNet(aliceAddr, symbol)))

  // Split again - both payable to Bob...
  const amount = mergeTx.vout[0].value / 2

  const split2Destinations = []
  split2Destinations[0] = { address: bobAddr, amount: bitcoinToSatoshis(amount) }
  split2Destinations[1] = { address: bobAddr, amount: bitcoinToSatoshis(amount) }

  const splitHex2 = split(
    alicePrivateKey,
    utils.getUtxo(mergeTxid, mergeTx, 0),
    split2Destinations,
    utils.getUtxo(mergeTxid, mergeTx, 1),
    issuerPrivateKey
  )
  const splitTxid2 = await utils.broadcastMapi(splitHex2)
  await new Promise(resolve => setTimeout(resolve, wait))
  console.log(`Split TX2:       ${splitTxid2}`)
  const splitTx2 = await utils.getTransactionMainNet(splitTxid2)
  //   expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(6000)
  //   expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(4000)
  console.log('Bob Balance  ' + (await utils.getTokenBalanceMainNet(bobAddr, symbol)))
  console.log('Alice Balance  ' + (await utils.getTokenBalanceMainNet(aliceAddr, symbol)))

  // Now mergeSplit
  const splitTxObj2 = new bsv.Transaction(splitHex2)

  const bobAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[0].value)
  const aliceAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[1].value)

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
  const mergeSplitTxid = await utils.broadcastMapi(mergeSplitHex)
  console.log(`MergeSplit TX:   ${mergeSplitTxid}`)
  await new Promise(resolve => setTimeout(resolve, wait))
  const mergeSplitTx = await utils.getTransactionMainNet(mergeSplitTxid)
  //   expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(3000)
  //   expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(7000)
  console.log('Bob Balance  ' + (await utils.getTokenBalanceMainNet(bobAddr, symbol)))
  console.log('Alice Balance  ' + (await utils.getTokenBalanceMainNet(aliceAddr, symbol)))

  // redeem Bon's Token
  const redeemHex = redeem(
    bobsPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(mergeSplitTxid, mergeSplitTx, 0),
    utils.getUtxo(mergeSplitTxid, mergeSplitTx, 2),
    issuerPrivateKey
  )
  const redeemTxid = await utils.broadcastMapi(redeemHex)
  console.log(`Redeem TX:       ${redeemTxid}`)
  await new Promise(resolve => setTimeout(resolve, wait))
  const redeemTx = await utils.getTransactionMainNet(redeemTxid)
  //   expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(0)
  //   expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(7000)
  console.log('Bob Balance  ' + (await utils.getTokenBalanceMainNet(bobAddr, symbol)))
  console.log('Alice Balance  ' + (await utils.getTokenBalanceMainNet(aliceAddr, symbol)))

  // redeem Alice's Token
  const redeemHex2 = redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(mergeSplitTxid, mergeSplitTx, 1),
    utils.getUtxo(redeemTxid, redeemTx, 1),
    issuerPrivateKey
  )
  const redeemTxid2 = await utils.broadcastMapi(redeemHex2)
  console.log(`Redeem TX2:       ${redeemTxid2}`)
  await new Promise(resolve => setTimeout(resolve, wait))
  //   expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(0)
  //   expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(4000)
  console.log('Bob Balance  ' + (await utils.getTokenBalanceMainNet(bobAddr, symbol)))
  console.log('Alice Balance  ' + (await utils.getTokenBalanceMainNet(aliceAddr, symbol)))
})
