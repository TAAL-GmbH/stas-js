const expect = require('chai').expect
const assert = require('chai').assert
const bsv = require('bsv')
require('dotenv').config()

const {
    contract,
} = require('../../index')

const {
    getFundsFromFaucet,
} = require('../../index').utils


describe('regression, testnet, failing, 1427', function () {

    it('Supply Not Divisble By Sats Per Token Throws Error', async function () {
        const issuerPrivateKey = bsv.PrivateKey()
        const fundingPrivateKey = bsv.PrivateKey()
        const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
        const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
        const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
        const supply = 10000
        const symbol = 'TAALT'
        const satsPerToken = 3
        const schema = schemaSatsPerToken(publicKeyHash, symbol, satsPerToken)

        try {
            contractHex = contract(
                issuerPrivateKey,
                contractUtxos,
                fundingUtxos,
                fundingPrivateKey,
                schema,
                supply
            )
            assert(false, 'No error thrown, something went wrong')
            return
        } catch (e) {
            expect(e).to.be.instanceOf(Error)
            expect(e.message).to.contain('some error')
        }
    })

})

function schemaSatsPerToken(publicKeyHash, symbol, supply, satsPerToken) {

    return schema = {
        name: 'Taal Token',
        tokenId: `${publicKeyHash}`,
        protocolId: 'To be decided',
        symbol: symbol,
        description: 'Example token on private Taalnet',
        image: 'https://www.taal.com/wp-content/themes/taal_v2/img/favicon/favicon-96x96.png',
        totalSupply: supply,
        decimals: 0,
        satsPerToken: satsPerToken,
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
}