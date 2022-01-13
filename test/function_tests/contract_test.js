const expect = require('chai').expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract, contractWithCallback
} = require('../../index')

const {
  getFundsFromFaucet,
  broadcast
} = require('../../index').utils

const ownerSignCallback = (tx) => {
  tx.sign(issuerPrivateKey)
}

const paymentSignCallback = (tx) => {
  tx.sign(fundingPrivateKey)
}

let issuerPrivateKey
let fundingPrivateKey
let contractUtxos
let fundingUtxos
let publicKeyHash
const supply = 10000
const symbol = 'TAALT'
let schema

beforeEach(async () => {
  await setup()
})

it('Contract - Successful With Fees', async () => {
  const contractHex = contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  )
  const contractTxid = await broadcast(contractHex)
  const amount = await utils.getVoutAmount(contractTxid, 0)
  expect(amount).to.equal(supply / 100000000)
})

it('Contract - Successful No Fees', async () => {
  const contractHex = contract(
    issuerPrivateKey,
    contractUtxos,
    null,
    null,
    schema,
    supply
  )
  const contractTxid = await broadcast(contractHex)
  const amount = await utils.getVoutAmount(contractTxid, 0)
  expect(amount).to.equal(supply / 100000000)
})

it('Contract - Successful No Fees Empty Array', async () => {
  const contractHex = contract(
    issuerPrivateKey,
    contractUtxos,
    [],
    fundingPrivateKey,
    schema,
    supply
  )
  const contractTxid = await broadcast(contractHex)
  const amount = await utils.getVoutAmount(contractTxid, 0)
  expect(amount).to.equal(supply / 100000000)
})

it('Contract - Successful With Callback Fee', async () => {
  const contractHex = contractWithCallback(
    issuerPrivateKey.publicKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey.publicKey,
    schema,
    supply,
    ownerSignCallback,
    paymentSignCallback
  )
  const contractTxid = await broadcast(contractHex)
  const amount = await utils.getVoutAmount(contractTxid, 0)
  expect(amount).to.equal(supply / 100000000)
})

it('Contract - Successful With Callback No Fee', async () => {
  const contractHex = contractWithCallback(
    issuerPrivateKey.publicKey,
    contractUtxos,
    null,
    null,
    schema,
    supply,
    ownerSignCallback,
    null
  )
  const contractTxid = await broadcast(contractHex)
  const amount = await utils.getVoutAmount(contractTxid, 0)
  expect(amount).to.equal(supply / 100000000)
})

it('Contract - Wrong Funding Private Key Throws Error', async () => {
  const incorrectPrivateKey = bsv.PrivateKey()
  const contractHex = contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    incorrectPrivateKey,
    schema,
    supply
  )
  try {
    await broadcast(contractHex)
    expect(false).toBeTruthy()
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.response.data).to.contain('mandatory-script-verify-flag-failed')
  }
})

it('Contract - Wrong Contract Private Key Throws Error', async () => {
  const incorrectPrivateKey = bsv.PrivateKey()
  const contractHex = contract(
    incorrectPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  )
  try {
    await broadcast(contractHex)
    expect(false).toBeTruthy()
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.response.data).to.contain('mandatory-script-verify-flag-failed')
  }
})

it('Contract - Duplicate UTXOS Throws Error', async () => {
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
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.response.data).to.contain('bad-txns-inputs-duplicate')
  }
})

it('Contract - Null Issuer Private Key Throws Error', async () => {
  try {
    contract(
      null,
      contractUtxos,
      fundingUtxos,
      fundingPrivateKey,
      schema,
      supply
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Issuer private key is null')
  }
})

it('Contract - Null Contract UTXO Throws Error', async () => {
  try {
    contract(
      issuerPrivateKey,
      null,
      fundingUtxos,
      fundingPrivateKey,
      schema,
      supply
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('inputUtxos is invalid')
  }
})

it('Contract - Non Array Contract UTXO Throws Error', async () => {
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
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('inputUtxos is invalid')
  }
})

it(
  'Contract - Null Funding Private Key With Funding UTXO Throws Error',
  async () => {
    try {
      contract(
        issuerPrivateKey,
        contractUtxos,
        fundingUtxos,
        null,
        schema,
        supply
      )
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Payment UTXOs provided but payment public key  or paymentSignCallback is null')
    }
  }
)

it('Contract - Null Schema Throws Error', async () => {
  try {
    contract(
      issuerPrivateKey,
      contractUtxos,
      fundingUtxos,
      fundingUtxos,
      null,
      supply
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Schema is null')
  }
})

it('Contract - Null Supply Throws Error', async () => {
  try {
    contract(
      issuerPrivateKey,
      contractUtxos,
      fundingUtxos,
      fundingUtxos,
      schema,
      null
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Token amount null is less than satsPerToken 1')
  }
})

it('Contract - Negative Supply Throws Error', async () => {
  try {
    contract(
      issuerPrivateKey,
      contractUtxos,
      fundingUtxos,
      fundingPrivateKey,
      schema,
      -100
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Token amount -100 is less than satsPerToken 1')
  }
})

it('Contract - Zero Supply Throws Error', async () => {
  try {
    contract(
      issuerPrivateKey,
      contractUtxos,
      fundingUtxos,
      fundingPrivateKey,
      schema,
      0
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Token satoshis is zero')
  }
})

it('Contract - Invalid Contract UTXO Throw Error', async () => {
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
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Argument: Must provide the scriptPubKey for that output!')
  }
})

it('Contract - Invalid Payment UTXO Throw Error', async () => {
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
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid TXID in object')
  }
})

it('Contract - Empty Array Contract UTXO Throw Error', async () => {
  try {
    contract(
      issuerPrivateKey,
      [],
      fundingUtxos,
      fundingPrivateKey,
      schema,
      supply
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('inputUtxos is invalid')
  }
})

it('Contract - Invalid Char Symbol Throws Error 1 ', async () => {
  const invalidCharsSymbol = '!invalid..;'
  const invalidSchema = utils.schema(publicKeyHash, invalidCharsSymbol, supply)
  try {
    contract(
      issuerPrivateKey,
      contractUtxos,
      fundingUtxos,
      fundingPrivateKey,
      invalidSchema,
      supply
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Symbol. Must be between 1 and 128 long and contain alpahnumeric, \'-\', \'_\' chars.')
  }
})

it('Contract - Invalid Char Symbol Throws Error 2', async () => {
  const invalidCharsSymbol = '&@invalid\"\'+='
  const invalidSchema = utils.schema(publicKeyHash, invalidCharsSymbol, supply)
  try {
    contract(
      issuerPrivateKey,
      contractUtxos,
      fundingUtxos,
      fundingPrivateKey,
      invalidSchema,
      supply
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Symbol. Must be between 1 and 128 long and contain alpahnumeric, \'-\', \'_\' chars.')
  }
})

it(
  'Contract - Symbol Greater than 128 Bytes Throws Error',
  async () => {
    const invalidSymbol = 'CallmeIshmaelSomeyearsagosdnevermindhowlongpreciselyhavinglittleornomoneyinmypurseandnothingparticulartointerestmeotoadasdfasfgg1'
    const invalidSchema = utils.schema(publicKeyHash, invalidSymbol, supply)
    try {
      contract(
        issuerPrivateKey,
        contractUtxos,
        fundingUtxos,
        fundingPrivateKey,
        invalidSchema,
        supply
      )
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Invalid Symbol. Must be between 1 and 128 long and contain alpahnumeric, \'-\', \'_\' chars.')
    }
  }
)

it('Contract - Null Symbol In Schema Throws Error', async () => {
  try {
    schema.symbol = null
    contract(
      issuerPrivateKey,
      contractUtxos,
      fundingUtxos,
      fundingPrivateKey,
      schema,
      supply
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Symbol. Must be between 1 and 128 long and contain alpahnumeric, \'-\', \'_\' chars.')
  }
})

it('Contract - Empty Symbol In Schema Throws Error', async () => {
  try {
    contract(
      issuerPrivateKey,
      contractUtxos,
      fundingUtxos,
      fundingPrivateKey,
      '',
      supply
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Symbol. Must be between 1 and 128 long and contain alpahnumeric, \'-\', \'_\' chars.')
  }
})

it(
  'Contract - Supply Not Divisible by satsPerToken Throws Error 1',
  async () => {
    try {
      schema.satsPerToken = 50

      contract(
        issuerPrivateKey,
        contractUtxos,
        fundingUtxos,
        fundingPrivateKey,
        schema,
        75
      )
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Token amount 75 must be divisible by satsPerToken 50')
    }
  }
)

it(
  'Contract - Supply Not Divisible by satsPerToken Throws Error 2',
  async () => {
    try {
      schema.satsPerToken = 66

      contract(
        issuerPrivateKey,
        contractUtxos,
        fundingUtxos,
        fundingPrivateKey,
        schema,
        1000
      )
      expect(false).toBeTruthy()
      return
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Token amount 1000 must be divisible by satsPerToken 66')
    }

    it('Contract - satsPerToken > Supply Throws Error', async () => {
      try {
        schema.satsPerToken = 2000

        contract(
          issuerPrivateKey,
          contractUtxos,
          fundingUtxos,
          fundingPrivateKey,
          schema,
          1000
        )
        expect(false).toBeTruthy()
        return
      } catch (e) {
        expect(e).to.be.instanceOf(Error)
        expect(e.message).to.eql('Token amount 1000 is less than satsPerToken 2000')
      }
    })
  }
)

async function setup () {
  issuerPrivateKey = bsv.PrivateKey()
  fundingPrivateKey = bsv.PrivateKey()
  contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  schema = utils.schema(publicKeyHash, symbol, supply)
}
