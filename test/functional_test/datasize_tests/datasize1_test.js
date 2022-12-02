const expect = require("chai").expect;
const utils = require("../../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const { contract, issue, redeem } = require("../../../index");

const { getTransaction, getFundsFromFaucet, broadcast } =
  require("../../../index").utils;

// Symbol size of 40 bytes
const symbol = "CallmeIshmaelSomeyearsagosdnevermindhowl";
const wait = 5000; // wait may be required due to delay in issuance of token
let issuerPrivateKey;
let fundingPrivateKey;
let alicePrivateKey;
let aliceAddr;
let contractUtxos;
let fundingUtxos;
let publicKeyHash;
let contractTxid;
let contractTx;

beforeEach(async () => {
  await setup();
});
describe("Symbol Size 40 Bytes test", () => {
  it("Symbol Size 40 Data Size Zero Bytes", async () => {
    const data = "";
    console.log("Data Size " + utils.byteCount(data));
    const issueInfo = [
      {
        addr: aliceAddr,
        satoshis: 10000,
        data: data,
      },
    ];
    const issueHex = await issue(
      issuerPrivateKey,
      issueInfo,
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol,
      2
    );
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const tokenId = await utils.getToken(issueTxid);
    console.log(`issueTxid:        ${issueTxid}`);
    console.log(`Token ID:        ${tokenId}`);
    const response = await utils.getTokenResponse(tokenId, symbol);
    expect(response.symbol).to.equal(symbol);
    const issueTx = await getTransaction(issueTxid);
    const redeemHex = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemHex);
    console.log(`Redeem TX:       ${redeemTxid}`);
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.0001);
    await utils.isTokenBalance(aliceAddr, 0);
  });

  it("Symbol Size 40 Data Size 1 Byte", async () => {
    const data = "A";
    console.log("Data Size " + utils.byteCount(data));
    const issueInfo = [
      {
        addr: aliceAddr,
        satoshis: 10000,
        data: data,
      },
    ];
    const issueHex = await issue(
      issuerPrivateKey,
      issueInfo,
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol,
      2
    );
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    const tokenId = await utils.getToken(issueTxid);
    console.log(`issueTxid:        ${issueTxid}`);
    console.log(`Token ID:        ${tokenId}`);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const response = await utils.getTokenResponse(tokenId, symbol);
    expect(response.symbol).to.equal(symbol);
    const issueTx = await getTransaction(issueTxid);

    const redeemHex = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemHex);
    console.log(`Redeem TX:       ${redeemTxid}`);
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.0001);
    await utils.isTokenBalance(aliceAddr, 0);
  });

  it("Symbol Size 40 Data Size < 75 Bytes", async () => {
    const data =
      "It was the best of times, it was the worst of times, it was the age of";
    console.log("Data Size " + utils.byteCount(data));
    const issueInfo = [
      {
        addr: aliceAddr,
        satoshis: 10000,
        data: data,
      },
    ];
    const issueHex = await issue(
      issuerPrivateKey,
      issueInfo,
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol,
      2
    );
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    const tokenId = await utils.getToken(issueTxid);
    console.log(`issueTxid:        ${issueTxid}`);
    console.log(`Token ID:        ${tokenId}`);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const response = await utils.getTokenResponse(tokenId, symbol);
    expect(response.symbol).to.equal(symbol);
    const issueTx = await getTransaction(issueTxid);

    const redeemHex = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemHex);
    console.log(`Redeem TX:       ${redeemTxid}`);
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.0001);
    await utils.isTokenBalance(aliceAddr, 0);
  });

  it("Symbol Size 40 Data Size < 128 Bytes", async () => {
    const data =
      "It was the best of times, it was the worst of times, it was the age of wisdom. It was the best of times, it was the";
    console.log("Data Size " + utils.byteCount(data));
    const issueInfo = [
      {
        addr: aliceAddr,
        satoshis: 10000,
        data: data,
      },
    ];
    const issueHex = await issue(
      issuerPrivateKey,
      issueInfo,
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol,
      2
    );
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    const tokenId = await utils.getToken(issueTxid);
    console.log(`issueTxid:        ${issueTxid}`);
    console.log(`Token ID:        ${tokenId}`);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const response = await utils.getTokenResponse(tokenId, symbol);
    expect(response.symbol).to.equal(symbol);
    const issueTx = await getTransaction(issueTxid);

    const redeemHex = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemHex);
    console.log(`Redeem TX:       ${redeemTxid}`);
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.0001);
    await utils.isTokenBalance(aliceAddr, 0);
  });

  it("Symbol Size 40 Data Size > 128 Bytes", async () => {
    const data =
      "It was the best of times, it was the worst of times, it was the age of wisdom. It was the best of times, it was the worst of";
    console.log("Data Size " + utils.byteCount(data));
    const issueInfo = [
      {
        addr: aliceAddr,
        satoshis: 10000,
        data: data,
      },
    ];
    const issueHex = await issue(
      issuerPrivateKey,
      issueInfo,
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol,
      2
    );
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    const tokenId = await utils.getToken(issueTxid);
    console.log(`issueTxid:        ${issueTxid}`);
    console.log(`Token ID:        ${tokenId}`);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const response = await utils.getTokenResponse(tokenId, symbol);
    expect(response.symbol).to.equal(symbol);
    const issueTx = await getTransaction(issueTxid);

    const redeemHex = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemHex);
    console.log(`Redeem TX:       ${redeemTxid}`);
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.0001);
    await utils.isTokenBalance(aliceAddr, 0);
  });

  it("Symbol Size 40 Data Size > 32768 Bytes", async () => {
    console.log("Data Size " + utils.byteCount(utils.addData(33)));
    const issueInfo = [
      {
        addr: aliceAddr,
        satoshis: 10000,
        data: utils.addData(33),
      },
    ];
    const issueHex = await issue(
      issuerPrivateKey,
      issueInfo,
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol,
      2
    );
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    const tokenId = await utils.getToken(issueTxid);
    console.log(`issueTxid:        ${issueTxid}`);
    console.log(`Token ID:        ${tokenId}`);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const response = await utils.getTokenResponse(tokenId, symbol);
    expect(response.symbol).to.equal(symbol);
    const issueTx = await getTransaction(issueTxid);

    const redeemHex = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemHex);
    console.log(`Redeem TX:       ${redeemTxid}`);
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.0001);
    await utils.isTokenBalance(aliceAddr, 0);
  });

  it("Symbol Size 40 Data Size < 32768 Bytes", async () => {
    console.log("Data Size " + utils.byteCount(utils.addData(32)));

    const issueInfo = [
      {
        addr: aliceAddr,
        satoshis: 10000,
        data: utils.addData(32),
      },
    ];
    const issueHex = await issue(
      issuerPrivateKey,
      issueInfo,
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol,
      2
    );
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    const tokenId = await utils.getToken(issueTxid);
    console.log(`issueTxid:        ${issueTxid}`);
    console.log(`Token ID:        ${tokenId}`);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const response = await utils.getTokenResponse(tokenId, symbol);
    expect(response.symbol).to.equal(symbol);
    const issueTx = await getTransaction(issueTxid);

    const redeemHex = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemHex);
    console.log(`Redeem TX:       ${redeemTxid}`);
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.0001);
    await utils.isTokenBalance(aliceAddr, 0);
  });

  it("Symbol < 128 Data Size Large", async () => {
    console.log("Data Size " + utils.byteCount(utils.addData(48)));

    const issueInfo = [
      {
        addr: aliceAddr,
        satoshis: 10000,
        data: utils.addData(48),
      },
    ];
    const issueHex = await issue(
      issuerPrivateKey,
      issueInfo,
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol,
      2
    );
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    const tokenId = await utils.getToken(issueTxid);
    console.log(`issueTxid:        ${issueTxid}`);
    console.log(`Token ID:        ${tokenId}`);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const response = await utils.getTokenResponse(tokenId, symbol);
    expect(response.symbol).to.equal(symbol);
    const issueTx = await getTransaction(issueTxid);

    const redeemHex = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemHex);
    console.log(`Redeem TX:       ${redeemTxid}`);
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.0001);
    await utils.isTokenBalance(aliceAddr, 0);
  });
});

async function setup() {
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
