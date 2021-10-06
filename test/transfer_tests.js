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
let contractTx
let contractTxid
let aliceAddr
let bobAddr
let symbol
let issueTxid
let issueTx

beforeEach(async function () {

  await setup() //contract and issue
});


it("Successful Transfer With Fee", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1

  const transferHex = transfer(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    getStasUtxo(),
    aliceAddr,
    getPaymentUtxoOut(issueOutFundingVout),
    fundingPrivateKey
  )
  const transferTxid = await broadcast(transferHex)
  console.log(transferTxid)
  const tokenId = await getToken(transferTxid)
  console.log(tokenId)
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
  expect(await areFeesProcessed(transferTxid)).to.be.true
})


it("Successful No Fee Transfer", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1

  const transferHex = transfer(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    getStasUtxo(),
    aliceAddr,
    null,
    fundingPrivateKey
  )
  const transferTxid = await broadcast(transferHex)
  console.log(transferTxid)

  const tokenId = await getToken(transferTxid)
  console.log(tokenId)
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
  expect(await areFeesProcessed(transferTxid)).to.be.false
})

//should empty array be accepted as no fees?
it("Successful No Fee Transfer Payment UTXO Empty Array", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1

  const transferHex = transfer(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    getStasUtxo(),
    aliceAddr,
    [],
    fundingPrivateKey
  )
  const transferTxid = await broadcast(transferHex)
  console.log(transferTxid)

  const tokenId = await getToken(transferTxid)
  console.log(tokenId)
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
  expect(await areFeesProcessed(transferTxid)).to.be.false
})


it("Transfer With Invalid Issuer PK Throws Error", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1
  const incorrectPK = bsv.PrivateKey()

  const transferHex = transfer(
    incorrectPK,
    issuerPrivateKey.publicKey,
    getStasUtxo(),
    aliceAddr,
    getPaymentUtxoOut(issueOutFundingVout),
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
    getStasUtxo(),
    aliceAddr,
    getPaymentUtxoOut(issueOutFundingVout),
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

it("Transfer With Invalid Contract Public Key Throws Error", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1
  const incorrectPrivateKey = bsv.PrivateKey()

  const transferHex = transfer(
    bobPrivateKey,
    incorrectPrivateKey.publicKey,
    getStasUtxo(),
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

//'Checksum mismatch' - Error could be more specific
it("Address Validation - Incorrect Starting Char", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1
  const incorrectPK = bsv.PrivateKey()
  const invalidAddr = '2MSCReQT9E4GpxuK1K7uyD5qF1EmznXjkr' //all addresses start with 1

  try {
    const transferHex = transfer(
      incorrectPK,
      issuerPrivateKey.publicKey,
      getStasUtxo(),
      invalidAddr,
      getPaymentUtxoOut(issueOutFundingVout),
      fundingPrivateKey
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Some Validation error')
  }
})


it("Address Validation - Too Few Chars", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1
  const incorrectPK = bsv.PrivateKey()
  const invalidAddr = '1MSCReQT9E4GpxuK1K7'

  try {
    const transferHex = transfer(
      incorrectPK,
      issuerPrivateKey.publicKey,
      getStasUtxo(),
      invalidAddr,
      getPaymentUtxoOut(issueOutFundingVout),
      fundingPrivateKey
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Address string provided')
  }
})

//needs fixed - throwing 'Checksum mismatch' 
it("Address Validation - Too May Chars", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1
  const incorrectPK = bsv.PrivateKey()
  const invalidAddr = '1MSCReQT9E4GpxuK1K7uyD5qF1EmznXjkrmoFCgGtkmhyaL2frwff84p2bwTf3FDpkZcCgGtkmhyaL2frwff84p2bwTf3FDpkZcCgGtkmhy'

  try {
    const transferHex = transfer(
      incorrectPK,
      issuerPrivateKey.publicKey,
      getStasUtxo(),
      invalidAddr,
      getPaymentUtxoOut(issueOutFundingVout),
      fundingPrivateKey
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Address string provided')
  }
})


it("Incorrect STAS UTXO Amount Throws Error", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1

  const transferHex = transfer(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    {
      txid: issueTxid,
      vout: 1,
      scriptPubKey: issueTx.vout[1].scriptPubKey.hex,
      amount: 0.0001
    },
    aliceAddr,
    getPaymentUtxoOut(issueOutFundingVout),
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

it("Incorrect Payment UTXO Amount Throws Error", async function () {

  const issueOutFundingVout = issueTx.vout.length - 1


  const transferHex = transfer(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    getStasUtxo(),
    aliceAddr,
    {
      txid: issueTxid,
      vout: issueOutFundingVout,
      scriptPubKey: issueTx.vout[issueOutFundingVout].scriptPubKey.hex,
      amount: 0.01
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


async function areFeesProcessed(txid) {

  const url = 'https://taalnet.whatsonchain.com/v1/bsv/taalnet/tx/hash/' + txid
  const response = await axios({
    method: 'get',
    url,
    auth: {
      username: 'taal_private',
      password: 'dotheT@@l007'
    }
  })

  if (response.data.vout[1] != null)
    return true
  else
    return false
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
    txid: issueTxid,
    vout: 1,
    scriptPubKey: issueTx.vout[1].scriptPubKey.hex,
    amount: issueTx.vout[1].value
  }
}

function getPaymentUtxoOut(issueOutFundingVout) {

  return {
    txid: issueTxid,
    vout: issueOutFundingVout,
    scriptPubKey: issueTx.vout[issueOutFundingVout].scriptPubKey.hex,
    amount: issueTx.vout[issueOutFundingVout].value
  }
}