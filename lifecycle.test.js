const bsv = require('bsv')

const {
  contract,
  issue,
  transfer,
  split,
  redeemSplit,
  redeem
} = require('./index')

const {
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('./index').utils

;(async () => {
  // const issuerPrivateKeyWif = 'KxvmdF516cqjAykqpyn4aYy6xkYuG4ffkMpraiYEhme6gdtkojSG'
  // const issuerPrivateKey = bsv.PrivateKey.fromString(issuerPrivateKeyWif)
  const issuerPrivateKey = bsv.PrivateKey()

  const alicePrivateKey = bsv.PrivateKey()
  const aliceAddr = alicePrivateKey.toAddress().toString()
  const bobPrivateKey = bsv.PrivateKey()
  const bobAddr = bobPrivateKey.toAddress().toString()

  const utxos = await getFundsFromFaucet(issuerPrivateKey.toAddress('testnet').toString())

  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')

  const schema = {
    schemaId: 'Schema STAS Coupon',
    tokenName: 'TAALT',
    tokenId: publicKeyHash,
    tokenDescription: 'Example token on private Taalnet',
    issuerName: 'Taal Technologies SEZC',
    issuerCountry: 'CYM',
    issuerLegalForm: 'Limited Liability Public Company',
    issuerEmail: 'info@taal.com',
    issuerWebsite: 'https://taal.com',
    terms: '© 2020 TAAL TECHNOLOGIES SEZC\nALL RIGHTS RESERVED. ANY USE OF THIS SOFTWARE IS SUBJECT TO TERMS AND CONDITIONS OF LICENSE. USE OF THIS SOFTWARE WITHOUT LICENSE CONSTITUTES INFRINGEMENT OF INTELLECTUAL PROPERTY. FOR LICENSE DETAILS OF THE SOFTWARE, PLEASE REFER TO: www.taal.com/stas-token-license-agreement',
    governingLaw: 'Cayman Islands Law',
    icon: 'https://www.taal.com/wp-content/themes/taal_v2/img/favicon/favicon-96x96.png',
    tickerSymbol: 'TAALT'
  }

  const contractHex = contract(
    issuerPrivateKey,
    utxos,
    schema,
    10000
  )
  const contractTxid = await broadcast(contractHex)
  console.log(`Contract TX:     ${contractTxid}`)
  const contractTx = await getTransaction(contractTxid)

  const issueInfo = [
    {
      addr: aliceAddr,
      satoshis: 4000
      // data: 'test'
    },
    {
      addr: bobAddr,
      satoshis: 6000
      // data: 'test'
    }
  ]
  const issueHex = issue(
    issuerPrivateKey,
    issueInfo,
    {
      txid: contractTxid,
      vout: 0,
      scriptPubKey: contractTx.vout[0].scriptPubKey.hex,
      amount: contractTx.vout[0].value
    },
    [{
      txid: contractTxid,
      vout: 1,
      scriptPubKey: contractTx.vout[1].scriptPubKey.hex,
      amount: contractTx.vout[1].value
    }],
    1 // STAS version
  )
  const issueTxid = await broadcast(issueHex)
  console.log(`Issue TX:        ${issueTxid}`)
  const issueTx = await getTransaction(issueTxid)

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
    [{
      txid: issueTxid,
      vout: 2,
      scriptPubKey: issueTx.vout[2].scriptPubKey.hex,
      amount: issueTx.vout[2].value
    }],
    issuerPrivateKey
  )
  const transferTxid = await broadcast(transferHex)
  console.log(`Transfer TX:     ${transferTxid}`)
  const transferTx = await getTransaction(transferTxid)

  const bobAmount1 = transferTx.vout[0].value / 4
  const bobAmount2 = transferTx.vout[0].value / 4
  const aliceAmount1 = transferTx.vout[0].value / 4
  const aliceAmount2 = transferTx.vout[0].value - bobAmount1 - bobAmount2 - aliceAmount1

  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
  splitDestinations[1] = { address: aliceAddr, amount: aliceAmount1 }
  splitDestinations[2] = { address: bobAddr, amount: bobAmount2 }
  splitDestinations[3] = { address: aliceAddr, amount: aliceAmount2 }

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
    [{
      txid: transferTxid,
      vout: 1,
      scriptPubKey: transferTx.vout[1].scriptPubKey.hex,
      amount: transferTx.vout[1].value
    }],
    issuerPrivateKey
  )
  const splitTxid = await broadcast(splitHex)
  console.log(`Split TX:        ${splitTxid}`)
  const splitTx = await getTransaction(splitTxid)

  const rsBobAmount = splitTx.vout[0].value / 3
  const rsAliceAmount1 = splitTx.vout[0].value / 3
  const rSplitDestinations = []
  rSplitDestinations[0] = { address: bobAddr, amount: rsBobAmount }
  rSplitDestinations[1] = { address: aliceAddr, amount: rsAliceAmount1 }

  const redeemSplitHex = redeemSplit(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    {
      txid: splitTxid,
      vout: 0,
      scriptPubKey: splitTx.vout[0].scriptPubKey.hex,
      amount: splitTx.vout[0].value
    },
    rSplitDestinations,
    [{
      txid: splitTxid,
      vout: 4,
      scriptPubKey: splitTx.vout[4].scriptPubKey.hex,
      amount: splitTx.vout[4].value
    }],
    issuerPrivateKey
  )
  const redeemSplitTxid = await broadcast(redeemSplitHex)
  console.log(`RedeemSplit TX:  ${redeemSplitTxid}`)
  const redeemSplitTx = await getTransaction(redeemSplitTxid)

  // Alice wants to redeem the money from bob...
  const redeem1Hex = redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    {
      txid: redeemSplitTxid,
      vout: 2,
      scriptPubKey: redeemSplitTx.vout[2].scriptPubKey.hex,
      amount: redeemSplitTx.vout[2].value
    },
    [{
      txid: redeemSplitTxid,
      vout: 3,
      scriptPubKey: redeemSplitTx.vout[3].scriptPubKey.hex,
      amount: redeemSplitTx.vout[3].value
    }],
    issuerPrivateKey
  )
  const redeem1Txid = await broadcast(redeem1Hex)
  console.log(`Redeem 1 TX:     ${redeem1Txid}`)
  const redeem1Tx = await getTransaction(redeem1Txid)

  // Alice want to redeem the 1st token she got
  const redeem2Hex = redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    {
      txid: splitTxid,
      vout: 1,
      scriptPubKey: splitTx.vout[1].scriptPubKey.hex,
      amount: splitTx.vout[1].value
    },
    [{
      txid: redeem1Txid,
      vout: 1,
      scriptPubKey: redeem1Tx.vout[1].scriptPubKey.hex,
      amount: redeem1Tx.vout[1].value
    }],
    issuerPrivateKey
  )
  const redeem2Txid = await broadcast(redeem2Hex)
  console.log(`Redeem 2 TX:     ${redeem2Txid}`)
  // const redeem2Tx = await getTransaction(redeem2Txid)
})()
