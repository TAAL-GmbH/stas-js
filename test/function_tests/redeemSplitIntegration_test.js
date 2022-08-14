const expect = require('chai').expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  redeemSplit,
  redeemSplitWithCallback,
  unsignedRedeemSplit
} = require('../../index')

const {
  bitcoinToSatoshis,
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../../index').utils

const { sighash } = require('../../lib/stas')
const unsigneRedeem = require('../../lib/unsignedRedeem')

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
const keyMap = new Map()

const aliceSignatureCallback = async (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash.sign(tx, alicePrivateKey, sighash, i, script, satoshis).toTxFormat().toString('hex')
}
const paymentSignatureCallback = async (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash.sign(tx, fundingPrivateKey, sighash, i, script, satoshis).toTxFormat().toString('hex')
}

beforeEach(async () => {
  await setup()
})

it('Successful RedeemSplit With 1 Split', async () => {
  const amount = issueTx.vout[0].value / 2
  const rSplitDestinations = []
  rSplitDestinations[0] = { address: bobAddr, amount: bitcoinToSatoshis(amount) }

  const redeemSplitHex = await redeemSplit(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    rSplitDestinations,
    utils.getUtxo(issueTxid, issueTx, 2),
    fundingPrivateKey
  )
  const redeemTxid = await broadcast(redeemSplitHex)
  expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.000035) // first utxo goes to redemption address
  expect(await utils.getVoutAmount(redeemTxid, 1)).to.equal(0.000035)
  await utils.isTokenBalance(aliceAddr, 0)
  await utils.isTokenBalance(bobAddr, 6500)
})

it('Successful RedeemSplit With 2 Split', async () => {
  const amount = issueTx.vout[0].value / 5
  const rSplitDestinations = []
  rSplitDestinations[0] = { address: bobAddr, amount: bitcoinToSatoshis(amount) }
  rSplitDestinations[1] = { address: aliceAddr, amount: bitcoinToSatoshis(amount) }

  const redeemSplitHex = await redeemSplit(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    rSplitDestinations,
    utils.getUtxo(issueTxid, issueTx, 2),
    fundingPrivateKey
  )
  const redeemTxid = await broadcast(redeemSplitHex)
  expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.000042) // first utxo goes to redemption address
  expect(await utils.getVoutAmount(redeemTxid, 1)).to.equal(0.000014)
  expect(await utils.getVoutAmount(redeemTxid, 2)).to.equal(0.000014)
  await utils.isTokenBalance(aliceAddr, 1400)
  await utils.isTokenBalance(bobAddr, 4400)
})

it('Successful RedeemSplit With 3 Split', async () => {
  const davePrivateKey = bsv.PrivateKey()
  const daveAddr = davePrivateKey.toAddress(process.env.NETWORK).toString()
  const amount = issueTx.vout[0].value / 10
  const rSplitDestinations = []
  rSplitDestinations[0] = { address: bobAddr, amount: bitcoinToSatoshis(amount) }
  rSplitDestinations[1] = { address: aliceAddr, amount: bitcoinToSatoshis(amount) }
  rSplitDestinations[2] = { address: daveAddr, amount: bitcoinToSatoshis(amount) }

  const redeemSplitHex = await redeemSplit(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    rSplitDestinations,
    utils.getUtxo(issueTxid, issueTx, 2),
    fundingPrivateKey
  )
  const redeemTxid = await broadcast(redeemSplitHex)
  expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.000049)
  expect(await utils.getVoutAmount(redeemTxid, 1)).to.equal(0.000007)
  expect(await utils.getVoutAmount(redeemTxid, 2)).to.equal(0.000007)
  expect(await utils.getVoutAmount(redeemTxid, 3)).to.equal(0.000007)
  await utils.isTokenBalance(aliceAddr, 700)
  await utils.isTokenBalance(bobAddr, 3700)
  await utils.isTokenBalance(daveAddr, 700)
})

it('Successful RedeemSplit With No Fees', async () => {
  const rsBobAmount = issueTx.vout[0].value / 3
  const rsAliceAmount1 = issueTx.vout[0].value / 3
  const rSplitDestinations = []
  rSplitDestinations[0] = { address: bobAddr, amount: bitcoinToSatoshis(rsBobAmount) }
  rSplitDestinations[1] = { address: aliceAddr, amount: bitcoinToSatoshis(rsAliceAmount1) }

  const redeemSplitHex = await redeemSplit(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    rSplitDestinations,
    null,
    null
  )
  const redeemTxid = await broadcast(redeemSplitHex)
  expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.00002334)
  expect(await utils.getVoutAmount(redeemTxid, 1)).to.equal(0.00002333)
  expect(await utils.getVoutAmount(redeemTxid, 2)).to.equal(0.00002333)
  await utils.isTokenBalance(aliceAddr, 2333)
  await utils.isTokenBalance(bobAddr, 5333)
})

it('RedeemSplit - No Split Completes Successfully', async () => {
  const rsBobAmount = issueTx.vout[0].value / 2
  const rSplitDestinations = []
  rSplitDestinations[0] = { address: bobAddr, amount: bitcoinToSatoshis(rsBobAmount) }

  const redeemSplitHex = await redeemSplit(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    rSplitDestinations,
    utils.getUtxo(issueTxid, issueTx, 2),
    fundingPrivateKey
  )
  const redeemTxid = await broadcast(redeemSplitHex)
  expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.000035)
  await utils.isTokenBalance(aliceAddr, 0)
  await utils.isTokenBalance(bobAddr, 6500)
})

it('Successful RedeemSplit With Callback & Fees', async () => {
  const amount = issueTx.vout[0].value / 5
  const rSplitDestinations = []
  rSplitDestinations[0] = { address: bobAddr, amount: bitcoinToSatoshis(amount) }
  rSplitDestinations[1] = { address: aliceAddr, amount: bitcoinToSatoshis(amount) }

  const redeemSplitHex = await redeemSplitWithCallback(
    alicePrivateKey.publicKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    rSplitDestinations,
    utils.getUtxo(issueTxid, issueTx, 2),
    fundingPrivateKey.publicKey,
    aliceSignatureCallback,
    paymentSignatureCallback
  )
  const redeemTxid = await broadcast(redeemSplitHex)
  expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.000042) // first utxo goes to redemption address
  expect(await utils.getVoutAmount(redeemTxid, 1)).to.equal(0.000014)
  expect(await utils.getVoutAmount(redeemTxid, 2)).to.equal(0.000014)
  await utils.isTokenBalance(aliceAddr, 1400)
  await utils.isTokenBalance(bobAddr, 4400)
})

it('Successful RedeemSplit With Callback & No fees', async () => {
  const amount = issueTx.vout[0].value / 5
  const rSplitDestinations = []
  rSplitDestinations[0] = { address: bobAddr, amount: bitcoinToSatoshis(amount) }
  rSplitDestinations[1] = { address: aliceAddr, amount: bitcoinToSatoshis(amount) }

  const redeemSplitHex = await redeemSplitWithCallback(
    alicePrivateKey.publicKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    rSplitDestinations,
    null,
    null,
    aliceSignatureCallback,
    null
  )
  const redeemTxid = await broadcast(redeemSplitHex)
  expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.000042) // first utxo goes to redemption address
  expect(await utils.getVoutAmount(redeemTxid, 1)).to.equal(0.000014)
  expect(await utils.getVoutAmount(redeemTxid, 2)).to.equal(0.000014)
  await utils.isTokenBalance(aliceAddr, 1400)
  await utils.isTokenBalance(bobAddr, 4400)
})

it('Successful RedeemSplit Unsigned & Fee', async () => {
  const amount = issueTx.vout[0].value / 5
  const rSplitDestinations = []
  rSplitDestinations[0] = { address: bobAddr, amount: bitcoinToSatoshis(amount) }
  rSplitDestinations[1] = { address: aliceAddr, amount: bitcoinToSatoshis(amount) }

  const unsignedRedeemSplitReturn = await unsignedRedeemSplit(
    alicePrivateKey.publicKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    rSplitDestinations,
    utils.getUtxo(issueTxid, issueTx, 2),
    fundingPrivateKey.publicKey
  )
  const redeemSplitTx = bsv.Transaction(unsignedRedeemSplitReturn.hex)
  utils.signScriptWithUnlocking(unsignedRedeemSplitReturn, redeemSplitTx, keyMap)
  const redeemTxid = await broadcast(redeemSplitTx.serialize(true))
  expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.000042) // first utxo goes to redemption address
  expect(await utils.getVoutAmount(redeemTxid, 1)).to.equal(0.000014)
  expect(await utils.getVoutAmount(redeemTxid, 2)).to.equal(0.000014)
  await utils.isTokenBalance(aliceAddr, 1400)
  await utils.isTokenBalance(bobAddr, 4400)
})

it('Successful RedeemSplit With Unsigned & No Fee', async () => {
  const amount = issueTx.vout[0].value / 5
  const rSplitDestinations = []
  rSplitDestinations[0] = { address: bobAddr, amount: bitcoinToSatoshis(amount) }
  rSplitDestinations[1] = { address: aliceAddr, amount: bitcoinToSatoshis(amount) }

  const unsignedRedeemSplitReturn = await unsignedRedeemSplit(
    alicePrivateKey.publicKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    rSplitDestinations,
    null,
    null
  )
  const redeemSplitTx = bsv.Transaction(unsignedRedeemSplitReturn.hex)
  utils.signScriptWithUnlocking(unsignedRedeemSplitReturn, redeemSplitTx, keyMap)
  const redeemTxid = await broadcast(redeemSplitTx.serialize(true))
  expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.000042) // first utxo goes to redemption address
  expect(await utils.getVoutAmount(redeemTxid, 1)).to.equal(0.000014)
  expect(await utils.getVoutAmount(redeemTxid, 2)).to.equal(0.000014)
  await utils.isTokenBalance(aliceAddr, 1400)
  await utils.isTokenBalance(bobAddr, 4400)
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
  'RedeemSplit - Incorrect Owner Private Key Throws Error',
  async () => {
    const bobAmount = bitcoinToSatoshis(issueTx.vout[0].value / 3)
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount }
    const issueOutFundingVout = issueTx.vout.length - 1
    const incorrectPrivateKey = bsv.PrivateKey()

    const redeemHex = await redeemSplit(
      incorrectPrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    try {
      await broadcast(redeemHex)
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Request failed with status code 400')
    }
  }
)

it(
  'RedeemSplit - Incorrect Funding Private Key Throws Error',
  async () => {
    const bobAmount = bitcoinToSatoshis(issueTx.vout[0].value / 4)
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount }
    const issueOutFundingVout = issueTx.vout.length - 1
    const incorrectPrivateKey = bsv.PrivateKey()

    const redeemHex = await redeemSplit(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      incorrectPrivateKey
    )

    try {
      await broadcast(redeemHex)
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Request failed with status code 400')
    }
  }
)

it('RedeemSplit - Incorrect Public Key Throws Error', async () => {
  const bobAmount = bitcoinToSatoshis(issueTx.vout[0].value / 4)
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount }
  const issueOutFundingVout = issueTx.vout.length - 1
  const incorrectPrivateKey = bsv.PrivateKey()

  const redeemHex = await redeemSplit(
    alicePrivateKey,
    incorrectPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    splitDestinations,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )

  try {
    await broadcast(redeemHex)
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it(
  'RedeemSplit - Incorrect Owner Private Key Throws Error',
  async () => {
    const bobAmount = bitcoinToSatoshis(issueTx.vout[0].value / 3)
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount }
    const issueOutFundingVout = issueTx.vout.length - 1
    const incorrectPrivateKey = bsv.PrivateKey()

    const redeemHex = await redeemSplit(
      incorrectPrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    )
    try {
      await broadcast(redeemHex)
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Request failed with status code 400')
    }
  }
)

it(
  'RedeemSplit - Incorrect Funding Private Key Throws Error',
  async () => {
    const bobAmount = bitcoinToSatoshis(issueTx.vout[0].value / 4)
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount }
    const issueOutFundingVout = issueTx.vout.length - 1
    const incorrectPrivateKey = bsv.PrivateKey()

    const redeemHex = await redeemSplit(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      incorrectPrivateKey
    )

    try {
      await broadcast(redeemHex)
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Request failed with status code 400')
    }
  }
)

it('RedeemSplit - Incorrect Public Key Throws Error', async () => {
  const bobAmount = bitcoinToSatoshis(issueTx.vout[0].value / 4)
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount }
  const issueOutFundingVout = issueTx.vout.length - 1
  const incorrectPrivateKey = bsv.PrivateKey()

  const redeemHex = await redeemSplit(
    alicePrivateKey,
    incorrectPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    splitDestinations,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )

  try {
    await broadcast(redeemHex)
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

async function setup () {
  issuerPrivateKey = bsv.PrivateKey()
  keyMap.set(issuerPrivateKey.publicKey, issuerPrivateKey)
  fundingPrivateKey = bsv.PrivateKey()
  keyMap.set(fundingPrivateKey.publicKey, fundingPrivateKey)
  bobPrivateKey = bsv.PrivateKey()
  keyMap.set(bobPrivateKey.publicKey, bobPrivateKey)
  alicePrivateKey = bsv.PrivateKey()
  keyMap.set(alicePrivateKey.publicKey, alicePrivateKey)
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
