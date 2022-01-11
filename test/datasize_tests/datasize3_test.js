const expect = require('chai').expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
    contract,
    issue
} = require('../../index')

const {
    getTransaction,
    getFundsFromFaucet,
    broadcast,

} = require('../../index').utils

// Symbol size of 75 bytes
const symbol = 'CallmeIshmaelSomeyearsagosdnevermindhowlongpreciselyhavinglittleornomoneasd'
const wait = 1000 //wait may be required due to delay in issuance of token
let issuerPrivateKey
let fundingPrivateKey
let bobPrivateKey
let alicePrivateKey
let contractUtxos
let fundingUtxos
let publicKeyHash
let contractTxid

beforeEach(async () => {
     
    await setup()
})


    it('Symbol 75 Data Size Zero Bytes', async () => {

        let data = ''
        console.log("Data Size " + utils.byteCount(data))
        const issueInfo = [
            {
                addr: aliceAddr,
                satoshis: 10000,
                data: data
            }
        ]
        const issueHex = issue(
            issuerPrivateKey,
            issueInfo,
            utils.getUtxo(contractTxid, contractTx, 0),
            utils.getUtxo(contractTxid, contractTx, 1),
            fundingPrivateKey,
            true,
            symbol,
            2
        )
        const issueTxid = await broadcast(issueHex)
        const tokenId = await utils.getToken(issueTxid)
        console.log(`issueTxid:        ${issueTxid}`)
        console.log(`Token ID:        ${tokenId}`)
        await new Promise(r => setTimeout(r, wait));
        const response = await utils.getTokenWithSymbol(tokenId, symbol)
        expect(response.symbol).to.equal(symbol)
    })

    it('Symbol 75 Data Size 1 Byte', async () => {

        let data = 'A'
        console.log("Data Size " + utils.byteCount(data))
        const issueInfo = [
            {
                addr: aliceAddr,
                satoshis: 10000,
                data: data
            }
        ]
        const issueHex = issue(
            issuerPrivateKey,
            issueInfo,
            utils.getUtxo(contractTxid, contractTx, 0),
            utils.getUtxo(contractTxid, contractTx, 1),
            fundingPrivateKey,
            true,
            symbol,
            2
        )
        const issueTxid = await broadcast(issueHex)
        const tokenId = await utils.getToken(issueTxid)
        console.log(`issueTxid:        ${issueTxid}`)
        console.log(`Token ID:        ${tokenId}`)
        await new Promise(r => setTimeout(r, wait));
        const response = await utils.getTokenWithSymbol(tokenId, symbol)
        expect(response.symbol).to.equal(symbol)
    })

    it('Symbol 75 Data Size < 75 Bytes', async () => {

        let data = 'It was the best of times, it was the worst of times, it was the age of'
        console.log("Data Size " + utils.byteCount(data))
        const issueInfo = [
            {
                addr: aliceAddr,
                satoshis: 10000,
                data: data
            }
        ]
        const issueHex = issue(
            issuerPrivateKey,
            issueInfo,
            utils.getUtxo(contractTxid, contractTx, 0),
            utils.getUtxo(contractTxid, contractTx, 1),
            fundingPrivateKey,
            true,
            symbol,
            2
        )
        const issueTxid = await broadcast(issueHex)
        const tokenId = await utils.getToken(issueTxid)
        console.log(`issueTxid:        ${issueTxid}`)
        console.log(`Token ID:        ${tokenId}`)
        await new Promise(r => setTimeout(r, wait));
        const response = await utils.getTokenWithSymbol(tokenId, symbol)
        expect(response.symbol).to.equal(symbol)
    })


    it('Symbol 75 Data Size < 128 Bytes', async () => {

        let data = 'It was the best of times, it was the worst of times, it was the age of wisdom. It was the best of times, it was the'
        console.log("Data Size " + utils.byteCount(data))
        const issueInfo = [
            {
                addr: aliceAddr,
                satoshis: 10000,
                data: data
            }
        ]
        const issueHex = issue(
            issuerPrivateKey,
            issueInfo,
            utils.getUtxo(contractTxid, contractTx, 0),
            utils.getUtxo(contractTxid, contractTx, 1),
            fundingPrivateKey,
            true,
            symbol,
            2
        )
        const issueTxid = await broadcast(issueHex)
        const tokenId = await utils.getToken(issueTxid)
        console.log(`issueTxid:        ${issueTxid}`)
        console.log(`Token ID:        ${tokenId}`)
        await new Promise(r => setTimeout(r, wait));
        const response = await utils.getTokenWithSymbol(tokenId, symbol)
        expect(response.symbol).to.equal(symbol)
    })


    it('Symbol 75 Data Size > 128 Bytes', async () => {

        let data = 'It was the best of times, it was the worst of times, it was the age of wisdom. It was the best of times, it was the worst of'
        console.log("Data Size " + utils.byteCount(data))
        const issueInfo = [
            {
                addr: aliceAddr,
                satoshis: 10000,
                data: data
            }
        ]
        const issueHex = issue(
            issuerPrivateKey,
            issueInfo,
            utils.getUtxo(contractTxid, contractTx, 0),
            utils.getUtxo(contractTxid, contractTx, 1),
            fundingPrivateKey,
            true,
            symbol,
            2
        )
        const issueTxid = await broadcast(issueHex)
        const tokenId = await utils.getToken(issueTxid)
        console.log(`issueTxid:        ${issueTxid}`)
        console.log(`Token ID:        ${tokenId}`)
        await new Promise(r => setTimeout(r, wait));
        const response = await utils.getTokenWithSymbol(tokenId, symbol)
        expect(response.symbol).to.equal(symbol)
    })


    it('Symbol 75 Data Size > 32768 Bytes', async () => {

        console.log("Data Size " + utils.byteCount(utils.addData(33)))
        const issueInfo = [
            {
                addr: aliceAddr,
                satoshis: 10000,
                data: utils.addData(33)
            }
        ]
        const issueHex = issue(
            issuerPrivateKey,
            issueInfo,
            utils.getUtxo(contractTxid, contractTx, 0),
            utils.getUtxo(contractTxid, contractTx, 1),
            fundingPrivateKey,
            true,
            symbol,
            2
        )
        const issueTxid = await broadcast(issueHex)
        const tokenId = await utils.getToken(issueTxid)
        console.log(`issueTxid:        ${issueTxid}`)
        console.log(`Token ID:        ${tokenId}`)
        await new Promise(r => setTimeout(r, wait));
        const response = await utils.getTokenWithSymbol(tokenId, symbol)
        expect(response.symbol).to.equal(symbol)
    })

    it('Symbol 75 Data Size < 32768 Bytes', async () => {

        console.log("Data Size " + utils.byteCount(utils.addData(32)))

        const issueInfo = [
            {
                addr: aliceAddr,
                satoshis: 10000,
                data: utils.addData(32)
            }
        ]
        const issueHex = issue(
            issuerPrivateKey,
            issueInfo,
            utils.getUtxo(contractTxid, contractTx, 0),
            utils.getUtxo(contractTxid, contractTx, 1),
            fundingPrivateKey,
            true,
            symbol,
            2
        )
        const issueTxid = await broadcast(issueHex)
        const tokenId = await utils.getToken(issueTxid)
        console.log(`issueTxid:        ${issueTxid}`)
        console.log(`Token ID:        ${tokenId}`)
        await new Promise(r => setTimeout(r, wait));
        const response = await utils.getTokenWithSymbol(tokenId, symbol)
        expect(response.symbol).to.equal(symbol)
    })


    it('Symbol 75 Data Size Large', async () => {

        console.log("Data Size " + utils.byteCount(utils.addData(1000)))

        const issueInfo = [
            {
                addr: aliceAddr,
                satoshis: 10000,
                data: utils.addData(1000)
            }
        ]
        const issueHex = issue(
            issuerPrivateKey,
            issueInfo,
            utils.getUtxo(contractTxid, contractTx, 0),
            utils.getUtxo(contractTxid, contractTx, 1),
            fundingPrivateKey,
            true,
            symbol,
            2
        )
        const issueTxid = await broadcast(issueHex)
        const tokenId = await utils.getToken(issueTxid)
        console.log(`issueTxid:        ${issueTxid}`)
        console.log(`Token ID:        ${tokenId}`)
        await new Promise(r => setTimeout(r, wait));
        const response = await utils.getTokenWithSymbol(tokenId, symbol)
        expect(response.symbol).to.equal(symbol)
    })
    
async function setup() {

    issuerPrivateKey = bsv.PrivateKey()
    fundingPrivateKey = bsv.PrivateKey()
    bobPrivateKey = bsv.PrivateKey()
    alicePrivateKey = bsv.PrivateKey()
    contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
    fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
    publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
    aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()
    bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()
    supply = 10000
    schema = utils.schema(publicKeyHash, symbol, supply)

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
}
