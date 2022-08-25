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
} = require('../index')

const {
  bitcoinToSatoshis,
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../index').utils

  ; (async () => {
    const issuerPrivateKey = bsv.PrivateKey()
    const fundingPrivateKey = bsv.PrivateKey()
    console.log('issuerPrivateKey: ', issuerPrivateKey.toWIF())
    console.log('fundingPrivateKey: ', fundingPrivateKey.toWIF())

    const alicePrivateKey = bsv.PrivateKey()
    const aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()

    const bobPrivateKey = bsv.PrivateKey()
    const bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()

    const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
    const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())

    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
    const supply = 10000
    const symbol = 'TAALT'

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

    // change goes back to the fundingPrivateKey
    const contractHex = await contract(
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
      issueHex = await issue(
        issuerPrivateKey,
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
        fundingPrivateKey,
        true, // isSplittable
        symbol,
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

    const transferHex = await transfer(
      bobPrivateKey,
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
      fundingPrivateKey
    )
    const transferTxid = await broadcast(transferHex)
    console.log(`Transfer TX:     ${transferTxid}`)
    const transferTx = await getTransaction(transferTxid)

    // Split tokens into 4 - both payable to Bob...
    const txOutSats = bitcoinToSatoshis(transferTx.vout[0].value)
    const bobAmount1 = txOutSats / 4
    const bobAmount2 = txOutSats / 4
    const bobAmount3 = txOutSats / 4
    const bobAmount4 = txOutSats - (bobAmount1 + bobAmount2 + bobAmount3)

    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }
    splitDestinations[2] = { address: bobAddr, amount: bobAmount3 }
    splitDestinations[3] = { address: bobAddr, amount: bobAmount4 }

    const splitHex = await split(
      alicePrivateKey,
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
      fundingPrivateKey
    )
    const splitTxid = await broadcast(splitHex)
    console.log(`Split TX:        ${splitTxid}`)
    const splitTx = await getTransaction(splitTxid)

    // Now let's merge the last split back together
    const splitTxObj = new bsv.Transaction(splitHex)

    const mergeHex = await merge(
      bobPrivateKey,
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
        vout: 4,
        scriptPubKey: splitTx.vout[4].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(splitTx.vout[4].value)
      },
      fundingPrivateKey
    )

    const mergeTxid = await broadcast(mergeHex)
    console.log(`Merge TX:        ${mergeTxid}`)
    const mergeTx = await getTransaction(mergeTxid)

    // Now let's merge the last split back together

    const mergeHex2 = await merge(
      bobPrivateKey,
      [{
        tx: splitTxObj,
        vout: 2
      },
      {
        tx: splitTxObj,
        vout: 3
      }],
      aliceAddr,
      {
        txid: mergeTxid,
        vout: 1,
        scriptPubKey: mergeTx.vout[1].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(mergeTx.vout[1].value)
      },
      fundingPrivateKey
    )

    const mergeTxid2 = await broadcast(mergeHex2)
    console.log(`Merge2 TX:       ${mergeTxid2}`)
    const mergeTx2 = await getTransaction(mergeTxid2)

    // Split again - both payable to Alice...
    const aliceAmount1 = mergeTx.vout[0].value / 2
    const aliceAmount2 = mergeTx.vout[0].value - aliceAmount1

    const split2Destinations = []
    split2Destinations[0] = { address: aliceAddr, amount: bitcoinToSatoshis(aliceAmount1) }
    split2Destinations[1] = { address: aliceAddr, amount: bitcoinToSatoshis(aliceAmount2) }

    const splitHex2 = await split(
      alicePrivateKey,
      {
        txid: mergeTxid,
        vout: 0,
        scriptPubKey: mergeTx.vout[0].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(mergeTx.vout[0].value)
      },
      split2Destinations,
      {
        txid: mergeTxid2,
        vout: 1,
        scriptPubKey: mergeTx2.vout[1].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(mergeTx2.vout[1].value)
      },
      fundingPrivateKey
    )
    const splitTxid2 = await broadcast(splitHex2)
    console.log(`Split TX2:       ${splitTxid2}`)
    const splitTx2 = await getTransaction(splitTxid2)

    // Now mergeSplit
    const splitTxObj2 = new bsv.Transaction(splitHex2)

    const aliceAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[0].value) / 2
    const bobAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[0].value) + bitcoinToSatoshis(splitTx2.vout[1].value) - aliceAmountSatoshis

    const mergeSplitHex = await mergeSplit(
      alicePrivateKey,
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
        satoshis: bitcoinToSatoshis(splitTx2.vout[2].value)
      },
      fundingPrivateKey
    )

    const mergeSplitTxid = await broadcast(mergeSplitHex)
    console.log(`MergeSplit TX:   ${mergeSplitTxid}`)
    const mergeSplitTx = await getTransaction(mergeSplitTxid)

    // Alice wants to redeem the money from bob...
    const redeemHex = await redeem(
      alicePrivateKey,
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
      fundingPrivateKey
    )
    const redeemTxid = await broadcast(redeemHex)
    console.log(`Redeem TX:       ${redeemTxid}`)
    // const redeem1Tx = await getTransaction(redeem1Txid)
  })()
