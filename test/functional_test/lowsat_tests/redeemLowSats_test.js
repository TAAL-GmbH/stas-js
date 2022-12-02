const expect = require("chai").expect;
const utils = require("../../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const {
  contract,
  issue,
  redeem,
  redeemWithCallback,
} = require("../../../index");

const { getTransaction, getFundsFromFaucet } = require("../../../index").utils;

const { sighash } = require("../../../lib/stas");

let issuerPrivateKey;
let fundingPrivateKey;
let alicePrivateKey;
let contractUtxos;
let fundingUtxos;
let publicKeyHash;
let aliceAddr;
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

describe("Redeem Low Sat Tests", () => {
  it("Redeem - Successful Redeem With Low Sats (20)", async () => {
    await setup(20);
    const redeemHex = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey
    );
    const redeemTxid = await utils.broadcastWithRetryy(redeemHex);
    expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.0000002);
    await utils.isTokenBalance(aliceAddr, 0);
  });

  it("Redeem - Successful Redeem With Low Sats (10)", async () => {
    await setup(10);
    const redeemHex = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemHex);
    expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.0000001);
    await utils.isTokenBalance(aliceAddr, 0);
  });

  it("Redeem - Successful Redeem With Low Sats (5)", async () => {
    await setup(5);
    const redeemHex = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemHex);
    expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.00000005);
    await utils.isTokenBalance(aliceAddr, 0);
  });

  it("Redeem - Successful Redeem With Low Sats (1)", async () => {
    await setup(1);
    const redeemHex = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey
    );
    const redeemTxid = await utils.utils.utils.broadcastWithRetry(redeemHex);
    expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.00000001);
    await utils.isTokenBalance(aliceAddr, 0);
  });

  it("Redeem - Successful Redeem With Callback and Fee", async () => {
    await setup(1);
    const redeemHex = await redeemWithCallback(
      alicePrivateKey.publicKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey.publicKey,
      aliceSignatureCallback,
      paymentSignatureCallback
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemHex);
    expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.00000001);
    await utils.isTokenBalance(aliceAddr, 0);
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
  const symbol = "TAALT";
  const schema = utils.schema(publicKeyHash, symbol, satSupply);

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
  issueTxid = await utils.broadcastWithRetryWithRetry(issueHex);
  issueTx = await getTransaction(issueTxid);
}
