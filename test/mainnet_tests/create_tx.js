const expect = require('chai').expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()


it('Create Tx to be used as UTXO', async () => {


  const newPk1 = bsv.PrivateKey()


    const inputTxID = '2508318ede297ae5485e8223cfa251a8730a08052e882b0f9fa3b1eacfcc39a4'  // id of tx to be used as UTXO
    const destinationAddress = '1Jx4BhAMYyGqq8KNZwDGTTS6bJdgSMRcdY' // address we are sending sats to 
    const changeAddress = '17WYiaND4U88fKkt1tSa142gFSquRsXkpP' // address that change from tx is returned to
    const satAmount = 2500 // the amount in satoshes we are sending
    const senderPrivateKey = 'Kzn3AnuGVa6bLe1Uwr5ufPXMYrBNAwQoQq9WYiGPp8woABFm5AaM' // private key of owner of UTXO to sign transaction

    const inputTx = await utils.getTransactionMainNet(inputTxID)
    const inputVout = 0   // which output of UTXO we are consuming

    const utxo = new bsv.Transaction.UnspentOutput({
        txId: inputTxID,
        outputIndex: inputVout,
        address: inputTx.vout[inputVout].scriptPubKey.addresses[0],
        script: inputTx.vout[inputVout].scriptPubKey.hex,
        satoshis: 3000
    })
    const transaction = new bsv.Transaction()
        .from(utxo)
        .to(destinationAddress, satAmount)
        .change(changeAddress)
        .sign(senderPrivateKey)
    console.log(transaction.toString()) // if broadcast fails goto 'https://whatsonchain.com/broadcast' and put in tx hex to check error

    // const it = await utils.broadcastMapi(transaction.toString())
   // const inputUtxoid = await utils.broadcastToMainNet(transaction.toString())
    // console.log(it)


})



