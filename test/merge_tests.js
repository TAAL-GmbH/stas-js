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



it("Successful Merge After Split into 2 Addresses", async function () {

    await setupWithSplit() //contract, issue then split

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
        }],
        aliceAddr,
        {
            txid: splitTxid,
            vout: 2,
            scriptPubKey: splitTx.vout[2].scriptPubKey.hex,
            amount: splitTx.vout[2].value
        },
        fundingPrivateKey
    )

    const mergeTxid = await broadcast(mergeHex)
})

it("Successful Merge With No Fee", async function () {

    await setupWithSplit() //contract, issue then split

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
        }],
        aliceAddr,
        null,
        fundingPrivateKey
    )

    const mergeTxid = await broadcast(mergeHex)
})

//needs fixed
it("Successful Merge With No Fee Empty Array", async function () {

    await setupWithSplit() //contract, issue then split

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
        }],
        aliceAddr,
        [],
        fundingPrivateKey
    )

    const mergeTxid = await broadcast(mergeHex)
})



it("Incorrect Owner Private Key Throws Error", async function () {

    const incorrectPrivateKey = bsv.PrivateKey()
    await setupWithSplit() //contract, issue then split

    const mergeHex = merge(
        incorrectPrivateKey,
        issuerPrivateKey.publicKey,
        [{
            tx: splitTxObj,
            vout: 0
        },
        {
            tx: splitTxObj,
            vout: 1
        }],
        aliceAddr,
        {
            txid: splitTxid,
            vout: 2,
            scriptPubKey: splitTx.vout[2].scriptPubKey.hex,
            amount: splitTx.vout[2].value
        },
        fundingPrivateKey
    )
    try {
        await broadcast(mergeHex)
        assert(false)
    } catch (e) {
        expect(e).to.be.instanceOf(Error)
        expect(e.message).to.eql('Request failed with status code 400')
    }
})

it("Incorrect Funding Private Key Throws Error", async function () {

    const incorrectPrivateKey = bsv.PrivateKey()
    await setupWithSplit() //contract, issue then split

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
        }],
        aliceAddr,
        {
            txid: splitTxid,
            vout: 2,
            scriptPubKey: splitTx.vout[2].scriptPubKey.hex,
            amount: splitTx.vout[2].value
        },
        incorrectPrivateKey
    )
    try {
        await broadcast(mergeHex)
        assert(false)
    } catch (e) {
        expect(e).to.be.instanceOf(Error)
        expect(e.message).to.eql('Request failed with status code 400')
    }
})

it("Incorrect Contract Public Key Throws Error", async function () {

    const incorrectPrivateKey = bsv.PrivateKey()
    await setupWithSplit() //contract, issue then split

    const mergeHex = merge(
        bobPrivateKey,
        incorrectPrivateKey.publicKey,
        [{
            tx: splitTxObj,
            vout: 0
        },
        {
            tx: splitTxObj,
            vout: 1
        }],
        aliceAddr,
        {
            txid: splitTxid,
            vout: 2,
            scriptPubKey: splitTx.vout[2].scriptPubKey.hex,
            amount: splitTx.vout[2].value
        },
        fundingPrivateKey
    )
    try {
        await broadcast(mergeHex)
        assert(false)
    } catch (e) {
        expect(e).to.be.instanceOf(Error)
        expect(e.message).to.eql('Request failed with status code 400')
    }
})

it("Attempt to Merge More Than 2 Tokens", async function () {

    await setupWithSplit() //contract, issue then split
    
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
        {
            txid: splitTxid,
            vout: 2,
            scriptPubKey: splitTx.vout[2].scriptPubKey.hex,
            amount: splitTx.vout[2].value
        },
        fundingPrivateKey
    )
        assert(false)
    } catch (e) {
        expect(e).to.be.instanceOf(Error)
        expect(e.message).to.eql('This function can only merge exactly 2 STAS tokens')
    }
})

it("Attempt to Merge Less Than Two  Tokens", async function () {

    await setupWithSplit() //contract, issue then split
    
    try {
    const mergeHex = merge(
        bobPrivateKey,
        issuerPrivateKey.publicKey,
        [{
            tx: splitTxObj,
            vout: 0
        }],
        aliceAddr,
        {
            txid: splitTxid,
            vout: 2,
            scriptPubKey: splitTx.vout[2].scriptPubKey.hex,
            amount: splitTx.vout[2].value
        },
        fundingPrivateKey
    )
        assert(false)
    } catch (e) {
        expect(e).to.be.instanceOf(Error)
        expect(e.message).to.eql('This function can only merge exactly 2 STAS tokens')
    }
})

//refactor
async function setupWithOutSplit() {

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
        getIssueInfo(),
        getContractUtxo(),
        getPaymentUtxo(),
        fundingPrivateKey,
        true,
        2
    )
    issueTxid = await broadcast(issueHex)
    issueTx = await getTransaction(issueTxid)

    const issueOutFundingVout = issueTx.vout.length - 1

    const transferHex = transfer(
        bobPrivateKey,
        issuerPrivateKey.publicKey,
        {
            txid: issueTxid,
            vout: 1,
            scriptPubKey: issueTx.vout[1].scriptPubKey.hex,
            amount: issueTx.vout[1].value
        },
        aliceAddr,
        {
            txid: issueTxid,
            vout: issueOutFundingVout,
            scriptPubKey: issueTx.vout[issueOutFundingVout].scriptPubKey.hex,
            amount: issueTx.vout[issueOutFundingVout].value
        },
        fundingPrivateKey
    )
    const transferTxid = await broadcast(transferHex)
    const transferTx = await getTransaction(transferTxid)
}




async function setupWithSplit() {

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
        getIssueInfo(),
        getContractUtxo(),
        getPaymentUtxo(),
        fundingPrivateKey,
        true,
        2
    )
    issueTxid = await broadcast(issueHex)
    issueTx = await getTransaction(issueTxid)

    const issueOutFundingVout = issueTx.vout.length - 1

    const transferHex = transfer(
        bobPrivateKey,
        issuerPrivateKey.publicKey,
        {
            txid: issueTxid,
            vout: 1,
            scriptPubKey: issueTx.vout[1].scriptPubKey.hex,
            amount: issueTx.vout[1].value
        },
        aliceAddr,
        {
            txid: issueTxid,
            vout: issueOutFundingVout,
            scriptPubKey: issueTx.vout[issueOutFundingVout].scriptPubKey.hex,
            amount: issueTx.vout[issueOutFundingVout].value
        },
        fundingPrivateKey
    )
    const transferTxid = await broadcast(transferHex)
    const transferTx = await getTransaction(transferTxid)

    const bobAmount1 = transferTx.vout[0].value / 2
    const bobAmount2 = transferTx.vout[0].value - bobAmount1
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }

    const splitHex = split(
        alicePrivateKey,
        issuerPrivateKey.publicKey,
        {
            txid: transferTxid,
            vout: 0,
            scriptPubKey: transferTx.vout[0].scriptPubKey.hex,
            amount: transferTx.vout[0].value
        },
        splitDestinations,
        {
            txid: transferTxid,
            vout: 1,
            scriptPubKey: transferTx.vout[1].scriptPubKey.hex,
            amount: transferTx.vout[1].value
        },
        fundingPrivateKey
    )
    splitTxid = await broadcast(splitHex)
    console.log(`Split TX:        ${splitTxid}`)
    splitTx = await getTransaction(splitTxid)
    splitTxObj = new bsv.Transaction(splitHex)
}



async function getToken(txid) {

    const url = 'https://taalnet.whatsonchain.com/v1/bsv/taalnet/tx/hash/' + txid
    const response = await axios({
        method: 'get',
        url,
        auth: {
            username: 'taal_private',
            password: 'dotheT@@l007'
        }
    })

    const temp = response.data.vout[0].scriptPubKey.asm
    const split = temp.split('OP_RETURN')[1]
    const tokenId = split.split(' ')[1]
    return tokenId
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


function getContractUtxo() {

    return {
        txid: contractTxid,
        vout: 0,
        scriptPubKey: contractTx.vout[0].scriptPubKey.hex,
        amount: contractTx.vout[0].value
    }
}

function getPaymentUtxo() {

    return {
        txid: contractTxid,
        vout: 1,
        scriptPubKey: contractTx.vout[1].scriptPubKey.hex,
        amount: contractTx.vout[1].value
    }
}


function getIssueInfo() {

    return [
        {
            addr: aliceAddr,
            satoshis: 7000,
            data: 'one'
        },
        {
            addr: bobAddr,
            satoshis: 3000,
            data: 'two'
        }
    ]
}

function getStasUtxo() {

    return {
        txid: transferTxid,
        vout: 0,
        scriptPubKey: transferTx.vout[0].scriptPubKey.hex,
        amount: transferTx.vout[0].value
    }
}

function getPaymentUtxoOut() {

    return {
        txid: transferTxid,
        vout: 1,
        scriptPubKey: transferTx.vout[1].scriptPubKey.hex,
        amount: transferTx.vout[1].value
    }
}