const bsv = require("bsv");
require("dotenv").config();
const {
  P2PKH_UNLOCKING_SCRIPT_BYTES,
  validateSymbol,
  sighash,
} = require("./stas");
const { SATS_PER_BITCOIN } = require("./utils");

const feeSettings = require("./constants");

/* create a contract transaction containing a JSON schema detailing the token and sign using the callbacks
publicKey is the public key of the owner
inputUtxos are the UTXOs which the contract will spend
ownerSignCallback is the function that will sign the contract and will become the redeem address.
paymentUtxos and paymentSignCallback provide the fees for the transation
schema is the JSON schema describing the contract
tokenSatoshis are the amount of satoshis you will be issuing
*/
async function contractWithCallback(
  publicKey,
  inputUtxos,
  paymentUtxos,
  paymentPublicKey,
  schema,
  tokenSatoshis,
  ownerSignCallback,
  paymentSignCallback
) {
  let isUnsigned = false;
  const signInfoList = []; // for unsigned tx
  validateSchema(schema);

  if (
    inputUtxos === null ||
    !Array.isArray(inputUtxos) ||
    inputUtxos.length === 0
  ) {
    throw new Error("inputUtxos is invalid");
  }
  if (tokenSatoshis === 0) {
    throw new Error("Token satoshis is zero");
  }
  if (publicKey === null) {
    throw new Error("Issuer public key is null");
  }

  if (ownerSignCallback === null || ownerSignCallback === undefined) {
    isUnsigned = true;
    // throw new Error('ownerSignCallback is null')
  }
  if (
    paymentUtxos !== null &&
    paymentUtxos.length > 0 &&
    (paymentPublicKey === null || paymentSignCallback === null)
  ) {
    throw new Error(
      "Payment UTXOs provided but payment public key or paymentSignCallback is null"
    );
  }

  if (schema.satsPerToken > tokenSatoshis) {
    throw new Error(
      `Token amount ${tokenSatoshis} is less than satsPerToken ${schema.satsPerToken}`
    );
  }
  if (tokenSatoshis % schema.satsPerToken !== 0) {
    throw new Error(
      `Token amount ${tokenSatoshis} must be divisible by satsPerToken ${schema.satsPerToken}`
    );
  }
  let totalSatAmount = 0;
  for (var i = 0; i < inputUtxos.length; i++) {
    totalSatAmount += inputUtxos[i].satoshis;
  }
  if (tokenSatoshis * schema.satsPerToken > totalSatAmount) {
    throw new Error(
      `Token Supply of ${tokenSatoshis} with satsPerToken of ${schema.satsPerToken} is greater than input amount of ${totalSatAmount}`
    );
  }

  const issuerPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    publicKey.toBuffer()
  ).toString("hex");
  if (schema.tokenId !== issuerPublicKeyHash) {
    throw new Error("Schema has incorrect Token ID");
  }

  const tx = new bsv.Transaction();
  const isZeroFee =
    paymentUtxos === null ||
    (Array.isArray(paymentUtxos) && !paymentUtxos.length);

  let satoshis = 0;

  inputUtxos.forEach((utxo) => {
    satoshis += utxo.satoshis;
    tx.from(utxo);
    if (isUnsigned) {
      signInfoList.push({
        inputIndex: utxo.vout,
        publicKey: publicKey,
        sighash: sighash,
      });
    }
  });

  if (!isZeroFee) {
    paymentUtxos.forEach((utxo) => {
      satoshis += utxo.satoshis;
      tx.from(utxo);
      if (isUnsigned) {
        signInfoList.push({
          inputIndex: utxo.vout,
          publicKey: paymentPublicKey,
          sighash: sighash,
        });
      }
    });
  }

  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    publicKey.toBuffer()
  ).toString("hex");

  const contractScript = bsv.Script.fromASM(
    `OP_DUP OP_HASH160 ${publicKeyHash} OP_EQUALVERIFY OP_CHECKSIG`
  );

  contractScript.add(bsv.Script.buildDataOut(JSON.stringify(schema)));

  tx.addOutput(
    new bsv.Transaction.Output({
      script: contractScript,
      satoshis: tokenSatoshis,
    })
  );
  if (!isZeroFee) {
    const paymentPubKeyHash = bsv.crypto.Hash.sha256ripemd160(
      paymentPublicKey.toBuffer()
    ).toString("hex");
    const changeScript = bsv.Script.fromASM(
      `OP_DUP OP_HASH160 ${paymentPubKeyHash} OP_EQUALVERIFY OP_CHECKSIG`
    );

    // Calculate the change amount
    const txSize =
      tx.serialize(true).length / 2 +
      1 +
      8 +
      changeScript.toBuffer().length +
      tx.inputs.length * P2PKH_UNLOCKING_SCRIPT_BYTES;
    const dataFee = Math.ceil(
      (txSize * feeSettings.Sats) / feeSettings.PerByte
    );

    tx.addOutput(
      new bsv.Transaction.Output({
        script: changeScript,
        satoshis: Math.floor(satoshis - (dataFee + tokenSatoshis)),
      })
    );
    if (!isUnsigned) {
      await paymentSignCallback(tx);
    }
  } else {
    const issuerPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(
      publicKey.toBuffer()
    ).toString("hex");
    const changeScript = bsv.Script.fromASM(
      `OP_DUP OP_HASH160 ${issuerPublicKeyHash} OP_EQUALVERIFY OP_CHECKSIG`
    );

    tx.addOutput(
      new bsv.Transaction.Output({
        script: changeScript,
        satoshis: Math.floor(satoshis - tx.outputs[0]._satoshis),
      })
    );
  }
  if (!isUnsigned) {
    await ownerSignCallback(tx);
  } else {
    return {
      hex: tx.toString(true),
      json: JSON.stringify(tx),
      signingInfo: signInfoList,
    };
  }

  return tx.serialize(true);
}

module.exports = contractWithCallback;

function validateSchema(schema) {
  if (schema === null) {
    throw new Error("Schema is null");
  }
  if (typeof schema.symbol === "undefined" || !validateSymbol(schema.symbol)) {
    throw new Error(
      "Invalid Symbol. Must be between 1 and 128 long and contain alpahnumeric, '-', '_' chars."
    );
  }

  if (
    schema.satsPerToken === "undefined" ||
    schema.satsPerToken === 0 ||
    schema.satsPerToken == null
  ) {
    throw new Error("Invalid satsPerToken. Must be over 0.");
  }
  if (typeof schema.tokenId === "undefined" || schema.tokenId === null) {
    throw new Error("Token id is required");
  }
  if (
    typeof schema.totalSupply === "undefined" ||
    schema.totalSupply === null
  ) {
    throw new Error("Total Supply is required");
  }
}
