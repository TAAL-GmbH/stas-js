const expect = require('chai').expect
const assert = require('chai').assert
const utils = require('./utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

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
const supply = 10000
const symbol = 'TAALT'
let schema

beforeEach(async function () {
  await setup()
})

it('Successful Contract With Fees', async function () {
  const contractHex = contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  )
  const contractTxid = await broadcast(contractHex)
  console.log(contractTxid)
  let amount = await utils.getVoutAmount(contractTxid, 0)
  expect(amount).to.equal(supply / 100000000)
  expect(await utils.areFeesProcessed(contractTxid, 1)).to.be.true
})

it('Successful Contract No Fees', async function () {
  const contractHex = contract(
    issuerPrivateKey,
    contractUtxos,
    null,
    fundingPrivateKey,
    schema,
    supply
  )
  const contractTxid = await broadcast(contractHex)
  console.log(contractTxid)
  let amount = await utils.getVoutAmount(contractTxid, 0)
  expect(amount).to.equal(supply / 100000000)
  expect(await utils.areFeesProcessed(contractTxid, 1)).to.be.false

})

it('Successful Contract No Fees Empty Arrays', async function () {
  const contractHex = contract(
    issuerPrivateKey,
    contractUtxos,
    [],
    fundingPrivateKey,
    schema,
    supply
  )
  const contractTxid = await broadcast(contractHex)
  let amount = await utils.getVoutAmount(contractTxid, 0)
  expect(amount).to.equal(supply / 100000000)
  expect(await utils.areFeesProcessed(contractTxid, 1)).to.be.false
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
    expect(e.response.data).to.contain('mandatory-script-verify-flag-failed')
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
    expect(e.response.data).to.contain('bad-txns-inputs-duplicate')
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
    expect(e.message).to.eql('inputUtxos is invalid'')
  }
})

it('Non Array Contract UTXO Throws Error', async function () {
  try {
    contract(
      issuerPrivateKey,
      {
        txid: '562c4afa4c14a1f01f960f9d79d1e90d0ffa4eac6e9d42c272454e93b8fad8e6',
        vout: 0,
        scriptPubKey: '76a914ddfa3b4a86af8e0dce6644db696114b585675eff88ac',
        amount: 0.01
      },
      fundingUtxos,
      fundingPrivateKey,
      schema,
      supply
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('inputUtxos is invalid')
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
//needs fixed
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
    expect(e.message).to.eql('Token satoshis is Not a natural number')
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
    expect(e.message).to.eql('inputUtxos is invalid')
  }
})


async function setup() {

  issuerPrivateKey = bsv.PrivateKey()
  fundingPrivateKey = bsv.PrivateKey()
  contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  schema = utils.schema(publicKeyHash, symbol, supply)
}
