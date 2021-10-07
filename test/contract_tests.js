const expect = require('chai').expect
const assert = require('chai').assert
const utils = require('./test_utils')
const chai = require('chai')
const bsv = require('bsv')

const {
  contract
} = require('../index')

const {
  getFundsFromFaucet,
  broadcast
} = require('../index').utils

let issuerPrivateKey
let fundingPrivateKey
let contractUtxos
let fundingUtxos
let publicKeyHash
let supply = 10000
let symbol = 'TAALT'
let schema

beforeEach(async function () {
  await setup()
})

it('Successful Contract Broadcast', async function () {
  const contractHex = contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  )
  await broadcast(contractHex)
})

it('Duplicate Private Keys Throws Error', async function () {
  const contractHex = contract(
    fundingPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  )

  try {
    await broadcast(contractHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it('Duplicate UTXOS Throws Error', async function () {
  const contractHex = contract(
    issuerPrivateKey,
    fundingUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  )

  try {
    await broadcast(contractHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it('Null Issuer Public Key Throws Error', async function () {
  try {
    contract(
      null,
      contractUtxos,
      fundingUtxos,
      fundingPrivateKey,
      schema,
      supply
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Cannot read property \'publicKey\' of null')
  }
})

it('Null Contract UTXO Throws Error', async function () {
  try {
    contract(
      issuerPrivateKey,
      null,
      fundingUtxos,
      fundingPrivateKey,
      schema,
      supply
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('ContractUtxos is invalid')
  }
})

it('Null Payment UTXO Successful Broadcast(no fees)', async function () {
  const contractHex = contract(
    issuerPrivateKey,
    contractUtxos,
    null,
    fundingPrivateKey,
    schema,
    supply
  )
  await broadcast(contractHex)
})

it('Null Funding Private Key Throws Error', async function () {
  try {
    contract(
      issuerPrivateKey,
      contractUtxos,
      fundingUtxos,
      null,
      schema,
      supply
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Cannot read property \'publicKey\' of null')
  }
})

it('Null Schema Throws Error', async function () {
  try {
    contract(
      issuerPrivateKey,
      contractUtxos,
      fundingUtxos,
      fundingUtxos,
      null,
      supply
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Schema is null')
  }
})

it('Null Supply Throws Error', async function () {
  try {
    contract(
      issuerPrivateKey,
      contractUtxos,
      fundingUtxos,
      fundingUtxos,
      schema,
      null
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Argument: Output satoshis is not a natural number')
  }
})

it('Negative Supply Throws Error', async function () {
  try {
    contract(
      issuerPrivateKey,
      contractUtxos,
      fundingUtxos,
      fundingPrivateKey,
      schema,
      -100
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Argument: Output satoshis is not a natural number')
  }
})

it('Zero Supply Throws Error', async function () {
  try {
    contract(
      issuerPrivateKey,
      contractUtxos,
      fundingUtxos,
      fundingPrivateKey,
      schema,
      0
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Token satoshis is zero')
  }
})

it('Invalid Contract UTXO Throw Error', async function () {
  try {
    contract(
      issuerPrivateKey,
      [
        {
          txid: '71ea4669224ce874ce79f71d609a48ce1cc7a32fcd22afee52b09a326ad22eff',
          vout: 0,
          amount: 0.01
        }
      ],
      fundingUtxos,
      fundingPrivateKey,
      schema,
      supply
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Argument: Must provide the scriptPubKey for that output!')
  }
})

it('Invalid Payment UTXO Throw Error', async function () {
  try {
    contract(
      issuerPrivateKey,
      contractUtxos,
      [
        {
          vout: 0,
          scriptPubKey: '76a914173a320ffd763627107b3274f7eb571df8114b9288ac',
          amount: 0.01
        }
      ],
      fundingPrivateKey,
      schema,
      supply
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid TXID in object')
  }
})

// needs fixed
it('Empty Array Contract UTXO Throw Error', async function () {
  try {
    contract(
      issuerPrivateKey,
      [],
      fundingUtxos,
      fundingPrivateKey,
      schema,
      supply
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('ContractUtxos is invalid')
  }
})

// Payment UTXO can be null in which case it's treated as a zero fee transaction.
it('Empty Array Payment UTXO Successful', async function () {
  try {
    contract(
      issuerPrivateKey,
      contractUtxos,
      [],
      fundingPrivateKey,
      schema,
      supply
    )
    assert(true)
  } catch (e) {
    assert(false)
  }
})

async function setup () {
  issuerPrivateKey = bsv.PrivateKey()
  fundingPrivateKey = bsv.PrivateKey()
  contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress('testnet').toString())
  fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress('testnet').toString())
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  schema = utils.schema(publicKeyHash, symbol, supply)
}
