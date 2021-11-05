const expect = require('chai').expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()


it('Create Tx to be used as UTXO', async function () {

    const inputTxID = ''  // id of tx to be used as UTXO
    const destinationAddress = '' // address we are sending sats to 
    const changeAddress = '' // address that change from tx is returned to
    const satAmount = 10000 // the amount in satoshes we are sending
    const senderPrivateKey = '' // private key of owner of UTXO to sign transaction

    const inputTx = await utils.getTransactionMainNet(inputTxID)
    const inputVout = 1 // which output of UTXO we are consuming

    const utxo = new bsv.Transaction.UnspentOutput({
        txId: inputTxID,
        outputIndex: inputVout,
        address: inputTx.vout[inputVout].scriptPubKey.addresses[0],
        script: inputTx.vout[inputVout].scriptPubKey.hex,
        satoshis: inputTx.vout[inputVout].value * 100000000
    })
    const transaction = new bsv.Transaction()
        .from(utxo)
        .to(destinationAddress, satAmount)
        .change(changeAddress)
        .sign(senderPrivateKey)
    console.log(transaction.toString()) // if broadcast fails goto 'https://whatsonchain.com/broadcast' and put in tx hex to check error

    const inputUtxoid = await utils.broadcastToMainNet(transaction.toString())
    console.log(inputUtxoid)

})



