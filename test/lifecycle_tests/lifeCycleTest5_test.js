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
  getTransaction,
  getFundsFromFaucet,
  broadcast,
  SATS_PER_BITCOIN
} = require('../../index').utils

const issuerPrivateKey = bsv.PrivateKey()
const fundingPrivateKey = bsv.PrivateKey()
const pk1 = bsv.PrivateKey()
const addr1 = pk1.toAddress(process.env.NETWORK).toString()
const pk2 = bsv.PrivateKey()
const addr2 = pk2.toAddress(process.env.NETWORK).toString()
const pk3 = bsv.PrivateKey()
const addr3 = pk3.toAddress(process.env.NETWORK).toString()
const pk4 = bsv.PrivateKey()
const addr4 = pk4.toAddress(process.env.NETWORK).toString()
const pk5 = bsv.PrivateKey()
const addr5 = pk5.toAddress(process.env.NETWORK).toString()
const pk6 = bsv.PrivateKey()
const addr6 = pk6.toAddress(process.env.NETWORK).toString()
const pk7 = bsv.PrivateKey()
const addr7 = pk7.toAddress(process.env.NETWORK).toString()
const pk8 = bsv.PrivateKey()
const addr8 = pk8.toAddress(process.env.NETWORK).toString()
const pk9 = bsv.PrivateKey()
const addr9 = pk9.toAddress(process.env.NETWORK).toString()
const pk10 = bsv.PrivateKey()
const addr10 = pk10.toAddress(process.env.NETWORK).toString()

console.log('addr3  ' + addr2)
console.log('addr4  ' + addr3)

describe('regression, testnet', () => {
  it('Full Life Cycle Test With 10 Issuance Addresses', async () => {
    const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
    const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
    const supply = 10000
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

    const issueHex = issue(
      issuerPrivateKey,
      get10IssueAddresses(),
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
    const response = await utils.getTokenResponse(tokenId) // token issuance fails intermittingly
    expect(response.symbol).to.equal(symbol)
    expect(response.contract_txs).to.contain(contractTxid)
    expect(response.issuance_txs).to.contain(issueTxid)

    const addrArray = [addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9, addr10]
    for (let i = 1; i < 10; i++) {
      expect(await utils.getVoutAmount(issueTxid, i)).to.equal(0.00001)
      expect(await utils.getTokenBalance(addrArray[i])).to.equal(1000)
    }

    const issueOutFundingVout = issueTx.vout.length - 1

    const transferHex = transfer(
      pk2,
      utils.getUtxo(issueTxid, issueTx, 1),
      addr3,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    const transferTxid = await broadcast(transferHex)
    console.log(`Transfer TX:     ${transferTxid}`)
    const transferTx = await getTransaction(transferTxid)

    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00001)
    expect(await utils.getTokenBalance(addr2)).to.equal(0)
    expect(await utils.getTokenBalance(addr3)).to.equal(2000)
    console.log('addr2 Balance ' + (await utils.getTokenBalance(addr2)))
    console.log('addr3 Balance ' + (await utils.getTokenBalance(addr3)))

    const amount = transferTx.vout[0].value / 2
    const splitDestinations = []
    splitDestinations[0] = { address: addr4, amount: amount }
    splitDestinations[1] = { address: addr4, amount: amount }

    const splitHex = split(
      pk3,
      utils.getUtxo(transferTxid, transferTx, 0),
      splitDestinations,
      utils.getUtxo(transferTxid, transferTx, 1),
      fundingPrivateKey
    )
    const splitTxid = await broadcast(splitHex)
    console.log(`Split TX:        ${splitTxid}`)
    const splitTx = await getTransaction(splitTxid)
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.000005)
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.000005)
    console.log('addr3 Balance ' + (await utils.getTokenBalance(addr3)))
    console.log('addr4 Balance ' + (await utils.getTokenBalance(addr4)))
    expect(await utils.getTokenBalance(addr3)).to.equal(1000)
    expect(await utils.getTokenBalance(addr4)).to.equal(2000)

    // Now let's merge the last split back together
    const splitTxObj = new bsv.Transaction(splitHex)

    const mergeHex = merge(
      pk4,
      utils.getMergeUtxo(splitTxObj),
      addr3,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    const mergeTxid = await broadcast(mergeHex)
    console.log(`Merge TX:        ${mergeTxid}`)
    const mergeTx = await getTransaction(mergeTxid)
    expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00001)
    const tokenIdMerge = await utils.getToken(issueTxid)
    const responseMerge = await utils.getTokenResponse(tokenIdMerge)
    expect(responseMerge.symbol).to.equal(symbol)
    expect(responseMerge.contract_txs).to.contain(contractTxid)
    expect(responseMerge.issuance_txs).to.contain(issueTxid)
    console.log('addr2 Balance ' + (await utils.getTokenBalance(addr4)))
    console.log('addr3 Balance ' + (await utils.getTokenBalance(addr3)))
    expect(await utils.getTokenBalance(addr2)).to.equal(0)
    expect(await utils.getTokenBalance(addr3)).to.equal(2000)

    const aliceAmount1 = mergeTx.vout[0].value / 2
    const aliceAmount2 = mergeTx.vout[0].value - aliceAmount1

    const split2Destinations = []
    split2Destinations[0] = { address: addr5, amount: aliceAmount1 }
    split2Destinations[1] = { address: addr5, amount: aliceAmount2 }

    const splitHex2 = split(
      pk3,
      utils.getUtxo(mergeTxid, mergeTx, 0),
      split2Destinations,
      utils.getUtxo(mergeTxid, mergeTx, 1),
      fundingPrivateKey
    )
    const splitTxid2 = await broadcast(splitHex2)
    console.log(`Split TX2:       ${splitTxid2}`)
    const splitTx2 = await getTransaction(splitTxid2)
    expect(await utils.getVoutAmount(splitTxid2, 0)).to.equal(0.000005)
    expect(await utils.getVoutAmount(splitTxid2, 1)).to.equal(0.000005)
    console.log('addr3 Balance ' + (await utils.getTokenBalance(addr3)))
    console.log('addr5 Balance ' + (await utils.getTokenBalance(addr5)))
    expect(await utils.getTokenBalance(addr3)).to.equal(1000)
    expect(await utils.getTokenBalance(addr5)).to.equal(2000)

    // Now mergeSplit
    const splitTxObj2 = new bsv.Transaction(splitHex2)

    const amount1 = Math.floor(splitTx2.vout[0].value * SATS_PER_BITCOIN) / 2
    const amount2 = Math.floor(splitTx2.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx2.vout[1].value * SATS_PER_BITCOIN) - amount1

    const mergeSplitHex = mergeSplit(
      pk5,
      utils.getMergeSplitUtxo(splitTxObj2, splitTx2),
      addr6,
      amount1,
      addr7,
      amount2,
      utils.getUtxo(splitTxid2, splitTx2, 2),
      fundingPrivateKey
    )

    const mergeSplitTxid = await broadcast(mergeSplitHex)
    console.log(`MergeSplit TX:   ${mergeSplitTxid}`)
    const mergeSplitTx = await getTransaction(mergeSplitTxid)
    expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.0000025)
    expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.0000075)
    console.log('addr5 Balance ' + (await utils.getTokenBalance(addr5)))
    console.log('addr6 Balance ' + (await utils.getTokenBalance(addr6)))
    console.log('addr6 Balance ' + (await utils.getTokenBalance(addr7)))
    expect(await utils.getTokenBalance(addr5)).to.equal(1000)
    expect(await utils.getTokenBalance(addr6)).to.equal(1250)
    expect(await utils.getTokenBalance(addr7)).to.equal(1750)

    // Alice wants to redeem the money from bob...
    const redeemHex = redeem(
      pk6,
      issuerPrivateKey.publicKey,
      utils.getUtxo(mergeSplitTxid, mergeSplitTx, 0),
      utils.getUtxo(mergeSplitTxid, mergeSplitTx, 2),
      fundingPrivateKey
    )
    const redeemTxid = await broadcast(redeemHex)
    console.log(`Redeem TX:       ${redeemTxid}`)
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.0000025)
    console.log('addr6 Balance ' + (await utils.getTokenBalance(addr6)))
    console.log('addr7 Balance ' + (await utils.getTokenBalance(addr7)))
    expect(await utils.getTokenBalance(addr6)).to.equal(1000)
    expect(await utils.getTokenBalance(addr7)).to.equal(1750)
  })
})

function get10IssueAddresses () {
  const issueInfo = [
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
  return issueInfo
}
