const expect = require("chai").expect;
const utils = require("../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const {
  contract,
  transfer,
  redeem,
  redeemSplit,
  issue,
  split,
  merge,
  mergeSplit,
} = require("../../index");

const { getFundsFromFaucet, broadcast, getTransaction, bitcoinToSatoshis } =
  require("../../index").utils;

let issuerPrivateKey;
let contractIssuerPrivateKey;
let fundingPrivateKey;
let bobPrivateKey;
let alicePrivateKey;
let contractUtxos;
let fundingUtxos;

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
const keyMap = new Map();

beforeAll(async () => {
  await setupContract();
  await setupMerge();
  await setupIssue();
  await setupRedeem();
});

// todo refactor setup

// test needs fixed
// it("Contract - Wrong Funding Private Key Throws Error", async () => {
//   const incorrectPrivateKey = bsv.PrivateKey();
//   const contractHex = await contract(
//     contractIssuerPrivateKey,
//     contractUtxos,
//     fundingUtxos,
//     incorrectPrivateKey,
//     schema,
//     supply
//   );
//   try {
//     await broadcast(contractHex);
//     expect(false).toBeTruthy();
//   } catch (e) {
//     expect(e).to.be.instanceOf(Error);
//     expect(e.response.data).to.contain("mandatory-script-verify-flag-failed");
//   }
// });

describe("Smoke Test 3", () => {
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

  it("Merge - Incorrect Owner Private Key Throws Error", async () => {
    const incorrectPrivateKey = bsv.PrivateKey();
    const mergeHex = await merge(
      incorrectPrivateKey,
      utils.getMergeUtxo(splitTxObj),
      aliceAddr,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    );
    try {
      await broadcast(mergeHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.response.data).to.contain(
        "mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)"
      );
    }
  });

  it("Merge - Incorrect Funding Private Key Throws Error", async () => {
    const incorrectPrivateKey = bsv.PrivateKey();
    const mergeHex = await merge(
      bobPrivateKey,
      utils.getMergeUtxo(splitTxObj),
      aliceAddr,
      utils.getUtxo(splitTxid, splitTx, 2),
      incorrectPrivateKey
    );
    try {
      await broadcast(mergeHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.response.data).to.contain(
        "mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)"
      );
    }
  });

  it("MergeSplit - Incorrect Owner Private Key Throws Error", async () => {
    const aliceAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) / 2;
    const bobAmountSatoshis =
      bitcoinToSatoshis(splitTx.vout[0].value) +
      bitcoinToSatoshis(splitTx.vout[1].value) -
      aliceAmountSatoshis;
    const incorrectPrivateKey = bsv.PrivateKey();

    const mergeSplitHex = await mergeSplit(
      incorrectPrivateKey,
      utils.getMergeSplitUtxo(splitTxObj, splitTx),
      aliceAddr,
      aliceAmountSatoshis,
      bobAddr,
      bobAmountSatoshis,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    );
    try {
      await broadcast(mergeSplitHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.response.data).to.contain(
        "mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)"
      );
    }
  });

  it("MergeSplit - Incorrect Payments Private Key Throws Error", async () => {
    const aliceAmountSatoshis = bitcoinToSatoshis(splitTx.vout[0].value) / 2;
    const bobAmountSatoshis =
      bitcoinToSatoshis(splitTx.vout[0].value) +
      bitcoinToSatoshis(splitTx.vout[1].value) -
      aliceAmountSatoshis;
    const incorrectPrivateKey = bsv.PrivateKey();

    const mergeSplitHex = await mergeSplit(
      issuerPrivateKey,
      utils.getMergeSplitUtxo(splitTxObj, splitTx),
      aliceAddr,
      aliceAmountSatoshis,
      bobAddr,
      bobAmountSatoshis,
      utils.getUtxo(splitTxid, splitTx, 2),
      incorrectPrivateKey
    );
    try {
      await broadcast(mergeSplitHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.response.data).to.contain(
        "mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)"
      );
    }
  });

  it("Redeem - Attempt To Unlock With Incorrect Public Key Throws Error", async () => {
    const incorrectKey = bsv.PrivateKey();

    const redeemHex = await redeem(
      alicePrivateKey,
      incorrectKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    );
    try {
      await broadcast(redeemHex);
      expect(false).toBeTruthy();
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.eql("Request failed with status code 400");
    }
  });

  it("Redeem - Attempt To Redeem with Incorrect Owner Private Key Throws Error", async () => {
    const incorrectKey = bsv.PrivateKey();

    const redeemHex = await redeem(
      incorrectKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    );
    try {
      await broadcast(redeemHex);
      expect(false).toBeTruthy();
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.eql("Request failed with status code 400");
    }
  });

  it("Redeem - Attempt To Redeem with Incorrect Payment Private Key Throws Error", async () => {
    const incorrectKey = bsv.PrivateKey();

    const redeemHex = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 2),
      incorrectKey
    );
    try {
      await broadcast(redeemHex);
      expect(false).toBeTruthy();
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.eql("Request failed with status code 400");
    }
  });

  it("RedeemSplit - Incorrect Owner Private Key Throws Error", async () => {
    const bobAmount = bitcoinToSatoshis(issueTx.vout[0].value / 3);
    const splitDestinations = [];
    splitDestinations[0] = { address: bobAddr, satoshis: bobAmount };
    splitDestinations[1] = { address: bobAddr, satoshis: bobAmount };
    const issueOutFundingVout = issueTx.vout.length - 1;
    const incorrectPrivateKey = bsv.PrivateKey();

    const redeemHex = await redeemSplit(
      incorrectPrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    );
    try {
      await broadcast(redeemHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.eql("Request failed with status code 400");
    }
  });

  it("RedeemSplit - Incorrect Funding Private Key Throws Error", async () => {
    const bobAmount = bitcoinToSatoshis(issueTx.vout[0].value / 4);
    const splitDestinations = [];
    splitDestinations[0] = { address: bobAddr, satoshis: bobAmount };
    splitDestinations[1] = { address: bobAddr, satoshis: bobAmount };
    const issueOutFundingVout = issueTx.vout.length - 1;
    const incorrectPrivateKey = bsv.PrivateKey();

    const redeemHex = await redeemSplit(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      incorrectPrivateKey
    );

    try {
      await broadcast(redeemHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.eql("Request failed with status code 400");
    }
  });

  it("RedeemSplit - Incorrect Public Key Throws Error", async () => {
    const bobAmount = bitcoinToSatoshis(issueTx.vout[0].value / 4);
    const splitDestinations = [];
    splitDestinations[0] = { address: bobAddr, satoshis: bobAmount };
    splitDestinations[1] = { address: bobAddr, satoshis: bobAmount };
    const issueOutFundingVout = issueTx.vout.length - 1;
    const incorrectPrivateKey = bsv.PrivateKey();

    const redeemHex = await redeemSplit(
      alicePrivateKey,
      incorrectPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    );

    try {
      await broadcast(redeemHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.eql("Request failed with status code 400");
    }
  });

  it("Split - Incorrect Owner Private Key Throws Error", async () => {
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
    const incorrectPrivateKey = bsv.PrivateKey();

    const splitHex = await split(
      incorrectPrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    );
    try {
      await broadcast(splitHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.eql("Request failed with status code 400");
    }
  });

  it("Split - Incorrect Payments Private Key Throws Error", async () => {
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
    const incorrectPrivateKey = bsv.PrivateKey();

    const splitHex = await split(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      incorrectPrivateKey
    );
    try {
      await broadcast(splitHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.eql("Request failed with status code 400");
    }
  });
  it("Transfer - Invalid Issuer Private Key Throws Error", async () => {
    const incorrectPK = bsv.PrivateKey();
    const transferHex = await transfer(
      incorrectPK,
      utils.getUtxo(issueTxid, issueTx, 1),
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, 2),
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
      utils.getUtxo(issueTxid, issueTx, 2),
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
async function setupContract() {
  issuerPrivateKey = bsv.PrivateKey();
  contractIssuerPrivateKey = bsv.PrivateKey();
  keyMap.set(issuerPrivateKey.publicKey, issuerPrivateKey);
  fundingPrivateKey = bsv.PrivateKey();
  keyMap.set(fundingPrivateKey.publicKey, fundingPrivateKey);
  contractUtxos = await getFundsFromFaucet(
    issuerPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  fundingUtxos = await getFundsFromFaucet(
    fundingPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    issuerPrivateKey.publicKey.toBuffer()
  ).toString("hex");
  schema = utils.schema(publicKeyHash, symbol, supply);
}

async function setupIssue() {
  issuerPrivateKey = bsv.PrivateKey();
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
  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(
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
  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(
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

async function setupRedeem() {
  issuerPrivateKey = bsv.PrivateKey();
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
  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    issuerPrivateKey.publicKey.toBuffer()
  ).toString("hex");
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString();
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString();
  const schema = utils.schema(publicKeyHash, symbol, supply);

  const contractHex = await contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  );
  const contractTxid = await broadcast(contractHex);
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
  issueTxid = await broadcast(issueHex);
  issueTx = await getTransaction(issueTxid);
}
