const expect = require("chai").expect
const assert = require('chai').assert
const utils = require('./test_utils')
const chai = require('chai')
const axios = require('axios')
const bsv = require('bsv')

const {
  contract,
  issue,
  transfer
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
var contractTx
var contractTxid
var issueInfo
var aliceAddr
var bobAddr
var symbol
var issueTxid
var issueTx

beforeEach(async function () {

  await setup() //contract and issue
});


it("Successful Transfer", async function () {

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
  const tokenId = await getToken(transferTxid)
  const url = 'https://taalnet.whatsonchain.com/v1/bsv/taalnet/token/' + tokenId + '/TAALT'
  const response = await axios({
    method: 'get',
    url,
    auth: {
      username: 'taal_private',
      password: 'dotheT@@l007'
    }
  })
  expect(response.data.token.symbol).to.equal(symbol)
})


it("Transfer With Invalid Issuer PK Throws Error", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1
  const incorrectPK = bsv.PrivateKey()

  const transferHex = transfer(
    incorrectPK,
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
  try {
    await broadcast(transferHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it("Transfer With Invalid Funding PK Throws Error", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1
  const incorrectPK = bsv.PrivateKey()

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
    incorrectPK
  )
  try {
    await broadcast(transferHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

//'Checksum mismatch' - Error could be more specific
it("Address Validation", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1
  const incorrectPK = bsv.PrivateKey()
  const invalidAddr = '2MSCReQT9E4GpxuK1K7uyD5qF1EmznXjkr' //all addresses start with 1

  try {
    const transferHex = transfer(
      incorrectPK,
      issuerPrivateKey.publicKey,
      {
        txid: issueTxid,
        vout: 1,
        scriptPubKey: issueTx.vout[1].scriptPubKey.hex,
        amount: issueTx.vout[1].value
      },
      invalidAddr,
      {
        txid: issueTxid,
        vout: issueOutFundingVout,
        scriptPubKey: issueTx.vout[issueOutFundingVout].scriptPubKey.hex,
        amount: issueTx.vout[issueOutFundingVout].value
      },
      fundingPrivateKey
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Some Validation error')
  }
})




async function setup() {

  const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress('testnet').toString())
  const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress('testnet').toString())
  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  symbol = 'TAALT'
  supply = 10000
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
  console.log(issueTxid)
  issueTx = await getTransaction(issueTxid)

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