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

const issuerPrivateKey = bsv.PrivateKey()
const fundingPrivateKey = bsv.PrivateKey()
const bobPrivateKey = bsv.PrivateKey()
const bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()
const alicePrivateKey = bsv.PrivateKey()
const aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()
const davePrivateKey = bsv.PrivateKey()
const daveAddr = davePrivateKey.toAddress(process.env.NETWORK).toString()
const emmaPrivateKey = bsv.PrivateKey()
const emmaAddr = emmaPrivateKey.toAddress(process.env.NETWORK).toString()
const wait = 5000

it(
  'Full Life Cycle Test With Multiple Transfers & Splits',
  async () => {
    const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
    const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
    const supply = 40000
    const symbol = 'TAALT'
    const schema = utils.schema(publicKeyHash, symbol, supply)

    // change goes back to the fundingPrivateKey
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

    const issueInfo = [
      {
        addr: bobAddr,
        satoshis: 10000,
        data: '1_data'
      },
      {
        addr: aliceAddr,
        satoshis: 10000,
        data: '2_data'
      },
      {
        addr: daveAddr,
        satoshis: 10000,
        data: '3_data'
      },
      {
        addr: emmaAddr,
        satoshis: 10000,
        data: '4_data'
      }]

    const issueHex = issue(
      issuerPrivateKey,
      issueInfo,
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol,
      2
    )
    const issueTxid = await broadcast(issueHex)
    await new Promise(resolve => setTimeout(resolve, wait))
    const issueTx = await getTransaction(issueTxid)
    const tokenId = await utils.getToken(issueTxid)
    console.log(`Token ID:        ${tokenId}`)
    const response = await utils.getTokenResponse(tokenId) // token issuance fails intermittingly
    expect(response.symbol).to.equal(symbol)

    for (let i = 1; i < 4; i++) {
      expect(await utils.getVoutAmount(issueTxid, i)).to.equal(0.0001)
    }
    await utils.isTokenBalance(bobAddr, 10000)
    await utils.isTokenBalance(aliceAddr, 10000)
    await utils.isTokenBalance(daveAddr, 10000)
    await utils.isTokenBalance(emmaAddr, 10000)

    const issueOutFundingVout = issueTx.vout.length - 1

    const transferHex = transfer(
      bobPrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    const transferTxid = await broadcast(transferHex)
    console.log(`Transfer TX:     ${transferTxid}`)
    const transferTx = await getTransaction(transferTxid)
    await utils.isTokenBalance(bobAddr, 0)
    await utils.isTokenBalance(aliceAddr, 20000)
    await utils.isTokenBalance(daveAddr, 10000)
    await utils.isTokenBalance(emmaAddr, 10000)

    const transferHex2 = transfer(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      emmaAddr,
      utils.getUtxo(transferTxid, transferTx, 1),
      fundingPrivateKey
    )
    const transferTxid2 = await broadcast(transferHex2)
    console.log(`Transfer TX2:     ${transferTxid2}`)
    const transferTx2 = await getTransaction(transferTxid2)
    await utils.isTokenBalance(bobAddr, 0)
    await utils.isTokenBalance(aliceAddr, 10000)
    await utils.isTokenBalance(daveAddr, 10000)
    await utils.isTokenBalance(emmaAddr, 20000)

    const transferHex3 = transfer(
      davePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 2),
      emmaAddr,
      utils.getUtxo(transferTxid2, transferTx2, 1),
      fundingPrivateKey
    )
    const transferTxid3 = await broadcast(transferHex3)
    console.log(`Transfer TX3:     ${transferTxid3}`)
    const transferTx3 = await getTransaction(transferTxid3)
    await utils.isTokenBalance(bobAddr, 0)
    await utils.isTokenBalance(aliceAddr, 10000)
    await utils.isTokenBalance(daveAddr, 0)
    await utils.isTokenBalance(emmaAddr, 30000)

    const transferHex4 = transfer(
      emmaPrivateKey,
      utils.getUtxo(issueTxid, issueTx, 3),
      bobAddr,
      utils.getUtxo(transferTxid3, transferTx3, 1),
      fundingPrivateKey
    )
    const transferTxid4 = await broadcast(transferHex4)
    console.log(`Transfer TX4:     ${transferTxid4}`)
    const transferTx4 = await getTransaction(transferTxid4)

    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.0001)
    await utils.isTokenBalance(bobAddr, 10000)
    await utils.isTokenBalance(aliceAddr, 10000)
    await utils.isTokenBalance(daveAddr, 0)
    await utils.isTokenBalance(emmaAddr, 20000)

    const bobAmount1 = transferTx.vout[0].value / 2
    const bobAmount2 = transferTx.vout[0].value - bobAmount1
    const splitDestinations = []
    splitDestinations[0] = { address: daveAddr, amount: bitcoinToSatoshis(bobAmount1) }
    splitDestinations[1] = { address: daveAddr, amount: bitcoinToSatoshis(bobAmount2) }

    const splitHex = split(
      bobPrivateKey,
      utils.getUtxo(transferTxid4, transferTx4, 0),
      splitDestinations,
      utils.getUtxo(transferTxid4, transferTx4, 1),
      fundingPrivateKey
    )
    const splitTxid = await broadcast(splitHex)
    console.log(`Split TX:        ${splitTxid}`)
    const splitTx = await getTransaction(splitTxid)
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.00005)
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.00005)
    await utils.isTokenBalance(bobAddr, 0)
    await utils.isTokenBalance(aliceAddr, 10000)
    await utils.isTokenBalance(daveAddr, 10000)
    await utils.isTokenBalance(emmaAddr, 20000)

    const splitTxObj = new bsv.Transaction(splitHex)

    const mergeHex = merge(
      davePrivateKey,
      utils.getMergeUtxo(splitTxObj),
      aliceAddr,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    const mergeTxid = await broadcast(mergeHex)
    console.log(`Merge TX:        ${mergeTxid}`)
    const mergeTx = await getTransaction(mergeTxid)
    expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.0001)
    await utils.isTokenBalance(bobAddr, 0)
    await utils.isTokenBalance(aliceAddr, 20000)
    await utils.isTokenBalance(daveAddr, 0)
    await utils.isTokenBalance(emmaAddr, 20000)

    const aliceAmount1 = mergeTx.vout[0].value / 2
    const aliceAmount2 = mergeTx.vout[0].value - aliceAmount1

    const split2Destinations = []
    split2Destinations[0] = { address: aliceAddr, amount: bitcoinToSatoshis(aliceAmount1) }
    split2Destinations[1] = { address: aliceAddr, amount: bitcoinToSatoshis(aliceAmount2) }

    const splitHex2 = split(
      alicePrivateKey,
      utils.getUtxo(mergeTxid, mergeTx, 0),
      split2Destinations,
      utils.getUtxo(mergeTxid, mergeTx, 1),
      fundingPrivateKey
    )

    const splitTxid2 = await broadcast(splitHex2)
    console.log(`Split TX2:       ${splitTxid2}`)
    const splitTx2 = await getTransaction(splitTxid2)
    expect(await utils.getVoutAmount(splitTxid2, 0)).to.equal(0.00005)
    expect(await utils.getVoutAmount(splitTxid2, 1)).to.equal(0.00005)
    await utils.isTokenBalance(bobAddr, 0)
    await utils.isTokenBalance(aliceAddr, 20000)
    await utils.isTokenBalance(daveAddr, 0)
    await utils.isTokenBalance(emmaAddr, 20000)

    //   // Now mergeSplit
    //   const splitTxObj2 = new bsv.Transaction(splitHex2)

    //   const aliceAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[0].value) / 2
    //   const bobAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[0].value) + bitcoinToSatoshis(splitTx2.vout[1].value) - aliceAmountSatoshis

    //   const mergeSplitHex = mergeSplit(
    //     alicePrivateKey,
    //     issuerPrivateKey.publicKey,
    //     utils.getMergeSplitUtxo(splitTxObj2, splitTx2),
    //     aliceAddr,
    //     aliceAmountSatoshis,
    //     bobAddr,
    //     bobAmountSatoshis,
    //     utils.getUtxo(splitTxid2, splitTx2, 2),
    //     fundingPrivateKey
    //   )

    //   const mergeSplitTxid = await broadcast(mergeSplitHex)
    //   console.log(`MergeSplit TX:   ${mergeSplitTxid}`)
    //   const mergeSplitTx = await getTransaction(mergeSplitTxid)
    //   expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.0000075)
    //   expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.0000225)
    //   console.log('Alice Balance ' + await utils.getTokenBalance(aliceAddr))
    //   console.log('Bob Balance ' + await utils.getTokenBalance(bobAddr))

    //   // Alice wants to redeem the money from bob...
    //   const redeemHex = redeem(
    //     alicePrivateKey,
    //     issuerPrivateKey.publicKey,
    //     utils.getUtxo(mergeSplitTxid, mergeSplitTx, 0),
    //     utils.getUtxo(mergeSplitTxid, mergeSplitTx, 2),
    //     fundingPrivateKey
    //   )
    //   const redeemTxid = await broadcast(redeemHex)
    //   console.log(`Redeem TX:       ${redeemTxid}`)
    //   expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.0000075)
    //   console.log('Alice Balance ' + await utils.getTokenBalance(aliceAddr))
    //   console.log('Bob Balance ' + await utils.getTokenBalance(bobAddr))
  }
)

function get5IssueAddresses () {
  return issueInfo = [
    {
      addr: addr1,
      satoshis: 1000,
      data: '1_data'
    },
    {
      addr: addr2,
      satoshis: 1000,
      data: '2_data'
    },
    {
      addr: addr3,
      satoshis: 1000,
      data: '3_data'
    },
    {
      addr: addr4,
      satoshis: 1000,
      data: '4_data'
    },
    {
      addr: addr5,
      satoshis: 1000,
      data: '5_data'
    },
    {
      addr: addr6,
      satoshis: 1000,
      data: '6_data'
    },
    {
      addr: addr7,
      satoshis: 1000,
      data: '7_data'
    },
    {
      addr: addr8,
      satoshis: 1000,
      data: '8_data'
    },
    {
      addr: addr9,
      satoshis: 1000,
      data: '9_data'
    },
    {
      addr: addr10,
      satoshis: 1000,
      data: '10_data'
    }
  ]
}
