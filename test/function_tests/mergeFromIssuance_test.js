const expect = require('chai').expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
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
  bitcoinToSatoshis,
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../../index').utils

it('Merge Directly From Issuance when issued to same address',
  async () => {
    const issuerPrivateKey = bsv.PrivateKey()
    const fundingPrivateKey = bsv.PrivateKey()

    const alicePrivateKey = bsv.PrivateKey()
    const aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()

    const bobPrivateKey = bsv.PrivateKey()
    const bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()

    const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
    const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())

    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
    const supply = 10000
    const symbol = 'TAALT'
    const schema = utils.schema(publicKeyHash, symbol, supply)

    console.log('Alice  ' + aliceAddr)
    console.log('Bob  ' + bobAddr)

    const wait = 0 // set wait before token balance check

    const contractHex = contract(
      issuerPrivateKey,
      contractUtxos,
      fundingUtxos,
      fundingPrivateKey,
      schema,
      supply
    )
    const contractTxid = await broadcast(contractHex)
    console.log(`Contract TX:     ${contractTxid}`)
    const contractTx = await getTransaction(contractTxid)

    const issueHex = issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000, aliceAddr, 3000), // issued to same address
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol,
      2
    )
    const issueTxid = await broadcast(issueHex)
    const issueTx = await getTransaction(issueTxid)
    const tokenId = await utils.getToken(issueTxid)
    console.log(`Token ID:        ${tokenId}`)
    const splitTxObj = new bsv.Transaction(issueHex)

    const mergeHex = merge(
      alicePrivateKey,
      utils.getMergeUtxo(splitTxObj),
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    )

    // const mergeTxid = await broadcast(mergeHex)
    // console.log(`Merge TX:        ${mergeTxid}`)
    // const mergeTx = await getTransaction(mergeTxid)
    // await new Promise(resolve => setTimeout(resolve, wait));
    // expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00003)
    // const tokenIdMerge = await utils.getToken(mergeTxid)
    // let responseMerge = await utils.getTokenResponse(tokenIdMerge)
    // expect(responseMerge.symbol).to.equal(symbol)
    // expect(responseMerge.contract_txs).to.contain(contractTxid)
    // expect(responseMerge.issuance_txs).to.contain(issueTxid)
    // console.log('Alice Balance ' + await utils.getTokenBalance(aliceAddr))
    // console.log('Bob Balance ' + await utils.getTokenBalance(bobAddr))
    // expect(await utils.getTokenBalance(aliceAddr)).to.equal(10000)
    // expect(await utils.getTokenBalance(bobAddr)).to.equal(0)

    // // Split again - both payable to Bob...
    // const amount = mergeTx.vout[0].value / 2

    // const split2Destinations = []
    // split2Destinations[0] = { address: bobAddr, amount: amount }
    // split2Destinations[1] = { address: bobAddr, amount: amount }

    // const splitHex2 = split(
    //   alicePrivateKey,
    //   utils.getUtxo(mergeTxid, mergeTx, 0),
    //   split2Destinations,
    //   utils.getUtxo(mergeTxid, mergeTx, 1),
    //   fundingPrivateKey
    // )
    // const splitTxid2 = await broadcast(splitHex2)
    // console.log(`Split TX2:       ${splitTxid2}`)
    // const splitTx2 = await getTransaction(splitTxid2)
    // await new Promise(resolve => setTimeout(resolve, wait));
    // expect(await utils.getVoutAmount(splitTxid2, 0)).to.equal(0.000015)
    // expect(await utils.getVoutAmount(splitTxid2, 1)).to.equal(0.000015)
    // console.log('Alice Balance ' + await utils.getTokenBalance(aliceAddr))
    // console.log('Bob Balance ' + await utils.getTokenBalance(bobAddr))
    // expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
    // expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)

    // // Now mergeSplit
    // const splitTxObj2 = new bsv.Transaction(splitHex2)

    // const aliceAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[0].value ) / 2
    // const bobAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[0].value ) + bitcoinToSatoshis(splitTx2.vout[1].value ) - aliceAmountSatoshis

    // const mergeSplitHex = mergeSplit(
    //   bobPrivateKey,
    //   utils.getMergeSplitUtxo(splitTxObj2, splitTx2),
    //   aliceAddr,
    //   aliceAmountSatoshis,
    //   bobAddr,
    //   bobAmountSatoshis,
    //   utils.getUtxo(splitTxid2, splitTx2, 2),
    //   fundingPrivateKey
    // )

    // const mergeSplitTxid = await broadcast(mergeSplitHex)
    // console.log(`MergeSplit TX:   ${mergeSplitTxid}`)
    // const mergeSplitTx = await getTransaction(mergeSplitTxid)
    // await new Promise(resolve => setTimeout(resolve, wait));
    // expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.0000075)
    // expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.0000225)
    // console.log('Alice Balance ' + await utils.getTokenBalance(aliceAddr))
    // console.log('Bob Balance ' + await utils.getTokenBalance(bobAddr))
    // expect(await utils.getTokenBalance(aliceAddr)).to.equal(7750)
    // expect(await utils.getTokenBalance(bobAddr)).to.equal(2250)

    // // Alice wants to redeem the money from bob...
    // const redeemHex = redeem(
    //   alicePrivateKey,
    //   issuerPrivateKey.publicKey,
    //   utils.getUtxo(mergeSplitTxid, mergeSplitTx, 0),
    //   utils.getUtxo(mergeSplitTxid, mergeSplitTx, 2),
    //   fundingPrivateKey
    // )
    // const redeemTxid = await broadcast(redeemHex)
    // console.log(`Redeem TX:       ${redeemTxid}`)
    // await new Promise(resolve => setTimeout(resolve, wait));
    // expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.0000075)
    // console.log('Alice Balance ' + await utils.getTokenBalance(aliceAddr))
    // console.log('Bob Balance ' + await utils.getTokenBalance(bobAddr))
    // expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000) // 750 of alice tokens were redeemed
    // expect(await utils.getTokenBalance(bobAddr)).to.equal(2250)
  }
)
