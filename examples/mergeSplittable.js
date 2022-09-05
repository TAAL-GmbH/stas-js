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

  const alicePrivateKey = bsv.PrivateKey()
  const aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()

  const bobPrivateKey = bsv.PrivateKey()
  const bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()

  const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())

  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  const supply = 10000
  const symbol = 'TAALT'
  console.log('alice address ' + aliceAddr)
  console.log('bob address ' + bobAddr)

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
    satsPerToken: 2,
    properties: {
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
      symbol
    )
  } catch (e) {
    console.log('error issuing token', e)
    return
  }

  const issueTxid = await broadcast(issueHex)
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

  const issueObj = new bsv.Transaction(issueHex)
  const transferObj = new bsv.Transaction(transferHex)

  const mergeHex = await merge(
    alicePrivateKey,
    [{
      tx: issueObj,
      vout: 0
    },
    {
      tx: transferObj,
      vout: 0
    }],
    aliceAddr,
    {
      txid: transferTxid,
      vout: 1,
      scriptPubKey: transferTx.vout[1].scriptPubKey.hex,
      satoshis: bitcoinToSatoshis(transferTx.vout[1].value)
    },
    fundingPrivateKey
  )
  console.log(mergeHex)
  const mergeTxid = await broadcast(mergeHex)
  console.log(`Merge TX:        ${mergeTxid}`)
  const mergeTx = await getTransaction(mergeTxid)
})()
