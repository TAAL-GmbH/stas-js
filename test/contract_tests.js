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

// it('Contract - Successful With Fees', async function () {
//   const contractHex = contract(
//     issuerPrivateKey,
//     contractUtxos,
//     fundingUtxos,
//     fundingPrivateKey,
//     schema,
//     supply
//   )
//   const contractTxid = await broadcast(contractHex)
//   const amount = await utils.getVoutAmount(contractTxid, 0)
//   expect(amount).to.equal(supply / 100000000)
// })

// it('Contract - Successful No Fees', async function () {
//   const contractHex = contract(
//     issuerPrivateKey,
//     contractUtxos,
//     null,
//     null,
//     schema,
//     supply
//   )
//   const contractTxid = await broadcast(contractHex)
//   const amount = await utils.getVoutAmount(contractTxid, 0)
//   expect(amount).to.equal(supply / 100000000)
// })

// it('Contract - Successful No Fees Empty Array', async function () {
//   const contractHex = contract(
//     issuerPrivateKey,
//     contractUtxos,
//     [],
//     fundingPrivateKey,
//     schema,
//     supply
//   )
//   const contractTxid = await broadcast(contractHex)
//   const amount = await utils.getVoutAmount(contractTxid, 0)
//   expect(amount).to.equal(supply / 100000000)
// })

it('Contract - Wrong Funding Private Key Throws Error', async function () {

  incorrectPrivateKey = bsv.PrivateKey()
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
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.response.data).to.contain('mandatory-script-verify-flag-failed')
  }
})

it('Contract - Wrong Contract Private Key Throws Error', async function () {

  incorrectPrivateKey = bsv.PrivateKey()
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
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.response.data).to.contain('mandatory-script-verify-flag-failed')
  }
})

// it('Contract - Duplicate UTXOS Throws Error', async function () {
//   const contractHex = contract(
//     issuerPrivateKey,
//     fundingUtxos,
//     fundingUtxos,
//     fundingPrivateKey,
//     schema,
//     supply
//   )

//   try {
//     await broadcast(contractHex)
//     assert(false)
//     return
//   } catch (e) {
//     expect(e).to.be.instanceOf(Error)
//     expect(e.response.data).to.contain('bad-txns-inputs-duplicate')
//   }
// })

// it('Contract - Null Issuer Private Key Throws Error', async function () {
//   try {
//     contract(
//       null,
//       contractUtxos,
//       fundingUtxos,
//       fundingPrivateKey,
//       schema,
//       supply
//     )
//     assert(false)
//     return
//   } catch (e) {
//     expect(e).to.be.instanceOf(Error)
//     expect(e.message).to.eql('Issuer private key is null')
//   }
// })

// it('Contract - Null Contract UTXO Throws Error', async function () {
//   try {
//     contract(
//       issuerPrivateKey,
//       null,
//       fundingUtxos,
//       fundingPrivateKey,
//       schema,
//       supply
//     )
//     assert(false)
//     return
//   } catch (e) {
//     expect(e).to.be.instanceOf(Error)
//     expect(e.message).to.eql('inputUtxos is invalid')
//   }
// })

// it('Contract - Non Array Contract UTXO Throws Error', async function () {
//   try {
//     contract(
//       issuerPrivateKey,
//       {
//         txid: '562c4afa4c14a1f01f960f9d79d1e90d0ffa4eac6e9d42c272454e93b8fad8e6',
//         vout: 0,
//         scriptPubKey: '76a914ddfa3b4a86af8e0dce6644db696114b585675eff88ac',
//         amount: 0.01
//       },
//       fundingUtxos,
//       fundingPrivateKey,
//       schema,
//       supply
//     )
//     assert(false)
//     return
//   } catch (e) {
//     expect(e).to.be.instanceOf(Error)
//     expect(e.message).to.eql('inputUtxos is invalid')
//   }
// })

// it('Contract - Null Funding Private Key With Funding UTXO Throws Error', async function () {
//   try {
//     contract(
//       issuerPrivateKey,
//       contractUtxos,
//       fundingUtxos,
//       null,
//       schema,
//       supply
//     )
//     assert(false)
//     return
//   } catch (e) {
//     expect(e).to.be.instanceOf(Error)
//     expect(e.message).to.eql('Payment UTXOs provided but payment private key is null')
//   }
// })

// it('Contract - Null Schema Throws Error', async function () {
//   try {
//     contract(
//       issuerPrivateKey,
//       contractUtxos,
//       fundingUtxos,
//       fundingUtxos,
//       null,
//       supply
//     )
//     assert(false)
//     return
//   } catch (e) {
//     expect(e).to.be.instanceOf(Error)
//     expect(e.message).to.eql('Schema is null')
//   }
// })

// it('Contract - Null Supply Throws Error', async function () {
//   try {
//     contract(
//       issuerPrivateKey,
//       contractUtxos,
//       fundingUtxos,
//       fundingUtxos,
//       schema,
//       null
//     )
//     assert(false)
//     return
//   } catch (e) {
//     expect(e).to.be.instanceOf(Error)
//     expect(e.message).to.eql('Invalid Argument: Output satoshis is not a natural number')
//   }
// })

// it('Contract - Negative Supply Throws Error', async function () {
//   try {
//     contract(
//       issuerPrivateKey,
//       contractUtxos,
//       fundingUtxos,
//       fundingPrivateKey,
//       schema,
//       -100
//     )
//     assert(false)
//     return
//   } catch (e) {
//     expect(e).to.be.instanceOf(Error)
//     expect(e.message).to.eql('Invalid Argument: Output satoshis is not a natural number')
//   }
// })

// it('Contract - Zero Supply Throws Error', async function () {
//   try {
//     contract(
//       issuerPrivateKey,
//       contractUtxos,
//       fundingUtxos,
//       fundingPrivateKey,
//       schema,
//       0
//     )
//     assert(false)
//     return
//   } catch (e) {
//     expect(e).to.be.instanceOf(Error)
//     expect(e.message).to.eql('Token satoshis is zero')
//   }
// })

// it('Contract - Invalid Contract UTXO Throw Error', async function () {
//   try {
//     contract(
//       issuerPrivateKey,
//       [
//         {
//           txid: '71ea4669224ce874ce79f71d609a48ce1cc7a32fcd22afee52b09a326ad22eff',
//           vout: 0,
//           amount: 0.01
//         }
//       ],
//       fundingUtxos,
//       fundingPrivateKey,
//       schema,
//       supply
//     )
//     assert(false)
//     return
//   } catch (e) {
//     expect(e).to.be.instanceOf(Error)
//     expect(e.message).to.eql('Invalid Argument: Must provide the scriptPubKey for that output!')
//   }
// })

// it('Contract - Invalid Payment UTXO Throw Error', async function () {
//   try {
//     contract(
//       issuerPrivateKey,
//       contractUtxos,
//       [
//         {
//           vout: 0,
//           scriptPubKey: '76a914173a320ffd763627107b3274f7eb571df8114b9288ac',
//           amount: 0.01
//         }
//       ],
//       fundingPrivateKey,
//       schema,
//       supply
//     )
//     assert(false)
//     return
//   } catch (e) {
//     expect(e).to.be.instanceOf(Error)
//     expect(e.message).to.eql('Invalid TXID in object')
//   }
// })

// it('Contract - Empty Array Contract UTXO Throw Error', async function () {
//   try {
//     contract(
//       issuerPrivateKey,
//       [],
//       fundingUtxos,
//       fundingPrivateKey,
//       schema,
//       supply
//     )
//     assert(false)
//     return
//   } catch (e) {
//     expect(e).to.be.instanceOf(Error)
//     expect(e.message).to.eql('inputUtxos is invalid')
//   }
// })

// it('Contract - Invalid Char Symbol Throws Error 1 ', async function () {
//   invalidCharsSymbol = '!invalid..;'
//   invalidSchema = utils.schema(publicKeyHash, invalidCharsSymbol, supply)
//   try {
//     contract(
//       issuerPrivateKey,
//       contractUtxos,
//       fundingUtxos,
//       fundingPrivateKey,
//       invalidSchema,
//       supply
//     )
//     assert(false)
//     return
//   } catch (e) {
//     expect(e).to.be.instanceOf(Error)
//     expect(e.message).to.eql('Invalid Symbol. Must be between 1 and 128 long and contain alpahnumeric, \'-\', \'_\' chars.')
//   }
// })

// it('Contract - Invalid Char Symbol Throws Error 2', async function () {
//   const invalidCharsSymbol = '&@invalid\"\'+='
//   const invalidSchema = utils.schema(publicKeyHash, invalidCharsSymbol, supply)
//   try {
//     contract(
//       issuerPrivateKey,
//       contractUtxos,
//       fundingUtxos,
//       fundingPrivateKey,
//       invalidSchema,
//       supply
//     )
//     assert(false)
//     return
//   } catch (e) {
//     expect(e).to.be.instanceOf(Error)
//     expect(e.message).to.eql('Invalid Symbol. Must be between 1 and 128 long and contain alpahnumeric, \'-\', \'_\' chars.')
//   }
// })

// it('Contract - Symbol Greater than 128 Bytes Throws Error', async function () {
//   invalidSymbol = 'CallmeIshmaelSomeyearsagosdnevermindhowlongpreciselyhavinglittleornomoneyinmypurseandnothingparticulartointerestmeotoadasdfasfgg1'
//   invalidSchema = utils.schema(publicKeyHash, invalidSymbol, supply)
//   try {
//     contract(
//       issuerPrivateKey,
//       contractUtxos,
//       fundingUtxos,
//       fundingPrivateKey,
//       invalidSchema,
//       supply
//     )
//     assert(false)
//     return
//   } catch (e) {
//     expect(e).to.be.instanceOf(Error)
//     expect(e.message).to.eql('Invalid Symbol. Must be between 1 and 128 long and contain alpahnumeric, \'-\', \'_\' chars.')
//   }
// })

// it('Contract - Null Symbol In Schema Throws Error', async function () {
//   try {
//     contract(
//       issuerPrivateKey,
//       contractUtxos,
//       fundingUtxos,
//       fundingPrivateKey,
//       schemaNullSymbol,
//       supply
//     )
//     assert(false)
//     return
//   } catch (e) {
//     expect(e).to.be.instanceOf(Error)
//     expect(e.message).to.eql('Invalid Symbol. Must be between 1 and 128 long and contain alpahnumeric, \'-\', \'_\' chars.')
//   }
// })

// it('Contract - Empty Symbol In Schema Throws Error', async function () {
//   try {
//     contract(
//       issuerPrivateKey,
//       contractUtxos,
//       fundingUtxos,
//       fundingPrivateKey,
//       '',
//       supply
//     )
//     assert(false)
//     return
//   } catch (e) {
//     expect(e).to.be.instanceOf(Error)
//     expect(e.message).to.eql('Invalid Symbol. Must be between 1 and 128 long and contain alpahnumeric, \'-\', \'_\' chars.')
//   }
// })

async function setup () {
  issuerPrivateKey = bsv.PrivateKey()
  fundingPrivateKey = bsv.PrivateKey()
  contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  schema = utils.schema(publicKeyHash, symbol, supply)
}

function schemaNullSymbol () {
  return {
    name: 'Taal Token',
    tokenId: `${publicKeyHash}`,
    protocolId: 'To be decided',
    symbol: null,
    description: 'Example token on private Taalnet',
    image: 'https://www.taal.com/wp-content/themes/taal_v2/img/favicon/favicon-96x96.png',
    totalSupply: supply,
    decimals: 0,
    satsPerToken: 1,
    properties: {
      legal: {
        terms: '© 2020 TAAL TECHNOLOGIES SEZC\nALL RIGHTS RESERVED. ANY USE OF THIS SOFTWARE IS SUBJECT TO TERMS AND CONDITIONS OF LICENSE. USE OF THIS SOFTWARE WITHOUT LICENSE CONSTITUTES INFRINGEMENT OF INTELLECTUAL PROPERTY. FOR LICENSE DETAILS OF THE SOFTWARE, PLEASE REFER TO: www.taal.com/stas-token-license-agreement',
        licenceId: '1234'
      },
      issuer: {
        organisation: 'Taal Technologies SEZC',
        legalForm: 'Limited Liability Public Company',
        governingLaw: 'CA',
        mailingAddress: '1 Volcano Stret, Canada',
        issuerCountry: 'CYM',
        jurisdiction: '',
        email: 'info@taal.com'
      },
      meta: {
        schemaId: 'token1',
        website: 'https://taal.com',
        legal: {
          terms: 'blah blah'
        },
        media: {
          type: 'mp4'
        }
      }
    }
  }
}
