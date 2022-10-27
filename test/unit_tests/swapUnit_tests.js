const bsv = require('bsv')
const { sighash } = require('../../lib/stas')
const {
    swap
} = require('../../index')
const {
    createSwapOffer,
    acceptSwapOffer,
    createUnsignedSwapOffer,
    acceptUnsignedSwapOffer,
    acceptUnsignedNativeSwapOffer,
    makerSignSwapOffer
  } = require('../../index').swap
const privateKeyStr = 'Ky5XHRQvYEcEbtGoQQQETbctAgAQKvb3PocfJSnkyHuEj5Nzj1pb'
const privateKey = new bsv.PrivateKey(privateKeyStr)
const txHex = '01000000028bf8a4e77f7648f9e838060daca70eaf73ba28605539da0d3bc320f35554c8d8000000006a47304402202d429d964a2c2de32a45bd7f0edf20c53723adc8d8ff2cb206a28dfb87cc637e022069265d63287621ed9e208570e0ca407830c2ea2e49d80f5802a6c54550f9a049412103c3c7cb498f8e866cff7fe2445553b76c58b0c35504c47f16b846ead1168f7581ffffffff8bf8a4e77f7648f9e838060daca70eaf73ba28605539da0d3bc320f35554c8d8010000006a47304402206144cedb1a2b6d2494b9e5eddc550f4cbf5742aa76146c654364dc0ed928fcc802205c0a45b3f2f2fffb52bd393d40b9ef5ea680a9b87ad989fc4884edc7fc6680c2412102c1966eaeeab6eff206f04f0946c698f35f4ef86dd39361f23a7e447acd2e8c49ffffffff02b80b000000000000fda40576a914a67a3c236e723db5defb08c5427a1141f819771688ac6976aa607f5f7f7c5e7f7c5d7f7c5c7f7c5b7f7c5a7f7c597f7c587f7c577f7c567f7c557f7c547f7c537f7c527f7c517f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7c5f7f7c5e7f7c5d7f7c5c7f7c5b7f7c5a7f7c597f7c587f7c577f7c567f7c557f7c547f7c537f7c527f7c517f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e01007e818b21414136d08c5ed2bf3ba048afe6dcaebafeffffffffffffffffffffffffffffff007d976e7c5296a06394677768827601249301307c7e23022079be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798027e7c7e7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e01417e21038ff83d8cf12121491609c4939dc11c4aa35503508fe432dc5a5c1905608b9218ad547f7701207f01207f7701247f517f7801007e8102fd00a063546752687f7801007e817f727e7b01177f777b557a766471567a577a786354807e7e676d68aa880067765158a569765187645294567a5379587a7e7e78637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6867567a6876aa587a7d54807e577a597a5a7a786354807e6f7e7eaa727c7e676d6e7eaa7c687b7eaa587a7d877663516752687c72879b69537a647500687c7b547f77517f7853a0916901247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f77788c6301247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f777852946301247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f77686877517f7c52797d8b9f7c53a09b91697c76638c7c587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f777c6876638c7c587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f777c6863587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f7768587f517f7801007e817602fc00a06302fd00a063546752687f7801007e81727e7b7b687f75537f7c0376a9148801147f775379645579887567726881766968789263556753687a76026c057f7701147f8263517f7c766301007e817f7c6775006877686b537992635379528763547a6b547a6b677c6b567a6b537a7c717c71716868547a587f7c81547a557964936755795187637c686b687c547f7701207f75748c7a7669765880748c7a76567a876457790376a9147e7c7e557967041976a9147c7e0288ac687e7e5579636c766976748c7a9d58807e6c0376a9147e748c7a7e6c7e7e676c766b8263828c007c80517e846864745aa0637c748c7a76697d937b7b58807e56790376a9147e748c7a7e55797e7e6868686c567a5187637500678263828c007c80517e846868647459a0637c748c7a76697d937b7b58807e55790376a9147e748c7a7e55797e7e687459a0637c748c7a76697d937b7b58807e55790376a9147e748c7a7e55797e7e68687c537a9d547963557958807e041976a91455797e0288ac7e7e68aa87726d77776a148314c4b3d45ee62bcccdedd48d374c120f765cda010006544f4b454e42036f6e6528781e00000000001976a914df00a360a841a42c8b7e4610137fe1f920089f1c88ac00000000'
const inputStasTx = bsv.Transaction(txHex)
let makerInputUtxo = {
        txId: '04e8013ecfc5958e4bce37fd3b6bd1366985d1f4338d6a76307920d91ff3cfae',
        outputIndex: 0,
        script: inputStasTx.outputs[0].script,
        satoshis: 1000
}
let wantedInfo = { type: 'native', satoshis: 1000 }
const hex = '01000000015e95597fe3f27fb00f0d33734fc62199e549fbde69b8569bed716dadc5547bd9000000006a4730440220113f7efe82e865d42673bc942b24c1fe54a437e8ccfb818509e24d4ea76e781b02202635e73e56f867cfba5c741fd5a8e9764b6026402ffa94168c2f492ad88a121cc32102f6151d3a7cf7de559baf54521bafc083ca1b043360409bf9bff0ea8e52503356ffffffff0140420f00000000001976a914649e80851dda9543baa29b4463665e360959ffbf88ac00000000'
const pubkeyhash = '649e80851dda9543baa29b4463665e360959ffbf'
const fundingUTXO = {
    txid: '04e8013ecfc5958e4bce37fd3b6bd1366985d1f4338d6a76307920d91ff3cfae',
    vout: 1,
    scriptPubKey: '76a914f6a1124c57b05b7c2544750d4241c90f15b6837b88ac',
    satoshis: 1000
  }


describe('createSwap unit tests', () => {

    const expectedHex = '0100000001aecff31fd9207930766a8d33f4d1856936d16b3bfd37ce4b8e95c5cf3e01e804000000006a47304402201ae6ab709cbf76bf52698ac263cf0a51c9addb1738e55b8b114b916a28e1d74b022068d40e744179cfcfce2be3d49bba130c903c125d36ef6c75f6c85cd7e06c1c56c3210270d2ae2d5eb30c142347b26b2b4684145b6934d7964127637eaf9ace366945b1ffffffff01e8030000000000001976a914fe5697f24aa6e72a1d5f034121156a81d4f46f9588ac00000000'

    beforeEach(() => 
        makerInputUtxo.script = inputStasTx.outputs[0].script       
    )

    it('createSwap offer returns tx hex', () => {

        const res = createSwapOffer(privateKey, makerInputUtxo, wantedInfo)
        expect(res).toBe(expectedHex)    
    })

    it('should fail with empty offerScript', () => {
        makerInputUtxo.script = ''
        expect(() => createSwapOffer(privateKey, makerInputUtxo, wantedInfo))
    })

    it('should fail with non object offerScript', () => {
        makerInputUtxo.script = 'notAnObject'
        expect(() => createSwapOffer(privateKey, makerInputUtxo, wantedInfo)).toThrow('makerInputUtxo.script must be an object')
    })

    it('should fail with null maker private key', () => {
        expect(() => createSwapOffer(null, makerInputUtxo, wantedInfo)).toThrow('Maker private key is null')
    })

    it('should fail with null inputUtxo', () => {
        expect(() => createSwapOffer(privateKey, null, wantedInfo)).toThrow('Maker input UTXO is null')
    })
})

describe('acceptSwapOffer unit tests', () => {
    
    const expectedHex = '01000000035e95597fe3f27fb00f0d33734fc62199e549fbde69b8569bed716dadc5547bd9000000006a4730440220113f7efe82e865d42673bc942b24c1fe54a437e8ccfb818509e24d4ea76e781b02202635e73e56f867cfba5c741fd5a8e9764b6026402ffa94168c2f492ad88a121cc32102f6151d3a7cf7de559baf54521bafc083ca1b043360409bf9bff0ea8e52503356ffffffff81d253d68a53175d827581e214c67d44996a2498a08ec6a955faedb732318a55000000006b483045022100a58319309af7a1a24d0c048e8fe455201090d40d60a95d237548f29baf73dd1502203a6057722a3d274fb6e32b5a4e86b23fc7edefaadc2225d6a3600c04168b296241210270d2ae2d5eb30c142347b26b2b4684145b6934d7964127637eaf9ace366945b1ffffffffaecff31fd9207930766a8d33f4d1856936d16b3bfd37ce4b8e95c5cf3e01e8040100000069463043021f378b36e9d81bddefedf4151c1d716ce31002644b4b2aef4fc772ccaee20f9d022033e3786c78b94e9e3fb65d7a96948f6646f27df8913e109cdf785f90410ce03b41210270d2ae2d5eb30c142347b26b2b4684145b6934d7964127637eaf9ace366945b1ffffffff0340420f00000000001976a914649e80851dda9543baa29b4463665e360959ffbf88ace8030000000000001976a914fe5697f24aa6e72a1d5f034121156a81d4f46f9588acc4030000000000001976a914fe5697f24aa6e72a1d5f034121156a81d4f46f9588ac00000000'

    it('acceptSwapOffer should return tx hex', () => {
        const res = acceptSwapOffer(hex, hex, privateKey, hex, makerInputUtxo, 1000, pubkeyhash, fundingUTXO, privateKey)
        expect(res).toBe(expectedHex)
    })

    it('acceptSwapOffer with null offerhex', () => {
        expect(() => acceptSwapOffer(null, hex, privateKey, hex, makerInputUtxo, 1000, pubkeyhash, fundingUTXO, privateKey)).toThrow('offerTxHex is null')
    })

    it('acceptSwapOffer with null makerInputHex', () => {
        expect(() => acceptSwapOffer(hex, null, privateKey, hex, makerInputUtxo, 1000, pubkeyhash, fundingUTXO, privateKey)).toThrow('makerInputTxHex is null')
    })

    it('acceptSwapOffer with null takerPrivateKey', () => {
        expect(() => acceptSwapOffer(hex, hex, null, hex, makerInputUtxo, 1000, pubkeyhash, fundingUTXO, privateKey)).toThrow('takerPrivateKey is null')
    })

    it('acceptSwapOffer with null takerInputHex', () => {
        expect(() => acceptSwapOffer(hex, hex, privateKey, null, makerInputUtxo, 1000, pubkeyhash, fundingUTXO, privateKey)).toThrow('takerInputTxHex is null')
    })

    it('acceptSwapOffer with null takerInputUTXO', () => {
        expect(() => acceptSwapOffer(hex, hex, privateKey, privateKey, null, 1000, pubkeyhash, fundingUTXO, privateKey)).toThrow('takerInputUTXO is null')
    })

    it('acceptSwapOffer with null takerOutputSatoshis', () => {
        expect(() => acceptSwapOffer(hex, hex, privateKey, privateKey, makerInputUtxo, null, pubkeyhash, fundingUTXO, privateKey)).toThrow('takerOutputSatoshis must be greater than zero')
    })

    it('acceptSwapOffer with zero takerOutputSatoshis', () => {
        expect(() => acceptSwapOffer(hex, hex, privateKey, privateKey, makerInputUtxo, 0, pubkeyhash, fundingUTXO, privateKey)).toThrow('takerOutputSatoshis must be greater than zero')
    })

    it('acceptSwapOffer with null makerPublicKeyHash', () => {
        expect(() => acceptSwapOffer(hex, hex, privateKey, privateKey, makerInputUtxo, 1000, null, fundingUTXO, privateKey)).toThrow('makerPublicKeyHash is null')
    })

    it('acceptSwapOffer with null paymentUtxo', () => {
        expect(() => acceptSwapOffer(hex, hex, privateKey, privateKey, makerInputUtxo, 1000, pubkeyhash, null, privateKey)).toThrow('paymentUtxo is null')
    })

    it('acceptSwapOffer with null paymentPrivateKey', () => {
        expect(() => acceptSwapOffer(hex, hex, privateKey, privateKey, makerInputUtxo, 1000, pubkeyhash, fundingUTXO, null)).toThrow('paymentPrivateKey is null')
    })
})

describe('createUnsignedOffer unit tests', () => {
    
    const expectedHex = '0100000001aecff31fd9207930766a8d33f4d1856936d16b3bfd37ce4b8e95c5cf3e01e8040000000000ffffffff01e8030000000000001976a914fe5697f24aa6e72a1d5f034121156a81d4f46f9588ac00000000'
    afterEach(() => 
        wantedInfo.type = 'native'  
    )   
    
    it('createUnsignedOffer should return tx hex', () => {
        const res = createUnsignedSwapOffer(privateKey, makerInputUtxo, wantedInfo)
        expect(res).toBe(expectedHex)
    })

    it('should fail with wrong wantedInfo type', () => {
        wantedInfo.type = 'incorrectType'
        expect(() => createUnsignedSwapOffer(privateKey, makerInputUtxo, wantedInfo)).toThrow('wantedInfo.type must be undefined or "native"')
    })

    it('createUnsignedOffer makerPrivateyKey is null', () => {
        expect(() => createUnsignedSwapOffer(null, makerInputUtxo, wantedInfo)).toThrow('makerPrivateKey is null')
    })

    it('createUnsignedOffer makerInputUtxo is null', () => {
        expect(() => createUnsignedSwapOffer(privateKey, null, wantedInfo)).toThrow('makerInputUTXO is null')
    })

    it('createUnsignedOffer wantedInfo is null', () => {
        expect(() => createUnsignedSwapOffer(privateKey, makerInputUtxo, null)).toThrow('wantedInfo is null')
    })
})

describe('acceptUnsignedSwapOffer unit tests', () => {

    // const offerTxHex = '01000000014be0e813cf7297719dcb431e835307d30d1790bf275f99b163d61cc91cf0ee080000000000ffffffff017017000000000000fda40576a9142819d8b2f1af04cdbf1a60325d33314c0e2c6be288ac6976aa607f5f7f7c5e7f7c5d7f7c5c7f7c5b7f7c5a7f7c597f7c587f7c577f7c567f7c557f7c547f7c537f7c527f7c517f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7c5f7f7c5e7f7c5d7f7c5c7f7c5b7f7c5a7f7c597f7c587f7c577f7c567f7c557f7c547f7c537f7c527f7c517f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e01007e818b21414136d08c5ed2bf3ba048afe6dcaebafeffffffffffffffffffffffffffffff007d976e7c5296a06394677768827601249301307c7e23022079be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798027e7c7e7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e01417e21038ff83d8cf12121491609c4939dc11c4aa35503508fe432dc5a5c1905608b9218ad547f7701207f01207f7701247f517f7801007e8102fd00a063546752687f7801007e817f727e7b01177f777b557a766471567a577a786354807e7e676d68aa880067765158a569765187645294567a5379587a7e7e78637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6867567a6876aa587a7d54807e577a597a5a7a786354807e6f7e7eaa727c7e676d6e7eaa7c687b7eaa587a7d877663516752687c72879b69537a647500687c7b547f77517f7853a0916901247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f77788c6301247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f777852946301247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f77686877517f7c52797d8b9f7c53a09b91697c76638c7c587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f777c6876638c7c587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f777c6863587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f7768587f517f7801007e817602fc00a06302fd00a063546752687f7801007e81727e7b7b687f75537f7c0376a9148801147f775379645579887567726881766968789263556753687a76026c057f7701147f8263517f7c766301007e817f7c6775006877686b537992635379528763547a6b547a6b677c6b567a6b537a7c717c71716868547a587f7c81547a557964936755795187637c686b687c547f7701207f75748c7a7669765880748c7a76567a876457790376a9147e7c7e557967041976a9147c7e0288ac687e7e5579636c766976748c7a9d58807e6c0376a9147e748c7a7e6c7e7e676c766b8263828c007c80517e846864745aa0637c748c7a76697d937b7b58807e56790376a9147e748c7a7e55797e7e6868686c567a5187637500678263828c007c80517e846868647459a0637c748c7a76697d937b7b58807e55790376a9147e748c7a7e55797e7e687459a0637c748c7a76697d937b7b58807e55790376a9147e748c7a7e55797e7e68687c537a9d547963557958807e041976a91455797e0288ac7e7e68aa87726d77776a14e165b0f1c1071175f3cc530ff2eb1180ac203a43010006544f4b454e41036f6e6500000000'
    // const makerInputTxHex = '020000000137996800e391b1f486fc5bc6a1609a27bcf9ec3fb74a9100c6540514260a6890000000006b483045022100bb533ed2e1c760773ad1f73d31835d905968f2466722e1d88a389d235c731775022069d2f8332bd8ded4270b317a42084cc252c059ef9e886c250d505177aa955c0b4121022cdc1885dfdb71f260fc8657ecb76ca025ee5d04d90e86e2b70d659963ab0fbdfeffffff0240420f00000000001976a91420cc90bac70461a4b08bac68ccc3cd1acf4248eb88ac1e43cb9b000000001976a914455bd52fbfad4752b4e1c051d74afa78fd05e45588aca3800100'
    // const takerInputTxHex = '01000000015e95597fe3f27fb00f0d33734fc62199e549fbde69b8569bed716dadc5547bd9000000006a4730440220113f7efe82e865d42673bc942b24c1fe54a437e8ccfb818509e24d4ea76e781b02202635e73e56f867cfba5c741fd5a8e9764b6026402ffa94168c2f492ad88a121cc32102f6151d3a7cf7de559baf54521bafc083ca1b043360409bf9bff0ea8e52503356ffffffff0140420f00000000001976a914649e80851dda9543baa29b4463665e360959ffbf88ac00000000'
     const vout = 0
   
   
    // it.only('acceptUnsignedSwapOffer should return tx hex', () => {
    //     const res = acceptUnsignedSwapOffer(offerTxHex, makerInputTxHex, privateKey, takerInputTxHex, vout, 1000, 1000, pubkeyhash, fundingUTXO, privateKey)
    //     expect(res).toBe('something')
    // })

    it('acceptUnsignedSwapOffer with null offerhex', () => {
        expect(() => acceptUnsignedSwapOffer(null, hex, privateKey, hex, vout, 1000, 1000, pubkeyhash, fundingUTXO, privateKey)).toThrow('offerTxHex is null')
    })

    it('acceptUnsignedSwapOffer with null makerInputTxHex', () => {
        expect(() => acceptUnsignedSwapOffer(hex, null, privateKey, hex, vout, 1000, 1000, pubkeyhash, fundingUTXO, privateKey)).toThrow('makerInputTxHex is null')
    })

    it('acceptUnsignedSwapOffer with null takerPrivateKey', () => {
        expect(() => acceptUnsignedSwapOffer(hex, hex, null, hex, vout, 1000, 1000, pubkeyhash, fundingUTXO, privateKey)).toThrow('takerPrivateKey is null')
    })

    it('acceptUnsignedSwapOffer with null takerInputHex', () => {
        expect(() => acceptUnsignedSwapOffer(hex, hex, privateKey, null, vout, 1000, 1000, pubkeyhash, fundingUTXO, privateKey)).toThrow('takerInputTxHex is null')
    })

    it('acceptUnsignedSwapOffer with null takerInputUTXO', () => {
        expect(() => acceptUnsignedSwapOffer(hex, hex, privateKey, hex, null, 1000, 1000, pubkeyhash, fundingUTXO, privateKey)).toThrow('takerInputVout is null')
    })

    it('acceptUnsignedSwapOffer with null takerOutputSatoshis', () => {
        expect(() => acceptUnsignedSwapOffer(hex, hex, privateKey, hex, vout, null, 1000, pubkeyhash, fundingUTXO, privateKey)).toThrow('takerInputSatoshis must be greater than zero')
    })

    it('acceptUnsignedSwapOffer with zero takerOutputSatoshis', () => {
        expect(() => acceptUnsignedSwapOffer(hex, hex, privateKey, hex, vout, 0, 1000, pubkeyhash, fundingUTXO, privateKey)).toThrow('takerInputSatoshis must be greater than zero')
    })

    it('acceptUnsignedSwapOffer with zero takerOutputSatoshis', () => {
        expect(() => acceptUnsignedSwapOffer(hex, hex, privateKey, hex, vout, 1000, 0, pubkeyhash, fundingUTXO, privateKey)).toThrow('takerOutputSatoshis must be greater than zero')
    })

    it('acceptUnsignedSwapOffer with null takerOutputSatoshis', () => {
        expect(() => acceptUnsignedSwapOffer(hex, hex, privateKey, hex, vout, 1000, null, pubkeyhash, fundingUTXO, privateKey)).toThrow('takerOutputSatoshis must be greater than zero')
    })

    it('acceptUnsignedSwapOffer with null makerPublicKeyHash', () => {
        expect(() => acceptUnsignedSwapOffer(hex, hex, privateKey, hex, vout, 1000, 1000, null, fundingUTXO, privateKey)).toThrow('makerPublicKeyHash is null')
    })

    it('acceptUnsignedSwapOffer with null paymentUtxo', () => {
        expect(() => acceptUnsignedSwapOffer(hex, hex, privateKey, hex, vout, 1000, 1000, pubkeyhash, null, privateKey)).toThrow('paymentUtxo is null')
    })

    it('acceptUnsignedSwapOffer with null paymentPrivateKey', () => {
        expect(() => acceptUnsignedSwapOffer(hex, hex, privateKey, hex, vout, 1000, 1000, pubkeyhash, fundingUTXO, null)).toThrow('paymentPrivateKey is null')
    })
})

describe('acceptUnsignedNativeSwapOffer unit tests', () => {
        //tests
})

describe('makerSignSwapOffer unit tests', () => {
        //tests
})
    

describe('handleChangeForSwap unit tests', () => {
        //tests
})