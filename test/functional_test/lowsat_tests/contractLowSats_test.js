const expect = require("chai").expect;
const utils = require("../../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const { contract, contractWithCallback } = require("../../../index");

const { getFundsFromFaucet } = require("../../../index").utils;

const ownerSignCallback = async (tx) => {
  tx.sign(issuerPrivateKey);
};

const paymentSignCallback = async (tx) => {
  tx.sign(fundingPrivateKey);
};

let issuerPrivateKey;
let fundingPrivateKey;
let contractUtxos;
let fundingUtxos;
let publicKeyHash;
const symbol = "TAALT";
let schema;

beforeEach(async () => {
  await setup();
});

describe("Contract Low Sat Tests", () => {
  it("Contract - Successful With Low Sats (20)", async () => {
    const supply = 20;
    await setup(supply);
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

  it("Contract - Successful With Low Sats (10)", async () => {
    const supply = 10;
    await setup(supply);
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

  it("Contract - Successful With Low Sats (5)", async () => {
    const supply = 5;
    await setup(supply);
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

  it("Contract - Successful With Low Sats (1)", async () => {
    const supply = 1;
    await setup(supply);
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

  it("Contract - Successful With Callback and Low Sats", async () => {
    const supply = 1;
    await setup(supply);
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
  schema = utils.schema(publicKeyHash, symbol, satSupply);
}
