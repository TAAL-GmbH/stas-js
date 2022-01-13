const expect = require('chai').expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  redeemSplit,
  redeemSplitWithCallback
} = require('../../index')

const {
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

beforeEach(async () => {
  await setup()
})

it('Successful RedeemSplit With 1 Split', async () => {
  const amount = issueTx.vout[0].value / 2
  const rSplitDestinations = []
  rSplitDestinations[0] = { address: bobAddr, amount: amount }

  const redeemSplitHex = redeemSplit(
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
  console.log('Bob Balance ' + (await utils.getTokenBalance(bobAddr)))
  expect(await utils.getTokenBalance(bobAddr)).to.equal(6500)
})

it('Successful RedeemSplit With 2 Split', async () => {
  const amount = issueTx.vout[0].value / 5
  const rSplitDestinations = []
  rSplitDestinations[0] = { address: bobAddr, amount: amount }
  rSplitDestinations[1] = { address: aliceAddr, amount: amount }

  const redeemSplitHex = redeemSplit(
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
  console.log('Alice Balance ' + (await utils.getTokenBalance(aliceAddr)))
  console.log('Bob Balance ' + (await utils.getTokenBalance(bobAddr)))
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(1400)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(4400)
})

it('Successful RedeemSplit With 3 Split', async () => {
  const davePrivateKey = bsv.PrivateKey()
  const daveAddr = davePrivateKey.toAddress(process.env.NETWORK).toString()
  const amount = issueTx.vout[0].value / 10
  const rSplitDestinations = []
  rSplitDestinations[0] = { address: bobAddr, amount: amount }
  rSplitDestinations[1] = { address: aliceAddr, amount: amount }
  rSplitDestinations[2] = { address: daveAddr, amount: amount }

  const redeemSplitHex = redeemSplit(
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
  console.log('Alice Balance ' + (await utils.getTokenBalance(aliceAddr)))
  console.log('Bob Balance ' + (await utils.getTokenBalance(bobAddr)))
  console.log('Dave Balance ' + (await utils.getTokenBalance(daveAddr)))
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(700)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(3700)
  expect(await utils.getTokenBalance(daveAddr)).to.equal(700)
})

it('Successful RedeemSplit With No Fees', async () => {
  const rsBobAmount = issueTx.vout[0].value / 3
  const rsAliceAmount1 = issueTx.vout[0].value / 3
  const rSplitDestinations = []
  rSplitDestinations[0] = { address: bobAddr, amount: rsBobAmount }
  rSplitDestinations[1] = { address: aliceAddr, amount: rsAliceAmount1 }

  const redeemSplitHex = redeemSplit(
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
  console.log('Alice Balance ' + (await utils.getTokenBalance(aliceAddr)))
  console.log('Bob Balance ' + (await utils.getTokenBalance(bobAddr)))
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(2333)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(5333)
})

it('RedeemSplit - No Split Completes Successfully', async () => {
  const rsBobAmount = issueTx.vout[0].value / 2
  const rSplitDestinations = []
  rSplitDestinations[0] = { address: bobAddr, amount: rsBobAmount }

  const redeemSplitHex = redeemSplit(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    rSplitDestinations,
    utils.getUtxo(issueTxid, issueTx, 2),
    fundingPrivateKey
  )
  const redeemTxid = await broadcast(redeemSplitHex)
  expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.000035)
  console.log('Alice Balance ' + (await utils.getTokenBalance(aliceAddr)))
  console.log('Bob Balance ' + (await utils.getTokenBalance(bobAddr)))
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(0)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(6500)
})

it('RedeemSplit - Too Many Outputs Throws Error', async () => {
  const davePrivateKey = bsv.PrivateKey()
  const daveAddr = davePrivateKey.toAddress(process.env.NETWORK).toString()
  const emmaPrivateKey = bsv.PrivateKey()
  const emmaAddr = emmaPrivateKey.toAddress(process.env.NETWORK).toString()
  const amount = issueTx.vout[0].value / 5
  const rSplitDestinations = []
  rSplitDestinations[0] = { address: bobAddr, amount: amount }
  rSplitDestinations[1] = { address: aliceAddr, amount: amount }
  rSplitDestinations[2] = { address: daveAddr, amount: amount }
  rSplitDestinations[3] = { address: emmaAddr, amount: amount }
  try {
    redeemSplit(
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
  splitDestinations[0] = { address: bobAddr, amount: bobAmount }
  const issueOutFundingVout = issueTx.vout.length - 1
  try {
    redeemSplit(
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
    expect(e.message).to.eql('Not enough input Satoshis to cover output')
  }
})


it('RedeemSplit - Address Too Short Throws Error', async () => {
  const bobAmount1 = issueTx.vout[0].value / 2
  const bobAmount2 = issueTx.vout[0].value - bobAmount1
  const splitDestinations = []
  splitDestinations[0] = { address: '1LF2wNCBT9dp5jN7fa6xSAaU', amount: bobAmount1 }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }
  const issueOutFundingVout = issueTx.vout.length - 1
  try {
    redeemSplit(
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
  splitDestinations[0] = { address: '1LF2wNCBT9dp5jN7fa6xSAaUGjJ5Pyz5VGaUG', amount: bobAmount1 }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }
  const issueOutFundingVout = issueTx.vout.length - 1
  try {
    redeemSplit(
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

// check with liam - we can split to issuer address
it('RedeemSplit - Send to Issuer Address Throws Error', async () => {
  const amount = issueTx.vout[0].value / 5
  const issuerAddr = issuerPrivateKey.toAddress(process.env.NETWORK).toString()
  const rSplitDestinations = []
  rSplitDestinations[0] = { address: issuerAddr, amount: amount }
  rSplitDestinations[1] = { address: issuerAddr, amount: amount }

  const redeemSplitHex = redeemSplit(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    rSplitDestinations,
    utils.getUtxo(issueTxid, issueTx, 2),
    fundingPrivateKey
  )
  const redeemTxid = await broadcast(redeemSplitHex)
  console.log(redeemTxid)
})

it(
  'RedeemSplit - Incorrect Owner Private Key Throws Error',
  async () => {
    const bobAmount = issueTx.vout[0].value / 3
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount }
    const issueOutFundingVout = issueTx.vout.length - 1
    const incorrectPrivateKey = bsv.PrivateKey()

    const redeemHex = redeemSplit(
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
    const bobAmount = issueTx.vout[0].value / 4
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount }
    const issueOutFundingVout = issueTx.vout.length - 1
    const incorrectPrivateKey = bsv.PrivateKey()

    const redeemHex = redeemSplit(
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
  const bobAmount = issueTx.vout[0].value / 4
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount }
  const issueOutFundingVout = issueTx.vout.length - 1
  const incorrectPrivateKey = bsv.PrivateKey()

  const redeemHex = redeemSplit(
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
  'RedeemSplit - Splitting Into Too Many Tokens Throws Error',
  async () => {
    const bobAmount = issueTx.vout[0].value / 10
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount }
    splitDestinations[2] = { address: bobAddr, amount: bobAmount }
    splitDestinations[3] = { address: bobAddr, amount: bobAmount }
    splitDestinations[4] = { address: bobAddr, amount: bobAmount }
    const issueOutFundingVout = issueTx.vout.length - 1
    try {
      redeemSplit(
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
    const bobAmount = issueTx.vout[0].value / 2
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount }

    const issueOutFundingVout = issueTx.vout.length - 1
    try {
      redeemSplit(
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
  const bobAmount = issueTx.vout[0].value / 2
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount }

  const issueOutFundingVout = issueTx.vout.length - 1
  try {
    redeemSplit(
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
    redeemSplit(
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

it('RedeemSplit - Null Funding Private Key Throws Error', async () => {
  const bobAmount = issueTx.vout[0].value / 2
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount }

  const issueOutFundingVout = issueTx.vout.length - 1
  try {
    redeemSplit(
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
    expect(e.message).to.eql('Payment UTXO provided but payment private key is null')
  }
})

it('RedeemSplit - Null Contract Public Key Throws Error', async () => {
  const bobAmount = issueTx.vout[0].value / 2
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount }

  const issueOutFundingVout = issueTx.vout.length - 1
  try {
    redeemSplit(
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

  const contractHex = contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  )
  const contractTxid = await broadcast(contractHex)
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
  issueTxid = await broadcast(issueHex)
  issueTx = await getTransaction(issueTxid)
}
