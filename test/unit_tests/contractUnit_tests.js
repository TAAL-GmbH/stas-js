const bsv = require("bsv");
const utils = require("../utils/test_utils");
const {
  contract,
  contractWithCallback,
  unsignedContract,
} = require("../../index");
const privateKeyStr = "Ky5XHRQvYEcEbtGoQQQETbctAgAQKvb3PocfJSnkyHuEj5Nzj1pb";
const privateKey = new bsv.PrivateKey(privateKeyStr);
const signCallBack = async (tx) => {
  tx.sign(privateKey);
};
const publicKeyHash = "fe5697f24aa6e72a1d5f034121156a81d4f46f95";
const incorrectPublicKeyHash = "1a59f0051a4e3585474d3af64fdc162a04e3f14f";
let symbol = "taalt";
let supply = 10000;
let schema = utils.schema(publicKeyHash, symbol, supply);

afterEach(async () => {
  schema.symbol = symbol;
  schema.satsPerToken = 1;
  schema.tokenId = publicKeyHash;
  supply = 10000;
});

describe("Contract Unit Tests", () => {
  it("should create return contract hex", async () => {
    expectedHex =
      "0100000002565bf78e8aca342409c0cc481cbda203430050c15f839be941b044d2790e44df0100000000ffffffff565bf78e8aca342409c0cc481cbda203430050c15f839be941b044d2790e44df0100000000ffffffff021027000000000000fd020476a914fe5697f24aa6e72a1d5f034121156a81d4f46f9588ac6a4de5037b226e616d65223a225461616c20546f6b656e222c22746f6b656e4964223a2266653536393766323461613665373261316435663033343132313135366138316434663436663935222c2270726f746f636f6c4964223a22546f2062652064656369646564222c2273796d626f6c223a227461616c74222c226465736372697074696f6e223a224578616d706c6520746f6b656e206f6e20746573746e6574222c22696d616765223a2268747470733a2f2f7777772e7461616c2e636f6d2f77702d636f6e74656e742f7468656d65732f7461616c5f76322f696d672f66617669636f6e2f66617669636f6e2d39367839362e706e67222c22746f74616c537570706c79223a31303030302c22646563696d616c73223a302c2273617473506572546f6b656e223a312c2270726f70657274696573223a7b226c6567616c223a7b227465726d73223a22c2a92032303230205441414c20544543484e4f4c4f474945532053455a435c6e414c4c205249474854532052455345525645442e20414e5920555345204f46205448495320534f465457415245204953205355424a45435420544f205445524d5320414e4420434f4e444954494f4e53204f46204c4943454e53452e20555345204f46205448495320534f46545741524520574954484f5554204c4943454e534520434f4e535449545554455320494e4652494e47454d454e54204f4620494e54454c4c45435455414c2050524f50455254592e20464f52204c4943454e53452044455441494c53204f462054484520534f4654574152452c20504c4541534520524546455220544f3a207777772e7461616c2e636f6d2f737461732d746f6b656e2d6c6963656e73652d61677265656d656e74222c226c6963656e63654964223a2231323334227d2c22697373756572223a7b226f7267616e69736174696f6e223a225461616c20546563686e6f6c6f676965732053455a43222c226c6567616c466f726d223a224c696d69746564204c696162696c697479205075626c696320436f6d70616e79222c22676f7665726e696e674c6177223a224341222c226d61696c696e6741646472657373223a223120566f6c63616e6f2053747265742c2043616e616461222c22697373756572436f756e747279223a2243594d222c226a7572697364696374696f6e223a22222c22656d61696c223a22696e666f407461616c2e636f6d227d2c226d657461223a7b22736368656d614964223a22746f6b656e31222c2277656273697465223a2268747470733a2f2f7461616c2e636f6d222c226c6567616c223a7b227465726d73223a22626c616820626c6168227d2c226d65646961223a7b2274797065223a226d7034227d7d7d7d2b5d1e00000000001976a914fe5697f24aa6e72a1d5f034121156a81d4f46f9588ac00000000";
    const hex = await contract(
      privateKey,
      getUtxo(),
      getUtxo(),
      privateKey,
      schema,
      supply
    );
    expect(hex).toBe(expectedHex);
  });

  it("should fail with null issuer privatekey", async () => {
    await expect(() =>
      contract(null, getUtxo(), getUtxo(), privateKey, schema, supply)
    ).rejects.toThrow("Issuer private key is null");
  });
});

describe("UnsignedContract Unit Tests", () => {
  it("should return contract hex", async () => {
    const expectedHex =
      "0100000002565bf78e8aca342409c0cc481cbda203430050c15f839be941b044d2790e44df0100000000ffffffff565bf78e8aca342409c0cc481cbda203430050c15f839be941b044d2790e44df0100000000ffffffff021027000000000000fd020476a914fe5697f24aa6e72a1d5f034121156a81d4f46f9588ac6a4de5037b226e616d65223a225461616c20546f6b656e222c22746f6b656e4964223a2266653536393766323461613665373261316435663033343132313135366138316434663436663935222c2270726f746f636f6c4964223a22546f2062652064656369646564222c2273796d626f6c223a227461616c74222c226465736372697074696f6e223a224578616d706c6520746f6b656e206f6e20746573746e6574222c22696d616765223a2268747470733a2f2f7777772e7461616c2e636f6d2f77702d636f6e74656e742f7468656d65732f7461616c5f76322f696d672f66617669636f6e2f66617669636f6e2d39367839362e706e67222c22746f74616c537570706c79223a31303030302c22646563696d616c73223a302c2273617473506572546f6b656e223a312c2270726f70657274696573223a7b226c6567616c223a7b227465726d73223a22c2a92032303230205441414c20544543484e4f4c4f474945532053455a435c6e414c4c205249474854532052455345525645442e20414e5920555345204f46205448495320534f465457415245204953205355424a45435420544f205445524d5320414e4420434f4e444954494f4e53204f46204c4943454e53452e20555345204f46205448495320534f46545741524520574954484f5554204c4943454e534520434f4e535449545554455320494e4652494e47454d454e54204f4620494e54454c4c45435455414c2050524f50455254592e20464f52204c4943454e53452044455441494c53204f462054484520534f4654574152452c20504c4541534520524546455220544f3a207777772e7461616c2e636f6d2f737461732d746f6b656e2d6c6963656e73652d61677265656d656e74222c226c6963656e63654964223a2231323334227d2c22697373756572223a7b226f7267616e69736174696f6e223a225461616c20546563686e6f6c6f676965732053455a43222c226c6567616c466f726d223a224c696d69746564204c696162696c697479205075626c696320436f6d70616e79222c22676f7665726e696e674c6177223a224341222c226d61696c696e6741646472657373223a223120566f6c63616e6f2053747265742c2043616e616461222c22697373756572436f756e747279223a2243594d222c226a7572697364696374696f6e223a22222c22656d61696c223a22696e666f407461616c2e636f6d227d2c226d657461223a7b22736368656d614964223a22746f6b656e31222c2277656273697465223a2268747470733a2f2f7461616c2e636f6d222c226c6567616c223a7b227465726d73223a22626c616820626c6168227d2c226d65646961223a7b2274797065223a226d7034227d7d7d7d2b5d1e00000000001976a914fe5697f24aa6e72a1d5f034121156a81d4f46f9588ac00000000";
    const res = await unsignedContract(
      privateKey.publicKey,
      getUtxo(),
      getUtxo(),
      privateKey.publicKey,
      schema,
      supply
    );
    expect(res.hex).toBe(expectedHex);
  });
});

describe("ContractWithCallback Unit Tests", () => {
  it("should create hex with contractWithCallback", async () => {
    expectedHex =
      "0100000002565bf78e8aca342409c0cc481cbda203430050c15f839be941b044d2790e44df0100000000ffffffff565bf78e8aca342409c0cc481cbda203430050c15f839be941b044d2790e44df0100000000ffffffff021027000000000000fd020476a914fe5697f24aa6e72a1d5f034121156a81d4f46f9588ac6a4de5037b226e616d65223a225461616c20546f6b656e222c22746f6b656e4964223a2266653536393766323461613665373261316435663033343132313135366138316434663436663935222c2270726f746f636f6c4964223a22546f2062652064656369646564222c2273796d626f6c223a227461616c74222c226465736372697074696f6e223a224578616d706c6520746f6b656e206f6e20746573746e6574222c22696d616765223a2268747470733a2f2f7777772e7461616c2e636f6d2f77702d636f6e74656e742f7468656d65732f7461616c5f76322f696d672f66617669636f6e2f66617669636f6e2d39367839362e706e67222c22746f74616c537570706c79223a31303030302c22646563696d616c73223a302c2273617473506572546f6b656e223a312c2270726f70657274696573223a7b226c6567616c223a7b227465726d73223a22c2a92032303230205441414c20544543484e4f4c4f474945532053455a435c6e414c4c205249474854532052455345525645442e20414e5920555345204f46205448495320534f465457415245204953205355424a45435420544f205445524d5320414e4420434f4e444954494f4e53204f46204c4943454e53452e20555345204f46205448495320534f46545741524520574954484f5554204c4943454e534520434f4e535449545554455320494e4652494e47454d454e54204f4620494e54454c4c45435455414c2050524f50455254592e20464f52204c4943454e53452044455441494c53204f462054484520534f4654574152452c20504c4541534520524546455220544f3a207777772e7461616c2e636f6d2f737461732d746f6b656e2d6c6963656e73652d61677265656d656e74222c226c6963656e63654964223a2231323334227d2c22697373756572223a7b226f7267616e69736174696f6e223a225461616c20546563686e6f6c6f676965732053455a43222c226c6567616c466f726d223a224c696d69746564204c696162696c697479205075626c696320436f6d70616e79222c22676f7665726e696e674c6177223a224341222c226d61696c696e6741646472657373223a223120566f6c63616e6f2053747265742c2043616e616461222c22697373756572436f756e747279223a2243594d222c226a7572697364696374696f6e223a22222c22656d61696c223a22696e666f407461616c2e636f6d227d2c226d657461223a7b22736368656d614964223a22746f6b656e31222c2277656273697465223a2268747470733a2f2f7461616c2e636f6d222c226c6567616c223a7b227465726d73223a22626c616820626c6168227d2c226d65646961223a7b2274797065223a226d7034227d7d7d7d2b5d1e00000000001976a914fe5697f24aa6e72a1d5f034121156a81d4f46f9588ac00000000";
    const hex = await contractWithCallback(
      privateKey.publicKey,
      getUtxo(),
      getUtxo(),
      privateKey.publicKey,
      schema,
      supply,
      signCallBack,
      signCallBack
    );
    expect(hex).toBe(expectedHex);
  });

  it("should fail with incorrect publicKeyHash in schema", async () => {
    schema.tokenId = incorrectPublicKeyHash;
    await expect(() =>
      contractWithCallback(
        privateKey,
        getUtxo(),
        getUtxo(),
        privateKey,
        schema,
        supply,
        signCallBack,
        signCallBack
      )
    ).rejects.toThrow("Schema has incorrect Token ID");
  });

  it("should fail with null schema", async () => {
    await expect(() =>
      contractWithCallback(
        privateKey,
        getUtxo(),
        getUtxo(),
        privateKey,
        null,
        supply,
        signCallBack,
        signCallBack
      )
    ).rejects.toThrow("Schema is null");
  });

  it("should fail with null issuer publickey", async () => {
    await expect(() =>
      contractWithCallback(
        null,
        getUtxo(),
        getUtxo(),
        privateKey,
        schema,
        supply,
        signCallBack,
        signCallBack
      )
    ).rejects.toThrow("Issuer public key is null");
  });

  it("should fail with null funding publickey", async () => {
    await expect(() =>
      contractWithCallback(
        privateKey,
        getUtxo(),
        getUtxo(),
        null,
        schema,
        supply,
        signCallBack,
        signCallBack
      )
    ).rejects.toThrow(
      "Payment UTXOs provided but payment public key or paymentSignCallback is null"
    );
  });

  it("should fail with null contract utxo", async () => {
    await expect(() =>
      contractWithCallback(
        privateKey,
        null,
        getUtxo(),
        privateKey,
        schema,
        supply,
        signCallBack,
        signCallBack
      )
    ).rejects.toThrow("inputUtxos is invalid");
  });

  it("should fail with supply > contract amount", async () => {
    supply = 2000000;
    await expect(() =>
      contractWithCallback(
        privateKey,
        getUtxo(),
        getUtxo(),
        privateKey,
        schema,
        supply,
        signCallBack,
        signCallBack
      )
    ).rejects.toThrow(
      "Token Supply of 2000000 with satsPerToken of 1 is greater than input amount of 1000000"
    );
  });

  it("should fail with supply !/ sats per token", async () => {
    supply = 33;
    schema.satsPerToken = 5;
    await expect(() =>
      contractWithCallback(
        privateKey,
        getUtxo(),
        getUtxo(),
        privateKey,
        schema,
        supply,
        signCallBack,
        signCallBack
      )
    ).rejects.toThrow("Token amount 33 must be divisible by satsPerToken 5");
  });

  it("should fail with satsPerToken > supply", async () => {
    supply = 50;
    schema.satsPerToken = 100;
    await expect(() =>
      contractWithCallback(
        privateKey,
        getUtxo(),
        getUtxo(),
        privateKey,
        schema,
        supply,
        signCallBack,
        signCallBack
      )
    ).rejects.toThrow("Token amount 50 is less than satsPerToken 100");
  });

  it("should fail with satsPertoken * supply > contract amount", async () => {
    schema.satsPerToken = 5000;
    await expect(() =>
      contractWithCallback(
        privateKey,
        getUtxo(),
        getUtxo(),
        privateKey,
        schema,
        supply,
        signCallBack,
        signCallBack
      )
    ).rejects.toThrow(
      "Token Supply of 10000 with satsPerToken of 5000 is greater than input amount of 1000000"
    );
  });

  it("should fail with non array contract utxo", async () => {
    await expect(() =>
      contractWithCallback(
        privateKey,
        {
          txid: "df440e79d244b041e99b835fc150004303a2bd1c48ccc0092434ca8a8ef75b56",
          vout: 1,
          scriptPubKey: "76a91460caf30b66c1dbbc97c8009ceb2478452899a36888ac",
          satoshis: 1000000,
        },
        getUtxo(),
        privateKey,
        schema,
        supply,
        signCallBack,
        signCallBack
      )
    ).rejects.toThrow("inputUtxos is invalid");
  });

  it("should fail with empty array contract utxo", async () => {
    await expect(() =>
      contractWithCallback(
        privateKey,
        [],
        getUtxo(),
        privateKey,
        schema,
        supply,
        signCallBack,
        signCallBack
      )
    ).rejects.toThrow("inputUtxos is invalid");
  });

  test.each([
    { supply: null, error: "Token amount null is less than satsPerToken 1" },
    { supply: -1, error: "Token amount -1 is less than satsPerToken 1" },
    { supply: 0, error: "Token satoshis is zero" },
  ])('should fail invalid supply of "$supply"', async ({ supply, error }) => {
    await expect(() =>
      contractWithCallback(
        privateKey,
        getUtxo(),
        getUtxo(),
        privateKey,
        schema,
        supply,
        signCallBack,
        signCallBack
      )
    ).rejects.toThrow(error);
  });

  test.each([
    { invalidCharsSymbol: "!invalid..;" },
    { invalidCharsSymbol: "&@invalid\"'+=" },
    { invalidCharsSymbol: null },
  ])(
    'should fail with invalid symbol "$invalidCharsSymbol}"',
    async ({ invalidCharsSymbol }) => {
      schema.symbol = invalidCharsSymbol;
      await expect(() =>
        contractWithCallback(
          privateKey,
          getUtxo(),
          getUtxo(),
          privateKey,
          schema,
          supply,
          signCallBack,
          signCallBack
        )
      ).rejects.toThrow(
        "Invalid Symbol. Must be between 1 and 128 long and contain alpahnumeric, '-', '_' chars."
      );
    }
  );
});

function getUtxo() {
  return [
    {
      txid: "df440e79d244b041e99b835fc150004303a2bd1c48ccc0092434ca8a8ef75b56",
      vout: 1,
      scriptPubKey: "76a91460caf30b66c1dbbc97c8009ceb2478452899a36888ac",
      satoshis: 1000000,
    },
  ];
}
