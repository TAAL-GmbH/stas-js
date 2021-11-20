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
it('Mainnet LifeCycle Test 1', async function () {


  // per-run modifiable values

  const contractUtxo = await getUtxoMainNet('', true)
  const feeUtxo = await getUtxoMainNet('', false)

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
  await new Promise(r => setTimeout(r, wait))

  // const issueInfo = [
  //   {
  //     addr: bobAddr,
  //     satoshis: bobsInitialSathoshis,
  //     data: 'sent to bob'
  //   },
  //   {
  //     addr: emmaAddr,
  //     satoshis: emmasInitialSatoshis,
  //     data: 'sent to emma'
  //   }
  // ]

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
  console.log("token issued")
  // eslint-disable-next-line promise/param-names
  await new Promise(r => setTimeout(r, wait))

  // expect(await utils.getTokenBalanceMainNet(bobAddr)).to.contain(6000)
  // expect(await utils.getTokenBalanceMainNet(emmaAddr)).to.contain(4000)
  console.log('Bob Balance  ' + await utils.getTokenBalanceMainNet(bobAddr, symbol))
  console.log('Alice Balance  ' + await utils.getTokenBalanceMainNet(aliceAddr, symbol))

  const issueOutFundingVout = issueTx.vout.length - 1

  const transferHex = transfer(
    bobsPrivateKey,
    issuerPrivateKey.publicKey,
    {
      txid: issueTxid,
      vout: 0,
      scriptPubKey: issueTx.vout[0].scriptPubKey.hex,
      amount: issueTx.vout[0].value
    },
    aliceAddr,
    {
      txid: issueTxid,
      vout: issueOutFundingVout,
      scriptPubKey: issueTx.vout[issueOutFundingVout].scriptPubKey.hex,
      amount: issueTx.vout[issueOutFundingVout].value
    },
    issuerPrivateKey
  )
  const transferTxid = await utils.broadcastToMainNet(transferHex)
  console.log(`Transfer TX:     ${transferTxid}`)
  const transferTx = await utils.getTransactionMainNet(transferTxid)

  await new Promise(r => setTimeout(r, wait))
  // expect(await utils.getTokenBalanceMainNet(emmaAddr)).to.contain(10000)
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
    {
      txid: transferTxid,
      vout: 0,
      scriptPubKey: transferTx.vout[0].scriptPubKey.hex,
      amount: transferTx.vout[0].value
    },
    splitDestinations,
    {
      txid: transferTxid,
      vout: 1,
      scriptPubKey: transferTx.vout[1].scriptPubKey.hex,
      amount: transferTx.vout[1].value
    },
    issuerPrivateKey
  )
  const splitTxid = await utils.broadcastToMainNet(splitHex)
  console.log(`Split TX:        ${splitTxid}`)
  const splitTx = await utils.getTransactionMainNet(splitTxid)
  await new Promise(r => setTimeout(r, wait))

  // expect(await utils.getTokenBalanceMainNet(bobAddr)).to.contain(0)
  // expect(await utils.getTokenBalanceMainNet(emmaAddr)).to.contain(10000)
  console.log('Bob Balance  ' + await utils.getTokenBalanceMainNet(bobAddr, symbol))
  console.log('Alice Balance  ' + await utils.getTokenBalanceMainNet(aliceAddr, symbol))

  // Now let's merge the last split back together
  const splitTxObj = new bsv.Transaction(splitHex)
  
  console.log("here")
  const mergeHex = merge(
    bobsPrivateKey,
    issuerPrivateKey.publicKey,
    [{
      tx: splitTxObj,
      vout: 0
    },
    {
      tx: splitTxObj,
      vout: 1
    }],
    aliceAddr,
    {
      txid: splitTxid,
      vout: 2,
      scriptPubKey: splitTx.vout[2].scriptPubKey.hex,
      amount: splitTx.vout[2].value
    },
    issuerPrivateKey
  )
  const mergeTxid = await utils.broadcastToMainNet(mergeHex)
  console.log(`Merge TX:        ${mergeTxid}`)
  const mergeTx = await utils.getTransactionMainNet(mergeTxid)

  await new Promise(r => setTimeout(r, wait))
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
    {
      txid: mergeTxid,
      vout: 0,
      scriptPubKey: mergeTx.vout[0].scriptPubKey.hex,
      amount: mergeTx.vout[0].value
    },
    split2Destinations,
    {
      txid: mergeTxid,
      vout: 1,
      scriptPubKey: mergeTx.vout[1].scriptPubKey.hex,
      amount: mergeTx.vout[1].value
    },
    issuerPrivateKey
  )
  const splitTxid2 = await utils.broadcastToMainNet(splitHex2)
  console.log(`Split TX2:       ${splitTxid2}`)
  const splitTx2 = await utils.getTransactionMainNet(splitTxid2)

  await new Promise(r => setTimeout(r, wait))

  console.log('Bob Balance  ' + await utils.getTokenBalanceMainNet(bobAddr, symbol))
  console.log('Alice Balance  ' + await utils.getTokenBalanceMainNet(aliceAddr, symbol))

  // Now mergeSplit
  const splitTxObj2 = new bsv.Transaction(splitHex2)

  const aliceAmountSatoshis = Math.floor(splitTx2.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx2.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx2.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis

  const mergeSplitHex = mergeSplit(
    bobsPrivateKey,
    issuerPrivateKey.publicKey,
    [{
      tx: splitTxObj2,
      scriptPubKey: splitTx2.vout[0].scriptPubKey.hex,
      vout: 0,
      amount: splitTx2.vout[0].value
    },
    {
      tx: splitTxObj2,
      scriptPubKey: splitTx2.vout[1].scriptPubKey.hex,
      vout: 1,
      amount: splitTx2.vout[1].value

    }],
    bobAddr,
    bobAmountSatoshis,
    aliceAddr,
    aliceAmountSatoshis,
    {
      txid: splitTxid2,
      vout: 2,
      scriptPubKey: splitTx2.vout[2].scriptPubKey.hex,
      amount: splitTx2.vout[2].value
    },
    issuerPrivateKey
  )
  const mergeSplitTxid = await utils.broadcastToMainNet(mergeSplitHex)
  console.log(`MergeSplit TX:   ${mergeSplitTxid}`)
  const mergeSplitTx = await utils.getTransactionMainNet(mergeSplitTxid)

  await new Promise(r => setTimeout(r, wait))

  console.log('Bob Balance  ' + await utils.getTokenBalanceMainNet(bobAddr, symbol))
  console.log('Alice Balance  ' + await utils.getTokenBalanceMainNet(aliceAddr, symbol))

  const redeemHex = redeem(
    bobsPrivateKey,
    issuerPrivateKey.publicKey,
    {
      txid: mergeSplitTxid,
      vout: 0,
      scriptPubKey: mergeSplitTx.vout[0].scriptPubKey.hex,
      amount: mergeSplitTx.vout[0].value
    },
    {
      txid: mergeSplitTxid,
      vout: 2,
      scriptPubKey: mergeSplitTx.vout[2].scriptPubKey.hex,
      amount: mergeSplitTx.vout[2].value
    },
    issuerPrivateKey
  )
  const redeemTxid = await utils.broadcastToMainNet(redeemHex)
  console.log(`Redeem TX:       ${redeemTxid}`)
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


async function getUtxoMainNet(address, forContract) {
  const url = `https://api.whatsonchain.com/v1/bsv/main/address/${address}/unspent`

  const response = await axios({
    method: 'get',
    url
  })
  let array = []
  if (forContract){
    for (var key in response.data) {
      if (response.data[key].value > 10000) {
        array.push(response.data[key].tx_hash)
        array.push(response.data[key].tx_pos) 
        break
      }
    }
  }else{
    for (var key in response.data) {
      if (response.data[key].value = 10000) {
        array.push(response.data[key].tx_hash)
        array.push(response.data[key].tx_pos) 
        break
      }
    }

  }
  

  console.log(array[0])
  console.log(array[1])
  return array
}



