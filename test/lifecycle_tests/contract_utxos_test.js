const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract

} = require('../../index')

const {
  getFundsFromFaucet,
  broadcast
} = require('../../index').utils

it('Multiple Contract UTXOs', async () => {
  const issuerPrivateKey = bsv.PrivateKey()
  const fundingPrivateKey = bsv.PrivateKey()
  const contractUtxos = []
  const contractUtxo = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  const contractUtxo2 = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  const contractUtxo3 = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  contractUtxos.push(contractUtxo, contractUtxo2, contractUtxo3)
  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  const supply = 10000
  const symbol = 'TAALT'
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
  console.log(`Contract TX:     ${contractTxid}`)
})

it('Multiple Funding UTXOs', async () => {
  const issuerPrivateKey = bsv.PrivateKey()
  const fundingPrivateKey = bsv.PrivateKey()

  const fundingUtxos = []
  const contractUtxo = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  const fundingUtxo = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  const fundingUtxo2 = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  const fundingUtxo3 = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  fundingUtxos.push(fundingUtxo, fundingUtxo2, fundingUtxo3)
  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  const supply = 10000
  const symbol = 'TAALT'
  const schema = utils.schema(publicKeyHash, symbol, supply)

  const contractHex = await contract(
    issuerPrivateKey,
    contractUtxo,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  )
  const contractTxid = await broadcast(contractHex)
  console.log(`Contract TX:     ${contractTxid}`)
})
