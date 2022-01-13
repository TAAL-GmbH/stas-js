const expect = require('chai').expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  merge
} = require('../../index')

const {
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../../index').utils

describe('regression, testnet', () => {
  it('Issue To Same Address Then Merge UTXOs', async () => {
    const issuerPrivateKey = bsv.PrivateKey()
    const fundingPrivateKey = bsv.PrivateKey()

    const alicePrivateKey = bsv.PrivateKey()
    const aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()

    const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
    const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())

    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
    const supply = 10000
    const symbol = 'TAALT'
    const schema = utils.schema(publicKeyHash, symbol, supply)

    // change goes back to the fundingPrivateKey
    const contractHex = contract(
      issuerPrivateKey,
      contractUtxos,
      fundingUtxos,
      fundingPrivateKey,
      schema,
      supply
    )
    const contractTxid = await broadcast(contractHex)
    console.log(`Contract TX:     ${contractTxid}`)
    const contractTx = await getTransaction(contractTxid)

    const issueHex = issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000, aliceAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol,
      2
    )
    const issueTxid = await broadcast(issueHex)
    const issueTx = await getTransaction(issueTxid)

    const issueTxObj = new bsv.Transaction(issueHex)

    const mergeHex = merge(
      alicePrivateKey,
      [{
        tx: issueTxObj,
        vout: 0
      },
      {
        tx: issueTxObj,
        vout: 1
      }],
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    )

    await broadcast(mergeHex)
  })
})
