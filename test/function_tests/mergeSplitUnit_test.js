const expect = require('chai').expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  transfer,
  split,
  mergeSplit
} = require('../../index')

const {
  bitcoinToSatoshis,
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../../index').utils

let issuerPrivateKey
let fundingPrivateKey
let contractUtxos
let fundingUtxos
let publicKeyHash
let bobPrivateKey
let alicePrivateKey
let bobAddr
let aliceAddr
let splitTxid
let splitTx
let splitTxObj

beforeAll(async () => {
  await setup()
})

it('MergeSplit - Attempt to MergeSplit More Than Two Tokens Throws Error',
  async () => {
    const aliceAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) / 2
    const bobAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) + bitcoinToSatoshis(splitTx.vout[1].value) - aliceAmountSatoshis
    const incorrectPrivateKey = bsv.PrivateKey()
    try {
      await mergeSplit(
        incorrectPrivateKey,
        [{
          tx: splitTxObj,
          scriptPubKey: splitTx.vout[0].scriptPubKey.hex,
          vout: 0,
          amount: splitTx.vout[0].value
        },
        {
          tx: splitTxObj,
          scriptPubKey: splitTx.vout[1].scriptPubKey.hex,
          vout: 1,
          amount: splitTx.vout[1].value

        },
        {
          tx: splitTxObj,
          scriptPubKey: splitTx.vout[2].scriptPubKey.hex,
          vout: 2,
          amount: splitTx.vout[2].value

        }],
        aliceAddr,
        aliceAmountSatoshis,
        bobAddr,
        bobAmountSatoshis,
        utils.getUtxo(splitTxid, splitTx, 2),
        fundingPrivateKey
      )
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('This function can only merge exactly 2 STAS tokens')
    }
  }
)

it('MergeSplit - Attempt to MergeSplit Less Than Two Tokens Throws Error',
  async () => {
    const aliceAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) / 2
    const bobAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) + bitcoinToSatoshis(splitTx.vout[1].value) - aliceAmountSatoshis
    const incorrectPrivateKey = bsv.PrivateKey()
    try {
      await mergeSplit(
        incorrectPrivateKey,
        [{
          tx: splitTxObj,
          scriptPubKey: splitTx.vout[0].scriptPubKey.hex,
          vout: 0,
          amount: splitTx.vout[0].value
        }],
        aliceAddr,
        aliceAmountSatoshis,
        bobAddr,
        bobAmountSatoshis,
        utils.getUtxo(splitTxid, splitTx, 2),
        fundingPrivateKey
      )
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('This function can only merge exactly 2 STAS tokens')
    }
  }
)

it('MergeSplit - Split to Issuer Address 1 Throws Error',
  async () => {
    const aliceAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) / 2
    const bobAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) + bitcoinToSatoshis(splitTx.vout[1].value) - aliceAmountSatoshis
    const issuerAddress = issuerPrivateKey.toAddress(process.env.NETWORK).toString()

    try {
      await mergeSplit(
        issuerPrivateKey,
        utils.getMergeSplitUtxo(splitTxObj, splitTx),
        issuerAddress,
        aliceAmountSatoshis,
        bobAddr,
        bobAmountSatoshis,
        utils.getUtxo(splitTxid, splitTx, 2),
        fundingPrivateKey
      )
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Token UTXO cannot be sent to issuer address')
    }
  }
)

it('MergeSplit - Split to Issuer Address 2 Throws Error',
  async () => {
    const aliceAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) / 2
    const bobAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) + bitcoinToSatoshis(splitTx.vout[1].value) - aliceAmountSatoshis
    const issuerAddress = issuerPrivateKey.toAddress(process.env.NETWORK).toString()

    try {
      await mergeSplit(
        issuerPrivateKey,
        utils.getMergeSplitUtxo(splitTxObj, splitTx),
        issuerAddress,
        aliceAmountSatoshis,
        bobAddr,
        bobAmountSatoshis,
        utils.getUtxo(splitTxid, splitTx, 2),
        fundingPrivateKey
      )
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Token UTXO cannot be sent to issuer address')
    }
  }
)

it('MergeSplit - Invalid Address Destination Address 1 Throws Error',
  async () => {
    const aliceAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) / 2
    const bobAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) + bitcoinToSatoshis(splitTx.vout[1].value) - aliceAmountSatoshis
    const invalidAddr = '1MSCReQT9E4GpxuK1K'

    try {
      await mergeSplit(
        issuerPrivateKey,
        utils.getMergeSplitUtxo(splitTxObj, splitTx),
        invalidAddr,
        aliceAmountSatoshis,
        bobAddr,
        bobAmountSatoshis,
        utils.getUtxo(splitTxid, splitTx, 2),
        fundingPrivateKey
      )
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Invalid Address string provided')
    }
  }
)

it('MergeSplit - Invalid Address Destination Address 2 Throws Error',
  async () => {
    const aliceAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) / 2
    const bobAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) + bitcoinToSatoshis(splitTx.vout[1].value) - aliceAmountSatoshis
    const invalidAddr = '1MSCReQT9E4GpxuK1K'

    try {
      await mergeSplit(
        issuerPrivateKey,
        utils.getMergeSplitUtxo(splitTxObj, splitTx),
        aliceAddr,
        aliceAmountSatoshis,
        invalidAddr,
        bobAmountSatoshis,
        utils.getUtxo(splitTxid, splitTx, 2),
        fundingPrivateKey
      )
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Invalid Address string provided')
    }
  }
)

it('MergeSplit - Null Issuer Private Key Throws Error', async () => {
  const aliceAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) / 2
  const bobAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) + bitcoinToSatoshis(splitTx.vout[1].value) - aliceAmountSatoshis
  try {
    await mergeSplit(
      null,
      utils.getMergeSplitUtxo(splitTxObj, splitTx),
      aliceAddr,
      aliceAmountSatoshis,
      bobAddr,
      bobAmountSatoshis,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Token owner private key is null')
  }
})

it('MergeSplit - Null STAS Merge UTXO Throws Error', async () => {
  const aliceAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) / 2
  const bobAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) + bitcoinToSatoshis(splitTx.vout[1].value) - aliceAmountSatoshis

  try {
    await mergeSplit(
      issuerPrivateKey,
      null,
      aliceAddr,
      aliceAmountSatoshis,
      bobAddr,
      bobAmountSatoshis,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('MergeUtxos is invalid')
  }
})

it(
  'MergeSplit - Null Destination Address 1 Throws Error',
  async () => {
    const aliceAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) / 2
    const bobAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) + bitcoinToSatoshis(splitTx.vout[1].value) - aliceAmountSatoshis

    try {
      await mergeSplit(
        issuerPrivateKey,
        utils.getMergeSplitUtxo(splitTxObj, splitTx),
        null,
        aliceAmountSatoshis,
        bobAddr,
        bobAmountSatoshis,
        utils.getUtxo(splitTxid, splitTx, 2),
        fundingPrivateKey
      )
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Destination address is null')
    }
  }
)

it('MergeSplit - Null Satoshi Amount 1 Throws Error', async () => {
  const aliceAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) / 2
  const bobAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) + bitcoinToSatoshis(splitTx.vout[1].value) - aliceAmountSatoshis

  try {
    await mergeSplit(
      issuerPrivateKey,
      utils.getMergeSplitUtxo(splitTxObj, splitTx),
      aliceAddr,
      null,
      bobAddr,
      bobAmountSatoshis,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Satoshi value suppled is null')
  }
})

it(
  'MergeSplit - Null Destination Address 2 Throws Error',
  async () => {
    const aliceAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) / 2
    const bobAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) + bitcoinToSatoshis(splitTx.vout[1].value) - aliceAmountSatoshis

    try {
      await mergeSplit(
        issuerPrivateKey,
        utils.getMergeSplitUtxo(splitTxObj, splitTx),
        aliceAddr,
        aliceAmountSatoshis,
        null,
        bobAmountSatoshis,
        utils.getUtxo(splitTxid, splitTx, 2),
        fundingPrivateKey
      )
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Destination address is null')
    }
  }
)

it('MergeSplit - Null Satoshi Amount 2 Throws Error', async () => {
  const aliceAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) / 2
  try {
    await mergeSplit(
      issuerPrivateKey,
      utils.getMergeSplitUtxo(splitTxObj, splitTx),
      aliceAddr,
      aliceAmountSatoshis,
      bobAddr,
      null,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Satoshi value suppled is null')
  }
})

it('MergeSplit - Null Funding Private Key Throws Error', async () => {
  const aliceAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) / 2
  const bobAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) + bitcoinToSatoshis(splitTx.vout[1].value) - aliceAmountSatoshis

  try {
    await mergeSplit(
      issuerPrivateKey,
      utils.getMergeSplitUtxo(splitTxObj, splitTx),
      aliceAddr,
      aliceAmountSatoshis,
      bobAddr,
      bobAmountSatoshis,
      utils.getUtxo(splitTxid, splitTx, 2),
      null
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Payment UTXO provided but payment key is null')
  }
})

async function setup () {
  issuerPrivateKey = bsv.PrivateKey()
  fundingPrivateKey = bsv.PrivateKey()
  bobPrivateKey = bsv.PrivateKey()
  alicePrivateKey = bsv.PrivateKey()
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()
  contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  const symbol = 'TAALT'
  const supply = 10000
  const schema = utils.schema(publicKeyHash, symbol, supply)

  const contractHex = await contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  )
  const contractTxid = await broadcast(contractHex)
  const contractTx = await getTransaction(contractTxid)

  const issueHex = await issue(
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
  const issueOutFundingVout = issueTx.vout.length - 1

  const transferHex = await transfer(
    bobPrivateKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    aliceAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )
  const transferTxid = await broadcast(transferHex)
  const transferTx = await getTransaction(transferTxid)

  const bobAmount1 = transferTx.vout[0].value / 2
  const bobAmount2 = transferTx.vout[0].value - bobAmount1
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bitcoinToSatoshis(bobAmount1) }
  splitDestinations[1] = { address: bobAddr, amount: bitcoinToSatoshis(bobAmount2) }

  const splitHex = await split(
    alicePrivateKey,
    utils.getUtxo(transferTxid, transferTx, 0),
    splitDestinations,
    utils.getUtxo(transferTxid, transferTx, 1),
    fundingPrivateKey
  )
  splitTxid = await broadcast(splitHex)
  splitTx = await getTransaction(splitTxid)
  splitTxObj = new bsv.Transaction(splitHex)
}
