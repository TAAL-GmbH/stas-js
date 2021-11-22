const expect = require('chai').expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()


it('Create Tx to be used as UTXO', async function () {

    const inputTxID = '97e59ef62846baddd670d107fc978c0d9e98ef8fb14790059ce2e83ca9da24d9'  // id of tx to be used as UTXO
    const destinationAddress = '17WYiaND4U88fKkt1tSa142gFSquRsXkpP' // address we are sending sats to 
    const changeAddress = '1Aj1yWfGjBpCZQGBDHNMeFWMgUp3DgZMR5' // address that change from tx is returned to
    const satAmount = 500000// the amount in satoshes we are sending
    const senderPrivateKey = 'Kz3R33xHUF7pqDqfeyTwsEPPp8vmD8ZfuHy9PcbZnx3YphMSLnWb' // private key of owner of UTXO to sign transaction

    const inputTx = await utils.getTransactionMainNet(inputTxID)
    const inputVout = 1  // which output of UTXO we are consuming

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

    //const it = await utils.broadcastMapi(transaction.toString())
    //  const inputUtxoid = await utils.broadcastToMainNet(transaction.toString())
    // console.log(inputUtxoid)




})



