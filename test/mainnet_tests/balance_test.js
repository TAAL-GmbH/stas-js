const expect = require('chai').expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()


it('Balance Test', async function () {


    const privateKey1 = bsv.PrivateKey()
    const addr1 = privateKey1.toAddress('mainnet').toString()

    const privateKey2   = bsv.PrivateKey()
    const addr2 = privateKey2.toAddress('mainnet').toString()

    const privateKey3 = bsv.PrivateKey()
    const addr3 = privateKey3.toAddress('mainnet').toString()


    console.log("pk1 " + privateKey1.toString())
    console.log("pk2 " + privateKey2.toString())
    console.log("pk3 " + privateKey3.toString())

})





