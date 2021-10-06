const expect = require("chai").expect
const utils = require('./test_utils')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const bsv = require('bsv')
const mergeUtil = require('./mergeWithoutValidation')

const {
  contract,
  issue,
  transfer,
  split,
  merge
} = require('../index')

const {
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../index').utils

  const issuerPrivateKey = bsv.PrivateKey()
  const fundingPrivateKey = bsv.PrivateKey()
  const alicePrivateKey = bsv.PrivateKey()
  const aliceAddr = alicePrivateKey.toAddress().toString()
  const bobPrivateKey = bsv.PrivateKey()
  const bobAddr = bobPrivateKey.toAddress().toString()
  const supply = 10000
  const symbol = 'TAALT'
  var splitTxid
  var splitTx


   it("Attempt To Merge Token with Different Owners Via SDK Throws Error", async function(){


    const validSplitTxObj = await validToken()
    const invalidSplitTxObj = await invalidToken()

   try{
    const mergeHex = merge(
        bobPrivateKey,
        issuerPrivateKey.publicKey,
        [{
          tx: validSplitTxObj,
          vout: 0
        },
        {
          tx: invalidSplitTxObj,
          vout: 1
        }],
        aliceAddr,
        {
          txid: splitTxid,
          vout: 2,
          scriptPubKey: splitTx.vout[2].scriptPubKey.hex,
          amount: splitTx.vout[2].value
        },
        fundingPrivateKey
    )
   }catch(e){
           expect(e).to.be.instanceOf(Error)
           expect(e.message).to.eql('This function only merges STAS tokens with the same owner')
      }
})

   it("Attempt To Merge Token with Different Owners Without SDK Validation Throws Error", async function(){


    const validSplitTxObj = await validToken()
    const invalidSplitTxObj = await invalidToken()


    const mergeHex = mergeUtil.mergeWithoutValidation(
        bobPrivateKey,
        issuerPrivateKey.publicKey,
        [{
          tx: validSplitTxObj,
          vout: 0
        },
        {
          tx: invalidSplitTxObj,
          vout: 1
        }],
        aliceAddr,
        {
          txid: splitTxid,
          vout: 2,
          scriptPubKey: splitTx.vout[2].scriptPubKey.hex,
          amount: splitTx.vout[2].value
        },
        fundingPrivateKey
    )
    try{
            await broadcast(mergeHex)
   }catch(e){
           expect(e).to.be.instanceOf(Error)
           expect(e.message).to.eql('Request failed with status code 400')
      }
})





async function validToken(){

  const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress('testnet').toString())
  const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress('testnet').toString())

  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')

  schema = utils.schema(publicKeyHash, symbol, supply)

  // change goes back to the fundingPrivateKey
  const contractHex = contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  )
  const contractTxid = await broadcast(contractHex)
  console.log(`Contract TX:     ${contractTxid}`)
  const contractTx = await getTransaction(contractTxid)

  const issueInfo = [
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
  let issueHex
  try {
    issueHex = issue(
      issuerPrivateKey,
      issueInfo,
      {
        txid: contractTxid,
        vout: 0,
        scriptPubKey: contractTx.vout[0].scriptPubKey.hex,
        amount: contractTx.vout[0].value
      },
      {
        txid: contractTxid,
        vout: 1,
        scriptPubKey: contractTx.vout[1].scriptPubKey.hex,
        amount: contractTx.vout[1].value
      },
      fundingPrivateKey,
      true, // isSplittable
      2 // STAS version
    )
  } catch (e) {
    console.log('error issuing token', e)
    return
  }
  const issueTxid = await broadcast(issueHex)
  console.log(`Issue TX:        ${issueTxid}`)
  const issueTx = await getTransaction(issueTxid)

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
  console.log(`Transfer TX:     ${transferTxid}`)
  const transferTx = await getTransaction(transferTxid)

  // Split tokens into 2 - both payable to Bob...
  const bobAmount1 = transferTx.vout[0].value / 2
  const bobAmount2 = transferTx.vout[0].value - bobAmount1
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }

  const splitHex = split(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    {
      txid: transferTxid,
      vout: 0,
      scriptPubKey: transferTx.vout[0].scriptPubKey.hex,
      amount: transferTx.vout[0].value
    },
    splitDestinations,
    {
      txid: transferTxid,
      vout: 1,
      scriptPubKey: transferTx.vout[1].scriptPubKey.hex,
      amount: transferTx.vout[1].value
    },
    fundingPrivateKey
  )
  splitTxid = await broadcast(splitHex)
  console.log(`Split TX:        ${splitTxid}`)
  splitTx = await getTransaction(splitTxid)

  // Now let's merge the last split back together
  const splitTxObj = new bsv.Transaction(splitHex)
  return splitTxObj

}



 async function invalidToken(){

 const issuerPrivateKey = bsv.PrivateKey()
 const newPk = bsv.PrivateKey()

  const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress('testnet').toString())
  const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress('testnet').toString())

  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(newPk.publicKey.toBuffer()).toString('hex')

    schema = utils.schema(publicKeyHash, symbol, supply)

  // change goes back to the fundingPrivateKey
  const contractHex = contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  )
  const contractTxid = await broadcast(contractHex)
  console.log(`Invalid Contract TX:     ${contractTxid}`)
  const contractTx = await getTransaction(contractTxid)

  const issueInfo = [
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
  let issueHex
  try {
    issueHex = issue(
      issuerPrivateKey,
      issueInfo,
      {
        txid: contractTxid,
        vout: 0,
        scriptPubKey: contractTx.vout[0].scriptPubKey.hex,
        amount: contractTx.vout[0].value
      },
      {
        txid: contractTxid,
        vout: 1,
        scriptPubKey: contractTx.vout[1].scriptPubKey.hex,
        amount: contractTx.vout[1].value
      },
      fundingPrivateKey,
      true, // isSplittable
      2 // STAS version
    )
  } catch (e) {
    console.log('error issuing token', e)
    return
  }
  const issueTxid = await broadcast(issueHex)
  console.log(`Invalid Issue TX:        ${issueTxid}`)
  const issueTx = await getTransaction(issueTxid)

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
  console.log(`Invalid Transfer TX:     ${transferTxid}`)
  const transferTx = await getTransaction(transferTxid)

  // Split tokens into 2 - both payable to Bob...
  const bobAmount1 = transferTx.vout[0].value / 2
  const bobAmount2 = transferTx.vout[0].value - bobAmount1
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }

  const splitHex = split(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    {
      txid: transferTxid,
      vout: 0,
      scriptPubKey: transferTx.vout[0].scriptPubKey.hex,
      amount: transferTx.vout[0].value
    },
    splitDestinations,
    {
      txid: transferTxid,
      vout: 1,
      scriptPubKey: transferTx.vout[1].scriptPubKey.hex,
      amount: transferTx.vout[1].value
    },
    fundingPrivateKey
  )
  const splitTxid = await broadcast(splitHex)
  console.log(`Invalid Split TX:        ${splitTxid}`)
  const splitTx = await getTransaction(splitTxid)

  // Now let's merge the last split back together
  const splitTxObj = new bsv.Transaction(splitHex)
  return splitTxObj

 }
