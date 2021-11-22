const expect = require("chai").expect
const utils = require('./utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
    contract,
    issue,
    transfer,
    split,
    merge,
    mergeSplit,
    redeem
} = require('../index')

const {
    getTransaction,
    getFundsFromFaucet,
    broadcast,
    SATS_PER_BITCOIN
} = require('../index').utils


it("Full Life Cycle Test On Mainnet With 4 Issuance Addresses", async function () {

    // per-run modifiable values
    const contractUtxo = await getUtxoMainNet('', true)
    const feeUtxo = await getUtxoMainNet('', false)

    const inputUtxoid = contractUtxo[0] // the input utxo
    const inputUtxoIdVoutIndex = contractUtxo[1]
    const inputUtxoidFee = feeUtxo[0] // the fee utxo
    const inputUtxoIdFeeVoutIndex = feeUtxo[1]
    const symbol = 'test-' + randomSymbol(10) // Use a unique symbol every test run to ensure that token balances can be checked correctly

    console.log('token symbol:', symbol)

    const supply = 10000
    const bobsInitialSathoshis = 6000
    const aliceInitialSatoshis = supply - bobsInitialSathoshis

    const wait = 1000 // set wait before token balance check in case of delay

    const issuerWif = process.env.ISSUERWIF // the issuer of the contract and pays fees
    const bobWif = process.env.BOBWIF
    const aliceWif = process.env.ALICEWIF
    const davePrivateKey = bsv.PrivateKey()
    const emmaPrivateKey = bsv.PrivateKey()

    const issuerPrivateKey = bsv.PrivateKey.fromWIF(issuerWif)
    const bobsPrivateKey = bsv.PrivateKey.fromWIF(bobWif)
    const alicePrivateKey = bsv.PrivateKey.fromWIF(aliceWif)

    const bobAddr = bobsPrivateKey.toAddress('mainnet').toString()
    const aliceAddr = alicePrivateKey.toAddress('mainnet').toString()
    const daveAddr = davePrivateKey.toAddress('mainnet').toString()
    const emmaAddr = emmaPrivateKey.toAddress('mainnet').toString()
    console.log('Bob Address ' + bobAddr)
    console.log('Alice Address ' + aliceAddr)
    console.log('Dave Address ' + daveAddr)
    console.log('Emma Address ' + emmaAddr)

    const inputUtxo = await utils.getTransactionMainNet(inputUtxoid)
    const inputUtxoFee = await utils.getTransactionMainNet(inputUtxoidFee)

    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
    const supply = 10000
    const symbol = 'TAALT'
    const schema = utils.schema(publicKeyHash, symbol, supply)

    const contractHex = contract(
        issuerPrivateKey,
        [{
            txid: inputUtxoid,
            vout: inputUtxoIdVoutIndex,
            scriptPubKey: inputUtxo.vout[inputUtxoIdVoutIndex].scriptPubKey.hex,
            amount: inputUtxo.vout[inputUtxoIdVoutIndex].value
        }],
        [{
            txid: inputUtxoidFee,
            vout: inputUtxoIdFeeVoutIndex,
            scriptPubKey: inputUtxoFee.vout[inputUtxoIdFeeVoutIndex].scriptPubKey.hex,
            amount: inputUtxoFee.vout[inputUtxoIdFeeVoutIndex].value
        }],
        issuerPrivateKey,
        schema,
        supply
    )
    const contractTxid = await utils.broadcastMapi(contractHex)
    console.log(`Contract TX:     ${contractTxid}`)
    const contractTx = await utils.getTransactionMainNet(contractTxid)

    const issueInfo = [
        {
            addr: aliceAddr,
            satoshis: 5000,
            data: 'one'
        },
        {
            addr: bobAddr,
            satoshis: 3000,
            data: 'two'
        },
        {
            addr: daveAddr,
            satoshis: 2000,
            data: 'three'
        },
        {
            addr: emmaAddr,
            satoshis: 2000,
            data: 'four'
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
    //const issueTxid = await utils.broadcastToMainNet(issueHex)
    const issueTx = await utils.getTransactionMainNet(issueTxid)
    const tokenId = await utils.getTokenMainNet(issueTxid)
    console.log(`Token ID:        ${tokenId}`)
    const response = await utils.getTokenResponseMainNet(tokenId, symbol)
    expect(response.symbol).to.equal(symbol)
    console.log("token issued")
    console.log("Alice Balance " + await utils.getTokenBalanceMainNet(aliceAddr, symbol))
    console.log("Bob Balance " + await utils.getTokenBalanceMainNet(bobAddr, symbol))
    console.log("Dave Balance " + await utils.getTokenBalanceMainNet(daveAddr, symbol))
    console.log("Emma Balance " + await utils.getTokenBalanceMainNet(emmaAddr, symbol))
    expect(await utils.getTokenBalanceMainNet(aliceAddr)).to.equal(5000)
    expect(await utils.getTokenBalanceMainNet(bobAddr)).to.equal(3000)
    expect(await utils.getTokenBalanceMainNet(daveAddr)).to.equal(2000)
    expect(await utils.getTokenBalanceMainNet(emmaAddr)).to.equal(2000)

    const issueOutFundingVout = issueTx.vout.length - 1

    const transferHex = transfer(
        bobPrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(issueTxid, issueTx, 1),
        aliceAddr,
        utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
        fundingPrivateKey
    )
    //const transferTxid = await utils.broadcastToMainNet(transferHex)
    console.log(`Transfer TX:     ${transferTxid}`)
    const transferTx = await utils.getTransactionMainNet(transferTxid)
    console.log("Alice Balance " + await utils.getTokenBalanceMainNet(aliceAddr, symbol))
    console.log("Bob Balance " + await utils.getTokenBalanceMainNet(bobAddr, symbol))
    console.log("Dave Balance " + await utils.getTokenBalanceMainNet(daveAddr, symbol))
    console.log("Emma Balance " + await utils.getTokenBalanceMainNet(emmaAddr, symbol))
    expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(8000)
    expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(0)
    expect(await utils.getTokenBalanceMainNet(daveAddr, symbol)).to.equal(2000)
    expect(await utils.getTokenBalanceMainNet(emmaAddr, symbol)).to.equal(2000)

    // Split tokens into 2 - both payable to Bob...
    const bobAmount1 = transferTx.vout[0].value / 2
    const bobAmount2 = transferTx.vout[0].value - bobAmount1
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }
    splitDestinations[2] = { address: bobAddr, amount: bobAmount2 }

    const splitHex = split(
        alicePrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(transferTxid, transferTx, 0),
        splitDestinations,
        utils.getUtxo(transferTxid, transferTx, 1),
        fundingPrivateKey
    )
    // const splitTxid = await utils.broadcastToMainNet(splitHex)
    console.log(`Split TX:        ${splitTxid}`)
    const splitTx = await utils.getTransactionMainNet(splitTxid)
    await new Promise(r => setTimeout(r, wait))
    console.log("Alice Balance " + await utils.getTokenBalanceMainNet(aliceAddr, symbol))
    console.log("Bob Balance " + await utils.getTokenBalanceMainNet(bobAddr, symbol))
    console.log("Dave Balance " + await utils.getTokenBalanceMainNet(daveAddr, symbol))
    console.log("Emma Balance " + await utils.getTokenBalanceMainNet(emmaAddr, symbol))
    expect(await utils.getTokenBalance(aliceAddr, symbol)).to.equal(5000)
    expect(await utils.getTokenBalance(bobAddr, symbol)).to.equal(3000)
    expect(await utils.getTokenBalance(daveAddr, symbol)).to.equal(2000)
    expect(await utils.getTokenBalance(daveAddr, symbol)).to.equal(2000)

    // Now let's merge the last split back together
    const splitTxObj = new bsv.Transaction(splitHex)

    const mergeHex = merge(
        bobPrivateKey,
        issuerPrivateKey.publicKey,
        utils.getMergeUtxo(splitTxObj),
        aliceAddr,
        utils.getUtxo(splitTxid, splitTx, 2),
        fundingPrivateKey
    )

    //const mergeTxid = await utils.broadcastToMainNet(mergeHex)
    console.log(`Merge TX:        ${mergeTxid}`)
    const mergeTx = await utils.getTransactionMainNet(mergeTxid)
    const tokenIdMerge = await utils.getToken(issueTxid)
    let responseMerge = await utils.getTokenResponse(tokenIdMerge)
    expect(responseMerge.symbol).to.equal(symbol)
    expect(responseMerge.contract_txs).to.contain(contractTxid)
    expect(responseMerge.issuance_txs).to.contain(issueTxid)
    console.log("Alice Balance " + await utils.getTokenBalanceMainNet(aliceAddr, symbol))
    console.log("Bob Balance " + await utils.getTokenBalanceMainNet(bobAddr, symbol))
    console.log("Dave Balance " + await utils.getTokenBalanceMainNet(daveAddr, symbol))
    console.log("Emma Balance " + await utils.getTokenBalanceMainNet(emmaAddr, symbol))
    expect(await utils.getTokenBalance(aliceAddr, symbol)).to.equal(5000)
    expect(await utils.getTokenBalance(bobAddr, symbol)).to.equal(3000)
    expect(await utils.getTokenBalance(daveAddr, symbol)).to.equal(2000)
    expect(await utils.getTokenBalance(daveAddr, symbol)).to.equal(2000)

    // Split again - both payable to Alice...
    const amount = mergeTx.vout[0].value / 2

    const split2Destinations = []
    split2Destinations[0] = { address: bobAddr, amount: amount }
    split2Destinations[1] = { address: bobAddr, amount: amount }

    const splitHex2 = split(
        alicePrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(mergeTxid, mergeTx, 0),
        split2Destinations,
        utils.getUtxo(mergeTxid, mergeTx, 1),
        fundingPrivateKey
    )
    // const splitTxid2 = await utils.broadcastToMainNet(splitHex2)
    console.log(`Split TX2:       ${splitTxid2}`)
    const splitTx2 = await utils.getTransactionMainNet(splitTxid2)
    await new Promise(r => setTimeout(r, wait))
    console.log("Alice Balance " + await utils.getTokenBalanceMainNet(aliceAddr, symbol))
    console.log("Bob Balance " + await utils.getTokenBalanceMainNet(bobAddr, symbol))
    console.log("Dave Balance " + await utils.getTokenBalanceMainNet(daveAddr, symbol))
    console.log("Emma Balance " + await utils.getTokenBalanceMainNet(emmaAddr, symbol))
    expect(await utils.getTokenBalance(aliceAddr, symbol)).to.equal(5000)
    expect(await utils.getTokenBalance(bobAddr, symbol)).to.equal(3000)
    expect(await utils.getTokenBalance(daveAddr, symbol)).to.equal(2000)
    expect(await utils.getTokenBalance(daveAddr, symbol)).to.equal(2000)


    // Now mergeSplit
    const splitTxObj2 = new bsv.Transaction(splitHex2)

    const aliceAmountSatoshis = Math.floor(splitTx2.vout[0].value * SATS_PER_BITCOIN) / 2
    const bobAmountSatoshis = Math.floor(splitTx2.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx2.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis

    const mergeSplitHex = mergeSplit(
        bobPrivateKey,
        issuerPrivateKey.publicKey,
        utils.getMergeSplitUtxo(splitTxObj2, splitTx2),
        aliceAddr,
        aliceAmountSatoshis,
        bobAddr,
        bobAmountSatoshis,
        utils.getUtxo(splitTxid2, splitTx2, 2),
        fundingPrivateKey
    )

    const mergeSplitTxid = await broadcast(mergeSplitHex)
    console.log(`MergeSplit TX:   ${mergeSplitTxid}`)
    const mergeSplitTx = await getTransaction(mergeSplitTxid)
    expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.0000075)
    expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.0000225)
    console.log("Alice Balance " + await utils.getTokenBalance(aliceAddr))
    console.log("Bob Balance " + await utils.getTokenBalance(bobAddr))
    console.log("dave Balance " + await utils.getTokenBalance(daveAddr))
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(5750)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(2250)
    expect(await utils.getTokenBalance(daveAddr)).to.equal(2000)


    // Alice wants to redeem the money from bob...
    const redeemHex = redeem(
        alicePrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(mergeSplitTxid, mergeSplitTx, 0),
        utils.getUtxo(mergeSplitTxid, mergeSplitTx, 2),
        fundingPrivateKey
    )
    const redeemTxid = await broadcast(redeemHex)
    console.log(`Redeem TX:       ${redeemTxid}`)
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.0000075)
    console.log("Alice Balance " + await utils.getTokenBalance(aliceAddr))
    console.log("Bob Balance " + await utils.getTokenBalance(bobAddr))
    console.log("dave Balance " + await utils.getTokenBalance(daveAddr))
    expect(await utils.getTokenBalance(aliceAddr)).to.equal(5000)
    expect(await utils.getTokenBalance(bobAddr)).to.equal(2250)
    expect(await utils.getTokenBalance(daveAddr)).to.equal(2000)

})
