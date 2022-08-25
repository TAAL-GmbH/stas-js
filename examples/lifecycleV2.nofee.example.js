const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  transfer,
  split,
  merge,
  mergeSplit,
  redeem,
  redeemSplit
} = require('../index')

const {
  bitcoinToSatoshis,
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../index').utils

  ; (async () => {
    const issuerPrivateKey = bsv.PrivateKey()

    const alicePrivateKey = bsv.PrivateKey()
    const aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()

    const bobPrivateKey = bsv.PrivateKey()
    const bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()

    const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())

    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
    const supply = 10000
    const symbol = 'TAALT'

    const schema = {
      name: 'Taal Token',
      tokenId: publicKeyHash,
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
          mailingAddress: '',
          issuerCountry: 'CYM',
          jurisdiction: '',
          email: 'info@taal.com'
        },
        meta: {
          schemaId: 'token1',
          website: 'https://taal.com',
          legal: {
            terms: ''
          },
          media: {
            type: 'mp4'
          }
        }
      }
    }

    const contractHex = await contract(
      issuerPrivateKey,
      contractUtxos, // we always need an input so the contract must be funded
      null,
      null,
      schema,
      supply
    )
    let contractTxid
    try {
      contractTxid = await broadcast(contractHex)
    } catch (e) {
      console.log(e)
      return
    }
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

    const issueHex = await issue(
      issuerPrivateKey,
      issueInfo,
      {
        txid: contractTxid,
        vout: 0,
        scriptPubKey: contractTx.vout[0].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(contractTx.vout[0].value)
      },
      null,
      null,
      true, // isSplittable
      symbol
    )
    let issueTxid = ''
    try {
      issueTxid = await broadcast(issueHex)
    } catch (e) {
      console.log(e)
      return
    }
    console.log(`Issue TX:        ${issueTxid}`)
    const issueTx = await getTransaction(issueTxid)

    const transferHex = await transfer(
      bobPrivateKey,
      {
        txid: issueTxid,
        vout: 1,
        scriptPubKey: issueTx.vout[1].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(issueTx.vout[1].value)
      },
      aliceAddr,
      null,
      null
    )
    let transferTxid
    try {
      transferTxid = await broadcast(transferHex)
    } catch (e) {
      console.log(e)
      return
    }
    console.log(`Transfer TX:     ${transferTxid}`)
    const transferTx = await getTransaction(transferTxid)

    // Split tokens into 2 - both payable to Bob...
    const bobAmount1 = transferTx.vout[0].value / 2
    const bobAmount2 = transferTx.vout[0].value - bobAmount1
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bitcoinToSatoshis(bobAmount1) }
    splitDestinations[1] = { address: bobAddr, amount: bitcoinToSatoshis(bobAmount2) }

    const splitHex = await split(
      alicePrivateKey,
      {
        txid: transferTxid,
        vout: 0,
        scriptPubKey: transferTx.vout[0].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(transferTx.vout[0].value)
      },
      splitDestinations,
      null,
      null
    )
    const splitTxid = await broadcast(splitHex)
    console.log(`Split TX:        ${splitTxid}`)

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
      null,
      null
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

    const splitHex2 = await split(
      alicePrivateKey,
      {
        txid: mergeTxid,
        vout: 0,
        scriptPubKey: mergeTx.vout[0].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(mergeTx.vout[0].value)
      },
      split2Destinations,
      null,
      null
    )
    const splitTxid2 = await broadcast(splitHex2)
    console.log(`Split TX2:       ${splitTxid2}`)
    const splitTx2 = await getTransaction(splitTxid2)

    // Now mergeSplit
    const splitTxObj2 = new bsv.Transaction(splitHex2)

    const splitTx2Sats = bitcoinToSatoshis(splitTx2.vout[0].value)
    const aliceAmountSatoshis = splitTx2Sats / 2
    const bobAmountSatoshis = splitTx2Sats + bitcoinToSatoshis(splitTx2.vout[1].value) - aliceAmountSatoshis

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
      null,
      null
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
      null,
      null
    )
    const redeemTxid = await broadcast(redeemHex)
    console.log(`Redeem TX:       ${redeemTxid}`)
    // const redeem1Tx = await getTransaction(redeem1Txid)

    const rsBobAmount = mergeSplitTx.vout[1].value / 3
    const rsAliceAmount1 = mergeSplitTx.vout[1].value / 3
    const rSplitDestinations = []
    rSplitDestinations[0] = { address: bobAddr, amount: bitcoinToSatoshis(rsBobAmount) }
    rSplitDestinations[1] = { address: aliceAddr, amount: bitcoinToSatoshis(rsAliceAmount1) }

    // bob want's to redeem his tokens
    const redeemSplitHex = await redeemSplit(
      bobPrivateKey,
      issuerPrivateKey.publicKey,
      {
        txid: mergeSplitTxid,
        vout: 1,
        scriptPubKey: mergeSplitTx.vout[1].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(mergeSplitTx.vout[1].value)
      },
      rSplitDestinations,
      null,
      null
    )
    let redeemSplitTxid
    try {
      redeemSplitTxid = await broadcast(redeemSplitHex)
    } catch (e) {
      console.log(e)
      return
    }
    console.log(`RedeemSplit TX:  ${redeemSplitTxid}`)
  })()
