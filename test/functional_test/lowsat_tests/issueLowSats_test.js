const expect = require("chai").expect;
const utils = require("../../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const { contract, issue, issueWithCallback } = require("../../../index");

const { getTransaction, getFundsFromFaucet } = require("../../../index").utils;

const { sighash } = require("../../../lib/stas");

let issuerPrivateKey;
let fundingPrivateKey;
let alicePrivateKey;
let contractUtxos;
let fundingUtxos;
let publicKeyHash;
let contractTx;
let contractTxid;
let aliceAddr;
let symbol;
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

describe("Issue Low Sat Tests", () => {
  it("Issue - Successful Issue Token With Low Sats (20)", async () => {
    const supply = 20;
    await setup(supply);

    const issueHex = await issue(
      issuerPrivateKey,
      [
        {
          addr: aliceAddr,
          satoshis: supply,
        },
      ],
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
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.0000002);
    await utils.isTokenBalance(aliceAddr, 20);
  });

  it("Issue - Successful Issue Token With Low Sats (10)", async () => {
    const supply = 10;
    await setup(supply);

    const issueHex = await issue(
      issuerPrivateKey,
      [
        {
          addr: aliceAddr,
          satoshis: supply,
        },
      ],
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
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.0000001);
    await utils.isTokenBalance(aliceAddr, 10);
  });
  it("Issue - Successful Issue Token With Low Sats (5)", async () => {
    const supply = 5;
    await setup(supply);

    const issueHex = await issue(
      issuerPrivateKey,
      [
        {
          addr: aliceAddr,
          satoshis: supply,
        },
      ],
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
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00000005);
    await utils.isTokenBalance(aliceAddr, 5);
  });

  it("Issue - Successful Issue Token With Low Sats (1)", async () => {
    const supply = 1;
    await setup(supply);

    const issueHex = await issue(
      issuerPrivateKey,
      [
        {
          addr: aliceAddr,
          satoshis: supply,
        },
      ],
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
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00000001);
    await utils.isTokenBalance(aliceAddr, 1);
  });

  it("Issue - Successful Callback with Fee", async () => {
    const supply = 1;
    await setup(supply);
    const issueHex = await issueWithCallback(
      issuerPrivateKey.publicKey,
      [
        {
          addr: aliceAddr,
          satoshis: supply,
        },
      ],
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
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00000001);
    await utils.isTokenBalance(aliceAddr, 1);
  });
});

async function setup(satSupply) {
  issuerPrivateKey = bsv.PrivateKey();
  fundingPrivateKey = bsv.PrivateKey();
  alicePrivateKey = bsv.PrivateKey();
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
  symbol = "TAALT";
  const schema = utils.schema(publicKeyHash, symbol, satSupply);

  const contractHex = await contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    satSupply
  );
  contractTxid = await utils.broadcastWithRetry(contractHex);
  contractTx = await getTransaction(contractTxid);
}
