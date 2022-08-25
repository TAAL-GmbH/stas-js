const bsv = require('bsv')

const {
  contract,
  issue,
  transfer,
  split
  // merge,
  // mergeSplit,
  // redeem
} = require('../index')

const {
  bitcoinToSatoshis,
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../index').utils

  ; (async () => {
    // use an explicit private key
    const issuerPrivateKey = bsv.PrivateKey('L3oxM7nskTaDcF5UtYzC9GnMDEN6Yqu17mHJiGFLkPcfn9SB2nVG', 'livenet')

    const fundingPrivateKey = bsv.PrivateKey()

    const alicePrivateKey = bsv.PrivateKey('L5DGnHJyBYtD8M8Dmtnk5dn9Z2TDKGs9tSQMA5S7hrHLGArTVXjD')
    const aliceAddr = alicePrivateKey.toAddress().toString()
    // 1GqBTPZKmiAe2vDdEEkEwM4S4YoVMyu3ui

    const bobPrivateKey = bsv.PrivateKey('KxoWYe16gGVVTKXEWneCEj7QsdBLpNafvyCyxGZwwLe75egUEwbs')
    const bobAddr = bobPrivateKey.toAddress().toString()
    // 1D4Zt7ejvwUzM9TVmaazUt3T3CUaJGeoHu

    const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress('testnet').toString())
    const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress('testnet').toString())

    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
    const supply = 10000
    const symbol = 'SYM1'

    const schema = {
      name: 'Multish Token',
      tokenId: `${publicKeyHash}`,
      protocolId: 'To be decided',
      symbol: symbol,
      description: 'Multiple issue token',
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

    // this spends the contract tx converting it into STAS tokens
    const issueHex = await issue(
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
      symbol
    )
    const issueTxid = await broadcast(issueHex)
    console.log(`Issue TX:        ${issueTxid}`)
    const issueTx = await getTransaction(issueTxid)
    // alice 7000
    // bob  3000
    const issueOutFundingVout = issueTx.vout.length - 1

    // transfer moves tokens to another address
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
    // alice 10000
    // bob  0
    // Split tokens into 2 - both payable to Bob...
    const transferTxSats = bitcoinToSatoshis(transferTx.vout[0].value)
    const bobAmount1 = transferTxSats / 2
    const bobAmount2 = transferTxSats - bobAmount1
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }

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
    // alice 7000
    // bob  3000 (2 * 1500)
    // const splitTx = await getTransaction(splitTxid)

    // // Now let's merge the last split back together
    // const splitTxObj = new bsv.Transaction(splitHex)

    // const mergeHex = merge(
    //   bobPrivateKey,
    //   issuerPrivateKey.publicKey,
    //   [{
    //     tx: splitTxObj,
    //     vout: 0
    //   },
    //   {
    //     tx: splitTxObj,
    //     vout: 1
    //   }],
    //   aliceAddr,
    //   {
    //     txid: splitTxid,
    //     vout: 2,
    //     scriptPubKey: splitTx.vout[2].scriptPubKey.hex,
    //     amount: splitTx.vout[2].value
    //   },
    //   fundingPrivateKey
    // )

    // const mergeTxid = await broadcast(mergeHex)
    // console.log(`Merge TX:        ${mergeTxid}`)
    // const mergeTx = await getTransaction(mergeTxid)

    // // Split again - both payable to Alice...
    // const aliceAmount1 = mergeTx.vout[0].value / 2
    // const aliceAmount2 = mergeTx.vout[0].value - aliceAmount1

    // const split2Destinations = []
    // split2Destinations[0] = { address: aliceAddr, amount: aliceAmount1 }
    // split2Destinations[1] = { address: aliceAddr, amount: aliceAmount2 }

    // const splitHex2 = split(
    //   alicePrivateKey,
    //   issuerPrivateKey.publicKey,
    //   {
    //     txid: mergeTxid,
    //     vout: 0,
    //     scriptPubKey: mergeTx.vout[0].scriptPubKey.hex,
    //     amount: mergeTx.vout[0].value
    //   },
    //   split2Destinations,
    //   [{
    //     txid: mergeTxid,
    //     vout: 1,
    //     scriptPubKey: mergeTx.vout[1].scriptPubKey.hex,
    //     amount: mergeTx.vout[1].value
    //   }],
    //   fundingPrivateKey
    // )
    // const splitTxid2 = await broadcast(splitHex2)
    // console.log(`Split TX2:       ${splitTxid2}`)
    // const splitTx2 = await getTransaction(splitTxid2)

    // // Now mergeSplit
    // const splitTxObj2 = new bsv.Transaction(splitHex2)

    // const aliceAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[0].value) / 2
    // const bobAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[0].value) + bitcoinToSatoshis(splitTx2.vout[1].value) - aliceAmountSatoshis

    // const mergeSplitHex = mergeSplit(
    //   alicePrivateKey,
    //   issuerPrivateKey.publicKey,
    //   [{
    //     tx: splitTxObj2,
    //     scriptPubKey: splitTx2.vout[0].scriptPubKey.hex,
    //     vout: 0,
    //     amount: splitTx2.vout[0].value
    //   },
    //   {
    //     tx: splitTxObj2,
    //     scriptPubKey: splitTx2.vout[1].scriptPubKey.hex,
    //     vout: 1,
    //     amount: splitTx2.vout[1].value

    //   }],
    //   aliceAddr,
    //   aliceAmountSatoshis,
    //   bobAddr,
    //   bobAmountSatoshis,
    //   {
    //     txid: splitTxid2,
    //     vout: 2,
    //     scriptPubKey: splitTx2.vout[2].scriptPubKey.hex,
    //     amount: splitTx2.vout[2].value
    //   },
    //   fundingPrivateKey
    // )

    // const mergeSplitTxid = await broadcast(mergeSplitHex)
    // console.log(`MergeSplit TX:   ${mergeSplitTxid}`)
    // const mergeSplitTx = await getTransaction(mergeSplitTxid)

    // // Alice wants to redeem the money from bob...
    // const redeemHex = redeem(
    //   alicePrivateKey,
    //   issuerPrivateKey.publicKey,
    //   {
    //     txid: mergeSplitTxid,
    //     vout: 0,
    //     scriptPubKey: mergeSplitTx.vout[0].scriptPubKey.hex,
    //     amount: mergeSplitTx.vout[0].value
    //   },
    //   [{
    //     txid: mergeSplitTxid,
    //     vout: 2,
    //     scriptPubKey: mergeSplitTx.vout[2].scriptPubKey.hex,
    //     amount: mergeSplitTx.vout[2].value
    //   }],
    //   fundingPrivateKey
    // )
    // const redeemTxid = await broadcast(redeemHex)
    // console.log(`Redeem TX:       ${redeemTxid}`)
    // // const redeem1Tx = await getTransaction(redeem1Txid)
  })()
