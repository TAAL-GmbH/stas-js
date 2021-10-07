


function schema(pkHash, symbol, supply) {
  const schema = {
    name: 'Taal Token',
    tokenId: `${pkHash}`,
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
  return schema
}


function getIssueInfo(addr1, sat1, addr2, sat2) {
  return [
    {
      addr: addr1,
      satoshis: sat1,
      data: 'one'
    },
    {
      addr: addr2,
      satoshis: sat2,
      data: 'two'
    }
  ]
}


function getUtxo(txid, tx, vout) {
  return {
    txid: txid,
    vout: vout,
    scriptPubKey: tx.vout[vout].scriptPubKey.hex,
    amount: tx.vout[vout].value
  }
}


function getMergeUtxo(splitTxObj) {

  return [{
      tx: splitTxObj,
      vout: 0
  },
  {
      tx: splitTxObj,
      vout: 1
  }]
}


module.exports = {
  schema,
  getIssueInfo,
  getUtxo,
  getMergeUtxo
}