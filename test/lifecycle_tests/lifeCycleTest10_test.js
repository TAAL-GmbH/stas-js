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

describe('regression, testnet', () => {
  it('Full Life Cycle Test 1', async () => {
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

    const wait = 0 // set wait before token balance check

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
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
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
    const response = await utils.getTokenResponse(tokenId)
    expect(response.symbol).to.equal(symbol)
    expect(response.contract_txs).to.contain(contractTxid)
    expect(response.issuance_txs).to.contain(issueTxid)
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007)
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003)
    console.log('Alice Balance ' + (await utils.getTokenBalance(aliceAddr)))
    console.log('Bob Balance ' + (await utils.getTokenBalance(bobAddr)))
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)

    const issueOutFundingVout = issueTx.vout.length - 1

    const transferHex = transfer(
      bobPrivateKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    const transferTxid = await broadcast(transferHex)
    console.log(`Transfer TX:     ${transferTxid}`)
    const transferTx = await getTransaction(transferTxid)
    await new Promise(r => setTimeout(r, wait))

    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003)
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(10000)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(0)
    console.log('Alice Balance ' + (await utils.getTokenBalance(aliceAddr)))
    console.log('Bob Balance ' + (await utils.getTokenBalance(bobAddr)))
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(10000)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(0)

    // Split tokens into 2 - both payable to Bob...
    const bobAmount = transferTx.vout[0].value / 4
    // const bobAmount2 = transferTx.vout[0].value - bobAmount1
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount }
    splitDestinations[2] = { address: bobAddr, amount: bobAmount }
    splitDestinations[3] = { address: bobAddr, amount: bobAmount }

    const splitHex = split(
      alicePrivateKey,
      utils.getUtxo(transferTxid, transferTx, 0),
      splitDestinations,
      utils.getUtxo(transferTxid, transferTx, 1),
      fundingPrivateKey
    )
    console.log(splitHex)
    const splitTxid = await broadcast(splitHex)
    console.log(`Split TX:        ${splitTxid}`)
    const splitTx = await getTransaction(splitTxid)
    await new Promise(r => setTimeout(r, wait))
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.0000075)
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.0000075)
    expect(await utils.getVoutAmount(splitTxid, 2)).to.equal(0.0000075)
    expect(await utils.getVoutAmount(splitTxid, 3)).to.equal(0.0000075)
    console.log('Alice Balance ' + (await utils.getTokenBalance(aliceAddr)))
    console.log('Bob Balance ' + (await utils.getTokenBalance(bobAddr)))
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)

    // Now let's merge the last split back together
    const splitTxObj = new bsv.Transaction(splitHex)

    const mergeHex = merge(
      bobPrivateKey,
      [{
        tx: splitTxObj,
        vout: 0
      },
      {
        tx: splitTxObj,
        vout: 1
      }],
      aliceAddr,
      utils.getUtxo(splitTxid, splitTx, 4),
      fundingPrivateKey
    )

    const mergeTxid = await broadcast(mergeHex)
    console.log(`Merge TX:        ${mergeTxid}`)
    const mergeTx = await getTransaction(mergeTxid)
    await new Promise(r => setTimeout(r, wait))
    expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.000015)
    const tokenIdMerge = await utils.getToken(mergeTxid)
    const responseMerge = await utils.getTokenResponse(tokenIdMerge)
    expect(responseMerge.symbol).to.equal(symbol)
    expect(responseMerge.contract_txs).to.contain(contractTxid)
    expect(responseMerge.issuance_txs).to.contain(issueTxid)
    console.log('Alice Balance ' + (await utils.getTokenBalance(aliceAddr)))
    console.log('Bob Balance ' + (await utils.getTokenBalance(bobAddr)))
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(8500)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(1500)

    const mergeHex2 = merge(
      bobPrivateKey,
      [{
        tx: splitTxObj,
        vout: 2
      },
      {
        tx: splitTxObj,
        vout: 3
      }],
      aliceAddr,
      utils.getUtxo(mergeTxid, mergeTx, 1),
      fundingPrivateKey
    )

    const mergeTxid2 = await broadcast(mergeHex2)
    console.log(`Merge TX2:        ${mergeTxid2}`)
    const mergeTx2 = await getTransaction(mergeTxid2)
    await new Promise(r => setTimeout(r, wait))
    expect(await utils.getVoutAmount(mergeTxid2, 0)).to.equal(0.000015)
    const tokenIdMerge2 = await utils.getToken(mergeTxid2)
    const responseMerge2 = await utils.getTokenResponse(tokenIdMerge2)
    expect(responseMerge2.symbol).to.equal(symbol)
    expect(responseMerge2.contract_txs).to.contain(contractTxid)
    expect(responseMerge2.issuance_txs).to.contain(issueTxid)
    console.log('Alice Balance ' + (await utils.getTokenBalance(aliceAddr)))
    console.log('Bob Balance ' + (await utils.getTokenBalance(bobAddr)))
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(10000)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(0)

    // Alice wants to redeem the money from bob...
    const redeemHex = redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(mergeTxid2, mergeTx2, 0),
      utils.getUtxo(mergeTxid2, mergeTx2, 1),
      fundingPrivateKey
    )
    const redeemTxid = await broadcast(redeemHex)
    console.log(`Redeem TX:       ${redeemTxid}`)
    await new Promise(r => setTimeout(r, wait))
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.000015)
    console.log('Alice Balance ' + (await utils.getTokenBalance(aliceAddr)))
    console.log('Bob Balance ' + (await utils.getTokenBalance(bobAddr)))
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(8500)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(0)
  })
})
