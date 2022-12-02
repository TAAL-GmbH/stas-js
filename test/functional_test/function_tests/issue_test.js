const expect = require("chai").expect;
const utils = require("../../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const {
  contract,
  issue,
  issueWithCallback,
  unsignedIssue,
} = require("../../../index");

const { getTransaction, getFundsFromFaucet, broadcast } =
  require("../../../index").utils;

const { sighash } = require("../../../lib/stas");

let issuerPrivateKey;
let fundingPrivateKey;
let bobPrivateKey;
let alicePrivateKey;
let contractUtxos;
let fundingUtxos;
let publicKeyHash;
let contractTx;
let contractTxid;
let aliceAddr;
let bobAddr;
let fundingAddress;
let symbol;
const keyMap = new Map();
const wait = 5000; // due to delay in token issuance

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

beforeEach(async () => {
  await setup(); // set up contract
});

describe("Issue Functional Tests", () => {
  it("Issue - Successful Issue Token With Split And Fee 1", async () => {
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

  it("Issue - Successful Issue Token With Split And Fee 3", async () => {
    const davePrivateKey = bsv.PrivateKey();
    const daveAddr = davePrivateKey.toAddress(process.env.NETWORK).toString();

    const issueInfo = [
      {
        addr: aliceAddr,
        satoshis: 6000,
        data: "one",
      },
      {
        addr: bobAddr,
        satoshis: 2000,
        data: "two",
      },
      {
        addr: daveAddr,
        satoshis: 2000,
        data: "three",
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
    console.log("token  " + tokenId);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const response = await utils.getTokenResponse(tokenId);
    expect(response.symbol).to.equal(symbol);
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00006);
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00002);
    expect(await utils.getVoutAmount(issueTxid, 2)).to.equal(0.00002);
    await utils.isTokenBalance(aliceAddr, 6000);
    await utils.isTokenBalance(bobAddr, 2000);
    await utils.isTokenBalance(daveAddr, 2000);
  });

  it("Issue - Successful Issue Token With Split And Fee 4", async () => {
    const davePrivateKey = bsv.PrivateKey();
    const daveAddr = davePrivateKey.toAddress(process.env.NETWORK).toString();
    const emmaPrivateKey = bsv.PrivateKey();
    const emmaAddr = emmaPrivateKey.toAddress(process.env.NETWORK).toString();
    const issueInfo = [
      {
        addr: aliceAddr,
        satoshis: 4000,
        data: "one",
      },
      {
        addr: bobAddr,
        satoshis: 3000,
        data: "two",
      },
      {
        addr: daveAddr,
        satoshis: 2000,
        data: "three",
      },
      {
        addr: emmaAddr,
        satoshis: 1000,
        data: "three",
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
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00004);
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003);
    expect(await utils.getVoutAmount(issueTxid, 2)).to.equal(0.00002);
    expect(await utils.getVoutAmount(issueTxid, 3)).to.equal(0.00001);
    await utils.isTokenBalance(aliceAddr, 4000);
    await utils.isTokenBalance(bobAddr, 3000);
    await utils.isTokenBalance(daveAddr, 2000);
    await utils.isTokenBalance(emmaAddr, 1000);
  });

  it("Issue - Successful Issue Token To Same Address", async () => {
    const issueHex = await issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000, aliceAddr, 3000),
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
    await utils.isTokenBalance(aliceAddr, 10000);
  });

  it("Issue - Successful Issue Token To Funding Address", async () => {
    const issueHex = await issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000, fundingAddress, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol
    );
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    const tokenId = await utils.getToken(issueTxid);
    const response = await utils.getTokenResponse(tokenId);
    await new Promise((resolve) => setTimeout(resolve, wait));
    expect(response.symbol).to.equal(symbol);
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007);
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003);
    await utils.isTokenBalance(aliceAddr, 7000);
    await utils.isTokenBalance(fundingAddress, 3000);
  });

  it("Issue - Successful Issue Token Non Split", async () => {
    const issueHex = await issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      false,
      symbol
    );
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    const tokenId = await utils.getToken(issueTxid);
    const response = await utils.getTokenResponse(tokenId);
    expect(response.symbol).to.equal(symbol);
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007);
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003);
    await utils.isTokenBalance(aliceAddr, 7000);
    await utils.isTokenBalance(bobAddr, 3000);
  });

  it("Issue - Successful Issue Token With Split No Fee", async () => {
    const issueHex = await issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      null,
      null,
      true,
      symbol
    );
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    const tokenId = await utils.getToken(issueTxid);
    const response = await utils.getTokenResponse(tokenId);
    expect(response.symbol).to.equal(symbol);
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007);
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003);
    await utils.isTokenBalance(aliceAddr, 7000);
    await utils.isTokenBalance(bobAddr, 3000);
  });

  it("Issue - Succesful Empty Funding UTXO", async () => {
    const issueHex = await issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      null,
      null,
      true,
      symbol
    );
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    const tokenId = await utils.getToken(issueTxid);
    const response = await utils.getTokenResponse(tokenId);
    expect(response.symbol).to.equal(symbol);
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007);
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003);
    await utils.isTokenBalance(aliceAddr, 7000);
    await utils.isTokenBalance(bobAddr, 3000);
  });

  it("Issue - Successful Callback with Fee", async () => {
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

  it("Issue - Successful No Fee with callback", async () => {
    const issueHex = await issueWithCallback(
      issuerPrivateKey.publicKey,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      null,
      null,
      true,
      symbol,
      issuerSignatureCallback,
      null
    );
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    const tokenId = await utils.getToken(issueTxid);
    const response = await utils.getTokenResponse(tokenId);
    expect(response.symbol).to.equal(symbol);
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007);
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003);
    await utils.isTokenBalance(aliceAddr, 7000);
    await utils.isTokenBalance(bobAddr, 3000);
  });

  it("Issue - Successful Issue Token 10 Addresses", async () => {
    const pk1 = bsv.PrivateKey();
    const add1 = pk1.toAddress(process.env.NETWORK).toString();
    const pk2 = bsv.PrivateKey();
    const add2 = pk2.toAddress(process.env.NETWORK).toString();
    const pk3 = bsv.PrivateKey();
    const add3 = pk3.toAddress(process.env.NETWORK).toString();
    const pk4 = bsv.PrivateKey();
    const add4 = pk4.toAddress(process.env.NETWORK).toString();
    const pk5 = bsv.PrivateKey();
    const add5 = pk5.toAddress(process.env.NETWORK).toString();
    const pk6 = bsv.PrivateKey();
    const add6 = pk6.toAddress(process.env.NETWORK).toString();
    const pk7 = bsv.PrivateKey();
    const add7 = pk7.toAddress(process.env.NETWORK).toString();
    const pk8 = bsv.PrivateKey();
    const add8 = pk8.toAddress(process.env.NETWORK).toString();

    const issueHex = await issue(
      issuerPrivateKey,
      utils.getTenIssueInfo(
        add1,
        add2,
        add3,
        add4,
        add5,
        add6,
        add7,
        add8,
        aliceAddr,
        bobAddr
      ),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      "TAALT"
    );
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    const tokenId = await utils.getToken(issueTxid);
    await new Promise((resolve) => setTimeout(resolve, 10000));
    const response = await utils.getTokenResponse(tokenId);
    expect(response.symbol).to.equal(symbol);

    for (let i = 1; i < 10; i++) {
      expect(await utils.getVoutAmount(issueTxid, i)).to.equal(0.00001);
    }
    await utils.isTokenBalance(aliceAddr, 1000);
    await utils.isTokenBalance(bobAddr, 1000);
  });

  it("Issue - Successful Issue Token With Unsigned & Fee", async () => {
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

  it("Issue - Successful Issue Token With Unsigned & NoFee", async () => {
    const issueHex = await unsignedIssue(
      issuerPrivateKey.publicKey,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      null,
      null,
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

  it("Issue - Issue With Incorrect issuer private key", async () => {
    const incorrectPrivateKey = bsv.PrivateKey();
    const issueHex = await issue(
      incorrectPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol
    );
    try {
      await broadcast(issueHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.response.data).to.contain(
        "mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)"
      );
    }
  });

  it("Issue - Issue With Incorrect funding private key", async () => {
    const incorrectPrivateKey = bsv.PrivateKey();
    const issueHex = await issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      incorrectPrivateKey,
      true,
      symbol
    );
    try {
      await broadcast(issueHex);
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
  fundingAddress = fundingPrivateKey.toAddress(process.env.NETWORK).toString();
  symbol = "TAALT";
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
  contractTxid = await utils.broadcastWithRetry(contractHex);
  contractTx = await getTransaction(contractTxid);
}
