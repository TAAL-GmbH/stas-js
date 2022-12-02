const expect = require("chai").expect;
const utils = require("../../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const {
  contract,
  contractWithCallback,
  unsignedContract,
} = require("../../../index");

const { getFundsFromFaucet, broadcast } = require("../../../index").utils;

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
const supply = 10000;
const symbol = "TAALT";
let schema;
const keymap = new Map();

beforeEach(async () => {
  await setup();
});

describe("Contract Functional Tests", () => {
  it("Contract - Successful With Fees", async () => {
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

  it("Contract - Successful No Fees", async () => {
    const contractHex = await contract(
      issuerPrivateKey,
      contractUtxos,
      null,
      null,
      schema,
      supply
    );
    const contractTxid = await utils.broadcastWithRetry(contractHex);
    const amount = await utils.getVoutAmount(contractTxid, 0);
    expect(amount).to.equal(supply / 100000000);
  });

  it("Contract - Successful No Fees Empty Array", async () => {
    const contractHex = await contract(
      issuerPrivateKey,
      contractUtxos,
      [],
      fundingPrivateKey,
      schema,
      supply
    );
    const contractTxid = await utils.broadcastWithRetry(contractHex);
    const amount = await utils.getVoutAmount(contractTxid, 0);
    expect(amount).to.equal(supply / 100000000);
  });

  it("Contract - Successful With Callback Fee", async () => {
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

  it("Contract - Successful With Callback No Fee", async () => {
    const contractHex = await contractWithCallback(
      issuerPrivateKey.publicKey,
      contractUtxos,
      null,
      null,
      schema,
      supply,
      ownerSignCallback,
      null
    );
    const contractTxid = await utils.broadcastWithRetry(contractHex);
    const amount = await utils.getVoutAmount(contractTxid, 0);
    expect(amount).to.equal(supply / 100000000);
  });

  it("Contract - Successful With Unsigned & Fee", async () => {
    const contractHex = await unsignedContract(
      issuerPrivateKey.publicKey,
      contractUtxos,
      fundingUtxos,
      fundingPrivateKey,
      schema,
      supply
    );
    const contractTxJson = JSON.parse(contractHex.json);
    const contractTx = new bsv.Transaction(contractTxJson);
    let signedContract = contractTx.sign(issuerPrivateKey);
    signedContract = contractTx.sign(fundingPrivateKey);
    const contractTxid = await utils.broadcastWithRetry(
      signedContract.serialize(true)
    );
    const amount = await utils.getVoutAmount(contractTxid, 0);
    expect(amount).to.equal(supply / 100000000);
  });

  it("Contract - Successful With Unsigned No Fee", async () => {
    const contractHex = await unsignedContract(
      issuerPrivateKey.publicKey,
      contractUtxos,
      null,
      null,
      schema,
      supply
    );
    const contractTxJson = JSON.parse(contractHex.json);
    const contractTx = new bsv.Transaction(contractTxJson);
    const signedContract = contractTx.sign(issuerPrivateKey);
    const contractTxid = await utils.broadcastWithRetry(
      signedContract.serialize(true)
    );
    const amount = await utils.getVoutAmount(contractTxid, 0);
    expect(amount).to.equal(supply / 100000000);
  });

  it("Contract - Wrong Funding Private Key Throws Error", async () => {
    const incorrectPrivateKey = bsv.PrivateKey();
    const contractHex = await contract(
      issuerPrivateKey,
      contractUtxos,
      fundingUtxos,
      incorrectPrivateKey,
      schema,
      supply
    );
    try {
      await broadcast(contractHex);
      expect(false).toBeTruthy();
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.response.data).to.contain(
        "mandatory-script-verify-flag-failed (Operation not valid with the current stack size)"
      );
    }
  });
});

async function setup() {
  issuerPrivateKey = bsv.PrivateKey();
  fundingPrivateKey = bsv.PrivateKey();
  keymap.set(issuerPrivateKey, fundingPrivateKey);
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
