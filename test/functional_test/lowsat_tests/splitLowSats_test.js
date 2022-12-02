const expect = require("chai").expect;
const utils = require("../../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const { contract, issue, split, splitWithCallback } = require("../../../index");

const { bitcoinToSatoshis, getTransaction, getFundsFromFaucet } =
  require("../../../index").utils;

const { sighash } = require("../../../lib/stas");

let issuerPrivateKey;
let fundingPrivateKey;
let contractUtxos;
let fundingUtxos;
let publicKeyHash;
let bobPrivateKey;
let alicePrivateKey;
let bobAddr;
let aliceAddr;
let issueTxid;
let issueTx;
const wait = 10000;

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

describe("Split Low Sat Tests", () => {
  it("Split - Successful Split Into Two Tokens With Low Sats (20)", async () => {
    await setup(40);
    const issueTxSats = issueTx.vout[0].value;
    const amount = issueTxSats / 2;
    const splitDestinations = [];
    splitDestinations[0] = {
      address: aliceAddr,
      satoshis: bitcoinToSatoshis(amount),
    };
    splitDestinations[1] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(amount),
    };

    const splitHex = await split(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey
    );
    const splitTxid = await utils.broadcastWithRetry(splitHex);
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.0000002);
    await utils.isTokenBalance(bobAddr, 20);
  });

  it("Split - Successful Split Into Two Tokens With Low Sats (10)", async () => {
    await setup(20);
    const issueTxSats = issueTx.vout[0].value;
    const amount = issueTxSats / 2;
    const splitDestinations = [];
    splitDestinations[0] = {
      address: aliceAddr,
      satoshis: bitcoinToSatoshis(amount),
    };
    splitDestinations[1] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(amount),
    };

    const splitHex = await split(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey
    );
    const splitTxid = await utils.broadcastWithRetry(splitHex);
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.0000001);
    await utils.isTokenBalance(bobAddr, 10);
  });

  it("Split - Successful Split Into Two Tokens With Low Sats (5)", async () => {
    await setup(10);
    const issueTxSats = issueTx.vout[0].value;
    const amount = issueTxSats / 2;
    const splitDestinations = [];
    splitDestinations[0] = {
      address: aliceAddr,
      satoshis: bitcoinToSatoshis(amount),
    };
    splitDestinations[1] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(amount),
    };

    const splitHex = await split(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey
    );
    const splitTxid = await utils.broadcastWithRetry(splitHex);
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.00000005);
    await utils.isTokenBalance(bobAddr, 5);
  });

  it("Split - Successful Split Into Two Tokens With Low Sats (1)", async () => {
    await setup(2);
    const issueTxSats = issueTx.vout[0].value;
    const amount = issueTxSats / 2;
    const splitDestinations = [];
    splitDestinations[0] = {
      address: aliceAddr,
      satoshis: bitcoinToSatoshis(amount),
    };
    splitDestinations[1] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(amount),
    };

    const splitHex = await split(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey
    );
    const splitTxid = await utils.broadcastWithRetry(splitHex);
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.00000001);
    await utils.isTokenBalance(aliceAddr, 1);
    await utils.isTokenBalance(bobAddr, 1);
  });

  it("Split - Successful Split With Callback and Fee", async () => {
    await setup(2);
    const issueTxSats = issueTx.vout[0].value;
    const amount = issueTxSats / 2;
    const splitDestinations = [];
    splitDestinations[0] = {
      address: aliceAddr,
      satoshis: bitcoinToSatoshis(amount),
    };
    splitDestinations[1] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(amount),
    };

    const splitHex = await splitWithCallback(
      alicePrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey.publicKey,
      aliceSignatureCallback,
      paymentSignatureCallback
    );
    const splitTxid = await utils.broadcastWithRetry(splitHex);
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.00000001);
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.00000001);
    await utils.isTokenBalance(aliceAddr, 1);
    await utils.isTokenBalance(bobAddr, 1);
  });
});
async function setup(satSupply) {
  issuerPrivateKey = bsv.PrivateKey();
  fundingPrivateKey = bsv.PrivateKey();
  contractUtxos = await getFundsFromFaucet(
    issuerPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  fundingUtxos = await getFundsFromFaucet(
    fundingPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    issuerPrivateKey.publicKey.toBuffer()
  ).toString("hex");
  bobPrivateKey = bsv.PrivateKey();
  alicePrivateKey = bsv.PrivateKey();
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString();
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
  issueTxid = await utils.broadcastWithRetry(issueHex);
  issueTx = await getTransaction(issueTxid);
}
