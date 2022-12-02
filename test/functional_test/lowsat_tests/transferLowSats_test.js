const expect = require("chai").expect;
const utils = require("../../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const {
  contract,
  issue,
  transfer,
  transferWithCallback,
} = require("../../../index");

const { getTransaction, getFundsFromFaucet } = require("../../../index").utils;

const { sighash } = require("../../../lib/stas");

let issuerPrivateKey;
let fundingPrivateKey;
let bobPrivateKey;
let alicePrivateKey;
let contractUtxos;
let fundingUtxos;
let publicKeyHash;
let aliceAddr;
let bobAddr;
let symbol;
let issueTxid;
let issueTx;

const aliceSignatureCallback = async (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash
    .sign(tx, alicePrivateKey, sighash, i, script, satoshis)
    .toTxFormat()
    .toString("hex");
};
const paymentSignatureCallback = async (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash
    .sign(tx, fundingPrivateKey, sighash, i, script, satoshis)
    .toTxFormat()
    .toString("hex");
};

describe("Transfer Low Sat Tests", () => {
  it("Transfer - Successful With Low Sats (20)", async () => {
    await setup(20);
    const transferHex = await transfer(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      bobAddr,
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey
    );
    const transferTxid = await utils.broadcastWithRetry(transferHex);
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.0000002);
    await utils.isTokenBalance(bobAddr, 20);
  });

  it("Transfer - Successful With Low Sats (10)", async () => {
    await setup(10);
    const transferHex = await transfer(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      bobAddr,
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey
    );
    const transferTxid = await utils.broadcastWithRetry(transferHex);
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.0000001);
    await utils.isTokenBalance(bobAddr, 10);
  });

  it("Transfer - Successful With Low Sats (5)", async () => {
    await setup(5);
    const transferHex = await transfer(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      bobAddr,
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey
    );
    const transferTxid = await utils.broadcastWithRetry(transferHex);
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00000005);
    await utils.isTokenBalance(bobAddr, 5);
  });

  it("Transfer - Successful With Low Sats (1)", async () => {
    await setup(1);
    const transferHex = await transfer(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      bobAddr,
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey
    );
    const transferTxid = await utils.broadcastWithRetry(transferHex);
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00000001);
    await utils.isTokenBalance(bobAddr, 1);
  });

  it("Transfer - Successful Callback With Fee", async () => {
    await setup(1);
    const transferHex = await transferWithCallback(
      alicePrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      bobAddr,
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey.publicKey,
      aliceSignatureCallback,
      paymentSignatureCallback
    );
    const transferTxid = await utils.broadcastWithRetry(transferHex);
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00000001);
    await utils.isTokenBalance(bobAddr, 1);
  });
});

async function setup(satSupply) {
  issuerPrivateKey = bsv.PrivateKey();
  fundingPrivateKey = bsv.PrivateKey();
  bobPrivateKey = bsv.PrivateKey();
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
  symbol = "TAALT";
  const supply = 10000;
  const schema = utils.schema(publicKeyHash, symbol, supply);
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString();
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString();

  const contractHex = await contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    satSupply
  );
  const contractTxid = await utils.broadcastWithRetry(contractHex);
  const contractTx = await getTransaction(contractTxid);

  const issueHex = await issue(
    issuerPrivateKey,
    [
      {
        addr: aliceAddr,
        satoshis: satSupply,
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
}
