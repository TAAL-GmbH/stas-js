const expect = require('chai').expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  transfer,
  split,
  merge,
  mergeSplit,
  redeem
} = require('../../index')

const {
  SATS_PER_BITCOIN
} = require('../../index').utils


it('Mainnet LifeCycle Test 1', async function () {

  const wait = 0 //set wait before token balance check

  const aliceWif = process.env.ALICEWIF //the issuer of the contract and pays fees
  const bobWif = process.env.BOBWIF
  const emmaWif = process.env.EMMAWIF

  const alicePrivateKey = bsv.PrivateKey.fromWIF(aliceWif)
  const bobprivateKey = bsv.PrivateKey.fromWIF(bobWif)
  const emmaPrivateKey = bsv.PrivateKey.fromWIF(emmaWif)

  const aliceAddr = alicePrivateKey.toAddress('mainnet').toString()
  const bobAddr = bobprivateKey.toAddress('mainnet').toString()
  const emmaAddr = emmaPrivateKey.toAddress('mainnet').toString()

  console.log("Bob Address " + bobAddr)
  console.log("Emma Address " + emmaAddr)

  const inputUtxoid = '' // the input utxo 
  const inputUtxo = await utils.getTransactionMainNet(inputUtxoid)

  const inputUtxoidFee = '' // the fee utxo 
  const inputUtxoFee = await utils.getTransactionMainNet(inputUtxoidFee)

  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(alicePrivateKey.publicKey.toBuffer()).toString('hex')
  const supply = 10000
  const symbol = ''  // Use a unique symbol every test run to ensure that token balances can be checked correctly

  const schema = {
    name: 'Taal Token',
    tokenId: `${publicKeyHash}`,
    protocolId: 'To be decided',
    symbol: symbol,
    description: 'Example token on private Taalnet',
    image: 'https://www.taal.com/wp-content/themes/taal_v2/img/favicon/favicon-96x96.png',
    totalSupply: supply,
    decimals: 0,
    satsPerToken: 1,
    properties: {
      legal: {
        terms: '© 2020 TAAL TECHNOLOGIES SEZC\nALL RIGHTS RESERVED. ANY USE OF THIS SOFTWARE IS SUBJECT TO TERMS AND CONDITIONS OF LICENSE. USE OF THIS SOFTWARE WITHOUT LICENSE CONSTITUTES INFRINGEMENT OF INTELLECTUAL PROPERTY. FOR LICENSE DETAILS OF THE SOFTWARE, PLEASE REFER TO: www.taal.com/stas-token-license-agreement',
        licenceId: '1234'
      },
      issuer: {
        organisation: 'Taal Technologies SEZC',
        legalForm: 'Limited Liability Public Company',
        governingLaw: 'CA',
        mailingAddress: '1 Volcano Stret, Canada',
        issuerCountry: 'CYM',
        jurisdiction: '',
        email: 'info@taal.com'
      },
      meta: {
        schemaId: 'token1',
        website: 'https://taal.com',
        legal: {
          terms: 'blah blah'
        },
        media: {
          type: 'mp4'
        }
      }
    }
  }
  const contractHex = contract(
    alicePrivateKey,
    [{
      txid: inputUtxoid,
      vout: 0,
      scriptPubKey: inputUtxo.vout[0].scriptPubKey.hex,
      amount: inputUtxo.vout[0].value
    }],
    [{
      txid: inputUtxoidFee,
      vout: 1,
      scriptPubKey: inputUtxoFee.vout[1].scriptPubKey.hex,
      amount: inputUtxoFee.vout[1].value
    }],
    alicePrivateKey,
    schema,
    supply
  )

  const contractTxid = await utils.broadcastToMainNet(contractHex)
  console.log(`Contract TX:     ${contractTxid}`)
  const contractTx = await utils.getTransactionMainNet(contractTxid)
  

  await new Promise(r => setTimeout(r, wait));

  const issueInfo = [
    {
      addr: bobAddr,
      satoshis: 6000,
      data: 'sent to bob'
    },
    {
      addr: emmaAddr,
      satoshis: 4000,
      data: 'sent to emma'
    }
  ]
  let issueHex
  try {
    issueHex = issue(
      alicePrivateKey,
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
      alicePrivateKey,
      true, // isSplittable
      symbol,
      2 // STAS version
    )
  } catch (e) {
    console.log('error issuing token', e)
    return
  }
  const issueTxid = await utils.broadcastToMainNet(issueHex)
  console.log(`Issue TX:        ${issueTxid}`)
  const issueTx = await utils.getTransactionMainNet(issueTxid)
  const tokenId = await utils.getTokenMainNet(issueTxid)
  console.log(`Token ID:        ${tokenId}`)
  const response = await utils.getTokenResponseMainNet(tokenId, symbol) 
  expect(response.symbol).to.equal(symbol)

  await new Promise(r => setTimeout(r, wait));

  // expect(await utils.getTokenBalanceMainNet(bobAddr)).to.contain(6000)
  // expect(await utils.getTokenBalanceMainNet(emmaAddr)).to.contain(4000)
  console.log("Bob Balance  " + await utils.getTokenBalanceMainNet(bobAddr, symbol))
  console.log("Emma Balance  " + await utils.getTokenBalanceMainNet(emmaAddr, symbol))


  const issueOutFundingVout = issueTx.vout.length - 1

  const transferHex = transfer(
    bobprivateKey,
    alicePrivateKey.publicKey,
    {
      txid: issueTxid,
      vout: 0,
      scriptPubKey: issueTx.vout[0].scriptPubKey.hex,
      amount: issueTx.vout[0].value
    },
    emmaAddr,
    {
      txid: issueTxid,
      vout: issueOutFundingVout,
      scriptPubKey: issueTx.vout[issueOutFundingVout].scriptPubKey.hex,
      amount: issueTx.vout[issueOutFundingVout].value
    },
    alicePrivateKey
  )
  const transferTxid = await utils.broadcastToMainNet(transferHex)
  console.log(`Transfer TX:     ${transferTxid}`)
  const transferTx = await utils.getTransactionMainNet(transferTxid)

  await new Promise(r => setTimeout(r, wait));
  // expect(await utils.getTokenBalanceMainNet(emmaAddr)).to.contain(10000)
  console.log("Bob Balance  " + await utils.getTokenBalanceMainNet(bobAddr, symbol))
  console.log("Emma Balance  " + await utils.getTokenBalanceMainNet(emmaAddr, symbol))

  // Split tokens into 2 - both payable to Bob...
  const bobAmount1 = transferTx.vout[0].value / 2

  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount1 }

  const splitHex = split(
    emmaPrivateKey,
    alicePrivateKey.publicKey,
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
    alicePrivateKey
  )
  const splitTxid = await utils.broadcastToMainNet(splitHex)
  console.log(`Split TX:        ${splitTxid}`)
  const splitTx = await utils.getTransactionMainNet(splitTxid)
  await new Promise(r => setTimeout(r, wait));

  // expect(await utils.getTokenBalanceMainNet(bobAddr)).to.contain(0)
  // expect(await utils.getTokenBalanceMainNet(emmaAddr)).to.contain(10000)
  console.log("Bob Balance  " + await utils.getTokenBalanceMainNet(bobAddr, symbol))
  console.log("Emma Balance  " + await utils.getTokenBalanceMainNet(emmaAddr, symbol))

  // Now let's merge the last split back together
  const splitTxObj = new bsv.Transaction(splitHex)

  const mergeHex = merge(
    bobprivateKey,
    alicePrivateKey.publicKey,
    [{
      tx: splitTxObj,
      vout: 0
    },
    {
      tx: splitTxObj,
      vout: 1
    }],
    emmaAddr,
    {
      txid: splitTxid,
      vout: 2,
      scriptPubKey: splitTx.vout[2].scriptPubKey.hex,
      amount: splitTx.vout[2].value
    },
    alicePrivateKey
  )

  const mergeTxid = await utils.broadcastToMainNet(mergeHex)
  console.log(`Merge TX:        ${mergeTxid}`)
  const mergeTx = await utils.getTransactionMainNet(mergeTxid)

   await new Promise(r => setTimeout(r, wait));
  console.log("Bob Balance  " + await utils.getTokenBalanceMainNet(bobAddr, symbol))
  console.log("Emma Balance  " + await utils.getTokenBalanceMainNet(emmaAddr, symbol))

  // Split again - both payable to Bob...
  const amount = mergeTx.vout[0].value / 2

  const split2Destinations = []
  split2Destinations[0] = { address: bobAddr, amount: amount }
  split2Destinations[1] = { address: bobAddr, amount: amount }

  const splitHex2 = split(
    emmaPrivateKey,
    alicePrivateKey.publicKey,
    {
      txid: mergeTxid,
      vout: 0,
      scriptPubKey: mergeTx.vout[0].scriptPubKey.hex,
      amount: mergeTx.vout[0].value
    },
    split2Destinations,
    {
      txid: mergeTxid,
      vout: 1,
      scriptPubKey: mergeTx.vout[1].scriptPubKey.hex,
      amount: mergeTx.vout[1].value
    },
    alicePrivateKey
  )
  const splitTxid2 = await utils.broadcastToMainNet(splitHex2)
  console.log(`Split TX2:       ${splitTxid2}`)
  const splitTx2 = await utils.getTransactionMainNet(splitTxid2)
  
  await new Promise(r => setTimeout(r, wait));

  console.log("Bob Balance  " + await utils.getTokenBalanceMainNet(bobAddr, symbol))
  console.log("Emma Balance  " + await utils.getTokenBalanceMainNet(emmaAddr, symbol))

  // Now mergeSplit
  const splitTxObj2 = new bsv.Transaction(splitHex2)

  const aliceAmountSatoshis = Math.floor(splitTx2.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx2.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx2.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis

  const mergeSplitHex = mergeSplit(
    bobprivateKey,
    alicePrivateKey.publicKey,
    [{
      tx: splitTxObj2,
      scriptPubKey: splitTx2.vout[0].scriptPubKey.hex,
      vout: 0,
      amount: splitTx2.vout[0].value
    },
    {
      tx: splitTxObj2,
      scriptPubKey: splitTx2.vout[1].scriptPubKey.hex,
      vout: 1,
      amount: splitTx2.vout[1].value

    }],
    bobAddr,
    aliceAmountSatoshis,
    emmaAddr,
    bobAmountSatoshis,
    {
      txid: splitTxid2,
      vout: 2,
      scriptPubKey: splitTx2.vout[2].scriptPubKey.hex,
      amount: splitTx2.vout[2].value
    },
    alicePrivateKey
  )
  const mergeSplitTxid = await utils.broadcastToMainNet(mergeSplitHex)
  console.log(`MergeSplit TX:   ${mergeSplitTxid}`)
  const mergeSplitTx = await utils.getTransactionMainNet(mergeSplitTxid)


  await new Promise(r => setTimeout(r, wait));

  console.log("Bob Balance  " + await utils.getTokenBalanceMainNet(bobAddr, symbol))
  console.log("Emma Balance  " + await utils.getTokenBalanceMainNet(emmaAddr, symbol))

  const redeemHex = redeem(
    bobprivateKey,
    alicePrivateKey.publicKey,
    {
      txid: mergeSplitTxid,
      vout: 0,
      scriptPubKey: mergeSplitTx.vout[0].scriptPubKey.hex,
      amount: mergeSplitTx.vout[0].value
    },
    {
      txid: mergeSplitTxid,
      vout: 2,
      scriptPubKey: mergeSplitTx.vout[2].scriptPubKey.hex,
      amount: mergeSplitTx.vout[2].value
    },
    alicePrivateKey
  )
  const redeemTxid = await utils.broadcastToMainNet(redeemHex)
  console.log(`Redeem TX:       ${redeemTxid}`)

    //add check that token has been redeemed

})



