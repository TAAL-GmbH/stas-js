const expect = require('chai').expect
const utils = require('./utils/test_utils')
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
} = require('./../index')

const {
  getTransaction,
  getFundsFromFaucet,
  broadcast,
  SATS_PER_BITCOIN
} = require('./../index').utils

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


// token issue is intermittingly failing - Tx broadcast is successful but token is not issuing - see line 79
it('Full Life Cycle Test With 10 Issuance Addresses', async function () {

  const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  const supply = 4000
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
      satoshis: 1000,
      data: '1_data'
    },
    {
      addr: aliceAddr,
      satoshis: 1000,
      data: '2_data'
    },
    {
      addr: daveAddr,
      satoshis: 1000,
      data: '3_data'
    },
    {
      addr: emmaAddr,
      satoshis: 1000,
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
  const issueTx = await getTransaction(issueTxid)
  const tokenId = await utils.getToken(issueTxid)
  console.log(`Token ID:        ${tokenId}`)
  const response = await utils.getTokenResponse(tokenId) // token issuance fails intermittingly
  expect(response.symbol).to.equal(symbol)
  expect(response.contract_txs).to.contain(contractTxid)
  expect(response.issuance_txs).to.contain(issueTxid)

  for (let i = 1; i < 4; i++) {
    expect(await utils.getVoutAmount(issueTxid, i)).to.equal(0.00001)
  }

  expect(await utils.getTokenBalance(bobAddr)).to.equal(1000)
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(1000)
  expect(await utils.getTokenBalance(daveAddr)).to.equal(1000)
  expect(await utils.getTokenBalance(emmaAddr)).to.equal(1000)

  const issueOutFundingVout = issueTx.vout.length - 1

  //transfer from bob to alice
  const transferHex = transfer(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    aliceAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )
  const transferTxid = await broadcast(transferHex)
  console.log(`Transfer TX:     ${transferTxid}`)
  const transferTx = await getTransaction(transferTxid)
  // console.log('addr3 ' + await utils.getTokenBalance(addr3))

  const fundingPrivateKey2 = bsv.PrivateKey()
  const fundingUtxos2 = await getFundsFromFaucet(fundingPrivateKey2.toAddress(process.env.NETWORK).toString())

  //transfer from Dave to Emma
  const transferHex2 = transfer(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    emmaAddr,
    fundingUtxos2,
    fundingPrivateKey2
  )

  const transferTxid2 = await broadcast(transferHex2)
  console.log(`Transfer TX2:     ${transferTxid2}`)
  const transferTx2 = await getTransaction(transferTxid2)
  //console.log('addr3 ' + await utils.getTokenBalance(addr3))

  const fundingPrivateKey3 = bsv.PrivateKey()
  const fundingUtxos3 = await getFundsFromFaucet(fundingPrivateKey3.toAddress(process.env.NETWORK).toString())

  const transferHex3 = transfer(
    davePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 2),
    emmaAddr,
    fundingUtxos3,
    fundingPrivateKey3
  )
  const transferTxid3 = await broadcast(transferHex3)
  console.log(`Transfer TX3:     ${transferTxid3}`)
  const transferTx3 = await getTransaction(transferTxid3)


  const fundingPrivateKey4 = bsv.PrivateKey()
  const fundingUtxos4 = await getFundsFromFaucet(fundingPrivateKey4.toAddress(process.env.NETWORK).toString())

  const transferHex4 = transfer(
    emmaPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 3),
    bobAddr,
    fundingUtxos4,
    fundingPrivateKey4
  )
  const transferTxid4 = await broadcast(transferHex4)
  console.log(`Transfer TX4:     ${transferTxid4}`)
  const transferTx4 = await getTransaction(transferTxid4)


  //   expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003)
  //   // expect(await utils.getTokenBalance(aliceAddr)).to.equal(10000)
  //   // expect(await utils.getTokenBalance(bobAddr)).to.equal(0)
  //   console.log('Alice Balance ' + await utils.getTokenBalance(aliceAddr))
  //   console.log('Bob Balance ' + await utils.getTokenBalance(bobAddr))

  //   // Split tokens into 2 - both payable to Bob...
  //   const bobAmount1 = transferTx.vout[0].value / 2
  //   const bobAmount2 = transferTx.vout[0].value - bobAmount1
  //   const splitDestinations = []
  //   splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
  //   splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }

  //   const splitHex = split(
  //     alicePrivateKey,
  //     issuerPrivateKey.publicKey,
  //     utils.getUtxo(transferTxid, transferTx, 0),
  //     splitDestinations,
  //     utils.getUtxo(transferTxid, transferTx, 1),
  //     fundingPrivateKey
  //   )
  //   const splitTxid = await broadcast(splitHex)
  //   console.log(`Split TX:        ${splitTxid}`)
  //   const splitTx = await getTransaction(splitTxid)
  //   expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.000015)
  //   expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.000015)
  //   console.log('Alice Balance ' + await utils.getTokenBalance(aliceAddr))
  //   console.log('Bob Balance ' + await utils.getTokenBalance(bobAddr))

  //   // Now let's merge the last split back together
  //   const splitTxObj = new bsv.Transaction(splitHex)

  //   const mergeHex = merge(
  //     bobPrivateKey,
  //     issuerPrivateKey.publicKey,
  //     utils.getMergeUtxo(splitTxObj),
  //     aliceAddr,
  //     utils.getUtxo(splitTxid, splitTx, 2),
  //     fundingPrivateKey
  //   )

  //   const mergeTxid = await broadcast(mergeHex)
  //   console.log(`Merge TX:        ${mergeTxid}`)
  //   const mergeTx = await getTransaction(mergeTxid)
  //   expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00003)
  //   // const tokenIdMerge = await utils.getToken(issueTxid)
  //   // let responseMerge = await utils.getTokenResponse(tokenIdMerge)
  //   // expect(responseMerge.token.symbol).to.equal(symbol)
  //   // expect(responseMerge.token.contract_txs).to.contain(contractTxid)
  //   // expect(responseMerge.token.issuance_txs).to.contain(issueTxid)
  //   console.log('Alice Balance ' + await utils.getTokenBalance(aliceAddr))
  //   console.log('Bob Balance ' + await utils.getTokenBalance(bobAddr))

  //   // Split again - both payable to Alice...
  //   const aliceAmount1 = mergeTx.vout[0].value / 2
  //   const aliceAmount2 = mergeTx.vout[0].value - aliceAmount1

  //   const split2Destinations = []
  //   split2Destinations[0] = { address: aliceAddr, amount: aliceAmount1 }
  //   split2Destinations[1] = { address: aliceAddr, amount: aliceAmount2 }

  //   const splitHex2 = split(
  //     alicePrivateKey,
  //     issuerPrivateKey.publicKey,
  //     utils.getUtxo(mergeTxid, mergeTx, 0),
  //     split2Destinations,
  //     utils.getUtxo(mergeTxid, mergeTx, 1),
  //     fundingPrivateKey
  //   )
  //   const splitTxid2 = await broadcast(splitHex2)
  //   console.log(`Split TX2:       ${splitTxid2}`)
  //   const splitTx2 = await getTransaction(splitTxid2)
  //   expect(await utils.getVoutAmount(splitTxid2, 0)).to.equal(0.000015)
  //   expect(await utils.getVoutAmount(splitTxid2, 1)).to.equal(0.000015)
  //   console.log('Alice Balance ' + await utils.getTokenBalance(aliceAddr))
  //   console.log('Bob Balance ' + await utils.getTokenBalance(bobAddr))

  //   // Now mergeSplit
  //   const splitTxObj2 = new bsv.Transaction(splitHex2)

  //   const aliceAmountSatoshis = Math.floor(splitTx2.vout[0].value * SATS_PER_BITCOIN) / 2
  //   const bobAmountSatoshis = Math.floor(splitTx2.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx2.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis

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
})


function get5IssueAddresses() {
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