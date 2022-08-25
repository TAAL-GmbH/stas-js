const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  transfer,
  split
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
      false, // isSplittable
      symbol,
      2 // STAS version
    )
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
      {
        txid: transferTxid,
        vout: 1,
        scriptPubKey: transferTx.vout[1].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(transferTx.vout[1].value)
      },
      fundingPrivateKey
    )
    try {
      await broadcast(splitHex)
    } catch (e) {
      console.log("Correct behaviour. Couldn't split")
      return
    }
    console.log('Error: was able to split NFT')
  })()
