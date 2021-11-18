const {
  getVersion,
  getScriptFlags,
  getScriptData,
  getSymbol,
  isSplittable
} = require('../lib/stas')

const assert = require('assert')

// const scriptV2 = '76a914563d403dd9877585525248aba5542b8783c292cd88ac6976aa607f5f7f7c5e7f7c5d7f7c5c7f7c5b7f7c5a7f7c597f7c587f7c577f7c567f7c557f7c547f7c537f7c527f7c517f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7c5f7f7c5e7f7c5d7f7c5c7f7c5b7f7c5a7f7c597f7c587f7c577f7c567f7c557f7c547f7c537f7c527f7c517f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e01007e818b21414136d08c5ed2bf3ba048afe6dcaebafeffffffffffffffffffffffffffffff007d976e7c5296a06394677768827601249301307c7e23022079be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798027e7c7e7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e01417e21038ff83d8cf12121491609c4939dc11c4aa35503508fe432dc5a5c1905608b9218ad547f7701207f01207f7701247f517f7801007e8102fd00a063546752687f7801007e817f727e7b01177f777b557a766471567a577a786354807e7e676d68aa880067765158a569765187645294567a5379587a7e7e78637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6867567a6876aa587a7d54807e577a597a5a7a786354807e6f7e7eaa727c7e676d6e7eaa7c687b7eaa587a7d877663516752687c72879b69537a647500687c7b547f77517f7853a0916901247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f77788c6301247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f777852946301247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f77686877517f7c52797d8b9f7c53a09b91697c76638c7c587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f777c6876638c7c587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f777c6863587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f7768587f517f7801007e817602fc00a06302fd00a063546752687f7801007e81727e7b7b687f75537f7c0376a9148801147f775379645579887567726881766968789263556753687a76026c057f7701147f8263517f7c766301007e817f7c6775006877686b537992635379528763547a6b547a6b677c6b567a6b537a7c717c71716868547a587f7c81547a557964936755795187637c686b687c547f7701207f75748c7a7669765880748c7a76567a876457790376a9147e7c7e557967041976a9147c7e0288ac687e7e5579636c766976748c7a9d58807e6c0376a9147e748c7a7e6c7e7e676c766b8263828c007c80517e846864745aa0637c748c7a76697d937b7b58807e56790376a9147e748c7a7e55797e7e6868686c567a5187637500678263828c007c80517e846868647459a0637c748c7a76697d937b7b58807e55790376a9147e748c7a7e55797e7e687459a0637c748c7a76697d937b7b58807e55790376a9147e748c7a7e55797e7e68687c537a9d547963557958807e041976a91455797e0288ac7e7e68aa87726d77776a1407e03abd6bc66352d693a93173516b835bf81c630100055441414c54036f6e65'
const scriptV2WithSymbol = '76a914563d403dd9877585525248aba5542b8783c292cd88ac6976aa607f5f7f7c5e7f7c5d7f7c5c7f7c5b7f7c5a7f7c597f7c587f7c577f7c567f7c557f7c547f7c537f7c527f7c517f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7c5f7f7c5e7f7c5d7f7c5c7f7c5b7f7c5a7f7c597f7c587f7c577f7c567f7c557f7c547f7c537f7c527f7c517f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e01007e818b21414136d08c5ed2bf3ba048afe6dcaebafeffffffffffffffffffffffffffffff007d976e7c5296a06394677768827601249301307c7e23022079be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798027e7c7e7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e01417e21038ff83d8cf12121491609c4939dc11c4aa35503508fe432dc5a5c1905608b9218ad547f7701207f01207f7701247f517f7801007e8102fd00a063546752687f7801007e817f727e7b01177f777b557a766471567a577a786354807e7e676d68aa880067765158a569765187645294567a5379587a7e7e78637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6867567a6876aa587a7d54807e577a597a5a7a786354807e6f7e7eaa727c7e676d6e7eaa7c687b7eaa587a7d877663516752687c72879b69537a647500687c7b547f77517f7853a0916901247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f77788c6301247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f777852946301247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f77686877517f7c52797d8b9f7c53a09b91697c76638c7c587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f777c6876638c7c587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f777c6863587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f7768587f517f7801007e817602fc00a06302fd00a063546752687f7801007e81727e7b7b687f75537f7c0376a9148801147f775379645579887567726881766968789263556753687a76026c057f7701147f8263517f7c766301007e817f7c6775006877686b537992635379528763547a6b547a6b677c6b567a6b537a7c717c71716868547a587f7c81547a557964936755795187637c686b687c547f7701207f75748c7a7669765880748c7a76567a876457790376a9147e7c7e557967041976a9147c7e0288ac687e7e5579636c766976748c7a9d58807e6c0376a9147e748c7a7e6c7e7e676c766b8263828c007c80517e846864745aa0637c748c7a76697d937b7b58807e56790376a9147e748c7a7e55797e7e6868686c567a5187637500678263828c007c80517e846868647459a0637c748c7a76697d937b7b58807e55790376a9147e748c7a7e55797e7e687459a0637c748c7a76697d937b7b58807e55790376a9147e748c7a7e55797e7e68687c537a9d547963557958807e041976a91455797e0288ac7e7e68aa87726d77776a1407e03abd6bc66352d693a93173516b835bf81c630100055441414c54036f6e65'
const scriptV2Unsplittable = '76a914bee5f58678ff2e417fa0462e328065068ca401b588ac6976aa607f5f7f7c5e7f7c5d7f7c5c7f7c5b7f7c5a7f7c597f7c587f7c577f7c567f7c557f7c547f7c537f7c527f7c517f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7c5f7f7c5e7f7c5d7f7c5c7f7c5b7f7c5a7f7c597f7c587f7c577f7c567f7c557f7c547f7c537f7c527f7c517f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e01007e818b21414136d08c5ed2bf3ba048afe6dcaebafeffffffffffffffffffffffffffffff007d976e7c5296a06394677768827601249301307c7e23022079be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798027e7c7e7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e01417e21038ff83d8cf12121491609c4939dc11c4aa35503508fe432dc5a5c1905608b9218ad547f7701207f01207f7701247f517f7801007e8102fd00a063546752687f7801007e817f727e7b01177f777b557a766471567a577a786354807e7e676d68aa880067765158a569765187645294567a5379587a7e7e78637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6867567a6876aa587a7d54807e577a597a5a7a786354807e6f7e7eaa727c7e676d6e7eaa7c687b7eaa587a7d877663516752687c72879b69537a647500687c7b547f77517f7853a0916901247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f77788c6301247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f777852946301247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f77686877517f7c52797d8b9f7c53a09b91697c76638c7c587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f777c6876638c7c587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f777c6863587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f7768587f517f7801007e817602fc00a06302fd00a063546752687f7801007e81727e7b7b687f75537f7c0376a9148801147f775379645579887567726881766968789263556753687a76026c057f7701147f8263517f7c766301007e817f7c6775006877686b537992635379528763547a6b547a6b677c6b567a6b537a7c717c71716868547a587f7c81547a557964936755795187637c686b687c547f7701207f75748c7a7669765880748c7a76567a876457790376a9147e7c7e557967041976a9147c7e0288ac687e7e5579636c766976748c7a9d58807e6c0376a9147e748c7a7e6c7e7e676c766b8263828c007c80517e846864745aa0637c748c7a76697d937b7b58807e56790376a9147e748c7a7e55797e7e6868686c567a5187637500678263828c007c80517e846868647459a0637c748c7a76697d937b7b58807e55790376a9147e748c7a7e55797e7e687459a0637c748c7a76697d937b7b58807e55790376a9147e748c7a7e55797e7e68687c537a9d547963557958807e041976a91455797e0288ac7e7e68aa87726d77776a1407e03abd6bc66352d693a93173516b835bf81c630101055441414c540374776f'

const scriptV2WithData = '76a914563d403dd9877585525248aba5542b8783c292cd88ac6976aa607f5f7f7c5e7f7c5d7f7c5c7f7c5b7f7c5a7f7c597f7c587f7c577f7c567f7c557f7c547f7c537f7c527f7c517f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7c5f7f7c5e7f7c5d7f7c5c7f7c5b7f7c5a7f7c597f7c587f7c577f7c567f7c557f7c547f7c537f7c527f7c517f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e01007e818b21414136d08c5ed2bf3ba048afe6dcaebafeffffffffffffffffffffffffffffff007d976e7c5296a06394677768827601249301307c7e23022079be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798027e7c7e7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e01417e21038ff83d8cf12121491609c4939dc11c4aa35503508fe432dc5a5c1905608b9218ad547f7701207f01207f7701247f517f7801007e8102fd00a063546752687f7801007e817f727e7b01177f777b557a766471567a577a786354807e7e676d68aa880067765158a569765187645294567a5379587a7e7e78637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6867567a6876aa587a7d54807e577a597a5a7a786354807e6f7e7eaa727c7e676d6e7eaa7c687b7eaa587a7d877663516752687c72879b69537a647500687c7b547f77517f7853a0916901247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f77788c6301247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f777852946301247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f77686877517f7c52797d8b9f7c53a09b91697c76638c7c587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f777c6876638c7c587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f777c6863587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f7768587f517f7801007e817602fc00a06302fd00a063546752687f7801007e81727e7b7b687f75537f7c0376a9148801147f775379645579887567726881766968789263556753687a76026c057f7701147f8263517f7c766301007e817f7c6775006877686b537992635379528763547a6b547a6b677c6b567a6b537a7c717c71716868547a587f7c81547a557964936755795187637c686b687c547f7701207f75748c7a7669765880748c7a76567a876457790376a9147e7c7e557967041976a9147c7e0288ac687e7e5579636c766976748c7a9d58807e6c0376a9147e748c7a7e6c7e7e676c766b8263828c007c80517e846864745aa0637c748c7a76697d937b7b58807e56790376a9147e748c7a7e55797e7e6868686c567a5187637500678263828c007c80517e846868647459a0637c748c7a76697d937b7b58807e55790376a9147e748c7a7e55797e7e687459a0637c748c7a76697d937b7b58807e55790376a9147e748c7a7e55797e7e68687c537a9d547963557958807e041976a91455797e0288ac7e7e68aa87726d77776a1407e03abd6bc66352d693a93173516b835bf81c630100055441414c54036f6e65'
const scriptV2NoData = '76a914c47abdc3542a74efe0df07f1f4f71bb83b90323888ac6976aa607f5f7f7c5e7f7c5d7f7c5c7f7c5b7f7c5a7f7c597f7c587f7c577f7c567f7c557f7c547f7c537f7c527f7c517f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7c5f7f7c5e7f7c5d7f7c5c7f7c5b7f7c5a7f7c597f7c587f7c577f7c567f7c557f7c547f7c537f7c527f7c517f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e01007e818b21414136d08c5ed2bf3ba048afe6dcaebafeffffffffffffffffffffffffffffff007d976e7c5296a06394677768827601249301307c7e23022079be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798027e7c7e7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e01417e21038ff83d8cf12121491609c4939dc11c4aa35503508fe432dc5a5c1905608b9218ad547f7701207f01207f7701247f517f7801007e8102fd00a063546752687f7801007e817f727e7b01177f777b557a766471567a577a786354807e7e676d68aa880067765158a569765187645294567a5379587a7e7e78637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6867567a6876aa587a7d54807e577a597a5a7a786354807e6f7e7eaa727c7e676d6e7eaa7c687b7eaa587a7d877663516752687c72879b69537a647500687c7b547f77517f7853a0916901247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f77788c6301247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f777852946301247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f77686877517f7c52797d8b9f7c53a09b91697c76638c7c587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f777c6876638c7c587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f777c6863587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f7768587f517f7801007e817602fc00a06302fd00a063546752687f7801007e81727e7b7b687f75537f7c0376a9148801147f775379645579887567726881766968789263556753687a76026c057f7701147f8263517f7c766301007e817f7c6775006877686b537992635379528763547a6b547a6b677c6b567a6b537a7c717c71716868547a587f7c81547a557964936755795187637c686b687c547f7701207f75748c7a7669765880748c7a76567a876457790376a9147e7c7e557967041976a9147c7e0288ac687e7e5579636c766976748c7a9d58807e6c0376a9147e748c7a7e6c7e7e676c766b8263828c007c80517e846864745aa0637c748c7a76697d937b7b58807e56790376a9147e748c7a7e55797e7e6868686c567a5187637500678263828c007c80517e846868647459a0637c748c7a76697d937b7b58807e55790376a9147e748c7a7e55797e7e687459a0637c748c7a76697d937b7b58807e55790376a9147e748c7a7e55797e7e68687c537a9d547963557958807e041976a91455797e0288ac7e7e68aa87726d77776a1407e03abd6bc66352d693a93173516b835bf81c630100055441414c54'

function testGetVersion () {
  const got = getVersion(scriptV2WithData)
  const expected = 2

  try {
    assert.equal(got, expected)

    console.log('Passed.')
  } catch (error) {
    console.error(`Failed. Expected ${expected}, got ${got}`)
  }
}

function testGetVersionUnsplittable () {
  const got = getVersion(scriptV2Unsplittable)
  const expected = 2

  try {
    assert.equal(got, expected)

    console.log('Passed.')
  } catch (error) {
    console.error(`testGetVersionUnsplittable Failed. Expected ${expected}, got ${got}`)
  }
}
function testGetScriptFlags () {
  // const script = 'OP_DUP OP_HASH160 dd823a0b3a6b1ed5683a10980089254099160394 OP_EQUALVERIFY OP_CHECKSIG OP_VERIFY OP_DUP OP_HASH256 16 OP_SPLIT 15 OP_SPLIT OP_SWAP 14 OP_SPLIT OP_SWAP 13 OP_SPLIT OP_SWAP 12 OP_SPLIT OP_SWAP 11 OP_SPLIT OP_SWAP 10 OP_SPLIT OP_SWAP 9 OP_SPLIT OP_SWAP 8 OP_SPLIT OP_SWAP 7 OP_SPLIT OP_SWAP 6 OP_SPLIT OP_SWAP 5 OP_SPLIT OP_SWAP 4 OP_SPLIT OP_SWAP 3 OP_SPLIT OP_SWAP 2 OP_SPLIT OP_SWAP 1 OP_SPLIT OP_SWAP OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_SWAP 15 OP_SPLIT OP_SWAP 14 OP_SPLIT OP_SWAP 13 OP_SPLIT OP_SWAP 12 OP_SPLIT OP_SWAP 11 OP_SPLIT OP_SWAP 10 OP_SPLIT OP_SWAP 9 OP_SPLIT OP_SWAP 8 OP_SPLIT OP_SWAP 7 OP_SPLIT OP_SWAP 6 OP_SPLIT OP_SWAP 5 OP_SPLIT OP_SWAP 4 OP_SPLIT OP_SWAP 3 OP_SPLIT OP_SWAP 2 OP_SPLIT OP_SWAP 1 OP_SPLIT OP_SWAP OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT 0 OP_CAT OP_BIN2NUM OP_1ADD 414136d08c5ed2bf3ba048afe6dcaebafeffffffffffffffffffffffffffffff00 OP_TUCK OP_MOD OP_2DUP OP_SWAP 2 OP_DIV OP_GREATERTHAN OP_IF OP_SUB OP_ELSE OP_NIP OP_ENDIF OP_SIZE OP_DUP 36 OP_ADD 48 OP_SWAP OP_CAT 022079be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f8179802 OP_CAT OP_SWAP OP_CAT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_SIZE OP_DUP OP_IF OP_1SUB OP_ENDIF OP_SPLIT OP_SWAP OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT OP_CAT 65 OP_CAT 038ff83d8cf12121491609c4939dc11c4aa35503508fe432dc5a5c1905608b9218 OP_CHECKSIGVERIFY 4 OP_SPLIT OP_NIP 32 OP_SPLIT 32 OP_SPLIT OP_NIP 36 OP_SPLIT 1 OP_SPLIT OP_OVER 0 OP_CAT OP_BIN2NUM 253 OP_GREATERTHAN OP_IF 4 OP_ELSE 2 OP_ENDIF OP_SPLIT OP_OVER 0 OP_CAT OP_BIN2NUM OP_SPLIT OP_2SWAP OP_CAT OP_ROT 23 OP_SPLIT OP_NIP OP_ROT 5 OP_ROLL OP_DUP OP_NOTIF OP_2ROT 6 OP_ROLL 7 OP_ROLL OP_OVER OP_IF 4 OP_NUM2BIN OP_CAT OP_CAT OP_ELSE OP_2DROP OP_ENDIF OP_HASH256 OP_EQUALVERIFY 0 OP_ELSE OP_DUP 1 8 OP_WITHIN OP_VERIFY OP_DUP 1 OP_EQUAL OP_NOTIF 2 OP_SUB 6 OP_ROLL 3 OP_PICK 8 OP_ROLL OP_CAT OP_CAT OP_OVER OP_IF OP_SWAP OP_1SUB OP_SWAP 3 OP_PICK OP_CAT 7 OP_ROLL OP_CAT OP_ENDIF OP_OVER OP_IF OP_SWAP OP_1SUB OP_SWAP 3 OP_PICK OP_CAT 7 OP_ROLL OP_CAT OP_ENDIF OP_OVER OP_IF OP_SWAP OP_1SUB OP_SWAP 3 OP_PICK OP_CAT 7 OP_ROLL OP_CAT OP_ENDIF OP_OVER OP_IF OP_SWAP OP_1SUB OP_SWAP 3 OP_PICK OP_CAT 7 OP_ROLL OP_CAT OP_ENDIF OP_OVER OP_IF OP_SWAP OP_1SUB OP_SWAP 3 OP_PICK OP_CAT 7 OP_ROLL OP_CAT OP_ENDIF OP_ELSE 6 OP_ROLL OP_ENDIF OP_DUP OP_HASH256 8 OP_ROLL OP_TUCK 4 OP_NUM2BIN OP_CAT 7 OP_ROLL 9 OP_ROLL 10 OP_ROLL OP_OVER OP_IF 4 OP_NUM2BIN OP_CAT OP_3DUP OP_CAT OP_CAT OP_HASH256 OP_2SWAP OP_SWAP OP_CAT OP_ELSE OP_2DROP OP_2DUP OP_CAT OP_HASH256 OP_SWAP OP_ENDIF OP_ROT OP_CAT OP_HASH256 8 OP_ROLL OP_TUCK OP_EQUAL OP_DUP OP_IF 1 OP_ELSE 2 OP_ENDIF OP_SWAP OP_2SWAP OP_EQUAL OP_BOOLOR OP_VERIFY 3 OP_ROLL OP_NOTIF OP_DROP 0 OP_ENDIF OP_SWAP OP_ROT 4 OP_SPLIT OP_NIP 1 OP_SPLIT OP_OVER 3 OP_GREATERTHAN OP_NOT OP_VERIFY 36 OP_SPLIT OP_NIP 1 OP_SPLIT OP_SWAP 0 OP_CAT OP_BIN2NUM OP_DUP 252 OP_GREATERTHAN OP_IF 253 OP_GREATERTHAN OP_IF 4 OP_ELSE 2 OP_ENDIF OP_SPLIT OP_SWAP 0 OP_CAT OP_BIN2NUM OP_ENDIF 4 OP_ADD OP_SPLIT OP_NIP OP_OVER OP_1SUB OP_IF 36 OP_SPLIT OP_NIP 1 OP_SPLIT OP_SWAP 0 OP_CAT OP_BIN2NUM OP_DUP 252 OP_GREATERTHAN OP_IF 253 OP_GREATERTHAN OP_IF 4 OP_ELSE 2 OP_ENDIF OP_SPLIT OP_SWAP 0 OP_CAT OP_BIN2NUM OP_ENDIF 4 OP_ADD OP_SPLIT OP_NIP OP_OVER 2 OP_SUB OP_IF 36 OP_SPLIT OP_NIP 1 OP_SPLIT OP_SWAP 0 OP_CAT OP_BIN2NUM OP_DUP 252 OP_GREATERTHAN OP_IF 253 OP_GREATERTHAN OP_IF 4 OP_ELSE 2 OP_ENDIF OP_SPLIT OP_SWAP 0 OP_CAT OP_BIN2NUM OP_ENDIF 4 OP_ADD OP_SPLIT OP_NIP OP_ENDIF OP_ENDIF OP_NIP 1 OP_SPLIT OP_SWAP 2 OP_PICK OP_TUCK OP_1ADD OP_LESSTHAN OP_SWAP 3 OP_GREATERTHAN OP_BOOLOR OP_NOT OP_VERIFY OP_SWAP OP_DUP OP_IF OP_1SUB OP_SWAP 8 OP_SPLIT OP_NIP 1 OP_SPLIT OP_SWAP 0 OP_CAT OP_BIN2NUM OP_DUP 252 OP_GREATERTHAN OP_IF 253 OP_GREATERTHAN OP_IF 4 OP_ELSE 2 OP_ENDIF OP_SPLIT OP_SWAP 0 OP_CAT OP_BIN2NUM OP_ENDIF OP_SPLIT OP_NIP OP_SWAP OP_ENDIF OP_DUP OP_IF OP_1SUB OP_SWAP 8 OP_SPLIT OP_NIP 1 OP_SPLIT OP_SWAP 0 OP_CAT OP_BIN2NUM OP_DUP 252 OP_GREATERTHAN OP_IF 253 OP_GREATERTHAN OP_IF 4 OP_ELSE 2 OP_ENDIF OP_SPLIT OP_SWAP 0 OP_CAT OP_BIN2NUM OP_ENDIF OP_SPLIT OP_NIP OP_SWAP OP_ENDIF OP_IF 8 OP_SPLIT OP_NIP 1 OP_SPLIT OP_SWAP 0 OP_CAT OP_BIN2NUM OP_DUP 252 OP_GREATERTHAN OP_IF 253 OP_GREATERTHAN OP_IF 4 OP_ELSE 2 OP_ENDIF OP_SPLIT OP_SWAP 0 OP_CAT OP_BIN2NUM OP_ENDIF OP_SPLIT OP_NIP OP_ENDIF 8 OP_SPLIT 1 OP_SPLIT OP_OVER 0 OP_CAT OP_BIN2NUM OP_DUP 252 OP_GREATERTHAN OP_IF 253 OP_GREATERTHAN OP_IF 4 OP_ELSE 2 OP_ENDIF OP_SPLIT OP_OVER 0 OP_CAT OP_BIN2NUM OP_2SWAP OP_CAT OP_ROT OP_ROT OP_ENDIF OP_SPLIT OP_DROP 3 OP_SPLIT OP_SWAP 1354102 OP_EQUALVERIFY 20 OP_SPLIT OP_NIP 3 OP_PICK OP_NOTIF 5 OP_PICK OP_EQUALVERIFY OP_DROP OP_ELSE OP_2SWAP OP_ENDIF OP_BIN2NUM OP_DUP OP_VERIFY OP_ENDIF OP_OVER OP_0NOTEQUAL OP_IF 5 OP_ELSE 3 OP_ENDIF OP_ROLL OP_DUP 1388 OP_SPLIT OP_NIP 20 OP_SPLIT OP_SIZE OP_IF 1 OP_SPLIT OP_SWAP OP_DUP OP_IF 0 OP_CAT OP_BIN2NUM OP_SPLIT OP_SWAP OP_ELSE OP_DROP 0 OP_ENDIF OP_NIP OP_ENDIF OP_TOALTSTACK 3 OP_PICK OP_0NOTEQUAL OP_IF 3 OP_PICK 2 OP_EQUAL OP_IF 4 OP_ROLL OP_TOALTSTACK 4 OP_ROLL OP_TOALTSTACK OP_ELSE OP_SWAP OP_TOALTSTACK 6 OP_ROLL OP_TOALTSTACK 3 OP_ROLL OP_SWAP OP_2ROT OP_SWAP OP_2ROT OP_2ROT OP_ENDIF OP_ENDIF 4 OP_ROLL 8 OP_SPLIT OP_SWAP OP_BIN2NUM 4 OP_ROLL 5 OP_PICK OP_NOTIF OP_ADD OP_ELSE 5 OP_PICK 1 OP_EQUAL OP_IF OP_SWAP OP_ENDIF OP_TOALTSTACK OP_ENDIF OP_SWAP 4 OP_SPLIT OP_NIP 32 OP_SPLIT OP_DROP OP_DEPTH OP_1SUB OP_ROLL OP_DUP OP_VERIFY OP_DUP 8 OP_NUM2BIN OP_DEPTH OP_1SUB OP_ROLL OP_DUP 6 OP_ROLL OP_EQUAL OP_NOTIF 7 OP_PICK 1354102 OP_CAT OP_SWAP OP_CAT 5 OP_PICK OP_ELSE 346650137 OP_SWAP OP_CAT -11400 OP_ENDIF OP_CAT OP_CAT 5 OP_PICK OP_IF OP_FROMALTSTACK OP_DUP OP_VERIFY OP_DUP OP_DEPTH OP_1SUB OP_ROLL OP_NUMEQUALVERIFY 8 OP_NUM2BIN OP_CAT OP_FROMALTSTACK 1354102 OP_CAT OP_DEPTH OP_1SUB OP_ROLL OP_CAT OP_FROMALTSTACK OP_CAT OP_CAT OP_ELSE OP_FROMALTSTACK OP_DUP OP_TOALTSTACK OP_SIZE OP_IF OP_SIZE OP_1SUB 0 OP_SWAP OP_NUM2BIN 1 OP_CAT OP_AND OP_ENDIF OP_NOTIF OP_DEPTH 10 OP_GREATERTHAN OP_IF OP_SWAP OP_DEPTH OP_1SUB OP_ROLL OP_DUP OP_VERIFY OP_TUCK OP_ADD OP_ROT OP_ROT 8 OP_NUM2BIN OP_CAT 6 OP_PICK 1354102 OP_CAT OP_DEPTH OP_1SUB OP_ROLL OP_CAT 5 OP_PICK OP_CAT OP_CAT OP_ENDIF OP_ENDIF OP_ENDIF OP_FROMALTSTACK 6 OP_ROLL 1 OP_EQUAL OP_IF OP_DROP 0 OP_ELSE OP_SIZE OP_IF OP_SIZE OP_1SUB 0 OP_SWAP OP_NUM2BIN 1 OP_CAT OP_AND OP_ENDIF OP_ENDIF OP_NOTIF OP_DEPTH 9 OP_GREATERTHAN OP_IF OP_SWAP OP_DEPTH OP_1SUB OP_ROLL OP_DUP OP_VERIFY OP_TUCK OP_ADD OP_ROT OP_ROT 8 OP_NUM2BIN OP_CAT 5 OP_PICK 1354102 OP_CAT OP_DEPTH OP_1SUB OP_ROLL OP_CAT 5 OP_PICK OP_CAT OP_CAT OP_ENDIF OP_DEPTH 9 OP_GREATERTHAN OP_IF OP_SWAP OP_DEPTH OP_1SUB OP_ROLL OP_DUP OP_VERIFY OP_TUCK OP_ADD OP_ROT OP_ROT 8 OP_NUM2BIN OP_CAT 5 OP_PICK 1354102 OP_CAT OP_DEPTH OP_1SUB OP_ROLL OP_CAT 5 OP_PICK OP_CAT OP_CAT OP_ENDIF OP_ENDIF OP_SWAP 3 OP_ROLL OP_NUMEQUALVERIFY 4 OP_PICK OP_IF 5 OP_PICK 8 OP_NUM2BIN OP_CAT 346650137 5 OP_PICK OP_CAT -11400 OP_CAT OP_CAT OP_ENDIF OP_HASH256 OP_EQUAL OP_2SWAP OP_2DROP OP_NIP OP_NIP OP_RETURN e31ea6452b745434199cc2a92f33acc43f045624 0'
  const got = getScriptFlags(scriptV2WithData)
  const expected = 0

  try {
    assert.equal(got, expected)

    console.log('Passed.')
  } catch (error) {
    console.error(`testGetScriptFlags Failed. Expected ${expected}, got ${got}`)
  }
}

function testIsSplittable () {
  const got = isSplittable(scriptV2WithData)
  const expected = true

  try {
    assert.equal(got, expected)

    console.log('Passed.')
  } catch (error) {
    console.error(`testIsSplittable Failed. Expected ${expected}, got ${got}`)
  }
}

function testGetScriptData () {
  const got = getScriptData(scriptV2WithData)
  const expected = '6f6e65' // one

  try {
    assert.equal(got, expected)

    console.log('Passed.')
  } catch (error) {
    console.error(`testGetScriptData Failed. Expected ${expected}, got ${got}`)
  }
}

function testGetScriptDataNoData () {
  const got = getScriptData(scriptV2NoData)
  const expected = ''

  try {
    assert.equal(got, expected)

    console.log('Passed.')
  } catch (error) {
    console.error(`testGetScriptDataNoData Failed. Expected ${expected}, got ${got}`)
  }
}
function testGetSymbol () {
  const got = getSymbol(scriptV2WithSymbol)
  const expected = '5441414c54' // TAALT

  try {
    assert.equal(got, expected)

    console.log('Passed.')
  } catch (error) {
    console.error(`testGetSymbol Failed. Expected ${expected}, got ${got}`)
  }
}

testGetVersion()
testGetScriptFlags()
testIsSplittable()
testGetScriptData()
testGetScriptDataNoData()
testGetVersionUnsplittable()
testGetSymbol()
