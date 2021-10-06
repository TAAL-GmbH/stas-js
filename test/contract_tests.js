const expect = require("chai").expect
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

var issuerPrivateKey
var fundingPrivateKey
var contractUtxos
var fundingUtxos
var publicKeyHash
var supply
var symbol
var schema

beforeEach(async function () {

    await setup()
});

it("Successful Contract Broadcast", async function () {

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


it("Duplicate Private Keys Throws Error", async function () {

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

it("Duplicate UTXOS Throws Error", async function () {

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

it("Null Issuer Public Key Throws Error", async function () {

    try {
        const contractHex = contract(
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


it("Null Contract UTXO Throws Error", async function () {

    try {
        const contractHex = contract(
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
        expect(e.message).to.eql('Cannot read property of null')
    }
})


it("Null Payment UTXO Successful Broadcast(no fees)", async function () {

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

it("Null Funding Private Key Throws Error", async function () {

    try {
        const contractHex = contract(
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

//needs fixed
it("Null Schema Throws Error", async function () {

    try {
        const contractHex = contract(
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
        expect(e.message).to.eql('Cannot read property of null')
    }
})


it("Null Supply Throws Error", async function () {

    try {
        const contractHex = contract(
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


it("Negative Supply Throws Error", async function () {

    try {
        const contractHex = contract(
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

//needs fixed
it("Zero Supply Throws Error", async function () {

    try {
        const contractHex = contract(
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
        expect(e.message).to.eql('Invalid Argument: Output satoshis is not a natural number')
    }
})


it("Invalid Contract UTXO Throw Error", async function () {

    try {
        const contractHex = contract(
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

it("Invalid Payment UTXO Throw Error", async function () {

    try {
        const contractHex = contract(
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

//needs fixed
it("Empty Array Contract UTXO Throw Error", async function () {

    try {
        const contractHex = contract(
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
        expect(e.message).to.eql('Some Error')
    }
})


//needs fixed
it("Empty Array Payment UTXO Throw Error", async function () {

    try {
        const contractHex = contract(
            issuerPrivateKey,
            contractUtxos,
            [],
            fundingPrivateKey,
            schema,
            supply
        )
        assert(false)
    } catch (e) {
        expect(e).to.be.instanceOf(Error)
        expect(e.message).to.eql('Some Error')
    }
})


async function setup() {

    issuerPrivateKey = bsv.PrivateKey()
    fundingPrivateKey = bsv.PrivateKey()
    contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress('testnet').toString())
    fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress('testnet').toString())
    publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
    supply = 10000
    symbol = 'TAALT'
    schema = utils.schema(publicKeyHash, symbol, supply)

}

