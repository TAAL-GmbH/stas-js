const expect = require("chai").expect;
const utils = require("../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const { sighash } = require("../../lib/stas");

const {
  contract,
  contractWithCallback,
  issue,
  issueWithCallback,
  split,
  merge,
  mergeWithCallback,
  unsignedContract,
  unsignedIssue,
} = require("../../index");

const { getFundsFromFaucet, broadcast, getTransaction, bitcoinToSatoshis } =
  require("../../index").utils;

const ownerSignCallback = async (tx) => {
  tx.sign(issuerPrivateKey);
};

const paymentSignCallback = async (tx) => {
  tx.sign(fundingPrivateKey);
};
const issuerSignatureCallback = async (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash
    .sign(tx, issuerPrivateKey, sighash, i, script, satoshis)
    .toTxFormat()
    .toString("hex");
};
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
let schema;
let aliceAddr;
let bobAddr;
const supply = 10000;
const symbol = "TAALT";
const wait = 5000; // due to delay in token issuance
const keyMap = new Map();

describe("Smoke Test 1", () => {
  it("Contract - Successful With Fees", async () => {
    await setupContract();
    const contractHex = await contract(
      issuerPrivateKey,
      contractUtxos,
      fundingUtxos,
      fundingPrivateKey,
      schema,
      supply
    );
    const contractTxid = await utils.broadcastWithRetry(contractHex);
    const amount = await utils.getVoutAmount(contractTxid, 0);
    expect(amount).to.equal(supply / 100000000);
  });

  it("Contract - Successful With Callback Fee", async () => {
    await setupContract();
    const contractHex = await contractWithCallback(
      issuerPrivateKey.publicKey,
      contractUtxos,
      fundingUtxos,
      fundingPrivateKey.publicKey,
      schema,
      supply,
      ownerSignCallback,
      paymentSignCallback
    );
    const contractTxid = await utils.broadcastWithRetry(contractHex);
    const amount = await utils.getVoutAmount(contractTxid, 0);
    expect(amount).to.equal(supply / 100000000);
  });

  it("Contract - Successful With Unsigned & Fee", async () => {
    await setupContract();
    const unsignedContractReturn = await unsignedContract(
      issuerPrivateKey.publicKey,
      contractUtxos,
      fundingUtxos,
      fundingPrivateKey.publicKey,
      schema,
      supply
    );
    const contractTxJson = JSON.parse(unsignedContractReturn.json);
    const contractTx = new bsv.Transaction(contractTxJson);
    let signedContract = contractTx.sign(issuerPrivateKey);
    signedContract = contractTx.sign(fundingPrivateKey);
    const contractTxid = await utils.broadcastWithRetry(
      signedContract.serialize(true)
    );
    const amount = await utils.getVoutAmount(contractTxid, 0);
    expect(amount).to.equal(supply / 100000000);
  });

  it("Issue - Successful Issue Token With Split And Fee 1", async () => {
    await setupIssue();
    const issueHex = await issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol
    );
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    const tokenId = await utils.getToken(issueTxid);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const response = await utils.getTokenResponse(tokenId);
    expect(response.symbol).to.equal(symbol);
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007);
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003);
    await utils.isTokenBalance(aliceAddr, 7000);
    await utils.isTokenBalance(bobAddr, 3000);
  });

  it("Issue - Successful Issue Token With Split And Fee 2", async () => {
    await setupIssue();
    const issueInfo = [
      {
        addr: aliceAddr,
        satoshis: 10000,
        data: "one",
      },
    ];
    const issueHex = await issue(
      issuerPrivateKey,
      issueInfo,
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol
    );
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    const tokenId = await utils.getToken(issueTxid);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const response = await utils.getTokenResponse(tokenId);
    expect(response.symbol).to.equal(symbol);
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.0001);
    await utils.isTokenBalance(aliceAddr, 10000);
  });

  it("Issue - Successful Callback with Fee", async () => {
    await setupIssue();
    const issueHex = await issueWithCallback(
      issuerPrivateKey.publicKey,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey.publicKey,
      true,
      symbol,
      issuerSignatureCallback,
      paymentSignatureCallback
    );
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    const tokenId = await utils.getToken(issueTxid);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const response = await utils.getTokenResponse(tokenId);
    expect(response.symbol).to.equal(symbol);
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007);
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003);
    await utils.isTokenBalance(aliceAddr, 7000);
    await utils.isTokenBalance(bobAddr, 3000);
  });

  it("Issue - Successful Issue Token With Unsigned & Fee", async () => {
    await setupIssue();
    const issueHex = await unsignedIssue(
      issuerPrivateKey.publicKey,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey.publicKey,
      true,
      symbol
    );
    const issueTx = new bsv.Transaction(issueHex.hex);
    utils.signScript(issueHex, issueTx, keyMap);
    const issueTxid = await utils.broadcastWithRetry(issueTx.serialize(true));
    const tokenId = await utils.getToken(issueTxid);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const response = await utils.getTokenResponse(tokenId);
    expect(response.symbol).to.equal(symbol);
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007);
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003);
    await utils.isTokenBalance(aliceAddr, 7000);
    await utils.isTokenBalance(bobAddr, 3000);
  });

  it("Merge - Successful Merge With Fee", async () => {
    await setupMerge();
    const mergeHex = await merge(
      bobPrivateKey,
      utils.getMergeUtxo(splitTxObj),
      aliceAddr,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    );
    const mergeTxid = await utils.broadcastWithRetry(mergeHex);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const tokenIdMerge = await utils.getToken(mergeTxid);
    const response = await utils.getTokenResponse(tokenIdMerge);
    expect(response.symbol).to.equal("TAALT");
    expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00007);
    await utils.isTokenBalance(aliceAddr, 7000);
    await utils.isTokenBalance(bobAddr, 3000);
  });

  it("Merge - Successful Merge With Callback And Fee", async () => {
    await setupMerge();
    const mergeHex = await mergeWithCallback(
      bobPrivateKey.publicKey,
      utils.getMergeUtxo(splitTxObj),
      aliceAddr,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey.publicKey,
      bobSignatureCallback,
      paymentSignatureCallback
    );
    const mergeTxid = await utils.broadcastWithRetry(mergeHex);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const tokenIdMerge = await utils.getToken(mergeTxid);
    const response = await utils.getTokenResponse(tokenIdMerge);
    expect(response.symbol).to.equal("TAALT");
    expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00007);
    await utils.isTokenBalance(aliceAddr, 7000);
    await utils.isTokenBalance(bobAddr, 3000);
  });
});

async function setupContract() {
  issuerPrivateKey = bsv.PrivateKey();
  keyMap.set(issuerPrivateKey.publicKey, issuerPrivateKey);
  fundingPrivateKey = bsv.PrivateKey();
  keyMap.set(fundingPrivateKey.publicKey, fundingPrivateKey);
  contractUtxos = await getFundsFromFaucet(
    issuerPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  fundingUtxos = await getFundsFromFaucet(
    fundingPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    issuerPrivateKey.publicKey.toBuffer()
  ).toString("hex");
  schema = utils.schema(publicKeyHash, symbol, supply);
}

async function setupIssue() {
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
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString();
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString();
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
}

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
