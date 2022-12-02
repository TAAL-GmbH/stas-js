const expect = require("chai").expect;
const utils = require("../../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const {
  contract,
  issue,
  transfer,
  transferWithCallback,
  unsignedTransfer,
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
let aliceAddr;
let bobAddr;
let fundingAddress;
let symbol;
let issueTxid;
let issueTx;
let issueOutFundingVout;
const keyMap = new Map();

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
  await setup(); // contract and issue
  issueOutFundingVout = issueTx.vout.length - 1;
});

describe("Transfer Functional Tests", () => {
  it("Transfer - Successful With Fee 1", async () => {
    const transferHex = await transfer(
      bobPrivateKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    );
    const transferTxid = await utils.broadcastWithRetry(transferHex);
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003);
    await utils.isTokenBalance(aliceAddr, 10000);
    await utils.isTokenBalance(bobAddr, 0);
  });

  it("Transfer - Successful With Fee 2", async () => {
    const transferHex = await transfer(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      bobAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    );
    const transferTxid = await utils.broadcastWithRetry(transferHex);
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00007);
    await utils.isTokenBalance(aliceAddr, 0);
    await utils.isTokenBalance(bobAddr, 10000);
  });

  it("Transfer - Successful With Fee 3", async () => {
    const davePrivateKey = bsv.PrivateKey();
    const daveAddr = davePrivateKey.toAddress(process.env.NETWORK).toString();
    const transferHex = await transfer(
      bobPrivateKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      daveAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    );
    const transferTxid = await utils.broadcastWithRetry(transferHex);
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003);
    await utils.isTokenBalance(aliceAddr, 7000);
    await utils.isTokenBalance(bobAddr, 0);
    await utils.isTokenBalance(daveAddr, 3000);
  });

  it("Transfer - Successful With Fee 4", async () => {
    const transferHex = await transfer(
      bobPrivateKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      bobAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    );
    const transferTxid = await utils.broadcastWithRetry(transferHex);
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003);
    await utils.isTokenBalance(aliceAddr, 7000);
    await utils.isTokenBalance(bobAddr, 3000);
  });

  it("Transfer - Successful to Funding Address", async () => {
    const transferHex = await transfer(
      bobPrivateKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingAddress,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    );
    const transferTxid = await utils.broadcastWithRetry(transferHex);
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003);
    await utils.isTokenBalance(aliceAddr, 7000);
    await utils.isTokenBalance(fundingAddress, 3000);
  });

  it("Transfer - Successful No Fee", async () => {
    const transferHex = await transfer(
      bobPrivateKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      aliceAddr,
      null,
      null
    );
    const transferTxid = await utils.broadcastWithRetry(transferHex);
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003);
    await utils.isTokenBalance(aliceAddr, 10000);
    await utils.isTokenBalance(bobAddr, 0);
  });

  it("Transfer - Successful Callback With No Fee", async () => {
    const transferHex = await transferWithCallback(
      bobPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      aliceAddr,
      null,
      null,
      bobSignatureCallback,
      null
    );
    const transferTxid = await utils.broadcastWithRetry(transferHex);
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003);
    await utils.isTokenBalance(aliceAddr, 10000);
    await utils.isTokenBalance(bobAddr, 0);
  });

  it("Transfer - Successful Callback With Fee", async () => {
    const transferHex = await transferWithCallback(
      bobPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      bobAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey.publicKey,
      bobSignatureCallback,
      paymentSignatureCallback
    );
    const transferTxid = await utils.broadcastWithRetry(transferHex);
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003);
    await utils.isTokenBalance(bobAddr, 3000);
    await utils.isTokenBalance(aliceAddr, 7000);
  });

  it("Transfer - Successful Unsigned & Fee", async () => {
    const unsignedTransferReturn = await unsignedTransfer(
      bobPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey.publicKey
    );
    const transferTx = bsv.Transaction(unsignedTransferReturn.hex);
    utils.signScriptWithUnlocking(unsignedTransferReturn, transferTx, keyMap);
    const transferTxid = await utils.broadcastWithRetry(
      transferTx.serialize(true)
    );
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003);
    await utils.isTokenBalance(aliceAddr, 10000);
    await utils.isTokenBalance(bobAddr, 0);
  });

  it("Transfer - Successful Unsigned & No Fee", async () => {
    const unsignedTransferReturn = await unsignedTransfer(
      bobPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      aliceAddr,
      null,
      null
    );
    const transferTx = bsv.Transaction(unsignedTransferReturn.hex);
    utils.signScriptWithUnlocking(unsignedTransferReturn, transferTx, keyMap);
    const transferTxid = await utils.broadcastWithRetry(
      transferTx.serialize(true)
    );
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003);
    await utils.isTokenBalance(aliceAddr, 10000);
    await utils.isTokenBalance(bobAddr, 0);
  });

  it("Transfer -  Transfer To Issuer Address (Splitable) Throws Error", async () => {
    const issuerAddr = issuerPrivateKey
      .toAddress(process.env.NETWORK)
      .toString();
    try {
      await transfer(
        issuerPrivateKey,
        utils.getUtxo(issueTxid, issueTx, 1),
        issuerAddr,
        utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
        fundingPrivateKey
      );
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.contain(
        "Token UTXO cannot be sent to issuer address"
      );
    }
  });

  it("Transfer - Invalid Issuer Private Key Throws Error", async () => {
    const incorrectPK = bsv.PrivateKey();
    const transferHex = await transfer(
      incorrectPK,
      utils.getUtxo(issueTxid, issueTx, 1),
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    );
    try {
      await broadcast(transferHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.response.data).to.contain(
        "mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)"
      );
    }
  });

  it("Transfer - Invalid Funding Private Key Throws Error", async () => {
    const incorrectPK = bsv.PrivateKey();
    const transferHex = await transfer(
      bobPrivateKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      incorrectPK
    );
    try {
      await broadcast(transferHex);
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
  symbol = "TAALT";
  const supply = 10000;
  const schema = utils.schema(publicKeyHash, symbol, supply);
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString();
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString();
  fundingAddress = fundingPrivateKey.toAddress(process.env.NETWORK).toString();

  const contractHex = await contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  );
  const contractTxid = await utils.broadcastWithRetry(contractHex);
  const contractTx = await getTransaction(contractTxid);

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
  issueTxid = await utils.broadcastWithRetry(issueHex);
  issueTx = await getTransaction(issueTxid);
}
