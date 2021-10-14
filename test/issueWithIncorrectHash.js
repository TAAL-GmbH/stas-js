const expect = require("chai").expect
const assert = require('chai').assert
const utils = require('./utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
    contract,
    issue
} = require('../index')

const {
    getTransaction,
    getFundsFromFaucet,
    broadcast
} = require('../index').utils



it("Attempt to Issue Token With Incorrect Public Key Hash Fails", async function () {

    const issuerPrivateKey = bsv.PrivateKey()
    const fundingPrivateKey = bsv.PrivateKey()
    const incorrectPrivateKey = bsv.PrivateKey()
    const alicePrivateKey = bsv.PrivateKey()
    const aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()
    const bobPrivateKey = bsv.PrivateKey()
    const bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()
    const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
    const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
    const incorrectPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(incorrectPrivateKey.publicKey.toBuffer()).toString('hex')
    const supply = 10000
    const symbol = 'TAALT'

    const schema = utils.schema(incorrectPublicKeyHash, symbol, supply)

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

    let issueHex
    try {
        issueHex = issue(
            issuerPrivateKey,
            utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
            utils.getUtxo(contractTxid, contractTx, 0),
            utils.getUtxo(contractTxid, contractTx, 1),
            fundingPrivateKey,
            true,
            2
        )
    } catch (e) {
        console.log('error issuing token', e)
        return
    }
    const issueTxid = await broadcast(issueHex)
    const tokenId = await utils.getToken(issueTxid)

    //Token Issuance Fails
    try {
        await utils.getTokenResponse(tokenId)
        assert(false)
        return
    } catch (e) {
        expect(e).to.be.instanceOf(Error)
        expect(e.message).to.eql('Request failed with status code 404')
    }
})
