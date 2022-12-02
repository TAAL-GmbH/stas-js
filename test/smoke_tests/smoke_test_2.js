const expect = require("chai").expect;
const utils = require("../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const { sighash } = require("../../lib/stas");

const {
  contract,
  issue,
  split,
  splitWithCallback,
  mergeSplit,
  mergeSplitWithCallback,
  redeem,
  redeemWithCallback,
  transfer,
  transferWithCallback,
  redeemSplit,
  redeemSplitWithCallback,
  unsignedMergeSplit,
  unsignedRedeem,
  unsignedRedeemSplit,
  unsignedSplit,
  unsignedTransfer,
} = require("../../index");

const {
  createSwapOffer,
  acceptSwapOffer,
  createUnsignedSwapOffer,
  acceptUnsignedSwapOffer,
  makerSignSwapOffer,
} = require("../../index").swap;

const {
  getFundsFromFaucet,
  broadcast,
  getTransaction,
  bitcoinToSatoshis,
  getRawTransaction,
} = require("../../index").utils;

const paymentSignatureCallback = async (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash
    .sign(tx, fundingPrivateKey, sighash, i, script, satoshis)
    .toTxFormat()
    .toString("hex");
};
const bobSignatureCallback = async (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash
    .sign(tx, bobPrivateKey, sighash, i, script, satoshis)
    .toTxFormat()
    .toString("hex");
};
const aliceSignatureCallback = async (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash
    .sign(tx, alicePrivateKey, sighash, i, script, satoshis)
    .toTxFormat()
    .toString("hex");
};

let issuerPrivateKey;
let fundingPrivateKey;
let bobPrivateKey;
let alicePrivateKey;
let contractUtxos;
let fundingUtxos;
let publicKeyHash;
let contractTx;
let contractTxid;
let issueTx;
let issueTxid;
let splitTxid;
let splitTx;
let splitTxObj;
let aliceAddr;
let bobAddr;
let paymentPublicKeyHash;
let tokenAIssueHex;
let tokenBIssueHex;
let tokenAObj;
let tokenBObj;
let tokenBIssueTx;
let tokenBIssueTxid;
let fundingUTXO;
let alicePublicKeyHash;
let bobPublicKeyHash;
let tokenASymbol;
let tokenBSymbol;
const supply = 10000;
const symbol = "TAALT";
const wait = 5000; // due to delay in token issuance
const keyMap = new Map();

describe("Smoke Test 2", () => {
  it("MergeSplit - Successful MergeSplit With Fees", async () => {
    await setupMerge(); // contract, issue, transfer then split

    const issueOutFundingVout = splitTx.vout.length - 1;

    const aliceAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) / 2;
    const bobAmountSatoshis =
      bitcoinToSatoshis(splitTx.vout[0].value) +
      bitcoinToSatoshis(splitTx.vout[1].value) -
      aliceAmountSatoshis;

    const mergeSplitHex = await mergeSplit(
      bobPrivateKey,
      utils.getMergeSplitUtxo(splitTxObj, splitTx),
      aliceAddr,
      aliceAmountSatoshis,
      bobAddr,
      bobAmountSatoshis,
      utils.getUtxo(splitTxid, splitTx, issueOutFundingVout),
      fundingPrivateKey
    );
    const mergeSplitTxid = await utils.broadcastWithRetry(mergeSplitHex);
    await new Promise((resolve) => setTimeout(resolve, wait));
    expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.0000175);
    expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.0000525);
    await utils.isTokenBalance(aliceAddr, 1750);
    await utils.isTokenBalance(bobAddr, 8250);
  });

  it("MergeSplit - Successful MergeSplit With Callback And Fees", async () => {
    await setupMerge(); // contract, issue, transfer then split

    const issueOutFundingVout = splitTx.vout.length - 1;

    const aliceAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) / 2;
    const bobAmountSatoshis =
      bitcoinToSatoshis(splitTx.vout[0].value) +
      bitcoinToSatoshis(splitTx.vout[1].value) -
      aliceAmountSatoshis;

    const mergeSplitHex = await mergeSplitWithCallback(
      bobPrivateKey.publicKey,
      utils.getMergeSplitUtxo(splitTxObj, splitTx),
      aliceAddr,
      aliceAmountSatoshis,
      bobAddr,
      bobAmountSatoshis,
      utils.getUtxo(splitTxid, splitTx, issueOutFundingVout),
      fundingPrivateKey.publicKey,
      bobSignatureCallback,
      paymentSignatureCallback
    );
    const mergeSplitTxid = await utils.broadcastWithRetry(mergeSplitHex);
    await new Promise((resolve) => setTimeout(resolve, wait));
    expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.0000175);
    expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.0000525);
    await utils.isTokenBalance(aliceAddr, 1750);
    await utils.isTokenBalance(bobAddr, 8250);
  });
  it("MergeSplit - Successful MergeSplit unsigned With Fees", async () => {
    await setupMerge(); // contract, issue, transfer then split

    const issueOutFundingVout = splitTx.vout.length - 1;

    const aliceAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) / 2;
    const bobAmountSatoshis =
      bitcoinToSatoshis(splitTx.vout[0].value) +
      bitcoinToSatoshis(splitTx.vout[1].value) -
      aliceAmountSatoshis;

    const unsignedMergeSplitReturn = await unsignedMergeSplit(
      bobPrivateKey.publicKey,
      utils.getMergeSplitUtxo(splitTxObj, splitTx),
      aliceAddr,
      aliceAmountSatoshis,
      bobAddr,
      bobAmountSatoshis,
      utils.getUtxo(splitTxid, splitTx, issueOutFundingVout),
      fundingPrivateKey.publicKey
    );
    const mergeSplitTx = bsv.Transaction(unsignedMergeSplitReturn.hex);
    utils.signScriptWithUnlocking(
      unsignedMergeSplitReturn,
      mergeSplitTx,
      keyMap
    );
    const mergeSplitTxid = await utils.broadcastWithRetry(
      mergeSplitTx.serialize(true)
    );
    expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.0000175);
    expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.0000525);
    await utils.isTokenBalance(aliceAddr, 1750);
    await utils.isTokenBalance(bobAddr, 8250);
  });

  it("Redeem - Successful Redeem", async () => {
    await setupRedeem();
    const redeemHex = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemHex);
    expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.00007);
    await utils.isTokenBalance(aliceAddr, 0);
    await utils.isTokenBalance(bobAddr, 3000);
  });

  it("Redeem - Successful Redeem With Callback and Fee", async () => {
    await setupRedeem();
    const redeemHex = await redeemWithCallback(
      alicePrivateKey.publicKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey.publicKey,
      aliceSignatureCallback,
      paymentSignatureCallback
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemHex);
    expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.00007);
    await utils.isTokenBalance(aliceAddr, 0);
    await utils.isTokenBalance(bobAddr, 3000);
  });

  it("Redeem - Successful Redeem With Unsigned & Fee", async () => {
    await setupRedeem();
    const unsignedRedeemReturn = await unsignedRedeem(
      alicePrivateKey.publicKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey.publicKey
    );
    const redeemTx = bsv.Transaction(unsignedRedeemReturn.hex);
    utils.signScriptWithUnlocking(unsignedRedeemReturn, redeemTx, keyMap);
    const redeemTxid = await utils.broadcastWithRetry(redeemTx.serialize(true));
    expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.00007);
    await utils.isTokenBalance(aliceAddr, 0);
    await utils.isTokenBalance(bobAddr, 3000);
  });

  it("Split - Successful Split Into Two Tokens With Fee", async () => {
    await setupRedeem();
    const issueTxSats = issueTx.vout[0].value;
    const bobAmount1 = issueTxSats / 2;
    const bobAmount2 = issueTxSats - bobAmount1;
    const splitDestinations = [];
    splitDestinations[0] = {
      address: aliceAddr,
      satoshis: bitcoinToSatoshis(bobAmount1),
    }; // 3500 tokens
    splitDestinations[1] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(bobAmount2),
    }; // 3500 tokens

    const splitHex = await split(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    );
    const splitTxid = await utils.broadcastWithRetry(splitHex);
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.000035);
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.000035);
    await utils.isTokenBalance(aliceAddr, 3500);
    await utils.isTokenBalance(bobAddr, 6500);
  });

  it("Successful RedeemSplit With 2 Split", async () => {
    await setupRedeem();
    const amount = issueTx.vout[0].value / 5;
    const rSplitDestinations = [];
    rSplitDestinations[0] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(amount),
    };
    rSplitDestinations[1] = {
      address: aliceAddr,
      satoshis: bitcoinToSatoshis(amount),
    };

    const redeemSplitHex = await redeemSplit(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      rSplitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemSplitHex);
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.000042); // first utxo goes to redemption address
    expect(await utils.getVoutAmount(redeemTxid, 1)).to.equal(0.000014);
    expect(await utils.getVoutAmount(redeemTxid, 2)).to.equal(0.000014);
    await utils.isTokenBalance(aliceAddr, 1400);
    await utils.isTokenBalance(bobAddr, 4400);
  });

  it("Successful RedeemSplit Unsigned & Fee", async () => {
    await setupRedeem();
    const amount = issueTx.vout[0].value / 5;
    const rSplitDestinations = [];
    rSplitDestinations[0] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(amount),
    };
    rSplitDestinations[1] = {
      address: aliceAddr,
      satoshis: bitcoinToSatoshis(amount),
    };

    const unsignedRedeemSplitReturn = await unsignedRedeemSplit(
      alicePrivateKey.publicKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      rSplitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey.publicKey
    );
    const redeemSplitTx = bsv.Transaction(unsignedRedeemSplitReturn.hex);
    utils.signScriptWithUnlocking(
      unsignedRedeemSplitReturn,
      redeemSplitTx,
      keyMap
    );
    const redeemTxid = await utils.broadcastWithRetry(
      redeemSplitTx.serialize(true)
    );
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.000042); // first utxo goes to redemption address
    expect(await utils.getVoutAmount(redeemTxid, 1)).to.equal(0.000014);
    expect(await utils.getVoutAmount(redeemTxid, 2)).to.equal(0.000014);
    await utils.isTokenBalance(aliceAddr, 1400);
    await utils.isTokenBalance(bobAddr, 4400);
  });

  it("Successful RedeemSplit With Callback & Fees", async () => {
    await setupRedeem();
    const amount = issueTx.vout[0].value / 5;
    const rSplitDestinations = [];
    rSplitDestinations[0] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(amount),
    };
    rSplitDestinations[1] = {
      address: aliceAddr,
      satoshis: bitcoinToSatoshis(amount),
    };

    const redeemSplitHex = await redeemSplitWithCallback(
      alicePrivateKey.publicKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      rSplitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey.publicKey,
      aliceSignatureCallback,
      paymentSignatureCallback
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemSplitHex);
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.000042); // first utxo goes to redemption address
    expect(await utils.getVoutAmount(redeemTxid, 1)).to.equal(0.000014);
    expect(await utils.getVoutAmount(redeemTxid, 2)).to.equal(0.000014);
    await utils.isTokenBalance(aliceAddr, 1400);
    await utils.isTokenBalance(bobAddr, 4400);
  });

  it("Split - Successful Split With Callback and Fee", async () => {
    await setupRedeem();
    const issueTxSats = issueTx.vout[0].value;
    const bobAmount1 = issueTxSats / 2;
    const bobAmount2 = issueTxSats - bobAmount1;
    console.log(bobAmount1);
    console.log(bobAmount2);
    const splitDestinations = [];
    splitDestinations[0] = {
      address: aliceAddr,
      satoshis: bitcoinToSatoshis(bobAmount1),
    }; // 3500 tokens
    splitDestinations[1] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(bobAmount2),
    }; // 3500 tokens

    const splitHex = await splitWithCallback(
      alicePrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey.publicKey,
      aliceSignatureCallback,
      paymentSignatureCallback
    );
    const splitTxid = await utils.broadcastWithRetry(splitHex);
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.000035);
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.000035);
    await utils.isTokenBalance(aliceAddr, 3500);
    await utils.isTokenBalance(bobAddr, 6500);
  });

  it("Split - Successful Split With Unsigned & Fee", async () => {
    await setupRedeem();
    const issueTxSats = issueTx.vout[0].value;
    const bobAmount1 = issueTxSats / 2;
    const bobAmount2 = issueTxSats - bobAmount1;
    const splitDestinations = [];
    splitDestinations[0] = {
      address: aliceAddr,
      satoshis: bitcoinToSatoshis(bobAmount1),
    }; // 3500 tokens
    splitDestinations[1] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(bobAmount2),
    }; // 3500 tokens

    const unsignedSplitReturn = await unsignedSplit(
      alicePrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey.publicKey
    );
    const splitTx = bsv.Transaction(unsignedSplitReturn.hex);
    utils.signScriptWithUnlocking(unsignedSplitReturn, splitTx, keyMap);
    const splitTxid = await utils.broadcastWithRetry(splitTx.serialize(true));
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.000035);
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.000035);
    await utils.isTokenBalance(aliceAddr, 3500);
    await utils.isTokenBalance(bobAddr, 6500);
  });

  it("Transfer - Successful With Fee", async () => {
    await setupRedeem();
    const transferHex = await transfer(
      bobPrivateKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    );
    const transferTxid = await utils.broadcastWithRetry(transferHex);
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003);
    await utils.isTokenBalance(aliceAddr, 10000);
    await utils.isTokenBalance(bobAddr, 0);
  });

  it("Transfer - Successful Callback With Fee", async () => {
    await setupRedeem();
    const transferHex = await transferWithCallback(
      bobPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      bobAddr,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey.publicKey,
      bobSignatureCallback,
      paymentSignatureCallback
    );
    const transferTxid = await utils.broadcastWithRetry(transferHex);
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003);
    await utils.isTokenBalance(bobAddr, 3000);
    await utils.isTokenBalance(aliceAddr, 7000);
  });

  it("Transfer - Successful Unsigned & Fee", async () => {
    await setupRedeem();
    const unsignedTransferReturn = await unsignedTransfer(
      bobPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey.publicKey
    );
    const transferTx = bsv.Transaction(unsignedTransferReturn.hex);
    utils.signScriptWithUnlocking(unsignedTransferReturn, transferTx, keyMap);
    const transferTxid = await utils.broadcastWithRetry(
      transferTx.serialize(true)
    );
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003);
    await utils.isTokenBalance(aliceAddr, 10000);
    await utils.isTokenBalance(bobAddr, 0);
  });

  // the maker offers a token for sats
  it("Swap - 2 step token-p2pkh swap", async function () {
    await setupSwap();
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
      bobPrivateKey,
      takerInputTxHex,
      takerInputUTXO,
      takerOutputSatoshis,
      alicePublicKeyHash,
      fundingUTXO,
      fundingPrivateKey
    );
    const swapTxid = await utils.broadcastWithRetry(fullySignedSwapHex);
    console.log("swaptxid", swapTxid);

    const tokenId = await utils.getToken(swapTxid, 1);
    const response = await utils.getTokenResponse(tokenId, tokenBSymbol);
    expect(response.symbol).to.equal(tokenBSymbol);
    expect(await utils.getVoutAmount(swapTxid, 0)).to.equal(0.01);
    expect(await utils.getVoutAmount(swapTxid, 1)).to.equal(0.00003);
  });

  // swap two STAS tokens
  it("Swap - 3 step token-token swap", async function () {
    await setupSwap();
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
      alicePrivateKey,
      bobPublicKeyHash,
      paymentPublicKeyHash,
      fundingUTXO
    );
    const swapTxid = await utils.broadcastWithRetry(fullySignedSwapHex);
    console.log("swaptxid ", swapTxid);

    const tokenId = await utils.getToken(swapTxid, 0);
    const response = await utils.getTokenResponse(tokenId, tokenASymbol);
    expect(response.symbol).to.equal(tokenASymbol);
    const tokenId2 = await utils.getToken(swapTxid, 1);
    const response2 = await utils.getTokenResponse(tokenId2, tokenBSymbol);
    expect(response2.symbol).to.equal(tokenBSymbol);
    expect(await utils.getVoutAmount(swapTxid, 0)).to.equal(0.00006);
    expect(await utils.getVoutAmount(swapTxid, 1)).to.equal(0.00003);
  });
});
async function setupMerge() {
  issuerPrivateKey = bsv.PrivateKey();
  keyMap.set(issuerPrivateKey.publicKey, issuerPrivateKey);
  fundingPrivateKey = bsv.PrivateKey();
  keyMap.set(fundingPrivateKey.publicKey, fundingPrivateKey);
  bobPrivateKey = bsv.PrivateKey();
  keyMap.set(bobPrivateKey.publicKey, bobPrivateKey);
  alicePrivateKey = bsv.PrivateKey();
  keyMap.set(alicePrivateKey.publicKey, alicePrivateKey);
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString();
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString();
  contractUtxos = await getFundsFromFaucet(
    issuerPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  fundingUtxos = await getFundsFromFaucet(
    fundingPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    issuerPrivateKey.publicKey.toBuffer()
  ).toString("hex");
  const symbol = "TAALT";
  const supply = 10000;
  const schema = utils.schema(publicKeyHash, symbol, supply);

  const contractHex = await contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  );
  contractTxid = await broadcast(contractHex);
  contractTx = await getTransaction(contractTxid);

  const issueHex = await issue(
    issuerPrivateKey,
    utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
    utils.getUtxo(contractTxid, contractTx, 0),
    utils.getUtxo(contractTxid, contractTx, 1),
    fundingPrivateKey,
    true,
    symbol,
    2
  );
  issueTxid = await broadcast(issueHex);
  issueTx = await getTransaction(issueTxid);

  const issueOutFundingVout = issueTx.vout.length - 1;

  const bobAmount1 = issueTx.vout[0].value / 2;
  const bobAmount2 = issueTx.vout[0].value - bobAmount1;
  const splitDestinations = [];
  splitDestinations[0] = {
    address: bobAddr,
    satoshis: bitcoinToSatoshis(bobAmount1),
  };
  splitDestinations[1] = {
    address: bobAddr,
    satoshis: bitcoinToSatoshis(bobAmount2),
  };

  const splitHex = await split(
    alicePrivateKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    splitDestinations,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  );
  splitTxid = await broadcast(splitHex);
  splitTx = await getTransaction(splitTxid);
  splitTxObj = new bsv.Transaction(splitHex);
}

async function setupRedeem() {
  issuerPrivateKey = bsv.PrivateKey();
  keyMap.set(issuerPrivateKey.publicKey, issuerPrivateKey);
  fundingPrivateKey = bsv.PrivateKey();
  keyMap.set(fundingPrivateKey.publicKey, fundingPrivateKey);
  bobPrivateKey = bsv.PrivateKey();
  keyMap.set(bobPrivateKey.publicKey, bobPrivateKey);
  alicePrivateKey = bsv.PrivateKey();
  keyMap.set(alicePrivateKey.publicKey, alicePrivateKey);
  contractUtxos = await getFundsFromFaucet(
    issuerPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  fundingUtxos = await getFundsFromFaucet(
    fundingPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    issuerPrivateKey.publicKey.toBuffer()
  ).toString("hex");
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString();
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString();
  const schema = utils.schema(publicKeyHash, symbol, supply);

  const contractHex = await contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  );
  const contractTxid = await broadcast(contractHex);
  const contractTx = await getTransaction(contractTxid);

  const issueHex = await issue(
    issuerPrivateKey,
    utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
    utils.getUtxo(contractTxid, contractTx, 0),
    utils.getUtxo(contractTxid, contractTx, 1),
    fundingPrivateKey,
    true,
    symbol,
    2
  );
  issueTxid = await broadcast(issueHex);
  issueTx = await getTransaction(issueTxid);
}

async function setupSwap() {
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
  const tokenAContractTxid = await broadcast(tokenAContractHex);
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
  tokenAIssueTxid = await broadcast(tokenAIssueHex);
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
  const tokenBContractTxid = await broadcast(tokenBContractHex);
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
  tokenBIssueTxid = await broadcast(tokenBIssueHex);
  tokenBIssueTx = await getTransaction(tokenBIssueTxid);
  tokenBObj = new bsv.Transaction(tokenBIssueHex);
  fundingUTXO = {
    txid: tokenBIssueTxid,
    vout: 1,
    scriptPubKey: tokenBIssueTx.vout[1].scriptPubKey.hex,
    satoshis: bitcoinToSatoshis(tokenBIssueTx.vout[1].value),
  };
}
