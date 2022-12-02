const utils = require("../../utils/test_utils");
const bsv = require("bsv");
const expect = require("chai").expect;

require("dotenv").config();

const {
  createSwapOffer,
  acceptSwapOffer,
  createUnsignedSwapOffer,
  acceptUnsignedSwapOffer,
  acceptUnsignedNativeSwapOffer,
  makerSignSwapOffer,
} = require("../../../index").swap;

const {
  bitcoinToSatoshis,
  getTransaction,
  getRawTransaction,
  getFundsFromFaucet,
  broadcast,
} = require("../../../index").utils;

const { contract, issue } = require("../../../index");

let fundingPrivateKey;
let bobPrivateKey;
let alicePrivateKey;
let bobAddr;
let aliceAddr;
let paymentPublicKeyHash;
let tokenAIssueHex;
let tokenBIssueHex;
let tokenAObj;
let tokenBObj;
let tokenBIssueTx;
let tokenAIssueTxid;
let tokenBIssueTxid;
let fundingUTXO;
let alicePublicKeyHash;
let bobPublicKeyHash;
let tokenASymbol;
let tokenBSymbol;

beforeAll(async function () {
  await setup();
});

// todo refactor
describe("atomic swap functional sad tests", function () {
  it("Swap - 2 step token-p2pkh swap with incorrect swap offer privatekey", async function () {
    const incorrectPrivateKey = bsv.PrivateKey();
    const makerVout = 0;
    const takerVout = 0;
    const makerStasTx = bsv.Transaction(tokenBIssueHex);
    const makerStasInputScript = makerStasTx.outputs[makerVout].script;
    const bobUtxos = await getFundsFromFaucet(
      bobPrivateKey.toAddress(process.env.NETWORK).toString()
    );
    const takerInputTxHex = await getRawTransaction(bobUtxos[0].txid);
    const alicePublicKeyHash = bsv.crypto.Hash.sha256ripemd160(
      alicePrivateKey.publicKey.toBuffer()
    ).toString("hex");

    const makerInputSatoshis = tokenBObj.outputs[makerVout].satoshis;
    const takerOutputSatoshis = makerInputSatoshis;
    const makerOutputSatoshis = bobUtxos[0].satoshis;
    const takerInputSatoshis = makerOutputSatoshis;

    const makerInputUtxo = {
      txId: tokenBIssueTxid,
      outputIndex: takerVout,
      script: makerStasInputScript,
      satoshis: makerInputSatoshis,
    };

    const wantedInfo = { type: "native", satoshis: makerOutputSatoshis };

    const swapOfferHex = await createSwapOffer(
      incorrectPrivateKey,
      makerInputUtxo,
      wantedInfo
    );
    // now bob takes the offer
    const fundingUTXO = {
      txid: tokenBIssueTxid,
      vout: 1,
      scriptPubKey: tokenBIssueTx.vout[1].scriptPubKey.hex,
      satoshis: bitcoinToSatoshis(tokenBIssueTx.vout[1].value),
    };

    const takerInputUTXO = {
      txId: bobUtxos[0].txid,
      outputIndex: bobUtxos[0].vout,
      script: bsv.Script.fromHex(bobUtxos[0].scriptPubKey),
      satoshis: takerInputSatoshis,
    };

    const fullySignedSwapHex = await acceptSwapOffer(
      swapOfferHex,
      tokenBIssueHex,
      bobPrivateKey,
      takerInputTxHex,
      takerInputUTXO,
      takerOutputSatoshis,
      alicePublicKeyHash,
      fundingUTXO,
      fundingPrivateKey
    );
    try {
      await broadcast(fullySignedSwapHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.response.data).to.contain(
        "mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)"
      );
    }
  });

  it("Swap - 2 step token-p2pkh swap with incorrect swap accept privatekey", async function () {
    const incorrectPrivateKey = bsv.PrivateKey();
    const makerVout = 0;
    const takerVout = 0;
    const makerStasTx = bsv.Transaction(tokenBIssueHex);
    const makerStasInputScript = makerStasTx.outputs[makerVout].script;

    // taker gets some funds
    const bobUtxos = await getFundsFromFaucet(
      bobPrivateKey.toAddress(process.env.NETWORK).toString()
    );
    // get input transaction
    const takerInputTxHex = await getRawTransaction(bobUtxos[0].txid);

    const alicePublicKeyHash = bsv.crypto.Hash.sha256ripemd160(
      alicePrivateKey.publicKey.toBuffer()
    ).toString("hex");

    const makerInputSatoshis = tokenBObj.outputs[makerVout].satoshis;
    const takerOutputSatoshis = makerInputSatoshis;
    const makerOutputSatoshis = bobUtxos[0].satoshis;
    const takerInputSatoshis = makerOutputSatoshis;

    const makerInputUtxo = {
      txId: tokenBIssueTxid,
      outputIndex: takerVout,
      script: makerStasInputScript,
      satoshis: makerInputSatoshis,
    };

    const wantedInfo = { type: "native", satoshis: makerOutputSatoshis };

    const swapOfferHex = await createSwapOffer(
      alicePrivateKey,
      makerInputUtxo,
      wantedInfo
    );
    // now bob takes the offer
    const fundingUTXO = {
      txid: tokenBIssueTxid,
      vout: 1,
      scriptPubKey: tokenBIssueTx.vout[1].scriptPubKey.hex,
      satoshis: bitcoinToSatoshis(tokenBIssueTx.vout[1].value),
    };

    const takerInputUTXO = {
      txId: bobUtxos[0].txid,
      outputIndex: bobUtxos[0].vout,
      script: bsv.Script.fromHex(bobUtxos[0].scriptPubKey),
      satoshis: takerInputSatoshis,
    };

    const fullySignedSwapHex = await acceptSwapOffer(
      swapOfferHex,
      tokenBIssueHex,
      incorrectPrivateKey,
      takerInputTxHex,
      takerInputUTXO,
      takerOutputSatoshis,
      alicePublicKeyHash,
      fundingUTXO,
      fundingPrivateKey
    );
    try {
      await broadcast(fullySignedSwapHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.response.data).to.contain(
        "mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)"
      );
    }
  });

  it("Swap - 2 step p2pkh-token swap with createSwapOffer incorrect privatekey", async function () {
    const incorrectPrivateKey = bsv.PrivateKey();
    const takerStasInputScriptHex = tokenAObj.outputs[0].script.toHex();
    const aliceUtxos = await getFundsFromFaucet(
      alicePrivateKey.toAddress(process.env.NETWORK).toString()
    );
    const makerInputHex = await getRawTransaction(aliceUtxos[0].txid);

    const makerInputSatoshis = aliceUtxos[0].satoshis;
    const takerOutputSatoshis = makerInputSatoshis;
    const makerOutputSatoshis = tokenAObj.outputs[0].satoshis;
    const takerInputSatoshis = makerOutputSatoshis;

    const wantedInfo = {
      scriptHex: takerStasInputScriptHex,
      satoshis: makerOutputSatoshis,
    };

    const makerUtxo = {
      txId: aliceUtxos[0].txid,
      outputIndex: aliceUtxos[0].vout,
      script: bsv.Script.fromHex(aliceUtxos[0].scriptPubKey), // makerStasInputScript,
      satoshis: makerInputSatoshis,
    };
    const swapOfferHex = await createSwapOffer(
      incorrectPrivateKey,
      makerUtxo,
      wantedInfo
    );
    const takerInputUTXO = {
      txId: tokenAIssueTxid,
      outputIndex: 0,
      script: tokenAObj.outputs[0].script,
      satoshis: takerInputSatoshis,
    };

    const fullySignedSwapHex = await acceptSwapOffer(
      swapOfferHex,
      makerInputHex,
      bobPrivateKey,
      tokenAIssueHex,
      takerInputUTXO,
      takerOutputSatoshis,
      alicePublicKeyHash,
      fundingUTXO,
      fundingPrivateKey
    );
    try {
      await broadcast(fullySignedSwapHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.response.data).to.contain(
        "mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)"
      );
    }
  });

  it("Swap - 2 step p2pkh-token swap with acceptSwapOffer incorrect privatekey", async function () {
    const incorrectPrivateKey = bsv.PrivateKey();
    const takerStasInputScriptHex = tokenAObj.outputs[0].script.toHex();
    const aliceUtxos = await getFundsFromFaucet(
      alicePrivateKey.toAddress(process.env.NETWORK).toString()
    );
    const makerInputHex = await getRawTransaction(aliceUtxos[0].txid);

    const makerInputSatoshis = aliceUtxos[0].satoshis;
    const takerOutputSatoshis = makerInputSatoshis;
    const makerOutputSatoshis = tokenAObj.outputs[0].satoshis;
    const takerInputSatoshis = makerOutputSatoshis;

    const wantedInfo = {
      scriptHex: takerStasInputScriptHex,
      satoshis: makerOutputSatoshis,
    };

    const makerUtxo = {
      txId: aliceUtxos[0].txid,
      outputIndex: aliceUtxos[0].vout,
      script: bsv.Script.fromHex(aliceUtxos[0].scriptPubKey), // makerStasInputScript,
      satoshis: makerInputSatoshis,
    };
    const swapOfferHex = await createSwapOffer(
      alicePrivateKey,
      makerUtxo,
      wantedInfo
    );
    const takerInputUTXO = {
      txId: tokenAIssueTxid,
      outputIndex: 0,
      script: tokenAObj.outputs[0].script,
      satoshis: takerInputSatoshis,
    };

    const fullySignedSwapHex = await acceptSwapOffer(
      swapOfferHex,
      makerInputHex,
      incorrectPrivateKey,
      tokenAIssueHex,
      takerInputUTXO,
      takerOutputSatoshis,
      alicePublicKeyHash,
      fundingUTXO,
      fundingPrivateKey
    );
    try {
      await broadcast(fullySignedSwapHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.response.data).to.contain(
        "mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)"
      );
    }
  });

  it("Swap - 3 step token-token swap with createUnsignedSwapOffer incorrect privatekey", async function () {
    const incorrectPrivateKey = bsv.PrivateKey();
    const takerStasInputScriptHex = tokenAObj.outputs[0].script.toHex();
    const makerStasInputScript = tokenBObj.outputs[0].script;

    const makerInputSatoshis = tokenBObj.outputs[0].satoshis;
    const takerOutputSatoshis = makerInputSatoshis;
    const makerOutputSatoshis = tokenAObj.outputs[0].satoshis;
    const takerInputSatoshis = makerOutputSatoshis;
    const makerInputUtxo = {
      txId: tokenBIssueTxid,
      outputIndex: 0,
      script: makerStasInputScript,
      satoshis: makerInputSatoshis,
    };

    const wantedInfo = {
      scriptHex: takerStasInputScriptHex,
      satoshis: makerOutputSatoshis,
    };

    const unsignedSwapOfferHex = await createUnsignedSwapOffer(
      incorrectPrivateKey,
      makerInputUtxo,
      wantedInfo
    );

    // now bob takes the offer
    const takerSignedSwapHex = await acceptUnsignedSwapOffer(
      unsignedSwapOfferHex,
      tokenBIssueHex,
      bobPrivateKey,
      tokenAIssueHex,
      0,
      takerInputSatoshis,
      takerOutputSatoshis,
      alicePublicKeyHash,
      fundingUTXO,
      fundingPrivateKey
    );

    const fullySignedSwapHex = await makerSignSwapOffer(
      takerSignedSwapHex,
      tokenBIssueHex,
      tokenAIssueHex,
      alicePrivateKey,
      bobPublicKeyHash,
      paymentPublicKeyHash,
      fundingUTXO
    );
    try {
      await broadcast(fullySignedSwapHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.response.data).to.contain(
        "mandatory-script-verify-flag-failed (Script evaluated without error but finished with a false/empty top stack element)"
      );
    }
  });

  it("Swap - 3 step token-token swap with acceptUnsignedSwap incorrect privatekey", async function () {
    const incorrectPrivateKey = bsv.PrivateKey();
    const takerStasInputScriptHex = tokenAObj.outputs[0].script.toHex();
    const makerStasInputScript = tokenBObj.outputs[0].script;

    const makerInputSatoshis = tokenBObj.outputs[0].satoshis;
    const takerOutputSatoshis = makerInputSatoshis;
    const makerOutputSatoshis = tokenAObj.outputs[0].satoshis;
    const takerInputSatoshis = makerOutputSatoshis;
    const makerInputUtxo = {
      txId: tokenBIssueTxid,
      outputIndex: 0,
      script: makerStasInputScript,
      satoshis: makerInputSatoshis,
    };

    const wantedInfo = {
      scriptHex: takerStasInputScriptHex,
      satoshis: makerOutputSatoshis,
    };

    const unsignedSwapOfferHex = await createUnsignedSwapOffer(
      alicePrivateKey,
      makerInputUtxo,
      wantedInfo
    );

    // now bob takes the offer
    const takerSignedSwapHex = await acceptUnsignedSwapOffer(
      unsignedSwapOfferHex,
      tokenBIssueHex,
      incorrectPrivateKey,
      tokenAIssueHex,
      0,
      takerInputSatoshis,
      takerOutputSatoshis,
      alicePublicKeyHash,
      fundingUTXO,
      fundingPrivateKey
    );

    const fullySignedSwapHex = await makerSignSwapOffer(
      takerSignedSwapHex,
      tokenBIssueHex,
      tokenAIssueHex,
      alicePrivateKey,
      bobPublicKeyHash,
      paymentPublicKeyHash,
      fundingUTXO
    );
    try {
      await broadcast(fullySignedSwapHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.response.data).to.contain(
        "mandatory-script-verify-flag-failed (Script evaluated without error but finished with a false/empty top stack element)"
      );
    }
  });

  it("Swap - 3 step token-token swap with makerSignSwapOffer incorrect privatekey", async function () {
    const incorrectPrivateKey = bsv.PrivateKey();
    const takerStasInputScriptHex = tokenAObj.outputs[0].script.toHex();
    const makerStasInputScript = tokenBObj.outputs[0].script;

    const makerInputSatoshis = tokenBObj.outputs[0].satoshis;
    const takerOutputSatoshis = makerInputSatoshis;
    const makerOutputSatoshis = tokenAObj.outputs[0].satoshis;
    const takerInputSatoshis = makerOutputSatoshis;
    const makerInputUtxo = {
      txId: tokenBIssueTxid,
      outputIndex: 0,
      script: makerStasInputScript,
      satoshis: makerInputSatoshis,
    };

    const wantedInfo = {
      scriptHex: takerStasInputScriptHex,
      satoshis: makerOutputSatoshis,
    };

    const unsignedSwapOfferHex = await createUnsignedSwapOffer(
      alicePrivateKey,
      makerInputUtxo,
      wantedInfo
    );

    // now bob takes the offer
    const takerSignedSwapHex = await acceptUnsignedSwapOffer(
      unsignedSwapOfferHex,
      tokenBIssueHex,
      bobPrivateKey,
      tokenAIssueHex,
      0,
      takerInputSatoshis,
      takerOutputSatoshis,
      alicePublicKeyHash,
      fundingUTXO,
      fundingPrivateKey
    );

    const fullySignedSwapHex = await makerSignSwapOffer(
      takerSignedSwapHex,
      tokenBIssueHex,
      tokenAIssueHex,
      incorrectPrivateKey,
      bobPublicKeyHash,
      paymentPublicKeyHash,
      fundingUTXO
    );
    try {
      await broadcast(fullySignedSwapHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.response.data).to.contain(
        "mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)"
      );
    }
  });

  it("Swap - 3 step token-p2pkh swap with createUnsignedSwap incorrect privatekey", async function () {
    const incorrectPrivateKey = bsv.PrivateKey();
    const bobUtxos = await getFundsFromFaucet(
      bobPrivateKey.toAddress(process.env.NETWORK).toString()
    );
    const takerInputTx = await getRawTransaction(bobUtxos[0].txid);

    const makerInputSatoshis = tokenBObj.outputs[0].satoshis;
    const takerOutputSatoshis = makerInputSatoshis;
    const makerOutputSatoshis = bobUtxos[0].satoshis;
    const takerInputSatoshis = makerOutputSatoshis;

    const makerInputUtxo = {
      txId: tokenBIssueTxid,
      outputIndex: 0,
      script: tokenBObj.outputs[0].script,
      satoshis: makerInputSatoshis,
    };

    const wantedInfo = { type: "native", satoshis: makerOutputSatoshis };
    const takerInputInfo = {
      type: "native",
      utxo: bobUtxos[0],
      satoshis: takerInputSatoshis,
    };

    const unsignedSwapOfferHex = await createUnsignedSwapOffer(
      incorrectPrivateKey,
      makerInputUtxo,
      wantedInfo
    );

    const takerSignedSwapHex = await acceptUnsignedNativeSwapOffer(
      unsignedSwapOfferHex,
      takerInputInfo,
      tokenBIssueHex,
      bobPrivateKey,
      takerInputTx,
      bobUtxos[0].vout,
      takerOutputSatoshis,
      alicePublicKeyHash,
      fundingUTXO,
      fundingPrivateKey
    );

    const fullySignedSwapHex = await makerSignSwapOffer(
      takerSignedSwapHex,
      tokenBIssueHex,
      takerInputTx,
      alicePrivateKey,
      bobPublicKeyHash,
      paymentPublicKeyHash,
      fundingUTXO
    );
    try {
      await broadcast(fullySignedSwapHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.response.data).to.contain(
        "mandatory-script-verify-flag-failed (Script evaluated without error but finished with a false/empty top stack element)"
      );
    }
  });

  it("Swap - 3 step token-p2pkh swap with acceptUnsignedNativeSwapOffer incorrect privatekey", async function () {
    const incorrectPrivateKey = bsv.PrivateKey();
    const bobUtxos = await getFundsFromFaucet(
      bobPrivateKey.toAddress(process.env.NETWORK).toString()
    );
    const takerInputTx = await getRawTransaction(bobUtxos[0].txid);

    const makerInputSatoshis = tokenBObj.outputs[0].satoshis;
    const takerOutputSatoshis = makerInputSatoshis;
    const makerOutputSatoshis = bobUtxos[0].satoshis;
    const takerInputSatoshis = makerOutputSatoshis;

    const makerInputUtxo = {
      txId: tokenBIssueTxid,
      outputIndex: 0,
      script: tokenBObj.outputs[0].script,
      satoshis: makerInputSatoshis,
    };

    const wantedInfo = { type: "native", satoshis: makerOutputSatoshis };
    const takerInputInfo = {
      type: "native",
      utxo: bobUtxos[0],
      satoshis: takerInputSatoshis,
    };

    const unsignedSwapOfferHex = await createUnsignedSwapOffer(
      alicePrivateKey,
      makerInputUtxo,
      wantedInfo
    );

    const takerSignedSwapHex = await acceptUnsignedNativeSwapOffer(
      unsignedSwapOfferHex,
      takerInputInfo,
      tokenBIssueHex,
      incorrectPrivateKey,
      takerInputTx,
      bobUtxos[0].vout,
      takerOutputSatoshis,
      alicePublicKeyHash,
      fundingUTXO,
      fundingPrivateKey
    );

    const fullySignedSwapHex = await makerSignSwapOffer(
      takerSignedSwapHex,
      tokenBIssueHex,
      takerInputTx,
      alicePrivateKey,
      bobPublicKeyHash,
      paymentPublicKeyHash,
      fundingUTXO
    );
    try {
      await broadcast(fullySignedSwapHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.response.data).to.contain(
        "mandatory-script-verify-flag-failed (Script evaluated without error but finished with a false/empty top stack element)"
      );
    }
  });

  it("Swap - 3 step token-p2pkh swap with makerSignSwapOffer incorrect privatekey", async function () {
    const incorrectPrivateKey = bsv.PrivateKey();
    const bobUtxos = await getFundsFromFaucet(
      bobPrivateKey.toAddress(process.env.NETWORK).toString()
    );
    const takerInputTx = await getRawTransaction(bobUtxos[0].txid);

    const makerInputSatoshis = tokenBObj.outputs[0].satoshis;
    const takerOutputSatoshis = makerInputSatoshis;
    const makerOutputSatoshis = bobUtxos[0].satoshis;
    const takerInputSatoshis = makerOutputSatoshis;

    const makerInputUtxo = {
      txId: tokenBIssueTxid,
      outputIndex: 0,
      script: tokenBObj.outputs[0].script,
      satoshis: makerInputSatoshis,
    };

    const wantedInfo = { type: "native", satoshis: makerOutputSatoshis };
    const takerInputInfo = {
      type: "native",
      utxo: bobUtxos[0],
      satoshis: takerInputSatoshis,
    };

    const unsignedSwapOfferHex = await createUnsignedSwapOffer(
      alicePrivateKey,
      makerInputUtxo,
      wantedInfo
    );

    const takerSignedSwapHex = await acceptUnsignedNativeSwapOffer(
      unsignedSwapOfferHex,
      takerInputInfo,
      tokenBIssueHex,
      bobPrivateKey,
      takerInputTx,
      bobUtxos[0].vout,
      takerOutputSatoshis,
      alicePublicKeyHash,
      fundingUTXO,
      fundingPrivateKey
    );

    const fullySignedSwapHex = await makerSignSwapOffer(
      takerSignedSwapHex,
      tokenBIssueHex,
      takerInputTx,
      incorrectPrivateKey,
      bobPublicKeyHash,
      paymentPublicKeyHash,
      fundingUTXO
    );
    try {
      await broadcast(fullySignedSwapHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.response.data).to.contain(
        "mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)"
      );
    }
  });

  it("Swap - 3 step p2pkh-token swap with createUnsignedSwapOffer incorrect privatekey", async function () {
    const incorrectPrivateKey = bsv.PrivateKey();
    const takerStasInputScriptHex = tokenAObj.outputs[0].script.toHex();
    const aliceUtxos = await getFundsFromFaucet(
      alicePrivateKey.toAddress(process.env.NETWORK).toString()
    );
    const makerInputTx = await getRawTransaction(aliceUtxos[0].txid);

    const makerInputSatoshis = aliceUtxos[0].satoshis;
    const takerOutputSatoshis = makerInputSatoshis;
    const makerOutputSatoshis = tokenAObj.outputs[0].satoshis;
    const takerInputSatoshis = makerOutputSatoshis;

    const wantedInfo = {
      scriptHex: takerStasInputScriptHex,
      satoshis: makerOutputSatoshis,
    };

    const unsignedSwapOfferHex = await createUnsignedSwapOffer(
      incorrectPrivateKey,
      aliceUtxos[0],
      wantedInfo
    );

    // now bob takes the offer
    const takerSignedSwapHex = await acceptUnsignedSwapOffer(
      unsignedSwapOfferHex,
      makerInputTx,
      bobPrivateKey,
      tokenAIssueHex,
      0,
      takerInputSatoshis,
      takerOutputSatoshis,
      alicePublicKeyHash,
      fundingUTXO,
      fundingPrivateKey
    );

    const fullySignedSwapHex = await makerSignSwapOffer(
      takerSignedSwapHex,
      makerInputTx,
      tokenAIssueHex,
      alicePrivateKey,
      bobPublicKeyHash,
      paymentPublicKeyHash,
      fundingUTXO
    );
    try {
      await broadcast(fullySignedSwapHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.response.data).to.contain(
        "mandatory-script-verify-flag-failed (Script evaluated without error but finished with a false/empty top stack element)"
      );
    }
  });

  it("Swap - 3 step p2pkh-token swap with acceptUnsignedSwapOffer incorrect privatekey", async function () {
    const incorrectPrivateKey = bsv.PrivateKey();
    const takerStasInputScriptHex = tokenAObj.outputs[0].script.toHex();
    const aliceUtxos = await getFundsFromFaucet(
      alicePrivateKey.toAddress(process.env.NETWORK).toString()
    );
    const makerInputTx = await getRawTransaction(aliceUtxos[0].txid);

    const makerInputSatoshis = aliceUtxos[0].satoshis;
    const takerOutputSatoshis = makerInputSatoshis;
    const makerOutputSatoshis = tokenAObj.outputs[0].satoshis;
    const takerInputSatoshis = makerOutputSatoshis;

    const wantedInfo = {
      scriptHex: takerStasInputScriptHex,
      satoshis: makerOutputSatoshis,
    };

    const unsignedSwapOfferHex = await createUnsignedSwapOffer(
      alicePrivateKey,
      aliceUtxos[0],
      wantedInfo
    );

    // now bob takes the offer
    const takerSignedSwapHex = await acceptUnsignedSwapOffer(
      unsignedSwapOfferHex,
      makerInputTx,
      incorrectPrivateKey,
      tokenAIssueHex,
      0,
      takerInputSatoshis,
      takerOutputSatoshis,
      alicePublicKeyHash,
      fundingUTXO,
      fundingPrivateKey
    );

    const fullySignedSwapHex = await makerSignSwapOffer(
      takerSignedSwapHex,
      makerInputTx,
      tokenAIssueHex,
      alicePrivateKey,
      bobPublicKeyHash,
      paymentPublicKeyHash,
      fundingUTXO
    );
    try {
      await broadcast(fullySignedSwapHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.response.data).to.contain(
        "mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)"
      );
    }
  });

  it("Swap - 3 step p2pkh-token swap with makerSignSwapOffer incorrect privatekey", async function () {
    const incorrectPrivateKey = bsv.PrivateKey();
    const takerStasInputScriptHex = tokenAObj.outputs[0].script.toHex();
    const aliceUtxos = await getFundsFromFaucet(
      alicePrivateKey.toAddress(process.env.NETWORK).toString()
    );
    const makerInputTx = await getRawTransaction(aliceUtxos[0].txid);

    const makerInputSatoshis = aliceUtxos[0].satoshis;
    const takerOutputSatoshis = makerInputSatoshis;
    const makerOutputSatoshis = tokenAObj.outputs[0].satoshis;
    const takerInputSatoshis = makerOutputSatoshis;

    const wantedInfo = {
      scriptHex: takerStasInputScriptHex,
      satoshis: makerOutputSatoshis,
    };

    const unsignedSwapOfferHex = await createUnsignedSwapOffer(
      alicePrivateKey,
      aliceUtxos[0],
      wantedInfo
    );

    // now bob takes the offer
    const takerSignedSwapHex = await acceptUnsignedSwapOffer(
      unsignedSwapOfferHex,
      makerInputTx,
      bobPrivateKey,
      tokenAIssueHex,
      0,
      takerInputSatoshis,
      takerOutputSatoshis,
      alicePublicKeyHash,
      fundingUTXO,
      fundingPrivateKey
    );

    const fullySignedSwapHex = await makerSignSwapOffer(
      takerSignedSwapHex,
      makerInputTx,
      tokenAIssueHex,
      incorrectPrivateKey,
      bobPublicKeyHash,
      paymentPublicKeyHash,
      fundingUTXO
    );
    try {
      await broadcast(fullySignedSwapHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.response.data).to.contain(
        "mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)"
      );
    }
  });
});
async function setup() {
  const tokenAIssuerPrivateKey = bsv.PrivateKey();
  const tokenBIssuerPrivateKey = bsv.PrivateKey();
  fundingPrivateKey = bsv.PrivateKey();
  paymentPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    fundingPrivateKey.publicKey.toBuffer()
  ).toString("hex");
  alicePrivateKey = bsv.PrivateKey();
  bobPrivateKey = bsv.PrivateKey();

  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString();
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString();

  const tokenAContractUtxos = await getFundsFromFaucet(
    tokenAIssuerPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  const tokenBContractUtxos = await getFundsFromFaucet(
    tokenBIssuerPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  const tokenAFundingUtxos = await getFundsFromFaucet(
    fundingPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  const tokenBFundingUtxos = await getFundsFromFaucet(
    fundingPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  const tokenAIssuerPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    tokenAIssuerPrivateKey.publicKey.toBuffer()
  ).toString("hex");
  const tokenBIssuerPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    tokenBIssuerPrivateKey.publicKey.toBuffer()
  ).toString("hex");
  alicePublicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    alicePrivateKey.publicKey.toBuffer()
  ).toString("hex");
  bobPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    bobPrivateKey.publicKey.toBuffer()
  ).toString("hex");

  // Token A
  tokenASymbol = "TOKENA";
  const tokenASupply = 6000;
  const tokenASchema = utils.schema(
    tokenAIssuerPublicKeyHash,
    tokenASymbol,
    tokenASupply
  );
  const tokenAContractHex = await contract(
    tokenAIssuerPrivateKey,
    tokenAContractUtxos,
    tokenAFundingUtxos,
    fundingPrivateKey,
    tokenASchema,
    tokenASupply
  );
  const tokenAContractTxid = await utils.broadcastWithRetry(tokenAContractHex);
  const tokenAContractTx = await getTransaction(tokenAContractTxid);

  tokenAIssueHex = await issue(
    tokenAIssuerPrivateKey,
    [
      {
        addr: bobAddr,
        satoshis: 6000,
        data: "one",
      },
    ],
    utils.getUtxo(tokenAContractTxid, tokenAContractTx, 0),
    utils.getUtxo(tokenAContractTxid, tokenAContractTx, 1),
    fundingPrivateKey,
    true,
    tokenASymbol,
    2
  );
  tokenAIssueTxid = await utils.broadcastWithRetry(tokenAIssueHex);
  tokenAObj = new bsv.Transaction(tokenAIssueHex);

  // Token B
  tokenBSymbol = "TOKENB";
  const tokenBSupply = 3000;
  const tokenBSchema = utils.schema(
    tokenBIssuerPublicKeyHash,
    tokenBSymbol,
    tokenBSupply
  );
  const tokenBContractHex = await contract(
    tokenBIssuerPrivateKey,
    tokenBContractUtxos,
    tokenBFundingUtxos,
    fundingPrivateKey,
    tokenBSchema,
    tokenBSupply
  );
  const tokenBContractTxid = await utils.broadcastWithRetry(tokenBContractHex);
  const tokenBContractTx = await getTransaction(tokenBContractTxid);

  tokenBIssueHex = await issue(
    tokenBIssuerPrivateKey,
    [
      {
        addr: aliceAddr,
        satoshis: 3000,
        data: "one",
      },
    ],
    utils.getUtxo(tokenBContractTxid, tokenBContractTx, 0),
    utils.getUtxo(tokenBContractTxid, tokenBContractTx, 1),
    fundingPrivateKey,
    true,
    tokenBSymbol,
    2
  );
  tokenBIssueTxid = await utils.broadcastWithRetry(tokenBIssueHex);
  tokenBIssueTx = await getTransaction(tokenBIssueTxid);
  tokenBObj = new bsv.Transaction(tokenBIssueHex);
  fundingUTXO = {
    txid: tokenBIssueTxid,
    vout: 1,
    scriptPubKey: tokenBIssueTx.vout[1].scriptPubKey.hex,
    satoshis: bitcoinToSatoshis(tokenBIssueTx.vout[1].value),
  };
}
