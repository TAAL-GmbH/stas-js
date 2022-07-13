const expect = require('chai').expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  redeemSplit
} = require('../../index')

const {
  bitcoinToSatoshis,
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../../index').utils

let issuerPrivateKey
let fundingPrivateKey
let bobPrivateKey
let alicePrivateKey
let bobAddr
let aliceAddr
let contractUtxos
let fundingUtxos
let publicKeyHash
let issueTxid
let issueTx

beforeAll(async () => {
  await setup()
})

it('RedeemSplit - Too Many Outputs Throws Error', async () => {
  const davePrivateKey = bsv.PrivateKey()
  const daveAddr = davePrivateKey.toAddress(process.env.NETWORK).toString()
  const emmaPrivateKey = bsv.PrivateKey()
  const emmaAddr = emmaPrivateKey.toAddress(process.env.NETWORK).toString()
  const amount = bitcoinToSatoshis(issueTx.vout[0].value / 5)
  const rSplitDestinations = []
  rSplitDestinations[0] = { address: bobAddr, amount: amount }
  rSplitDestinations[1] = { address: aliceAddr, amount: amount }
  rSplitDestinations[2] = { address: daveAddr, amount: amount }
  rSplitDestinations[3] = { address: emmaAddr, amount: amount }
  try {
    await redeemSplit(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      rSplitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Must have less than 5 segments')
  }
})

it('RedeemSplit - Add Too Much To Split Throws Error', async () => {
  const bobAmount = issueTx.vout[0].value * 2
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bitcoinToSatoshis(bobAmount) }
  const issueOutFundingVout = issueTx.vout.length - 1
  try {
    await redeemSplit(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Not enough input Satoshis to cover output. Trying to redeem -7000 sats')
  }
})

it('RedeemSplit - Address Too Short Throws Error', async () => {
  const bobAmount1 = issueTx.vout[0].value / 2
  const bobAmount2 = issueTx.vout[0].value - bobAmount1
  const splitDestinations = []
  splitDestinations[0] = { address: '1LF2wNCBT9dp5jN7fa6xSAaU', amount: bitcoinToSatoshis(bobAmount1) }
  splitDestinations[1] = { address: bobAddr, amount: bitcoinToSatoshis(bobAmount2) }
  const issueOutFundingVout = issueTx.vout.length - 1
  try {
    await redeemSplit(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Address in split destination')
  }
})

it('RedeemSplit - Address Too Long Throws Error', async () => {
  const bobAmount1 = issueTx.vout[0].value / 2
  const bobAmount2 = issueTx.vout[0].value - bobAmount1
  console.log(bobAddr)
  const splitDestinations = []
  splitDestinations[0] = { address: '1LF2wNCBT9dp5jN7fa6xSAaUGjJ5Pyz5VGaUG', amount: bitcoinToSatoshis(bobAmount1) }
  splitDestinations[1] = { address: bobAddr, amount: bitcoinToSatoshis(bobAmount2) }
  const issueOutFundingVout = issueTx.vout.length - 1
  try {
    await redeemSplit(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Address in split destination')
  }
})

it(
  'RedeemSplit - Splitting Into Too Many Tokens Throws Error',
  async () => {
    const bobAmount = bitcoinToSatoshis(issueTx.vout[0].value / 10)
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount }
    splitDestinations[2] = { address: bobAddr, amount: bobAmount }
    splitDestinations[3] = { address: bobAddr, amount: bobAmount }
    splitDestinations[4] = { address: bobAddr, amount: bobAmount }
    const issueOutFundingVout = issueTx.vout.length - 1
    try {
      await redeemSplit(
        alicePrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(issueTxid, issueTx, 0),
        splitDestinations,
        utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
        fundingPrivateKey
      )
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Must have less than 5 segments')
    }
  }
)

it(
  'RedeemSplit - Null Token Owner Private Key Throws Error',
  async () => {
    const bobAmount = bitcoinToSatoshis(issueTx.vout[0].value / 2)
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount }

    const issueOutFundingVout = issueTx.vout.length - 1
    try {
      await redeemSplit(
        null,
        issuerPrivateKey.publicKey,
        utils.getUtxo(issueTxid, issueTx, 0),
        splitDestinations,
        utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
        fundingPrivateKey
      )
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Token owner private key is null')
    }
  }
)

it('RedeemSplit - Null STAS UTXO Throws Error', async () => {
  const bobAmount = bitcoinToSatoshis(issueTx.vout[0].value / 2)
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount }

  const issueOutFundingVout = issueTx.vout.length - 1
  try {
    await redeemSplit(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      null,
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Argument: Must provide an object from where to extract data')
  }
})

it('RedeemSplit - Null Split Destinations Throws Error', async () => {
  const issueOutFundingVout = issueTx.vout.length - 1
  try {
    await redeemSplit(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      null,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('split destinations array is null or empty')
  }
})

it('RedeemSplit - Empty Split Destinations Throws Error', async () => {
  const splitDestinations = []
  const issueOutFundingVout = issueTx.vout.length - 1
  try {
    await redeemSplit(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('split destinations array is null or empty')
  }
})

it('RedeemSplit - Null Funding Private Key Throws Error', async () => {
  const bobAmount = bitcoinToSatoshis(issueTx.vout[0].value / 2)
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount }

  const issueOutFundingVout = issueTx.vout.length - 1
  try {
    await redeemSplit(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      null
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Payment UTXO provided but payment public key is null')
  }
})

it('RedeemSplit - Null Contract Public Key Throws Error', async () => {
  const bobAmount = bitcoinToSatoshis(issueTx.vout[0].value / 2)
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount }

  const issueOutFundingVout = issueTx.vout.length - 1
  try {
    await redeemSplit(
      alicePrivateKey,
      null,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      null
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('contract public key is null')
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
  issueTxid = await broadcast(issueHex)
  issueTx = await getTransaction(issueTxid)
}
