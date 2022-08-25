const bsv = require('bsv')
require('dotenv').config()

const {
  contractWithCallback,
  issueWithCallback,
  transferWithCallback,
  splitWithCallback,
  mergeWithCallback,
  mergeSplitWithCallback,
  redeemWithCallback
} = require('../index')

const { sighash } = require('../lib/stas')

const {
  bitcoinToSatoshis,
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../index').utils

  ; (async () => {
    const issuerPrivateKey = bsv.PrivateKey()
    const issuerPublicKey = issuerPrivateKey.publicKey

    const fundingPrivateKey = bsv.PrivateKey()
    const fundingPublicKey = fundingPrivateKey.publicKey

    const alicePrivateKey = bsv.PrivateKey()
    const alicePublicKey = alicePrivateKey.publicKey
    const aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()

    const bobPrivateKey = bsv.PrivateKey()
    const bobPublicKey = bobPrivateKey.publicKey
    const bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()

    const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
    const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())

    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
    const supply = 10000
    const symbol = 'TAALT'

    // schemaId is required for the api to parse the tokens
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
          media: [
            {
              URI: 'B://0ee1cfc3996e69a183e490e4d874f0bf8d646e9b9de74b168fbdf896012eadb1',
              type: 'image/png',
              altURI: '1kb.png'
            }
          ]
        }
      }
    }

    const ownerSignCallback = async (tx) => {
      tx.sign(issuerPrivateKey)
    }

    // console.log('------------')
    // console.log(ownerSignCallback.toString())
    // console.log('------------')

    const paymentSignCallback = async (tx) => {
      tx.sign(fundingPrivateKey)
    }

    // return contractWithCallback(privateKey.publicKey, inputUtxos, paymentUtxos, paymentPrivateKey ? paymentPrivateKey.publicKey : null, schema, tokenSatoshis, ownerSignCallback, paymentSignCallback)

    // change goes back to the fundingPrivateKey
    const contractHex = await contractWithCallback(
      issuerPublicKey,
      contractUtxos,
      fundingUtxos,
      fundingPublicKey,
      schema,
      supply,
      ownerSignCallback,
      paymentSignCallback
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

    const issuerSignatureCallback = async (tx, i, script, satoshis) => {
      return bsv.Transaction.sighash.sign(tx, issuerPrivateKey, sighash, i, script, satoshis).toTxFormat().toString('hex')
    }
    const aliceSignatureCallback = async (tx, i, script, satoshis) => {
      return bsv.Transaction.sighash.sign(tx, alicePrivateKey, sighash, i, script, satoshis).toTxFormat().toString('hex')
    }
    const bobSignatureCallback = async (tx, i, script, satoshis) => {
      return bsv.Transaction.sighash.sign(tx, bobPrivateKey, sighash, i, script, satoshis).toTxFormat().toString('hex')
    }
    const paymentSignatureCallback = async (tx, i, script, satoshis) => {
      return bsv.Transaction.sighash.sign(tx, fundingPrivateKey, sighash, i, script, satoshis).toTxFormat().toString('hex')
    }

    let issueHex
    try {
      issueHex = await issueWithCallback(
        issuerPublicKey,
        issueInfo,
        {
          txid: contractTxid,
          vout: 0,
          scriptPubKey: contractTx.vout[0].scriptPubKey.hex,
          satoshis: bitcoinToSatoshis(contractTx.vout[0].value)
        },
        {
          txid: contractTxid,
          vout: 1,
          scriptPubKey: contractTx.vout[1].scriptPubKey.hex,
          satoshis: bitcoinToSatoshis(contractTx.vout[1].value)
        },
        fundingPublicKey,
        true, // isSplittable
        symbol,
        issuerSignatureCallback,
        paymentSignatureCallback

      )
    } catch (e) {
      console.log('error issuing token', e)
      return
    }
    const issueTxid = await broadcast(issueHex)
    console.log(`Issue TX:        ${issueTxid}`)
    const issueTx = await getTransaction(issueTxid)

    const issueOutFundingVout = issueTx.vout.length - 1

    const transferHex = await transferWithCallback(
      bobPublicKey,
      {
        txid: issueTxid,
        vout: 1,
        scriptPubKey: issueTx.vout[1].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(issueTx.vout[1].value)
      },
      aliceAddr,
      {
        txid: issueTxid,
        vout: issueOutFundingVout,
        scriptPubKey: issueTx.vout[issueOutFundingVout].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(issueTx.vout[issueOutFundingVout].value)
      },
      fundingPublicKey,
      bobSignatureCallback,
      paymentSignatureCallback
    )
    const transferTxid = await broadcast(transferHex)
    console.log(`Transfer TX:     ${transferTxid}`)
    const transferTx = await getTransaction(transferTxid)

    // Split tokens into 2 - both payable to Bob...
    const transferTxSats = bitcoinToSatoshis(transferTx.vout[0].value)
    const bobAmount1 = transferTxSats / 2
    const bobAmount2 = transferTxSats - bobAmount1
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }

    const splitHex = await splitWithCallback(
      alicePublicKey,
      {
        txid: transferTxid,
        vout: 0,
        scriptPubKey: transferTx.vout[0].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(transferTx.vout[0].value)
      },
      splitDestinations,
      {
        txid: transferTxid,
        vout: 1,
        scriptPubKey: transferTx.vout[1].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(transferTx.vout[1].value)
      },
      fundingPublicKey,
      aliceSignatureCallback,
      paymentSignatureCallback
    )
    const splitTxid = await broadcast(splitHex)
    console.log(`Split TX:        ${splitTxid}`)
    const splitTx = await getTransaction(splitTxid)

    // Now let's merge the last split back together
    const splitTxObj = new bsv.Transaction(splitHex)

    const mergeHex = await mergeWithCallback(
      bobPublicKey,
      [{
        tx: splitTxObj,
        vout: 0
      },
      {
        tx: splitTxObj,
        vout: 1
      }],
      aliceAddr,
      {
        txid: splitTxid,
        vout: 2,
        scriptPubKey: splitTx.vout[2].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(splitTx.vout[2].value)
      },
      fundingPublicKey,
      bobSignatureCallback,
      paymentSignatureCallback
    )

    const mergeTxid = await broadcast(mergeHex)
    console.log(`Merge TX:        ${mergeTxid}`)
    const mergeTx = await getTransaction(mergeTxid)

    // Split again - both payable to Alice...
    const mergeTxSats = bitcoinToSatoshis(mergeTx.vout[0].value)
    const aliceAmount1 = mergeTxSats / 2
    const aliceAmount2 = mergeTxSats - aliceAmount1

    const split2Destinations = []
    split2Destinations[0] = { address: aliceAddr, amount: aliceAmount1 }
    split2Destinations[1] = { address: aliceAddr, amount: aliceAmount2 }

    const splitHex2 = await splitWithCallback(
      alicePublicKey,
      {
        txid: mergeTxid,
        vout: 0,
        scriptPubKey: mergeTx.vout[0].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(mergeTx.vout[0].value)
      },
      split2Destinations,
      {
        txid: mergeTxid,
        vout: 1,
        scriptPubKey: mergeTx.vout[1].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(mergeTx.vout[1].value)
      },
      fundingPublicKey,
      aliceSignatureCallback,
      paymentSignatureCallback

    )
    const splitTxid2 = await broadcast(splitHex2)
    console.log(`Split TX2:       ${splitTxid2}`)
    const splitTx2 = await getTransaction(splitTxid2)

    // Now mergeSplit
    const splitTxObj2 = new bsv.Transaction(splitHex2)

    const aliceAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[0].value) / 2
    const bobAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[0].value) + bitcoinToSatoshis(splitTx2.vout[1].value) - aliceAmountSatoshis

    const mergeSplitHex = await mergeSplitWithCallback(
      alicePublicKey,
      [{
        tx: splitTxObj2,
        scriptPubKey: splitTx2.vout[0].scriptPubKey.hex,
        vout: 0,
        satoshis: bitcoinToSatoshis(splitTx2.vout[0].value)
      },
      {
        tx: splitTxObj2,
        scriptPubKey: splitTx2.vout[1].scriptPubKey.hex,
        vout: 1,
        satoshis: bitcoinToSatoshis(splitTx2.vout[1].value)

      }],
      aliceAddr,
      aliceAmountSatoshis,
      bobAddr,
      bobAmountSatoshis,
      {
        txid: splitTxid2,
        vout: 2,
        scriptPubKey: splitTx2.vout[2].scriptPubKey.hex,
        amount: splitTx2.vout[2].value
      },
      fundingPublicKey,
      aliceSignatureCallback,
      paymentSignatureCallback
    )

    const mergeSplitTxid = await broadcast(mergeSplitHex)
    console.log(`MergeSplit TX:   ${mergeSplitTxid}`)
    const mergeSplitTx = await getTransaction(mergeSplitTxid)

    // Alice wants to redeem the money from bob...
    const redeemHex = await redeemWithCallback(
      alicePublicKey,
      issuerPrivateKey.publicKey,
      {
        txid: mergeSplitTxid,
        vout: 0,
        scriptPubKey: mergeSplitTx.vout[0].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(mergeSplitTx.vout[0].value)
      },
      {
        txid: mergeSplitTxid,
        vout: 2,
        scriptPubKey: mergeSplitTx.vout[2].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(mergeSplitTx.vout[2].value)
      },
      fundingPublicKey,
      aliceSignatureCallback,
      paymentSignatureCallback
    )
    const redeemTxid = await broadcast(redeemHex)
    console.log(`Redeem TX:       ${redeemTxid}`)
    // const redeem1Tx = await getTransaction(redeem1Txid)
  })()
