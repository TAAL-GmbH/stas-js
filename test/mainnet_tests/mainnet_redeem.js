const expect = require('chai').expect
const utils = require('../utils/test_utils')
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
} = require('../../index')

const {
    getTransaction,
    getFundsFromFaucet,
    broadcast,
    SATS_PER_BITCOIN
} = require('../../index').utils


it('Redeem STAS Utxo on MainNet', async function () {


    // const bobPrivateKey = bsv.PrivateKey()
    // const bobAddr = bobPrivateKey.toAddress('mainnet').toString()
    // console.log(bobPrivateKey.toString())
    // console.log(bobAddr)

    const leonardWif = 'L24ym1g2YeUo85t5GZKzhZBMpra6DMgEKq5Y4KfVRxjsL3DFoG7m'
    const liamWif = 'Kz3R33xHUF7pqDqfeyTwsEPPp8vmD8ZfuHy9PcbZnx3YphMSLnWb' // 1Aj1yWfGjBpCZQGBDHNMeFWMgUp3DgZMR5
    const bobWif = 'L49DxSSiJyJ3M6CK8ZByqTRWitqgBLtpsK3oqXAzBCWXydRun9gi'
    // // leonard 1CyHC1dnGBYjQycx9cipPws9gwPePMHQdT
    // // bob  16xgaXKtZWmP9AXe3SYwQtY6uJnU6ZGGqA
    // // get utxo
    // // outpoint 92a6fb5f0ffca5208e8560075c0dc6481fc0d5e369fc2af0fc071549a1da4f4a 0

    const bobprivateKey = bsv.PrivateKey.fromWIF(bobWif)
    const leonardPrivateKey = bsv.PrivateKey.fromWIF(leonardWif)
    const leonardAddress = '1CyHC1dnGBYjQycx9cipPws9gwPePMHQdT'
    const bobAddr = '16xgaXKtZWmP9AXe3SYwQtY6uJnU6ZGGqA'

    const inputTxID = '38631786d9780f5e101b76738003aed1da64948ef44786064e8eae63cdd89a10'
    const inputUtxo = await utils.getTransactionMainNet(inputTxID)

    const redeemHex = redeem(
        bobprivateKey,
        leonardPrivateKey.publicKey,
        {
            txid: inputTxID,
            vout: 1,
            scriptPubKey: inputUtxo.vout[1].scriptPubKey.hex,
            amount: inputUtxo.vout[1].value
        },
        {
            txid: inputTxID,
            vout: 2,
            scriptPubKey: inputUtxo.vout[2].scriptPubKey.hex,
            amount: inputUtxo.vout[2].value
        },
        leonardPrivateKey
    )
    console.log(redeemHex)
    const redeemTxid = await utils.broadcastToMainNet(redeemHex)
    console.log(`Redeem TX:       ${redeemTxid}`)

})


