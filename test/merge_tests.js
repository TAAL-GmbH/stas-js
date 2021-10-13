const expect = require("chai").expect
const assert = require('chai').assert
const utils = require('./utils/test_utils')
const bsv = require('bsv')
const mergeUtil = require('./utils/mergeWithoutValidation')

const {
    contract,
    issue,
    transfer,
    split,
    merge
} = require('../index')

const {
    getTransaction,
    getFundsFromFaucet,
    broadcast
} = require('../index').utils

const issuerPrivateKey = bsv.PrivateKey()
const fundingPrivateKey = bsv.PrivateKey()
const bobPrivateKey = bsv.PrivateKey()
const alicePrivateKey = bsv.PrivateKey()
const bobAddr = bobPrivateKey.toAddress().toString()
const aliceAddr = alicePrivateKey.toAddress().toString()
let splitTxid
let splitTx
let splitTxObj

beforeEach(async function () {

    await setup()
  })

it("Successful Merge After Split into 2 Addresses With Fee", async function () {

    const mergeHex = merge(
        bobPrivateKey,
        issuerPrivateKey.publicKey,
        utils.getMergeUtxo(splitTxObj),
        aliceAddr,
        utils.getUtxo(splitTxid, splitTx, 2),
        fundingPrivateKey
    )
    const mergeTxid = await broadcast(mergeHex)
    expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00007)
    const tokenIdMerge = await utils.getToken(mergeTxid)
    let response = await utils.getTokenResponse(tokenIdMerge)
    expect(response.data.token.symbol).to.equal('TAALT')
    expect(response.data.token.contract_txs).to.contain(contractTxid)
    expect(response.data.token.issuance_txs).to.contain(issueTxid)
    expect(await utils.areFeesProcessed(mergeTxid, 1)).to.be.true
    
})

it("Successful Merge With No Fee", async function () {

    const mergeHex = merge(
        bobPrivateKey,
        issuerPrivateKey.publicKey,
        utils.getMergeUtxo(splitTxObj),
        aliceAddr,
        null,
        fundingPrivateKey
    )
    const mergeTxid = await broadcast(mergeHex)
    expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00007)
    const tokenIdMerge = await utils.getToken(mergeTxid)
    let response = await utils.getTokenResponse(tokenIdMerge)
    expect(response.data.token.symbol).to.equal('TAALT')
    expect(response.data.token.contract_txs).to.contain(contractTxid)
    expect(response.data.token.issuance_txs).to.contain(issueTxid)
    expect(await utils.areFeesProcessed(mergeTxid, 1)).to.be.false
})

//needs fixed
it("Successful Merge With No Fee Empty Array", async function () {

    const mergeHex = merge(
        bobPrivateKey,
        issuerPrivateKey.publicKey,
        utils.getMergeUtxo(splitTxObj),
        aliceAddr,
        [],
        fundingPrivateKey
    )

    const mergeTxid = await broadcast(mergeHex)
    expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00007)
    const tokenIdMerge = await utils.getToken(mergeTxid)
    let response = await utils.getTokenResponse(tokenIdMerge)
    expect(response.data.token.symbol).to.equal('TAALT')
    expect(response.data.token.contract_txs).to.contain(contractTxid)
    expect(response.data.token.issuance_txs).to.contain(issueTxid)
    expect(await utils.areFeesProcessed(mergeTxid, 1)).to.be.false
})


it("Incorrect Owner Private Key Throws Error", async function () {

    const incorrectPrivateKey = bsv.PrivateKey()

    const mergeHex = merge(
        incorrectPrivateKey,
        issuerPrivateKey.publicKey,
        utils.getMergeUtxo(splitTxObj),
        aliceAddr,
        utils.getUtxo(splitTxid, splitTx, 2),
        fundingPrivateKey
    )
    try {
        await broadcast(mergeHex)
        assert(false)
        return
    } catch (e) {
        expect(e).to.be.instanceOf(Error)
        expect(e.message).to.eql('Request failed with status code 400')
    }
})

it("Incorrect Funding Private Key Throws Error", async function () {

    const incorrectPrivateKey = bsv.PrivateKey()

    const mergeHex = merge(
        bobPrivateKey,
        issuerPrivateKey.publicKey,
        utils.getMergeUtxo(splitTxObj),
        aliceAddr,
        utils.getUtxo(splitTxid, splitTx, 2),
        incorrectPrivateKey
    )
    try {
        await broadcast(mergeHex)
        assert(false)
        return
    } catch (e) {
        expect(e).to.be.instanceOf(Error)
        expect(e.message).to.eql('Request failed with status code 400')
    }
})

it("Incorrect Contract Public Key Throws Error", async function () {

    const incorrectPrivateKey = bsv.PrivateKey()

    const mergeHex = merge(
        bobPrivateKey,
        incorrectPrivateKey.publicKey,
        utils.getMergeUtxo(splitTxObj),
        aliceAddr,
        utils.getUtxo(splitTxid, splitTx, 2),
        fundingPrivateKey
    )
    try {
        await broadcast(mergeHex)
        assert(false)
        return
    } catch (e) {
        expect(e).to.be.instanceOf(Error)
        expect(e.message).to.eql('Request failed with status code 400')
    }
})

it("Attempt to Merge More Than 2 Tokens", async function () {

    try {
        const mergeHex = merge(
            bobPrivateKey,
            issuerPrivateKey.publicKey,
            [{
                tx: splitTxObj,
                vout: 0
            },
            {
                tx: splitTxObj,
                vout: 1
            },
            {
                tx: splitTxObj,
                vout: 2
            }],
            aliceAddr,
            utils.getUtxo(splitTxid, splitTx, 2),
            fundingPrivateKey
        )
        assert(false)
        return
    } catch (e) {
        expect(e).to.be.instanceOf(Error)
        expect(e.message).to.eql('This function can only merge exactly 2 STAS tokens')
    }
})

it("Attempt to Merge More Than 2 Tokens Without SDK Validation", async function () {

   
        const mergeHex = mergeUtil.mergeWithoutValidation(
            bobPrivateKey,
            issuerPrivateKey.publicKey,
            [{
                tx: splitTxObj,
                vout: 0
            },
            {
                tx: splitTxObj,
                vout: 1
            },
            {
                tx: splitTxObj,
                vout: 2
            }],
            aliceAddr,
            utils.getUtxo(splitTxid, splitTx, 2),
            fundingPrivateKey
        )
        try {
        await broadcast(mergeHex)
        assert(false)
        return
    } catch (e) {
        expect(e).to.be.instanceOf(Error)
        expect(e.message).to.eql('Request failed with status code 400')
    }
})

it("Attempt to Merge Less Than Two  Tokens", async function () {

    try {
        const mergeHex = merge(
            bobPrivateKey,
            issuerPrivateKey.publicKey,
            [{
                tx: splitTxObj,
                vout: 0
            }],
            aliceAddr,
            utils.getUtxo(splitTxid, splitTx, 2),
            fundingPrivateKey
        )
        assert(false)
        return
    } catch (e) {
        expect(e).to.be.instanceOf(Error)
        expect(e.message).to.eql('This function can only merge exactly 2 STAS tokens')
    }
})


async function setup() {

    const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress('testnet').toString())
    const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress('testnet').toString())
    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
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
    contractTxid = await broadcast(contractHex)
    contractTx = await getTransaction(contractTxid)

    const issueHex = issue(
        issuerPrivateKey,
        utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        2
    )
    issueTxid = await broadcast(issueHex)
    issueTx = await getTransaction(issueTxid)

    const issueOutFundingVout = issueTx.vout.length - 1

    const bobAmount1 = issueTx.vout[0].value / 2
    const bobAmount2 = issueTx.vout[0].value - bobAmount1
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }

    const splitHex = split(
        alicePrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(issueTxid, issueTx, 0),
        splitDestinations,
        utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
        fundingPrivateKey
    )
    splitTxid = await broadcast(splitHex)
    splitTx = await getTransaction(splitTxid)
    splitTxObj = new bsv.Transaction(splitHex)
}