const expect = require('chai').expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  issueWithCallback
} = require('../../index')

const {
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../../index').utils

const { sighash } = require('../../lib/stas')

let issuerPrivateKey
let fundingPrivateKey
let bobPrivateKey
let alicePrivateKey
let contractUtxos
let fundingUtxos
let publicKeyHash
let contractTx
let contractTxid
let issueInfo
let aliceAddr
let bobAddr
let fundingAddress
let issuerAddress
let symbol

beforeAll(async () => {
  await setup() // set up contract
})

it(
  'Issue - Issue to Address with a negative token amount(?)',
  async () => {
    try {
      await issue(
        issuerPrivateKey,
        utils.getIssueInfo(aliceAddr, 13000, bobAddr, -3000),
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        symbol
      )
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('issueInfo Satoshis must be a natural number')
    }
  }
)

it(
  'Issue - Issue to Address with Zero Tokens Throws Errror',
  async () => {
    try {
      await issue(
        issuerPrivateKey,
        utils.getIssueInfo(aliceAddr, 10000, bobAddr, 0),
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        symbol
      )
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('issueInfo satoshis < 1')
    }
  }
)

it(
  'Issue - Issue with Incorrect Balance (Less Than) Throws Error',
  async () => {
    try {
      await issue(
        issuerPrivateKey,
        utils.getIssueInfo(aliceAddr, 5000, bobAddr, 4000),
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        symbol
      )
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.contain('total out amount 9000 must equal total in amount 10000')
    }
  }
)

it(
  'Issue - Issue with Incorrect Balance (More Than) Throws Error',
  async () => {
    try {
      await issue(
        issuerPrivateKey,
        utils.getIssueInfo(aliceAddr, 10000, bobAddr, 3000),
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        symbol
      )
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('total out amount 13000 must equal total in amount 10000')
    }
  }
)

it('Issue - Empty Issue Info Throws Error', async () => {
  try {
    await issue(
      issuerPrivateKey,
      [],
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      2
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('issueInfo is invalid')
  }
})

it(
  'Issue - Invalid Issue Address (Too Short) throws error',
  async () => {
    issueInfo = [
      {
        addr: '1bc1qxy2kgdygjrsqtzq2',
        satoshis: 7000,
        data: 'One'
      },
      {
        addr: bobAddr,
        satoshis: 3000,
        data: 'Two'
      }
    ]
    try {
      await issue(
        issuerPrivateKey,
        issueInfo,
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        symbol
      )
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('issueInfo address must be between 26 and 35')
    }
  }
)

it(
  'Issue - Invalid Issue Address (Too Long) throws error',
  async () => {
    issueInfo = [
      {
        addr: '1zP1eP5QGefi2DMPTfTL5SLmv7DivfNabc1qxymv7',
        satoshis: 7000,
        data: 'One'
      },
      {
        addr: bobAddr,
        satoshis: 3000,
        data: 'Two'
      }
    ]
    try {
      await issue(
        issuerPrivateKey,
        issueInfo,
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        symbol
      )
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('issueInfo address must be between 26 and 35')
    }
  }
)

it('Issue - Issue Amount Decimal Throws Error', async () => {
  try {
    await issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000.5, bobAddr, 2999.5),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('issueInfo Satoshis must be a natural number')
  }
})

it('Issue - Non Array Issue Info Throws Error', async () => {
  try {
    await issue(
      issuerPrivateKey,
      {
        addr: bobAddr,
        satoshis: 7000,
        data: 'one'
      },
      {
        addr: aliceAddr,
        satoshis: 3000,
        data: 'two'
      },
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('issueInfo is invalid')
  }
})

it('Issue - Empty Contract UTXO Info Throws Error', async () => {
  try {
    await issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      [],
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('contractUtxo is invalid')
  }
})

it('Issue - Null Issuer Private Key Throws Error', async () => {
  try {
    await issue(
      null,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Issuer private key is null')
  }
})

it('Issue - Null Issue Info Throws Error', async () => {
  try {
    await issue(
      issuerPrivateKey,
      null,
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('issueInfo is invalid')
  }
})

it('Issue - Null Contract UTXO Throws Error', async () => {
  try {
    await issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      null,
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol,
      2
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('contractUtxo is invalid')
  }
})

it('Issue - Null Payment Private Key Throws Error', async () => {
  try {
    await issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      null,
      true,
      symbol
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Payment UTXO provided but payment private key is null')
  }
})

it('Issue - Null isSplittable Throws Error', async () => {
  try {
    await issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      null,
      symbol
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('isSplittable must be a boolean value')
  }
})

it('Issue - Null Symbol Throws Error', async () => {
  try {
    await issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      null
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Symbol. Must be between 1 and 128 long and contain alpahnumeric, \'-\', \'_\' chars.')
  }
})

async function setup () {
  issuerPrivateKey = bsv.PrivateKey()
  fundingPrivateKey = bsv.PrivateKey()
  bobPrivateKey = bsv.PrivateKey()
  alicePrivateKey = bsv.PrivateKey()
  contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()
  fundingAddress = fundingPrivateKey.toAddress(process.env.NETWORK).toString()
  issuerAddress = issuerPrivateKey.toAddress(process.env.NETWORK).toString()
  symbol = 'TAALT'
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
  contractTxid = await broadcast(contractHex)
  contractTx = await getTransaction(contractTxid)
}
