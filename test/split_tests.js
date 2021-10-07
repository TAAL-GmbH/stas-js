const expect = require("chai").expect
const assert = require('chai').assert
const utils = require('./test_utils')
const chai = require('chai')
const axios = require('axios')
const bsv = require('bsv')

const {
    contract,
    issue,
    transfer,
    split
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
let transferTxid
let transferTx

beforeEach(async function () {

    await setup() //contract and issue
});


it("Successful Split Into Two Tokens", async function () {

    const bobAmount1 = transferTx.vout[0].value / 2
    const bobAmount2 = transferTx.vout[0].value - bobAmount1
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }

    const splitHex = split(
        alicePrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(transferTxid, transferTx, 0),
        splitDestinations,
        utils.getUtxo(transferTxid, transferTx, 1),
        fundingPrivateKey
    )
    const splitTxid = await broadcast(splitHex)
    let noOfTokens = await countNumOfTokens(splitTxid, true)
    expect(splitDestinations).to.have.length(noOfTokens) //ensure that tx output contains 2 values

})


it("Successful Split Into Four Tokens", async function () {

    const bobAmount = transferTx.vout[0].value / 4
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount }
    splitDestinations[2] = { address: bobAddr, amount: bobAmount }
    splitDestinations[3] = { address: bobAddr, amount: bobAmount }

    const splitHex = split(
        alicePrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(transferTxid, transferTx, 0),
        splitDestinations,
        utils.getUtxo(transferTxid, transferTx, 1),
        fundingPrivateKey
    )
    const splitTxid = await broadcast(splitHex)
    let noOfTokens = await countNumOfTokens(splitTxid, true)
    expect(splitDestinations).to.have.length(noOfTokens) //ensure that tx output contains 4 values
})


it("Splitting Into Too Many Tokens Throws Error", async function () {

    const bobAmount = transferTx.vout[0].value / 5
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount }
    splitDestinations[2] = { address: bobAddr, amount: bobAmount }
    splitDestinations[3] = { address: bobAddr, amount: bobAmount }
    splitDestinations[4] = { address: bobAddr, amount: bobAmount }
    try {
        const splitHex = split(
            alicePrivateKey,
            issuerPrivateKey.publicKey,
            utils.getUtxo(transferTxid, transferTx, 0),
            splitDestinations,
            utils.getUtxo(transferTxid, transferTx, 1),
            fundingPrivateKey
        )
        assert(false)
    } catch (e) {
        expect(e).to.be.instanceOf(Error)
        expect(e.message).to.eql('Must have less than 5 segments')
    }
})



it("No Split Completes Successfully", async function () {

    const bobAmount = transferTx.vout[0].value
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount }

    const splitHex = split(
        alicePrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(transferTxid, transferTx, 0),
        splitDestinations,
        utils.getUtxo(transferTxid, transferTx, 1),
        fundingPrivateKey
    )
    const splitTxid = await broadcast(splitHex)
    let noOfTokens = await countNumOfTokens(splitTxid, true)
    expect(splitDestinations).to.have.length(noOfTokens) //ensure that tx output contains 1 
})


it("Add Too Little To Split Throws Error", async function () {

    const bobAmount = transferTx.vout[0].value / 2
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount }

    const splitHex = split(
        alicePrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(transferTxid, transferTx, 0),
        splitDestinations,
        utils.getUtxo(transferTxid, transferTx, 1),
        fundingPrivateKey
    )
    try {
        await broadcast(splitHex)
        assert(false)
    } catch (e) {
        expect(e).to.be.instanceOf(Error)
        expect(e.message).to.eql('Request failed with status code 400')
    }
})

it("Add Too Much To Split Throws Error", async function () {

    const bobAmount = transferTx.vout[0].value * 2
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount }

    const splitHex = split(
        alicePrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(transferTxid, transferTx, 0),
        splitDestinations,
        utils.getUtxo(transferTxid, transferTx, 1),
        fundingPrivateKey
    )
    try {
        await broadcast(splitHex)
        assert(false)
    } catch (e) {
        expect(e).to.be.instanceOf(Error)
        expect(e.message).to.eql('Request failed with status code 400')
    }
})


it("Incorrect Owner Private Key Throws Error", async function () {

    const bobAmount1 = transferTx.vout[0].value / 2
    const bobAmount2 = transferTx.vout[0].value - bobAmount1
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }
    const incorrectPrivateKey = bsv.PrivateKey()

    const splitHex = split(
        incorrectPrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(transferTxid, transferTx, 0),
        splitDestinations,
        utils.getUtxo(transferTxid, transferTx, 1),
        fundingPrivateKey
    )
    try {
        await broadcast(splitHex)
        assert(false)
    } catch (e) {
        expect(e).to.be.instanceOf(Error)
        expect(e.message).to.eql('Request failed with status code 400')
    }
})

it("Incorrect Payments Private Key Throws Error", async function () {

    const bobAmount1 = transferTx.vout[0].value / 2
    const bobAmount2 = transferTx.vout[0].value - bobAmount1
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }
    const incorrectPrivateKey = bsv.PrivateKey()

    const splitHex = split(
        issuerPrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(transferTxid, transferTx, 0),
        splitDestinations,
        utils.getUtxo(transferTxid, transferTx, 1),
        incorrectPrivateKey
    )
    try {
        await broadcast(splitHex)
        assert(false)
    } catch (e) {
        expect(e).to.be.instanceOf(Error)
        expect(e.message).to.eql('Request failed with status code 400')
    }
})

it("Incorrect Contract Public Key Throws Error", async function () {

    const bobAmount1 = transferTx.vout[0].value / 2
    const bobAmount2 = transferTx.vout[0].value - bobAmount1
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }
    const incorrectPrivateKey = bsv.PrivateKey()

    const splitHex = split(
        issuerPrivateKey,
        incorrectPrivateKey.publicKey,
        utils.getUtxo(transferTxid, transferTx, 0),
        splitDestinations,
        utils.getUtxo(transferTxid, transferTx, 1),
        fundingPrivateKey
    )
    try {
        await broadcast(splitHex)
        assert(false)
    } catch (e) {
        expect(e).to.be.instanceOf(Error)
        expect(e.message).to.eql('Request failed with status code 400')
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
    const contractTxid = await broadcast(contractHex)
    const contractTx = await getTransaction(contractTxid)

    const issueHex = issue(
        issuerPrivateKey,
        utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        2
    )
    const issueTxid = await broadcast(issueHex)
    const issueTx = await getTransaction(issueTxid)

    const issueOutFundingVout = issueTx.vout.length - 1

    const transferHex = transfer(
        bobPrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(issueTxid, issueTx, 1),
        aliceAddr,
        utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
        fundingPrivateKey
    )
    transferTxid = await broadcast(transferHex)
    console.log(`Transfer TX:     ${transferTxid}`)
    transferTx = await getTransaction(transferTxid)
}


async function countNumOfTokens(txid, isThereAFee) {

    const url = 'https://taalnet.whatsonchain.com/v1/bsv/taalnet/tx/hash/' + txid
    const response = await axios({
        method: 'get',
        url,
        auth: {
            username: 'taal_private',
            password: 'dotheT@@l007'
        }
    })

    let count = 0
    for (var i = 0; i < response.data.vout.length; i++) {
        if (response.data.vout[i].value != null) {
            count++
        }
    }
    if (isThereAFee == true) //output decreased by 1 if fees charged
        return count - 1
    else
        return count
}