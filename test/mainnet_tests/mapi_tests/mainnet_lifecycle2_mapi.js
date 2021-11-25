const expect = require("chai").expect
const utils = require('../../utils/test_utils')
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
} = require('../../../index')

const {
    SATS_PER_BITCOIN
} = require('../../../index').utils


it("Full Life Cycle Test On Mainnet With 4 Issuance Addresses", async function () {

    const wait = 10000 // set wait to ensure mapi tx has reached woc

    const address = ''
    const satsAmountForContract_and_Fees = 0 
    const responseArray = await utils.setupMainNetTest(address, wait, satsAmountForContract_and_Fees)
    console.log(responseArray)

    const inputUtxoid = responseArray[0] // the input utxo
    const inputUtxoIdVoutIndex = responseArray[1]
    const inputUtxoidFee = responseArray[2] // the fee utxo
    const inputUtxoIdFeeVoutIndex = responseArray[3]
    const symbol = 'test-' + utils.randomSymbol(10) // Use a unique symbol every test run to ensure that token balances can be checked correctly

    console.log('token symbol:', symbol)

    const issuerWif = process.env.ISSUERWIF // the issuer of the contract and pays fees
    const bobWif = process.env.BOBWIF
    const aliceWif = process.env.ALICEWIF
    const davePrivateKey = bsv.PrivateKey()
    const emmaPrivateKey = bsv.PrivateKey()

    const issuerPrivateKey = bsv.PrivateKey.fromWIF(issuerWif)
    const bobPrivateKey = bsv.PrivateKey.fromWIF(bobWif)
    const alicePrivateKey = bsv.PrivateKey.fromWIF(aliceWif)

    const bobAddr = bobPrivateKey.toAddress('mainnet').toString()
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
    const supply = 20000
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
    await new Promise(r => setTimeout(r, wait))
    const contractTx = await utils.getTransactionMainNet(contractTxid)

    const issueInfo = [
        {
            addr: aliceAddr,
            satoshis: 7000,
            data: 'one'
        },
        {
            addr: bobAddr,
            satoshis: 6000,
            data: 'two'
        },
        {
            addr: daveAddr,
            satoshis: 4000,
            data: 'three'
        },
        {
            addr: emmaAddr,
            satoshis: 3000,
            data: 'four'
        }
    ]

    const issueHex = issue(
        issuerPrivateKey,
        issueInfo,
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        issuerPrivateKey,
        true,
        symbol,
        2
    )
    const issueTxid = await utils.broadcastMapi(issueHex)
    await new Promise(r => setTimeout(r, wait))
    const issueTx = await utils.getTransactionMainNet(issueTxid)
    const tokenId = await utils.getTokenMainNet(issueTxid)
    console.log(`Token ID:        ${tokenId}`)
    await new Promise(r => setTimeout(r, wait))
    const response = await utils.getTokenResponseMainNet(tokenId, symbol)
    expect(response.symbol).to.equal(symbol)
    console.log("token issued")
    console.log("Alice Balance " + await utils.getTokenBalanceMainNet(aliceAddr, symbol))
    console.log("Bob Balance " + await utils.getTokenBalanceMainNet(bobAddr, symbol))
    console.log("Dave Balance " + await utils.getTokenBalanceMainNet(daveAddr, symbol))
    console.log("Emma Balance " + await utils.getTokenBalanceMainNet(emmaAddr, symbol))
    expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(7000)
    expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(6000)
    expect(await utils.getTokenBalanceMainNet(daveAddr, symbol)).to.equal(4000)
    expect(await utils.getTokenBalanceMainNet(emmaAddr, symbol)).to.equal(3000)

    const issueOutFundingVout = issueTx.vout.length - 1

    const transferHex = transfer(
        bobPrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(issueTxid, issueTx, 1),
        aliceAddr,
        utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
        issuerPrivateKey
    )
    const transferTxid = await utils.broadcastMapi(transferHex)
    await new Promise(r => setTimeout(r, wait))
    console.log(`Transfer TX:     ${transferTxid}`)
    const transferTx = await utils.getTransactionMainNet(transferTxid)
    console.log("Alice Balance " + await utils.getTokenBalanceMainNet(aliceAddr, symbol))
    console.log("Bob Balance " + await utils.getTokenBalanceMainNet(bobAddr, symbol))
    console.log("Dave Balance " + await utils.getTokenBalanceMainNet(daveAddr, symbol))
    console.log("Emma Balance " + await utils.getTokenBalanceMainNet(emmaAddr, symbol))
    expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(13000)
    expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(0)
    expect(await utils.getTokenBalanceMainNet(daveAddr, symbol)).to.equal(4000)
    expect(await utils.getTokenBalanceMainNet(emmaAddr, symbol)).to.equal(3000)

    // Split tokens into 2 - both payable to Bob...
    const bobAmount1 = transferTx.vout[0].value / 2

    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount1 }

    const splitHex = split(
        alicePrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(transferTxid, transferTx, 0),
        splitDestinations,
        utils.getUtxo(transferTxid, transferTx, 1),
        issuerPrivateKey
    )
    const splitTxid = await utils.broadcastMapi(splitHex)
    await new Promise(r => setTimeout(r, wait))
    console.log(`Split TX:        ${splitTxid}`)
    const splitTx = await utils.getTransactionMainNet(splitTxid)
    await new Promise(r => setTimeout(r, wait))
    console.log("Alice Balance " + await utils.getTokenBalanceMainNet(aliceAddr, symbol))
    console.log("Bob Balance " + await utils.getTokenBalanceMainNet(bobAddr, symbol))
    console.log("Dave Balance " + await utils.getTokenBalanceMainNet(daveAddr, symbol))
    console.log("Emma Balance " + await utils.getTokenBalanceMainNet(emmaAddr, symbol))
    expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(7000)
    expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(6000)
    expect(await utils.getTokenBalanceMainNet(daveAddr, symbol)).to.equal(4000)
    expect(await utils.getTokenBalanceMainNet(emmaAddr, symbol)).to.equal(3000)

    // Now let's merge the last split back together
    const splitTxObj = new bsv.Transaction(splitHex)

    const mergeHex = merge(
        bobPrivateKey,
        issuerPrivateKey.publicKey,
        utils.getMergeUtxo(splitTxObj),
        aliceAddr,
        utils.getUtxo(splitTxid, splitTx, 2),
        issuerPrivateKey
    )

    const mergeTxid = await utils.broadcastMapi(mergeHex)
    await new Promise(r => setTimeout(r, wait))
    console.log(`Merge TX:        ${mergeTxid}`)
    const mergeTx = await utils.getTransactionMainNet(mergeTxid)
    console.log("Alice Balance " + await utils.getTokenBalanceMainNet(aliceAddr, symbol))
    console.log("Bob Balance " + await utils.getTokenBalanceMainNet(bobAddr, symbol))
    console.log("Dave Balance " + await utils.getTokenBalanceMainNet(daveAddr, symbol))
    console.log("Emma Balance " + await utils.getTokenBalanceMainNet(emmaAddr, symbol))
    expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(13000)
    expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(0)
    expect(await utils.getTokenBalanceMainNet(daveAddr, symbol)).to.equal(4000)
    expect(await utils.getTokenBalanceMainNet(emmaAddr, symbol)).to.equal(3000)

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
        issuerPrivateKey
    )
    const splitTxid2 = await utils.broadcastMapi(splitHex2)
    await new Promise(r => setTimeout(r, wait))
    console.log(`Split TX2:       ${splitTxid2}`)
    const splitTx2 = await utils.getTransactionMainNet(splitTxid2)
    await new Promise(r => setTimeout(r, wait))
    console.log("Alice Balance " + await utils.getTokenBalanceMainNet(aliceAddr, symbol))
    console.log("Bob Balance " + await utils.getTokenBalanceMainNet(bobAddr, symbol))
    console.log("Dave Balance " + await utils.getTokenBalanceMainNet(daveAddr, symbol))
    console.log("Emma Balance " + await utils.getTokenBalanceMainNet(emmaAddr, symbol))
    expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(7000)
    expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(6000)
    expect(await utils.getTokenBalanceMainNet(daveAddr, symbol)).to.equal(4000)
    expect(await utils.getTokenBalanceMainNet(emmaAddr, symbol)).to.equal(3000)


    // Now mergeSplit
    const splitTxObj2 = new bsv.Transaction(splitHex2)

    const bobAmountSatoshis = Math.floor(splitTx2.vout[0].value * SATS_PER_BITCOIN)
    const aliceAmountSatoshis = Math.floor(splitTx2.vout[1].value * SATS_PER_BITCOIN)

    const mergeSplitHex = mergeSplit(
        bobPrivateKey,
        issuerPrivateKey.publicKey,
        utils.getMergeSplitUtxo(splitTxObj2, splitTx2),
        aliceAddr,
        aliceAmountSatoshis,
        bobAddr,
        bobAmountSatoshis,
        utils.getUtxo(splitTxid2, splitTx2, 2),
        issuerPrivateKey
    )
    const mergeSplitTxid = await utils.broadcastMapi(mergeSplitHex)
    await new Promise(r => setTimeout(r, wait))
    console.log(`MergeSplit TX:   ${mergeSplitTxid}`)
    const mergeSplitTx = await utils.getTransactionMainNet(mergeSplitTxid)
    console.log("Alice Balance " + await utils.getTokenBalanceMainNet(aliceAddr, symbol))
    console.log("Bob Balance " + await utils.getTokenBalanceMainNet(bobAddr, symbol))
    console.log("Dave Balance " + await utils.getTokenBalanceMainNet(daveAddr, symbol))
    console.log("Emma Balance " + await utils.getTokenBalanceMainNet(emmaAddr, symbol))
    expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(10000)
    expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(3000)
    expect(await utils.getTokenBalanceMainNet(daveAddr, symbol)).to.equal(4000)
    expect(await utils.getTokenBalanceMainNet(emmaAddr, symbol)).to.equal(3000)

    // Alice wants to redeem the money from bob...
    const redeemHex = redeem(
        alicePrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(mergeSplitTxid, mergeSplitTx, 0),
        utils.getUtxo(mergeSplitTxid, mergeSplitTx, 2),
        issuerPrivateKey
    )
    const redeemTxid = await utils.broadcastMapi(redeemHex)
    await new Promise(r => setTimeout(r, wait))
    console.log(`Redeem TX:       ${redeemTxid}`)
    const redeemTx = await utils.getTransactionMainNet(redeemTxid)
    console.log("Alice Balance " + await utils.getTokenBalanceMainNet(aliceAddr, symbol))
    console.log("Bob Balance " + await utils.getTokenBalanceMainNet(bobAddr, symbol))
    console.log("Dave Balance " + await utils.getTokenBalanceMainNet(daveAddr, symbol))
    console.log("Emma Balance " + await utils.getTokenBalanceMainNet(emmaAddr, symbol))
    expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(7000)
    expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(3000)
    expect(await utils.getTokenBalanceMainNet(daveAddr, symbol)).to.equal(4000)
    expect(await utils.getTokenBalanceMainNet(emmaAddr, symbol)).to.equal(3000)

    //redeem Bobs's Token
    const redeemHex2 = redeem(
        bobPrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(mergeSplitTxid, mergeSplitTx, 1),
        utils.getUtxo(redeemTxid, redeemTx, 1),
        issuerPrivateKey
    )
    const redeemTxid2 = await utils.broadcastMapi(redeemHex2)
    console.log(`Redeem TX2:       ${redeemTxid2}`)
    await new Promise(r => setTimeout(r, wait))
    const redeemTx2 = await utils.getTransactionMainNet(redeemTxid2)
    console.log("Alice Balance " + await utils.getTokenBalanceMainNet(aliceAddr, symbol))
    console.log("Bob Balance " + await utils.getTokenBalanceMainNet(bobAddr, symbol))
    console.log("Dave Balance " + await utils.getTokenBalanceMainNet(daveAddr, symbol))
    console.log("Emma Balance " + await utils.getTokenBalanceMainNet(emmaAddr, symbol))
    expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(7000)
    expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(0)
    expect(await utils.getTokenBalanceMainNet(daveAddr, symbol)).to.equal(4000)
    expect(await utils.getTokenBalanceMainNet(emmaAddr, symbol)).to.equal(3000)

      //redeem Dave's Tokens
      const redeemHex3 = redeem(
        davePrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(issueTxid, issueTx, 2),
        utils.getUtxo(redeemTxid2, redeemTx2, 1),
        issuerPrivateKey
    )
    const redeemTxid3 = await utils.broadcastMapi(redeemHex3)
    console.log(`Redeem TX3:       ${redeemTxid3}`)
    await new Promise(r => setTimeout(r, wait))
    const redeemTx3 = await utils.getTransactionMainNet(redeemTxid3)
    console.log("Alice Balance " + await utils.getTokenBalanceMainNet(aliceAddr, symbol))
    console.log("Bob Balance " + await utils.getTokenBalanceMainNet(bobAddr, symbol))
    console.log("Dave Balance " + await utils.getTokenBalanceMainNet(daveAddr, symbol))
    console.log("Emma Balance " + await utils.getTokenBalanceMainNet(emmaAddr, symbol))
    expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(7000)
    expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(0)
    expect(await utils.getTokenBalanceMainNet(daveAddr, symbol)).to.equal(0)
    expect(await utils.getTokenBalanceMainNet(emmaAddr, symbol)).to.equal(3000)

      //redeem Emmas's Tokens
      const redeemHex4 = redeem(
        emmaPrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(issueTxid, issueTx, 3),
        utils.getUtxo(redeemTxid3, redeemTx3, 1),
        issuerPrivateKey
    )
    const redeemTxid4 = await utils.broadcastMapi(redeemHex4)
    console.log(`Redeem TX4:       ${redeemTxid4}`)
    await new Promise(r => setTimeout(r, wait))
    console.log("Alice Balance " + await utils.getTokenBalanceMainNet(aliceAddr, symbol))
    console.log("Bob Balance " + await utils.getTokenBalanceMainNet(bobAddr, symbol))
    console.log("Dave Balance " + await utils.getTokenBalanceMainNet(daveAddr, symbol))
    console.log("Emma Balance " + await utils.getTokenBalanceMainNet(emmaAddr, symbol))
    expect(await utils.getTokenBalanceMainNet(aliceAddr, symbol)).to.equal(7000)
    expect(await utils.getTokenBalanceMainNet(bobAddr, symbol)).to.equal(0)
    expect(await utils.getTokenBalanceMainNet(daveAddr, symbol)).to.equal(0)
    expect(await utils.getTokenBalanceMainNet(emmaAddr, symbol)).to.equal(0)


})


