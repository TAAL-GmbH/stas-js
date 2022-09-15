// const expect = require('chai').expect
// const utils = require('../../utils/test_utils')
// const bsv = require('bsv')
// const axios = require('axios')
// require('dotenv').config()

// const {
//   contract,
//   issue,
//   transfer,
//   split,
//   merge,
//   mergeSplit,
//   redeem
// } = require('../../../index')

// const { bitcoinToSatoshis } = require('../../../index').utils

// it(
//   'Mainnet LifeCycle Test 1 broadcast via WOC With No Fees',
//   async () => {
//     const wait = 10000

//     const inputTxid = ''
//     const inputTx = await utils.getTransactionMainNet(inputTxid)
//     const inputUtxoIdVoutIndex = 1
//     const scriptPubKey = inputTx.vout[inputUtxoIdVoutIndex].scriptPubKey.hex
//     const inputAmount = inputTx.vout[inputUtxoIdVoutIndex].value
//     console.log(inputTx)
//     console.log(scriptPubKey)
//     console.log(inputAmount)

//     const symbol = 'test-' + utils.randomSymbol(10) // Use a unique symbol every test run to ensure that token balances can be checked correctly
//     console.log('token symbol:', symbol)

//     const supply = 10000
//     const bobsInitialSathoshis = 6000
//     const aliceInitialSatoshis = supply - bobsInitialSathoshis

//     const issuerWif = process.env.ISSUERWIF // the issuer of the contract and pays fees
//     const bobWif = process.env.BOBWIF
//     const aliceWif = process.env.ALICEWIF

//     const issuerPrivateKey = bsv.PrivateKey.fromWIF(issuerWif)
//     const bobsPrivateKey = bsv.PrivateKey.fromWIF(bobWif)
//     const alicePrivateKey = bsv.PrivateKey.fromWIF(aliceWif)

//     const bobAddr = bobsPrivateKey.toAddress('mainnet').toString()
//     const aliceAddr = alicePrivateKey.toAddress('mainnet').toString()
//     console.log('Bob Address ' + bobAddr)
//     console.log('Alice Address ' + aliceAddr)

//     const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
//     const schema = utils.schema(publicKeyHash, symbol, supply)

//     const contractHex = contract(
//       issuerPrivateKey,
//       [{
//         txid: inputTxid,
//         vout: inputUtxoIdVoutIndex,
//         scriptPubKey: inputTx.vout[inputUtxoIdVoutIndex].scriptPubKey.hex,
//         satoshis: inputTx.vout[inputUtxoIdVoutIndex].value
//       }],
//       null,
//       null,
//       schema,
//       supply
//     )
//     const contractTxid = await utils.broadcastToMainNet(contractHex)
//     console.log(`Contract TX:     ${contractTxid}`)
//     const contractTx = await utils.getTransactionMainNet(contractTxid)

//     // eslint-disable-next-line promise/param-names
//     await new Promise(resolve => setTimeout(resolve, wait))

//     const issueHex = issue(
//       issuerPrivateKey,
//       utils.getIssueInfo(bobAddr, bobsInitialSathoshis, aliceAddr, aliceInitialSatoshis),
//       utils.getUtxo(contractTxid, contractTx, 0),
//       null,
//       null,
//       true,
//       symbol,
//       2
//     )
//     const issueTxid = await utils.broadcastToMainNet(issueHex)
//     console.log(`Issue TX:        ${issueTxid}`)
//     await new Promise(resolve => setTimeout(resolve, wait))
//     const issueTx = await utils.getTransactionMainNet(issueTxid)
//     const tokenId = await utils.getTokenMainNet(issueTxid)
//     console.log(`Token ID:        ${tokenId}`)
//     const response = await utils.getTokenResponseMainNet(tokenId, symbol)
//     expect(response.symbol).to.equal(symbol)
//     console.log('token issued')

//     expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(6000)
//     expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(4000)
//     console.log('Bob Balance  ' + (await utils.getTokenBalanceMainNet(bobAddr, symbol)))
//     console.log('Alice Balance  ' + (await utils.getTokenBalanceMainNet(aliceAddr, symbol)))

//     const transferHex = transfer(
//       bobsPrivateKey,
//       utils.getUtxo(issueTxid, issueTx, 0),
//       aliceAddr,
//       null,
//       null
//     )
//     const transferTxid = await utils.broadcastToMainNet(transferHex)
//     console.log(`Transfer TX:     ${transferTxid}`)
//     await new Promise(resolve => setTimeout(resolve, wait))
//     const transferTx = await utils.getTransactionMainNet(transferTxid)
//     console.log('Bob Balance  ' + (await utils.getTokenBalanceMainNet(bobAddr, symbol)))
//     console.log('Alice Balance  ' + (await utils.getTokenBalanceMainNet(aliceAddr, symbol)))
//     expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(0)
//     expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(10000)

//     // Split tokens into 2 - both payable to Bob...
//     const bobAmount1 = transferTx.vout[0].value / 2

//     const splitDestinations = []
//     splitDestinations[0] = { address: bobAddr, satoshis: bitcoinToSatoshis(bobAmount1) }
//     splitDestinations[1] = { address: bobAddr, satoshis: bitcoinToSatoshis(bobAmount1) }

//     const splitHex = split(
//       alicePrivateKey,
//       utils.getUtxo(transferTxid, transferTx, 0),
//       splitDestinations,
//       null,
//       null
//     )
//     const splitTxid = await utils.broadcastToMainNet(splitHex)
//     console.log(`Split TX:        ${splitTxid}`)
//     await new Promise(resolve => setTimeout(resolve, wait))
//     const splitTx = await utils.getTransactionMainNet(splitTxid)
//     console.log('Bob Balance  ' + (await utils.getTokenBalanceMainNet(bobAddr, symbol)))
//     console.log('Alice Balance  ' + (await utils.getTokenBalanceMainNet(aliceAddr, symbol)))
//     expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(6000)
//     expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(4000)

//     // Now let's merge the last split back together
//     const splitTxObj = new bsv.Transaction(splitHex)

//     const mergeHex = merge(
//       bobsPrivateKey,
//       utils.getMergeUtxo(splitTxObj),
//       aliceAddr,
//       null,
//       null
//     )
//     const mergeTxid = await utils.broadcastToMainNet(mergeHex)
//     console.log(`Merge TX:        ${mergeTxid}`)
//     await new Promise(resolve => setTimeout(resolve, wait))
//     const mergeTx = await utils.getTransactionMainNet(mergeTxid)
//     console.log('Bob Balance  ' + (await utils.getTokenBalanceMainNet(bobAddr, symbol)))
//     console.log('Alice Balance  ' + (await utils.getTokenBalanceMainNet(aliceAddr, symbol)))
//     expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(0)
//     expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(10000)

//     const amount = bitcoinToSatoshis(mergeTx.vout[0].value / 2)

//     const split2Destinations = []
//     split2Destinations[0] = { address: bobAddr, satoshis: amount }
//     split2Destinations[1] = { address: bobAddr, satoshis: amount }

//     const splitHex2 = split(
//       alicePrivateKey,
//       utils.getUtxo(mergeTxid, mergeTx, 0),
//       split2Destinations,
//       null,
//       null
//     )
//     const splitTxid2 = await utils.broadcastToMainNet(splitHex2)
//     console.log(`Split TX2:       ${splitTxid2}`)
//     await new Promise(resolve => setTimeout(resolve, wait))
//     const splitTx2 = await utils.getTransactionMainNet(splitTxid2)
//     console.log('Bob Balance  ' + (await utils.getTokenBalanceMainNet(bobAddr, symbol)))
//     console.log('Alice Balance  ' + (await utils.getTokenBalanceMainNet(aliceAddr, symbol)))
//     expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(6000)
//     expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(4000)

//     const splitTxObj2 = new bsv.Transaction(splitHex2)

//     const aliceAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[0].value) / 2
//     const bobAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[0].value) + bitcoinToSatoshis(splitTx2.vout[1].value) - aliceAmountSatoshis

//     const mergeSplitHex = mergeSplit(
//       bobsPrivateKey,
//       utils.getMergeSplitUtxo(splitTxObj2, splitTx2),
//       bobAddr,
//       bobAmountSatoshis,
//       aliceAddr,
//       aliceAmountSatoshis,
//       null,
//       null
//     )

//     const mergeSplitTxid = await utils.broadcastToMainNet(mergeSplitHex)
//     console.log(`MergeSplit TX:   ${mergeSplitTxid}`)
//     await new Promise(resolve => setTimeout(resolve, wait))
//     const mergeSplitTx = await utils.getTransactionMainNet(mergeSplitTxid)
//     console.log('Bob Balance  ' + (await utils.getTokenBalanceMainNet(bobAddr, symbol)))
//     console.log('Alice Balance  ' + (await utils.getTokenBalanceMainNet(aliceAddr, symbol)))
//     expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(4500)
//     expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(5500)

//     const redeemHex = redeem(
//       bobsPrivateKey,
//       issuerPrivateKey.publicKey,
//       utils.getUtxo(mergeSplitTxid, mergeSplitTx, 0),
//       null,
//       null
//     )
//     const redeemTxid = await utils.broadcastToMainNet(redeemHex)
//     console.log(`Redeem TX:       ${redeemTxid}`)
//     await new Promise(resolve => setTimeout(resolve, wait))
//     const redeemTx = await utils.getTransactionMainNet(redeemTxid)
//     console.log('Bob Balance  ' + (await utils.getTokenBalanceMainNet(bobAddr, symbol)))
//     console.log('Alice Balance  ' + (await utils.getTokenBalanceMainNet(aliceAddr, symbol)))
//     expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(0)
//     expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(5500)

//     const redeemHex2 = redeem(
//       alicePrivateKey,
//       issuerPrivateKey.publicKey,
//       utils.getUtxo(mergeSplitTxid, mergeSplitTx, 1),
//       null,
//       null
//     )
//     const redeemTxid2 = await utils.broadcastToMainNet(redeemHex2)
//     console.log(`Redeem TX2:       ${redeemTxid2}`)
//     console.log('Bob Balance  ' + (await utils.getTokenBalanceMainNet(bobAddr, symbol)))
//     console.log('Alice Balance  ' + (await utils.getTokenBalanceMainNet(aliceAddr, symbol)))
//     expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(0)
//     expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(4000)
//   }
// )
