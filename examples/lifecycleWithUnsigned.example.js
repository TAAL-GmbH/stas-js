const bsv = require('bsv')
// const { map } = require('bsv/lib/util/_')
require('dotenv').config()

const {
  unsignedContract,
  unsignedIssue,
  unsignedTransfer,
  unsignedSplit,
  unsignedMerge,
  unsignedMergeSplit,
  unsignedRedeem,
  unsignedRedeemSplit
} = require('../index')

const {
  getTransaction,
  getFundsFromFaucet,
  broadcast,
  finaliseSTASUnlockingScript,
  bitcoinToSatoshis
} = require('../index').utils

  ; (async () => {
    const keyMap = new Map() // key: publicKey value: privateKey

    const issuerPrivateKey = bsv.PrivateKey()
    const issuerPublicKey = issuerPrivateKey.publicKey
    keyMap.set(issuerPublicKey, issuerPrivateKey)

    const fundingPrivateKey = bsv.PrivateKey()
    const fundingPublicKey = fundingPrivateKey.publicKey
    keyMap.set(fundingPublicKey, fundingPrivateKey)

    const alicePrivateKey = bsv.PrivateKey()
    const alicePublicKey = alicePrivateKey.publicKey
    const aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()
    keyMap.set(alicePublicKey, alicePrivateKey)

    const bobPrivateKey = bsv.PrivateKey()
    const bobPublicKey = bobPrivateKey.publicKey
    const bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()
    keyMap.set(bobPublicKey, bobPrivateKey)

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

    // returns an object with hex and signingInfo
    const unsignedContractRes = await unsignedContract(
      issuerPublicKey,
      contractUtxos,
      fundingUtxos,
      fundingPublicKey,
      schema,
      supply
    )
    const contratTxJson = JSON.parse(unsignedContractRes.json)
    const contractTx = new bsv.Transaction(contratTxJson)

    let signedContract = contractTx.sign(issuerPrivateKey)
    signedContract = contractTx.sign(fundingPrivateKey)

    const contractTxid = await broadcast(signedContract.serialize(true))
    console.log(`Contract TX:     ${contractTxid}`)
    const newContractTx = await getTransaction(contractTxid)

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

    let unsignedIssueRes
    try {
      unsignedIssueRes = await unsignedIssue(
        issuerPublicKey,
        issueInfo,
        {
          txid: contractTxid,
          vout: 0,
          scriptPubKey: newContractTx.vout[0].scriptPubKey.hex,
          satoshis: bitcoinToSatoshis(newContractTx.vout[0].value)
        },
        {
          txid: contractTxid,
          vout: 1,
          scriptPubKey: newContractTx.vout[1].scriptPubKey.hex,
          satoshis: bitcoinToSatoshis(newContractTx.vout[1].value)
        },
        fundingPublicKey,
        true, // isSplittable
        symbol
      )
    } catch (e) {
      console.log('error creating unsigned issue transaction', e)
      return
    }

    const issueTx = new bsv.Transaction(unsignedIssueRes.hex)

    // now sign the tx
    let signingPrivateKey

    for (let i = 0; i < unsignedIssueRes.signingInfo.length; i++) {
      const signingInfo = unsignedIssueRes.signingInfo[i]
      if (!keyMap.has(signingInfo.publicKey)) {
        throw new Error('unknown public key: ' + signingInfo.publicKey)
      }
      signingPrivateKey = keyMap.get(signingInfo.publicKey)

      const sig = bsv.Transaction.sighash.sign(issueTx, signingPrivateKey, signingInfo.sighash, signingInfo.inputIndex, signingInfo.script, new bsv.crypto.BN(signingInfo.satoshis)).toTxFormat().toString('hex')
      const unlockingScript = bsv.Script.fromASM(sig + ' ' + signingInfo.publicKey.toString('hex'))
      issueTx.inputs[signingInfo.inputIndex].setScript(unlockingScript)
    }

    const issueTxid = await broadcast(issueTx.serialize(true))
    console.log(`Issue TX:        ${issueTxid}`)
    // alice: 7000
    // bob: 3000
    const newIssueTx = await getTransaction(issueTxid)
    const issueOutFundingVout = newIssueTx.vout.length - 1

    // bob sends alice his tokens
    const unsignedTransferRes = await unsignedTransfer(
      bobPublicKey,
      {
        txid: issueTxid,
        vout: 1,
        scriptPubKey: newIssueTx.vout[1].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(newIssueTx.vout[1].value)
      },
      aliceAddr,
      {
        txid: issueTxid,
        vout: issueOutFundingVout,
        scriptPubKey: newIssueTx.vout[issueOutFundingVout].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(newIssueTx.vout[issueOutFundingVout].value)
      },
      fundingPublicKey
    )

    const transferTx = new bsv.Transaction(unsignedTransferRes.hex)

    // now sign the tx
    for (let i = 0; i < unsignedTransferRes.signingInfo.length; i++) {
      const signingInfo = unsignedTransferRes.signingInfo[i]
      if (!keyMap.has(signingInfo.publicKey)) {
        throw new Error('unknown public key: ' + signingInfo.publicKey)
      }
      signingPrivateKey = keyMap.get(signingInfo.publicKey)

      const sig = bsv.Transaction.sighash.sign(transferTx, signingPrivateKey, signingInfo.sighash, signingInfo.inputIndex, signingInfo.script, new bsv.crypto.BN(signingInfo.satoshis)).toTxFormat().toString('hex')
      if (signingInfo.type === 'stas') {
        const finalScript = finaliseSTASUnlockingScript(transferTx, signingInfo.inputIndex, signingInfo.publicKey.toString('hex'), sig)
        transferTx.inputs[signingInfo.inputIndex].setScript(bsv.Script.fromASM(finalScript))
      } else {
        const unlockingScript = bsv.Script.fromASM(sig + ' ' + signingInfo.publicKey.toString('hex'))
        transferTx.inputs[signingInfo.inputIndex].setScript(unlockingScript)
      }
    }

    const transferTxid = await broadcast(transferTx.serialize(true))
    console.log(`Transfer TX:     ${transferTxid}`)

    // alice: 7000, 3000
    // bob: 0
    const newTransferTx = await getTransaction(transferTxid)

    // Split tokens into 2 - both payable to Bob...
    const transferTxSats = bitcoinToSatoshis(newTransferTx.vout[0].value)
    const bobAmount1 = transferTxSats / 2
    const bobAmount2 = transferTxSats - bobAmount1
    const splitDestinations = []
    splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
    splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }

    const unsignedSplitRes = await unsignedSplit(
      alicePublicKey,
      {
        txid: transferTxid,
        vout: 0,
        scriptPubKey: newTransferTx.vout[0].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(newTransferTx.vout[0].value)
      },
      splitDestinations,
      {
        txid: transferTxid,
        vout: 1,
        scriptPubKey: newTransferTx.vout[1].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(newTransferTx.vout[1].value)
      },
      fundingPublicKey
    )

    const splitTx = new bsv.Transaction(unsignedSplitRes.hex)

    // now sign the tx
    for (let i = 0; i < unsignedSplitRes.signingInfo.length; i++) {
      const signingInfo = unsignedSplitRes.signingInfo[i]
      if (!keyMap.has(signingInfo.publicKey)) {
        throw new Error('unknown public key: ' + signingInfo.publicKey)
      }
      signingPrivateKey = keyMap.get(signingInfo.publicKey)

      const sig = bsv.Transaction.sighash.sign(splitTx, signingPrivateKey, signingInfo.sighash, signingInfo.inputIndex, signingInfo.script, new bsv.crypto.BN(signingInfo.satoshis)).toTxFormat().toString('hex')
      if (signingInfo.type === 'stas') {
        const finalScript = finaliseSTASUnlockingScript(splitTx, signingInfo.inputIndex, signingInfo.publicKey.toString('hex'), sig)
        splitTx.inputs[signingInfo.inputIndex].setScript(bsv.Script.fromASM(finalScript))
      } else {
        const unlockingScript = bsv.Script.fromASM(sig + ' ' + signingInfo.publicKey.toString('hex'))
        splitTx.inputs[signingInfo.inputIndex].setScript(unlockingScript)
      }
    }

    const splitTxid = await broadcast(splitTx.serialize(true))
    console.log(`Split TX:        ${splitTxid}`)
    // alice: 7000
    // bob: 1500, 1500
    const newSplitTx = await getTransaction(splitTxid)

    // Now let's merge the last split back together and send to alice
    const unsignedMergeRes = await unsignedMerge(
      bobPublicKey,
      [{
        tx: splitTx,
        vout: 0
      },
      {
        tx: splitTx,
        vout: 1
      }],
      aliceAddr,
      {
        txid: splitTxid,
        vout: 2,
        scriptPubKey: newSplitTx.vout[2].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(newSplitTx.vout[2].value)
      },
      fundingPublicKey
    )

    const mergeTx = new bsv.Transaction(unsignedMergeRes.hex)

    // now sign the tx
    for (let i = 0; i < unsignedMergeRes.signingInfo.length; i++) {
      const signingInfo = unsignedMergeRes.signingInfo[i]
      if (!keyMap.has(signingInfo.publicKey)) {
        throw new Error('unknown public key: ' + signingInfo.publicKey)
      }
      signingPrivateKey = keyMap.get(signingInfo.publicKey)

      const sig = bsv.Transaction.sighash.sign(mergeTx, signingPrivateKey, signingInfo.sighash, signingInfo.inputIndex, signingInfo.script, new bsv.crypto.BN(signingInfo.satoshis)).toTxFormat().toString('hex')
      if (signingInfo.type === 'stas') {
        const finalScript = finaliseSTASUnlockingScript(mergeTx, signingInfo.inputIndex, signingInfo.publicKey.toString('hex'), sig)
        mergeTx.inputs[signingInfo.inputIndex].setScript(bsv.Script.fromASM(finalScript))
      } else {
        const unlockingScript = bsv.Script.fromASM(sig + ' ' + signingInfo.publicKey.toString('hex'))
        mergeTx.inputs[signingInfo.inputIndex].setScript(unlockingScript)
      }
    }

    const mergeTxid = await broadcast(mergeTx.serialize(true))
    console.log(`Merge TX:        ${mergeTxid}`)
    // alice: 7000, 3000
    // bob: 0
    const newMergeTx = await getTransaction(mergeTxid)

    // Split again - both payable to Alice...
    const mergeTxSats = bitcoinToSatoshis(newMergeTx.vout[0].value)
    const aliceAmount1 = mergeTxSats / 2
    const aliceAmount2 = mergeTxSats - aliceAmount1

    const split2Destinations = []
    split2Destinations[0] = { address: aliceAddr, amount: aliceAmount1 }
    split2Destinations[1] = { address: aliceAddr, amount: aliceAmount2 }

    const unsignedSplitRes2 = await unsignedSplit(
      alicePublicKey,
      {
        txid: mergeTxid,
        vout: 0,
        scriptPubKey: newMergeTx.vout[0].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(newMergeTx.vout[0].value)
      },
      split2Destinations,
      {
        txid: mergeTxid,
        vout: 1,
        scriptPubKey: newMergeTx.vout[1].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(newMergeTx.vout[1].value)
      },
      fundingPublicKey

    )
    const splitTx2 = new bsv.Transaction(unsignedSplitRes2.hex)

    // now sign the tx
    for (let i = 0; i < unsignedSplitRes2.signingInfo.length; i++) {
      const signingInfo = unsignedSplitRes2.signingInfo[i]
      if (!keyMap.has(signingInfo.publicKey)) {
        throw new Error('unknown public key: ' + signingInfo.publicKey)
      }
      signingPrivateKey = keyMap.get(signingInfo.publicKey)

      const sig = bsv.Transaction.sighash.sign(splitTx2, signingPrivateKey, signingInfo.sighash, signingInfo.inputIndex, signingInfo.script, new bsv.crypto.BN(signingInfo.satoshis)).toTxFormat().toString('hex')
      if (signingInfo.type === 'stas') {
        const finalScript = finaliseSTASUnlockingScript(splitTx2, signingInfo.inputIndex, signingInfo.publicKey.toString('hex'), sig)
        splitTx2.inputs[signingInfo.inputIndex].setScript(bsv.Script.fromASM(finalScript))
      } else {
        const unlockingScript = bsv.Script.fromASM(sig + ' ' + signingInfo.publicKey.toString('hex'))
        splitTx2.inputs[signingInfo.inputIndex].setScript(unlockingScript)
      }
    }

    const splitTxid2 = await broadcast(splitTx2.serialize(true))
    console.log(`Split TX2:       ${splitTxid2}`)
    // alice: 7000, 1500, 1500
    // bob: 0
    const newSplitTx2 = await getTransaction(splitTxid2)

    // Now mergeSplit
    const aliceAmountSatoshis = bitcoinToSatoshis(newSplitTx2.vout[0].value) / 2
    const bobAmountSatoshis = bitcoinToSatoshis(newSplitTx2.vout[0].value) + bitcoinToSatoshis(newSplitTx2.vout[1].value) - aliceAmountSatoshis

    const unsignedMergeSplitRes = await unsignedMergeSplit(
      alicePublicKey,
      [{
        tx: splitTx2,
        scriptPubKey: newSplitTx2.vout[0].scriptPubKey.hex,
        vout: 0,
        satoshis: bitcoinToSatoshis(newSplitTx2.vout[0].value)
      },
      {
        tx: splitTx2,
        scriptPubKey: newSplitTx2.vout[1].scriptPubKey.hex,
        vout: 1,
        satoshis: bitcoinToSatoshis(newSplitTx2.vout[1].value)

      }],
      aliceAddr,
      aliceAmountSatoshis,
      bobAddr,
      bobAmountSatoshis,
      {
        txid: splitTxid2,
        vout: 2,
        scriptPubKey: newSplitTx2.vout[2].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(newSplitTx2.vout[2].value)
      },
      fundingPublicKey
    )

    const mergeSplitTx = new bsv.Transaction(unsignedMergeSplitRes.hex)

    // now sign the tx
    for (let i = 0; i < unsignedMergeSplitRes.signingInfo.length; i++) {
      const signingInfo = unsignedMergeSplitRes.signingInfo[i]
      if (!keyMap.has(signingInfo.publicKey)) {
        throw new Error('unknown public key: ' + signingInfo.publicKey)
      }
      signingPrivateKey = keyMap.get(signingInfo.publicKey)

      const sig = bsv.Transaction.sighash.sign(mergeSplitTx, signingPrivateKey, signingInfo.sighash, signingInfo.inputIndex, signingInfo.script, new bsv.crypto.BN(signingInfo.satoshis)).toTxFormat().toString('hex')
      if (signingInfo.type === 'stas') {
        const finalScript = finaliseSTASUnlockingScript(mergeSplitTx, signingInfo.inputIndex, signingInfo.publicKey.toString('hex'), sig)
        mergeSplitTx.inputs[signingInfo.inputIndex].setScript(bsv.Script.fromASM(finalScript))
      } else {
        const unlockingScript = bsv.Script.fromASM(sig + ' ' + signingInfo.publicKey.toString('hex'))
        mergeSplitTx.inputs[signingInfo.inputIndex].setScript(unlockingScript)
      }
    }

    const mergeSplitTxid = await broadcast(mergeSplitTx.serialize(true))
    console.log(`MergeSplit TX:   ${mergeSplitTxid}`)
    // alice: 7000, 750
    // bob: 2250
    const newMergeSplitTx = await getTransaction(mergeSplitTxid)

    // Alice wants to redeem the 750 tokens she just received
    const unsignedRedeemRes = await unsignedRedeem(
      alicePublicKey,
      issuerPrivateKey.publicKey,
      {
        txid: mergeSplitTxid,
        vout: 0,
        scriptPubKey: newMergeSplitTx.vout[0].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(newMergeSplitTx.vout[0].value)
      },
      {
        txid: mergeSplitTxid,
        vout: 2,
        scriptPubKey: newMergeSplitTx.vout[2].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(newMergeSplitTx.vout[2].value)
      },
      fundingPublicKey
    )

    const redeemTx = new bsv.Transaction(unsignedRedeemRes.hex)

    // now sign the tx
    for (let i = 0; i < unsignedRedeemRes.signingInfo.length; i++) {
      const signingInfo = unsignedRedeemRes.signingInfo[i]
      if (!keyMap.has(signingInfo.publicKey)) {
        throw new Error('unknown public key: ' + signingInfo.publicKey)
      }
      signingPrivateKey = keyMap.get(signingInfo.publicKey)

      const sig = bsv.Transaction.sighash.sign(redeemTx, signingPrivateKey, signingInfo.sighash, signingInfo.inputIndex, signingInfo.script, new bsv.crypto.BN(signingInfo.satoshis)).toTxFormat().toString('hex')
      if (signingInfo.type === 'stas') {
        const finalScript = finaliseSTASUnlockingScript(redeemTx, signingInfo.inputIndex, signingInfo.publicKey.toString('hex'), sig)
        redeemTx.inputs[signingInfo.inputIndex].setScript(bsv.Script.fromASM(finalScript))
      } else {
        const unlockingScript = bsv.Script.fromASM(sig + ' ' + signingInfo.publicKey.toString('hex'))
        redeemTx.inputs[signingInfo.inputIndex].setScript(unlockingScript)
      }
    }

    const redeemTxid = await broadcast(redeemTx.serialize(true))
    console.log(`Redeem TX:       ${redeemTxid}`)
    // alice: 7000
    // bob: 2250
    const newRedeemTx = await getTransaction(redeemTxid)

    const redeemSplitTxSats = bitcoinToSatoshis(newMergeSplitTx.vout[1].value)
    const bobAmountRs1 = redeemSplitTxSats / 3
    const bobAmountRs2 = bobAmountRs1
    const redeemSplitDestinations = []
    redeemSplitDestinations[0] = { address: bobAddr, amount: bobAmountRs1 }
    redeemSplitDestinations[1] = { address: bobAddr, amount: bobAmountRs2 }

    // Bob wants to redeem the 50 of his tokens
    const unsignedRedeemSplitRes = await unsignedRedeemSplit(
      bobPublicKey,
      issuerPrivateKey.publicKey,
      {
        txid: mergeSplitTxid,
        vout: 1,
        scriptPubKey: newMergeSplitTx.vout[1].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(newMergeSplitTx.vout[1].value)
      },
      redeemSplitDestinations,
      {
        txid: redeemTxid,
        vout: 1,
        scriptPubKey: newRedeemTx.vout[1].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(newRedeemTx.vout[1].value)
      },
      fundingPublicKey
    )

    const redeemSplitTx = new bsv.Transaction(unsignedRedeemSplitRes.hex)

    // now sign the tx
    for (let i = 0; i < unsignedRedeemSplitRes.signingInfo.length; i++) {
      const signingInfo = unsignedRedeemSplitRes.signingInfo[i]
      if (!keyMap.has(signingInfo.publicKey)) {
        throw new Error('unknown public key: ' + signingInfo.publicKey)
      }
      signingPrivateKey = keyMap.get(signingInfo.publicKey)

      const sig = bsv.Transaction.sighash.sign(redeemSplitTx, signingPrivateKey, signingInfo.sighash, signingInfo.inputIndex, signingInfo.script, new bsv.crypto.BN(signingInfo.satoshis)).toTxFormat().toString('hex')
      if (signingInfo.type === 'stas') {
        const finalScript = finaliseSTASUnlockingScript(redeemSplitTx, signingInfo.inputIndex, signingInfo.publicKey.toString('hex'), sig)
        redeemSplitTx.inputs[signingInfo.inputIndex].setScript(bsv.Script.fromASM(finalScript))
      } else {
        const unlockingScript = bsv.Script.fromASM(sig + ' ' + signingInfo.publicKey.toString('hex'))
        redeemSplitTx.inputs[signingInfo.inputIndex].setScript(unlockingScript)
      }
    }

    const redeemSplitTxid = await broadcast(redeemSplitTx.serialize(true))
    console.log(`RedeemSplit TX:  ${redeemSplitTxid}`)
  })()
