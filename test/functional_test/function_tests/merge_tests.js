const expect = require("chai").expect;
const utils = require("../../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const {
  contract,
  issue,
  split,
  merge,
  mergeWithCallback,
  unsignedMerge,
} = require("../../../index");

const { bitcoinToSatoshis, getTransaction, getFundsFromFaucet, broadcast } =
  require("../../../index").utils;

const { sighash } = require("../../../lib/stas");

let issuerPrivateKey;
let fundingPrivateKey;
let bobPrivateKey;
let alicePrivateKey;
let bobAddr;
let aliceAddr;
let contractUtxos;
let fundingUtxos;
let publicKeyHash;
let contractTx;
let issueTx;
let issueTxid;
let mergeObj;
const wait = 5000;
const keyMap = new Map();
let issueOutFundingVout;

const bobSignatureCallback = async (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash
    .sign(tx, bobPrivateKey, sighash, i, script, satoshis)
    .toTxFormat()
    .toString("hex");
};
const paymentSignatureCallback = async (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash
    .sign(tx, fundingPrivateKey, sighash, i, script, satoshis)
    .toTxFormat()
    .toString("hex");
};

beforeEach(async () => {
  await setup();
});
describe("Merge Funcional Tests", () => {
  it("Merge - Successful Merge With Fee", async () => {
    const mergeHex = await merge(
      alicePrivateKey,
      utils.getMergeUtxoTemp(mergeObj, 0, 1),
      bobAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    );
    const mergeTxid = await utils.broadcastWithRetry(mergeHex);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const tokenIdMerge = await utils.getToken(mergeTxid);
    const response = await utils.getTokenResponse(tokenIdMerge);
    expect(response.symbol).to.equal("TAALT");
    expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00005);
    await utils.isTokenBalance(aliceAddr, 0);
    await utils.isTokenBalance(bobAddr, 10000);
  });

  it("Merge - Successful Merge With Fee 2", async () => {
    const mergeHex = await merge(
      bobPrivateKey,
      utils.getMergeUtxoTemp(mergeObj, 2, 3),
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    );
    const mergeTxid = await utils.broadcastWithRetry(mergeHex);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const tokenIdMerge = await utils.getToken(mergeTxid);
    const response = await utils.getTokenResponse(tokenIdMerge);
    expect(response.symbol).to.equal("TAALT");
    expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00005);
    await utils.isTokenBalance(aliceAddr, 10000);
    await utils.isTokenBalance(bobAddr, 0);
  });

  it("Merge - Merge With No Fee", async () => {
    const mergeHex = await merge(
      bobPrivateKey,
      utils.getMergeUtxoTemp(mergeObj, 2, 3),
      aliceAddr,
      null,
      null
    );
    const mergeTxid = await utils.broadcastWithRetry(mergeHex);
    const tokenIdMerge = await utils.getToken(mergeTxid);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const response = await utils.getTokenResponse(tokenIdMerge);
    expect(response.symbol).to.equal("TAALT");
    expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00005);
    await utils.isTokenBalance(aliceAddr, 10000);
    await utils.isTokenBalance(bobAddr, 0);
  });

  it("Merge - Successful Merge With Callback And Fee", async () => {
    const mergeHex = await mergeWithCallback(
      bobPrivateKey.publicKey,
      utils.getMergeUtxoTemp(mergeObj, 2, 3),
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey.publicKey,
      bobSignatureCallback,
      paymentSignatureCallback
    );
    const mergeTxid = await utils.broadcastWithRetry(mergeHex);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const tokenIdMerge = await utils.getToken(mergeTxid);
    const response = await utils.getTokenResponse(tokenIdMerge);
    expect(response.symbol).to.equal("TAALT");
    expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00005);
    await utils.isTokenBalance(aliceAddr, 10000);
    await utils.isTokenBalance(bobAddr, 0);
  });

  it("Merge - Successful Merge With Callback And No Fee", async () => {
    const mergeHex = await mergeWithCallback(
      bobPrivateKey.publicKey,
      utils.getMergeUtxoTemp(mergeObj, 2, 3),
      aliceAddr,
      null,
      null,
      bobSignatureCallback,
      null
    );
    const mergeTxid = await utils.broadcastWithRetry(mergeHex);
    const tokenIdMerge = await utils.getToken(mergeTxid);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const response = await utils.getTokenResponse(tokenIdMerge);
    expect(response.symbol).to.equal("TAALT");
    expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00005);
    await utils.isTokenBalance(aliceAddr, 10000);
    await utils.isTokenBalance(bobAddr, 0);
  });

  it("Merge - Successful Merge unsigned & Fee", async () => {
    const unsignedMergeReturn = await unsignedMerge(
      bobPrivateKey.publicKey,
      utils.getMergeUtxoTemp(mergeObj, 2, 3),
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey.publicKey
    );
    const mergeTx = bsv.Transaction(unsignedMergeReturn.hex);
    utils.signScriptWithUnlocking(unsignedMergeReturn, mergeTx, keyMap);
    const mergeTxid = await utils.broadcastWithRetry(mergeTx.serialize(true));
    await new Promise((resolve) => setTimeout(resolve, wait));
    const tokenIdMerge = await utils.getToken(mergeTxid);
    const response = await utils.getTokenResponse(tokenIdMerge);
    expect(response.symbol).to.equal("TAALT");
    expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00005);
    await utils.isTokenBalance(aliceAddr, 10000);
    await utils.isTokenBalance(bobAddr, 0);
  });

  it("Merge - Successful Merge Unsigned & No Fee", async () => {
    const unsignedMergeReturn = await unsignedMerge(
      bobPrivateKey.publicKey,
      utils.getMergeUtxoTemp(mergeObj, 2, 3),
      aliceAddr,
      null,
      null
    );
    const mergeTx = bsv.Transaction(unsignedMergeReturn.hex);
    utils.signScriptWithUnlocking(unsignedMergeReturn, mergeTx, keyMap);
    const mergeTxid = await utils.broadcastWithRetry(mergeTx.serialize(true));
    await new Promise((resolve) => setTimeout(resolve, wait));
    const tokenIdMerge = await utils.getToken(mergeTxid);
    const response = await utils.getTokenResponse(tokenIdMerge);
    expect(response.symbol).to.equal("TAALT");
    expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00005);
    await utils.isTokenBalance(aliceAddr, 10000);
    await utils.isTokenBalance(bobAddr, 0);
  });

  it("Merge - Incorrect Owner Private Key Throws Error", async () => {
    const incorrectPrivateKey = bsv.PrivateKey();
    const mergeHex = await merge(
      incorrectPrivateKey,
      utils.getMergeUtxoTemp(mergeObj, 2, 3),
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    );
    try {
      await broadcast(mergeHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.response.data).to.contain(
        "mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)"
      );
    }
  });

  it("Merge - Incorrect Funding Private Key Throws Error", async () => {
    const incorrectPrivateKey = bsv.PrivateKey();
    const mergeHex = await merge(
      bobPrivateKey,
      utils.getMergeUtxoTemp(mergeObj, 2, 3),
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      incorrectPrivateKey
    );
    try {
      await broadcast(mergeHex);
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
  const contractTxid = await utils.broadcastWithRetry(contractHex);
  contractTx = await getTransaction(contractTxid);

  const issueHex = await issue(
    issuerPrivateKey,
    [
      {
        addr: aliceAddr,
        satoshis: 2000,
      },
      {
        addr: aliceAddr,
        satoshis: 3000,
      },
      {
        addr: bobAddr,
        satoshis: 2000,
      },
      {
        addr: bobAddr,
        satoshis: 3000,
      },
    ],
    utils.getUtxo(contractTxid, contractTx, 0),
    utils.getUtxo(contractTxid, contractTx, 1),
    fundingPrivateKey,
    true,
    symbol,
    2
  );
  issueTxid = await utils.broadcastWithRetry(issueHex);
  issueTx = await getTransaction(issueTxid);
  mergeObj = bsv.Transaction(issueHex);
  issueOutFundingVout = issueTx.vout.length - 1;
}
