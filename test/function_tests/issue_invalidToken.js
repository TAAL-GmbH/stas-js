const expect = require('chai').expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract
} = require('../../index')

const {
  getFundsFromFaucet
} = require('../../index').utils

const issuerPrivateKey = bsv.PrivateKey()
const fundingPrivateKey = bsv.PrivateKey()
const incorrectPrivateKey = bsv.PrivateKey()
const symbol = 'TAALT'
const supply = 10000

it('Attempt to issue invalid token', async () => {
  const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(incorrectPrivateKey.publicKey.toBuffer()).toString('hex')
  const schema = utils.schema(publicKeyHash, symbol, supply)

  try {
    await contract(
      issuerPrivateKey,
      contractUtxos,
      fundingUtxos,
      fundingPrivateKey,
      schema,
      supply
    )
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Schema has incorrect Token ID')
  }
})
