const expect = require('chai').expect
const utils = require('../../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  transfer,
  split,
  merge
} = require('../../../index')

const {
  bitcoinToSatoshis,
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../../../index').utils

const issuerPrivateKey = bsv.PrivateKey()
const fundingPrivateKey = bsv.PrivateKey()
const alicePrivateKey = bsv.PrivateKey()
const aliceAddr = alicePrivateKey.toAddress().toString()
const bobPrivateKey = bsv.PrivateKey()
const bobAddr = bobPrivateKey.toAddress().toString()
const supply = 10000
const symbol = 'TAALT'
let splitTxid
let splitTx

it.only('Attempt To Merge Token with Different Owners Via SDK Throws Error',
  async () => {
    const firstSplitTxObj = await firstToken()
    const secondSplitTxObj = await secondToken()

    try {
     let mergeHex =  await merge(
        bobPrivateKey,
        [{
          tx: firstSplitTxObj,
          vout: 0
        },
        {
          tx: secondSplitTxObj,
          vout: 1
        }],
        aliceAddr,
        {
          txid: splitTxid,
          vout: 2,
          scriptPubKey: splitTx.vout[2].scriptPubKey.hex,
          satoshis: splitTx.vout[2].value
        },
        fundingPrivateKey
      )
      console.log(mergeHex)
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('This function only merges STAS tokens with the same owner')
    }
  }
)

async function firstToken() {
  const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')

  const schema = utils.schema(publicKeyHash, symbol, supply)

  // change goes back to the fundingPrivateKey
  const contractHex = await contract(
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
      addr: aliceAddr,
      satoshis: 7000,
      data: 'one'
    },
    {
      addr: bobAddr,
      satoshis: 3000,
      data: 'two'
    }
  ]
  let issueHex
  try {
    issueHex = await issue(
      issuerPrivateKey,
      issueInfo,
      {
        txid: contractTxid,
        vout: 0,
        scriptPubKey: contractTx.vout[0].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(contractTx.vout[0].value)
      },
      {
        txid: contractTxid,
        vout: 1,
        scriptPubKey: contractTx.vout[1].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(contractTx.vout[1].value)
      },
      fundingPrivateKey,
      true, // isSplittable
      symbol,
      2 // STAS version
    )
  } catch (e) {
    console.log('error issuing token', e)
    return
  }
  const issueTxid = await broadcast(issueHex)
  console.log(`Issue TX:        ${issueTxid}`)
  const issueTx = await getTransaction(issueTxid)

  const issueOutFundingVout = issueTx.vout.length - 1

  const transferHex = await transfer(
    bobPrivateKey,
    {
      txid: issueTxid,
      vout: 1,
      scriptPubKey: issueTx.vout[1].scriptPubKey.hex,
      satoshis: bitcoinToSatoshis(issueTx.vout[1].value)
    },
    aliceAddr,
    {
      txid: issueTxid,
      vout: issueOutFundingVout,
      scriptPubKey: issueTx.vout[issueOutFundingVout].scriptPubKey.hex,
      satoshis: bitcoinToSatoshis(issueTx.vout[issueOutFundingVout].value)
    },
    fundingPrivateKey
  )
  const transferTxid = await broadcast(transferHex)
  console.log(`Transfer TX:     ${transferTxid}`)
  const transferTx = await getTransaction(transferTxid)

  // Split tokens into 2 - both payable to Bob...
  const bobAmount1 = transferTx.vout[0].value / 2
  const bobAmount2 = transferTx.vout[0].value - bobAmount1
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, satoshis: bitcoinToSatoshis(bobAmount1) }
  splitDestinations[1] = { address: bobAddr, satoshis: bitcoinToSatoshis(bobAmount2) }

  const splitHex = await split(
    alicePrivateKey,
    {
      txid: transferTxid,
      vout: 0,
      scriptPubKey: transferTx.vout[0].scriptPubKey.hex,
      satoshis: bitcoinToSatoshis(transferTx.vout[0].value)
    },
    splitDestinations,
    {
      txid: transferTxid,
      vout: 1,
      scriptPubKey: transferTx.vout[1].scriptPubKey.hex,
      satoshis: bitcoinToSatoshis(transferTx.vout[1].value)
    },
    fundingPrivateKey
  )
  splitTxid = await broadcast(splitHex)
  console.log(`Split TX:        ${splitTxid}`)
  splitTx = await getTransaction(splitTxid)

  // Now let's merge the last split back together
  const splitTxObj = new bsv.Transaction(splitHex)
  return splitTxObj
}

async function secondToken() {
  const issuerPrivateKey = bsv.PrivateKey()

  const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())

  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')

  const schema = utils.schema(publicKeyHash, symbol, supply)

  // change goes back to the fundingPrivateKey
  const contractHex = await contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  )
  const contractTxid = await broadcast(contractHex)
  console.log(`Invalid Contract TX:     ${contractTxid}`)
  const contractTx = await getTransaction(contractTxid)

  const issueInfo = [
    {
      addr: aliceAddr,
      satoshis: 7000,
      data: 'one'
    },
    {
      addr: bobAddr,
      satoshis: 3000,
      data: 'two'
    }
  ]
  let issueHex
  try {
    issueHex = await issue(
      issuerPrivateKey,
      issueInfo,
      {
        txid: contractTxid,
        vout: 0,
        scriptPubKey: contractTx.vout[0].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(contractTx.vout[0].value)
      },
      {
        txid: contractTxid,
        vout: 1,
        scriptPubKey: contractTx.vout[1].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(contractTx.vout[1].value)
      },
      fundingPrivateKey,
      true, // isSplittable
      symbol,
      2 // STAS version
    )
  } catch (e) {
    console.log('error issuing token', e)
    return
  }
  const issueTxid = await broadcast(issueHex)
  console.log(`Invalid Issue TX:        ${issueTxid}`)
  const issueTx = await getTransaction(issueTxid)

  const issueOutFundingVout = issueTx.vout.length - 1

  const transferHex = await transfer(
    bobPrivateKey,
    {
      txid: issueTxid,
      vout: 1,
      scriptPubKey: issueTx.vout[1].scriptPubKey.hex,
      satoshis: bitcoinToSatoshis(issueTx.vout[1].value)
    },
    aliceAddr,
    {
      txid: issueTxid,
      vout: issueOutFundingVout,
      scriptPubKey: issueTx.vout[issueOutFundingVout].scriptPubKey.hex,
      satoshis: bitcoinToSatoshis(issueTx.vout[issueOutFundingVout].value)
    },
    fundingPrivateKey
  )
  const transferTxid = await broadcast(transferHex)
  console.log(`Invalid Transfer TX:     ${transferTxid}`)
  const transferTx = await getTransaction(transferTxid)

  // Split tokens into 2 - both payable to Bob...
  const bobAmount1 = transferTx.vout[0].value / 2
  const bobAmount2 = transferTx.vout[0].value - bobAmount1
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, satoshis: bitcoinToSatoshis(bobAmount1) }
  splitDestinations[1] = { address: bobAddr, satoshis: bitcoinToSatoshis(bobAmount2) }

  const splitHex = await split(
    alicePrivateKey,
    {
      txid: transferTxid,
      vout: 0,
      scriptPubKey: transferTx.vout[0].scriptPubKey.hex,
      satoshis: bitcoinToSatoshis(transferTx.vout[0].value)
    },
    splitDestinations,
    {
      txid: transferTxid,
      vout: 1,
      scriptPubKey: transferTx.vout[1].scriptPubKey.hex,
      satoshis: bitcoinToSatoshis(transferTx.vout[1].value)
    },
    fundingPrivateKey
  )
  const splitTxid = await broadcast(splitHex)
  console.log(`Invalid Split TX:        ${splitTxid}`)
  await getTransaction(splitTxid)

  // Now let's merge the last split back together
  const splitTxObj = new bsv.Transaction(splitHex)
  return splitTxObj
}
