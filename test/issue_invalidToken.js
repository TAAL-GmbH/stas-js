const expect = require("chai").expect
const utils = require('./test_utils')
const bsv = require('bsv')
const axios = require('axios')

const {
  contract,
  issue
} = require('../index')

const {
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../index').utils

var issuerPrivateKey = bsv.PrivateKey()
var fundingPrivateKey = bsv.PrivateKey()
var contractTx
var contractTxid
var issueInfo
var aliceAddr
var bobAddr

//We create contract with incorrect public key hash
beforeEach(async function () {

  var incorrectPrivateKey = bsv.PrivateKey()
  var bobPrivateKey = bsv.PrivateKey()
  var alicePrivateKey = bsv.PrivateKey()
  var contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress('testnet').toString())
  var fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress('testnet').toString())
  var publicKeyHash = bsv.crypto.Hash.sha256ripemd160(incorrectPrivateKey.publicKey.toBuffer()).toString('hex')
  var symbol = 'TAALT'
  var supply = 10000
  schema = utils.schema(publicKeyHash, symbol, supply)
  aliceAddr = alicePrivateKey.toAddress().toString()
  bobAddr = bobPrivateKey.toAddress().toString()

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

});

//null returned from API call - error handling required
it("Attempt to issue invalid token", async function () {

  const issueHex = issue(
    issuerPrivateKey,
    issueInfo(),
    contractUtxo(),
    paymentUtxo(),
    fundingPrivateKey,
    true, // isSplittable
    2 // STAS version
  )
  const issueTxid = await broadcast(issueHex)
  const tokenId = await getToken(issueTxid)

  const url = 'https://taalnet.whatsonchain.com/v1/bsv/taalnet/token/' + tokenId + '/TAALT'
  const response = await axios({
    method: 'get',
    url,
    auth: {
      username: 'taal_private',
      password: 'dotheT@@l007'
    }
  })
  expect(response).to.equal("Some Error")

})


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

  var temp = response.data.vout[0].scriptPubKey.asm
  var split = temp.split('OP_RETURN')[1]
  var tokenId = split.split(' ')[1]
  console.log(tokenId)
  return tokenId
}


function contractUtxo() {

  return {
    txid: contractTxid,
    vout: 0,
    scriptPubKey: contractTx.vout[0].scriptPubKey.hex,
    amount: contractTx.vout[0].value
  }
}

function paymentUtxo() {

  return {
    txid: contractTxid,
    vout: 1,
    scriptPubKey: contractTx.vout[1].scriptPubKey.hex,
    amount: contractTx.vout[1].value
  }
}

function issueInfo() {

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