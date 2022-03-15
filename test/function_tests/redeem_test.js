const expect = require('chai').expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  redeem,
  redeemWithCallback
} = require('../../index')

const {
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../../index').utils

const { sighash } = require('../../lib/stas')

let issuerPrivateKey
let fundingPrivateKey
let bobPrivateKey
let alicePrivateKey
let contractUtxos
let fundingUtxos
let publicKeyHash
let bobAddr
let aliceAddr
let issueTxid
let issueTx
const wait = 5000

const aliceSignatureCallback = (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash.sign(tx, alicePrivateKey, sighash, i, script, satoshis)
}
const paymentSignatureCallback = (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash.sign(tx, fundingPrivateKey, sighash, i, script, satoshis)
}

beforeEach(async () => {
  await setup()
})

it('Redeem - Successful Redeem 1', async () => {
  const redeemHex = redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    utils.getUtxo(issueTxid, issueTx, 2),
    fundingPrivateKey
  )
  const redeemTxid = await broadcast(redeemHex)
  await new Promise(resolve => setTimeout(resolve, wait))
  expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.00007)
  console.log('Alice Balance ' + (await utils.getTokenBalance(aliceAddr)))
  console.log('Bob Balance ' + (await utils.getTokenBalance(bobAddr)))
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(0)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
})

it('Redeem - Successful Redeem 2', async () => {
  const redeemHex = redeem(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    utils.getUtxo(issueTxid, issueTx, 2),
    fundingPrivateKey
  )
  const redeemTxid = await broadcast(redeemHex)
  await new Promise(resolve => setTimeout(resolve, wait))
  expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.00003)
  console.log('Alice Balance ' + (await utils.getTokenBalance(aliceAddr)))
  console.log('Bob Balance ' + (await utils.getTokenBalance(bobAddr)))
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(0)
})

// no fees disabled in tests currently
// it('Redeem - Successful Redeem No Fee ', async () => {
//   const redeemHex = redeem(
//     alicePrivateKey,
//     issuerPrivateKey.publicKey,
//     utils.getUtxo(issueTxid, issueTx, 0),
//     null,
//     null
//   )
//   const redeemTxid = await broadcast(redeemHex)
//   expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.00007)
//   console.log('Alice Balance ' + (await utils.getTokenBalance(aliceAddr)))
//   console.log('Bob Balance ' + (await utils.getTokenBalance(bobAddr)))
//   expect(await utils.getTokenBalance(aliceAddr)).to.equal(0)
//   expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
// })

it('Redeem - Successful Redeem With Callback and Fee', async () => {
  const redeemHex = redeemWithCallback(
    alicePrivateKey.publicKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    utils.getUtxo(issueTxid, issueTx, 2),
    fundingPrivateKey.publicKey,
    aliceSignatureCallback,
    paymentSignatureCallback
  )
  const redeemTxid = await broadcast(redeemHex)
  await new Promise(resolve => setTimeout(resolve, wait))
  expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.00007)
  console.log('Alice Balance ' + (await utils.getTokenBalance(aliceAddr)))
  console.log('Bob Balance ' + (await utils.getTokenBalance(bobAddr)))
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(0)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
})

// no fees disabled in tests currently
// it('Redeem - Successful Redeem With Callback and No Fee', async () => {
//   const redeemHex = redeemWithCallback(
//     alicePrivateKey.publicKey,
//     issuerPrivateKey.publicKey,
//     utils.getUtxo(issueTxid, issueTx, 0),
//     null,
//     null,
//     aliceSignatureCallback,
//     null
//   )
//   const redeemTxid = await broadcast(redeemHex)
//   expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.00007)
//   console.log('Alice Balance ' + (await utils.getTokenBalance(aliceAddr)))
//   console.log('Bob Balance ' + (await utils.getTokenBalance(bobAddr)))
//   expect(await utils.getTokenBalance(aliceAddr)).to.equal(0)
//   expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
// })

// no fees currently disabled in tests
// it('Redeem - Successful Redeem No Fee Empty Array ', async () => {
//   const redeemHex = redeem(
//     alicePrivateKey,
//     issuerPrivateKey.publicKey,
//     utils.getUtxo(issueTxid, issueTx, 0),
//     [],
//     null
//   )
//   const redeemTxid = await broadcast(redeemHex)
//   expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.00007)
//   console.log('Alice Balance ' + (await utils.getTokenBalance(aliceAddr)))
//   console.log('Bob Balance ' + (await utils.getTokenBalance(bobAddr)))
//   expect(await utils.getTokenBalance(aliceAddr)).to.equal(0)
//   expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
// })

it('Redeem - Incorrect Stas UTXO Amount Throws Error', async () => {
  const redeemHex = redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    {
      txid: issueTxid,
      vout: 0,
      scriptPubKey: issueTx.vout[0].scriptPubKey.hex,
      amount: 0.1
    },
    {
      txid: issueTxid,
      vout: 2,
      scriptPubKey: issueTx.vout[2].scriptPubKey.hex,
      amount: issueTx.vout[2].value
    },
    fundingPrivateKey
  )
  try {
    await broadcast(redeemHex)
    expect(false).toBeTruthy()
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it('Redeem - Incorrect Funding UTXO Amount Throws Error', async () => {
  const redeemHex = redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    {
      txid: issueTxid,
      vout: 0,
      scriptPubKey: issueTx.vout[0].scriptPubKey.hex,
      amount: issueTx.vout[0].value
    },
    {
      txid: issueTxid,
      vout: 2,
      scriptPubKey: issueTx.vout[2].scriptPubKey.hex,
      amount: 0.1
    },
    fundingPrivateKey
  )
  try {
    await broadcast(redeemHex)
    expect(false).toBeTruthy()
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Request failed with status code 400')
  }
})

it(
  'Redeem - Attempt To Unlock With Incorrect Public Key Throws Error',
  async () => {
    const incorrectKey = bsv.PrivateKey()

    const redeemHex = redeem(
      alicePrivateKey,
      incorrectKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    )
    try {
      await broadcast(redeemHex)
      expect(false).toBeTruthy()
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Request failed with status code 400')
    }
  }
)

it(
  'Redeem - Attempt To Redeem with Incorrect Owner Private Key Throws Error',
  async () => {
    const incorrectKey = bsv.PrivateKey()

    const redeemHex = redeem(
      incorrectKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    )
    try {
      await broadcast(redeemHex)
      expect(false).toBeTruthy()
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Request failed with status code 400')
    }
  }
)

it(
  'Redeem - Attempt To Redeem with Incorrect Payment Private Key Throws Error',
  async () => {
    const incorrectKey = bsv.PrivateKey()

    const redeemHex = redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 2),
      incorrectKey
    )
    try {
      await broadcast(redeemHex)
      expect(false).toBeTruthy()
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Request failed with status code 400')
    }
  }
)

it('Redeem - Null Token Owner Private Key Throws Error', async () => {
  try {
    redeem(
      null,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Token owner private key is null')
  }
})

it('Redeem - Null STAS UTXO Throws Error', async () => {
  try {
    redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      null,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('stasUtxo is null')
  }
})

it(
  'Redeem -  No Fee UTXO but funding pk provided throws error',
  async () => {
    try {
      redeem(
        alicePrivateKey,
        issuerPrivateKey.publicKey,
        utils.getUtxo(issueTxid, issueTx, 0),
        null,
        fundingPrivateKey
      )
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      expect(e.message).to.eql('Payment key provided but payment UTXO is null')
    }
  }
)

it('Redeem - Null Funding Private Key Throws Error', async () => {
  try {
    redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 2),
      null
    )
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Payment UTXO provided but payment key is null')
  }
})

async function setup () {
  issuerPrivateKey = bsv.PrivateKey()
  fundingPrivateKey = bsv.PrivateKey()
  bobPrivateKey = bsv.PrivateKey()
  alicePrivateKey = bsv.PrivateKey()
  contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()
  const symbol = 'TAALT'
  const supply = 10000
  const schema = utils.schema(publicKeyHash, symbol, supply)

  const contractHex = contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  )
  const contractTxid = await broadcast(contractHex)
  const contractTx = await getTransaction(contractTxid)

  const issueHex = issue(
    issuerPrivateKey,
    utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
    utils.getUtxo(contractTxid, contractTx, 0),
    utils.getUtxo(contractTxid, contractTx, 1),
    fundingPrivateKey,
    true,
    symbol,
    2
  )
  issueTxid = await broadcast(issueHex)
  issueTx = await getTransaction(issueTxid)
}
