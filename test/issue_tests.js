const expect = require('chai').expect
const assert = require('chai').assert
const utils = require('./test_utils')
const chai = require('chai')
const axios = require('axios')
const bsv = require('bsv')

const {
  contract,
  issue
} = require('../index')

const {
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../index').utils

const issuerPrivateKey = bsv.PrivateKey()
const fundingPrivateKey = bsv.PrivateKey()
let contractTx
let contractTxid
let issueInfo
let aliceAddr
let bobAddr
let symbol

beforeEach(async function () {
  await setup() // set up contract
})

it('Successful Issue Token With Split', async function () {
  const issueHex = issue(
    issuerPrivateKey,
    getIssueInfo(),
    getContractUtxo(),
    getPaymentUtxo(),
    fundingPrivateKey,
    true,
    2
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
  expect(response.data.token.symbol).to.equal(symbol)
})

it('Successful Issue Token Non Split', async function () {
  const issueHex = issue(
    issuerPrivateKey,
    getIssueInfo(),
    getContractUtxo(),
    getPaymentUtxo(),
    fundingPrivateKey,
    false,
    2
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
  expect(response.data.token.symbol).to.equal(symbol)
})

it('Incorrect Issue Private Key Throws Error', async function () {
  const incorrectPrivateKey = bsv.PrivateKey()
  const issueHex = issue(
    incorrectPrivateKey,
    getIssueInfo(),
    getContractUtxo(),
    getPaymentUtxo(),
    fundingPrivateKey,
    true,
    2
  )
  try {
    await broadcast(issueHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it('Incorrect Funding Private Key Throws Error', async function () {
  const incorrectPrivateKey = bsv.PrivateKey()
  const issueHex = issue(
    issuerPrivateKey,
    getIssueInfo(),
    getContractUtxo(),
    getPaymentUtxo(),
    incorrectPrivateKey,
    true,
    2
  )
  try {
    await broadcast(issueHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it('Incorrect Issuer Address Throws Error', async function () {
  const incorrectPrivateKey = bsv.PrivateKey()
  const incorrectAddr = incorrectPrivateKey.toAddress().toString()
  issueInfo = [
    {
      addr: incorrectAddr,
      satoshis: 7000,
      data: 'one'
    },
    {
      addr: bobAddr,
      satoshis: 3000,
      data: 'two'
    }
  ]
  const issueHex = issue(
    issuerPrivateKey,
    issueInfo,
    getContractUtxo(),
    getPaymentUtxo(),
    incorrectPrivateKey,
    true,
    2
  )
  try {
    await broadcast(issueHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it('Incorrect Redemption Address Throws Error', async function () {
  const incorrectPrivateKey = bsv.PrivateKey()
  const incorrectAddr = incorrectPrivateKey.toAddress().toString()
  issueInfo = [
    {
      addr: bobAddr,
      satoshis: 7000,
      data: 'one'
    },
    {
      addr: incorrectAddr,
      satoshis: 3000,
      data: 'two'
    }
  ]
  const issueHex = issue(
    issuerPrivateKey,
    issueInfo,
    getContractUtxo(),
    getPaymentUtxo(),
    incorrectPrivateKey,
    true,
    2
  )
  try {
    await broadcast(issueHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

// 'Checksum mismatch' - Error could be more specific
it('Address Validation', async function () {
  const incorrectPrivateKey = bsv.PrivateKey()
  const invalidAddr = '2MSCReQT9E4GpxuK1K7uyD5qF1EmznXjkr' // all addresses start with 1
  console.log(bobAddr)
  issueInfo = [
    {
      addr: invalidAddr,
      satoshis: 7000,
      data: 'one'
    },
    {
      addr: aliceAddr,
      satoshis: 3000,
      data: 'two'
    }
  ]

  try {
    issue(
      issuerPrivateKey,
      issueInfo,
      getContractUtxo(),
      getPaymentUtxo(),
      incorrectPrivateKey,
      true,
      2
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Some Validation Error')
  }
})

it('Issue with Incorrect Balance Throws Error', async function () {
  issueInfo = [
    {
      addr: aliceAddr,
      satoshis: 0,
      data: 'one'
    },
    {
      addr: bobAddr,
      satoshis: 0,
      data: 'two'
    }
  ]
  try {
    issue(
      issuerPrivateKey,
      issueInfo,
      getContractUtxo(),
      getPaymentUtxo(),
      fundingPrivateKey,
      true,
      2
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('total out amount 0 must equal total in amount 10000')
  }
})

// some validation required
it('Issue with appended data throws error', async function () {
  issueInfo = [
    {
      addr: aliceAddr,
      satoshis: 7000,
      data: 'what constitutes invalid data?'
    },
    {
      addr: bobAddr,
      satoshis: 3000,
      data: 'what constitutes invalid data?'
    }
  ]
  try {
    issue(
      issuerPrivateKey,
      issueInfo,
      getContractUtxo(),
      getPaymentUtxo(),
      fundingPrivateKey,
      true,
      2
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Some Error')
  }
})

it('Empty Issue Info Throws Error', async function () {
  try {
    issue(
      issuerPrivateKey,
      [],
      getContractUtxo(),
      getPaymentUtxo(),
      fundingPrivateKey,
      true,
      2
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('issueInfo is invalid')
  }
})

// needs fixed - current error 'total out amount 10000 must equal total in amount NaN''
it('Empty Contract UTXO Info Throws Error', async function () {
  try {
    issue(
      issuerPrivateKey,
      getIssueInfo(),
      [],
      getPaymentUtxo(),
      fundingPrivateKey,
      true,
      2
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Some Error')
  }
})

it('Empty Payment UTXO Info Throws Error', async function () {
  try {
    issue(
      issuerPrivateKey,
      getIssueInfo(),
      getContractUtxo(),
      [],
      fundingPrivateKey,
      true,
      2
    )
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Argument: Output satoshis is not a natural number')
  }
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

  const temp = response.data.vout[0].scriptPubKey.asm
  const split = temp.split('OP_RETURN')[1]
  const tokenId = split.split(' ')[1]
  console.log(tokenId)
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

async function setup() {
  const bobPrivateKey = bsv.PrivateKey()
  const alicePrivateKey = bsv.PrivateKey()
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
}
