const expect = require('chai').expect
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
    broadcast,

} = require('../index').utils

const symbol = 'CallmeIshmaelSomeyearsagosdnevermindhowlongpreciselyhavinglittleornomoneyinmypurseandnothingparticulartointerestmeoto'
const wait = 1000

it('Symbol < 128 Data Size < 128 Bytes', async function () {
    const issuerPrivateKey = bsv.PrivateKey()
    const fundingPrivateKey = bsv.PrivateKey()

    const alicePrivateKey = bsv.PrivateKey()
    const aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()
    const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
    const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())

    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
    const supply = 10000
    const schema = utils.schema(publicKeyHash, symbol, supply)

    console.log('Symbol  ' + symbol)

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

    let data = 'It was the best of times, it was the worst of times, it was the age of wisdom. It was the best of times, it was the'
    console.log("Data Size " + byteCount(data))
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


it('Symbol < 128Data Size > 128 Bytes', async function () {
    const issuerPrivateKey = bsv.PrivateKey()
    const fundingPrivateKey = bsv.PrivateKey()

    const alicePrivateKey = bsv.PrivateKey()
    const aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()

    const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
    const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())

    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
    const supply = 10000
    const schema = utils.schema(publicKeyHash, symbol, supply)


    console.log('Symbol  ' + symbol)

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

    let data = 'It was the best of times, it was the worst of times, it was the age of wisdom. It was the best of times, it was the worst of'
    console.log("Data Size " + byteCount(data))
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


it('Symbol < 128 Data Size > 32768 Bytes', async function () {
    const issuerPrivateKey = bsv.PrivateKey()
    const fundingPrivateKey = bsv.PrivateKey()

    const alicePrivateKey = bsv.PrivateKey()
    const aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()

    const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
    const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())

    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
    const supply = 10000
    const schema = utils.schema(publicKeyHash, symbol, supply)

    console.log('Symbol  ' + symbol)

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

    console.log("Data Size " + byteCount(addData(33)))
    const issueInfo = [
        {
            addr: aliceAddr,
            satoshis: 10000,
            data: addData(33)
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

it('Symbol < 128 Data Size < 32768 Bytes', async function () {
    const issuerPrivateKey = bsv.PrivateKey()
    const fundingPrivateKey = bsv.PrivateKey()

    const alicePrivateKey = bsv.PrivateKey()
    const aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()

    const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
    const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())

    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
    const supply = 10000
    const schema = utils.schema(publicKeyHash, symbol, supply)

    console.log('Symbol  ' + symbol)

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

    console.log("Data Size " + byteCount(addData(32)))

    const issueInfo = [
        {
            addr: aliceAddr,
            satoshis: 10000,
            data: addData(32)
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


it('Symbol < 128 Data Size Large', async function () {
    const issuerPrivateKey = bsv.PrivateKey()
    const fundingPrivateKey = bsv.PrivateKey()

    const alicePrivateKey = bsv.PrivateKey()
    const aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()

    const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
    const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())

    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
    const supply = 10000
    const schema = utils.schema(publicKeyHash, symbol, supply)

    console.log('Symbol  ' + symbol)

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

    console.log("Data Size " + byteCount(addData(1000)))

    const issueInfo = [
        {
            addr: aliceAddr,
            satoshis: 10000,
            data: addData(1000)
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


function addData(sizeInKB) {

    let data
    for (let i = 0; i < sizeInKB; i++) {

        data += 'It was the best of times, it was the worst of times, it was the age of wisdom. It was the best of times, it was the worst of, It was the best of times, it was the worst of times, it was the age of wisdom. It was the best of times, it was the worst of, It was the best of times, it was the worst of times, it was the age of wisdom. It was the best of times, it was the worst of, It was the best of times, it was the worst of times, it was the age of wisdom. It was the best of times, it was the worst of, It was the best of times, it was the worst of times, it was the age of wisdom. It was the best of times, it was the worst of, It was the best of times, it was the worst of times, it was the age of wisdom. It was the best of times, it was the worst of, It was the best of times, it was the worst of times, it was the age of wisdom. It was the best of times, it was the worst of, It was the best of times, it was the worst of times, it was the age of wisdom. It was the best of times, it was the and'
    }
    return data
}


function byteCount(s) {
    return encodeURI(s).split(/%..|./).length - 1;
}