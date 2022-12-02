const expect = require("chai").expect;
const utils = require("../../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const {
  contract,
  issue,
  mergeSplit,
  mergeSplitWithCallback,
  unsignedMergeSplit,
} = require("../../../index");

const { bitcoinToSatoshis, getTransaction, getFundsFromFaucet, broadcast } =
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
let issueOutFundingVout;
let mergeObj;
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
describe("MergeSplit Functional Tests", () => {
  beforeEach(async () => {
    await setup();
  });

  it("MergeSplit - Successful MergeSplit With Fees 1", async () => {
    const aliceAmountSatoshis = bitcoinToSatoshis(issueTx.vout[0].value) / 2;
    const bobAmountSatoshis =
      bitcoinToSatoshis(issueTx.vout[0].value) +
      bitcoinToSatoshis(issueTx.vout[1].value) -
      aliceAmountSatoshis;

    const mergeSplitHex = await mergeSplit(
      alicePrivateKey,
      utils.getMergeSplitUtxoTemp(mergeObj, issueTx, 0, 1),
      aliceAddr,
      aliceAmountSatoshis,
      bobAddr,
      bobAmountSatoshis,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    );
    const mergeSplitTxid = await utils.broadcastWithRetry(mergeSplitHex);
    expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.000035);
    expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.000065);
    await utils.isTokenBalance(aliceAddr, 3500);
    await utils.isTokenBalance(bobAddr, 11500);
  });

  it("MergeSplit - Successful MergeSplit With Fees 2", async () => {
    const issueOutFundingVout = issueTx.vout.length - 1;
    const aliceAmount1 = bitcoinToSatoshis(issueTx.vout[2].value) / 2;
    const aliceAmount2 =
      bitcoinToSatoshis(issueTx.vout[2].value) +
      bitcoinToSatoshis(issueTx.vout[3].value) -
      aliceAmount1;

    const mergeSplitHex = await mergeSplit(
      bobPrivateKey,
      utils.getMergeSplitUtxoTemp(mergeObj, issueTx, 2, 3),
      aliceAddr,
      aliceAmount1,
      aliceAddr,
      aliceAmount2,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    );
    const mergeSplitTxid = await utils.broadcastWithRetry(mergeSplitHex);
    expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.000015);
    expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.000035);
    await utils.isTokenBalance(aliceAddr, 15000);
    await utils.isTokenBalance(bobAddr, 0);
  });

  it("MergeSplit - Successful MergeSplit No Fees", async () => {
    const aliceAmount = bitcoinToSatoshis(issueTx.vout[2].value) / 2;
    const bobAmount =
      bitcoinToSatoshis(issueTx.vout[2].value) +
      bitcoinToSatoshis(issueTx.vout[3].value) -
      aliceAmount;

    const mergeSplitHex = await mergeSplit(
      bobPrivateKey,
      utils.getMergeSplitUtxoTemp(mergeObj, issueTx, 2, 3),
      aliceAddr,
      aliceAmount,
      bobAddr,
      bobAmount,
      null,
      null
    );
    const mergeSplitTxid = await utils.broadcastWithRetry(mergeSplitHex);
    expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.000015);
    expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.000035);
    await utils.isTokenBalance(aliceAddr, 11500);
    await utils.isTokenBalance(bobAddr, 3500);
  });

  it("MergeSplit - Successful MergeSplit With Callback And Fees", async () => {
    const issueOutFundingVout = issueTx.vout.length - 1;
    const aliceAmount = bitcoinToSatoshis(issueTx.vout[2].value) / 2;
    const bobAmount =
      bitcoinToSatoshis(issueTx.vout[2].value) +
      bitcoinToSatoshis(issueTx.vout[3].value) -
      aliceAmount;

    const mergeSplitHex = await mergeSplitWithCallback(
      bobPrivateKey.publicKey,
      utils.getMergeSplitUtxoTemp(mergeObj, issueTx, 2, 3),
      aliceAddr,
      aliceAmount,
      bobAddr,
      bobAmount,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey.publicKey,
      bobSignatureCallback,
      paymentSignatureCallback
    );
    const mergeSplitTxid = await utils.broadcastWithRetry(mergeSplitHex);
    expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.000015);
    expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.000035);
    await utils.isTokenBalance(aliceAddr, 11500);
    await utils.isTokenBalance(bobAddr, 3500);
  });

  it("MergeSplit - Successful MergeSplit With Callback No Fees", async () => {
    const aliceAmount = bitcoinToSatoshis(issueTx.vout[2].value) / 2;
    const bobAmount =
      bitcoinToSatoshis(issueTx.vout[2].value) +
      bitcoinToSatoshis(issueTx.vout[3].value) -
      aliceAmount;

    const mergeSplitHex = await mergeSplitWithCallback(
      bobPrivateKey.publicKey,
      utils.getMergeSplitUtxoTemp(mergeObj, issueTx, 2, 3),
      aliceAddr,
      aliceAmount,
      bobAddr,
      bobAmount,
      null,
      null,
      bobSignatureCallback,
      null
    );
    const mergeSplitTxid = await utils.broadcastWithRetry(mergeSplitHex);
    expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.000015);
    expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.000035);
    await utils.isTokenBalance(aliceAddr, 11500);
    await utils.isTokenBalance(bobAddr, 3500);
  });

  it("MergeSplit - Successful MergeSplit unsigned With Fees", async () => {
    const issueOutFundingVout = issueTx.vout.length - 1;
    const aliceAmount = bitcoinToSatoshis(issueTx.vout[2].value) / 2;
    const bobAmount =
      bitcoinToSatoshis(issueTx.vout[2].value) +
      bitcoinToSatoshis(issueTx.vout[3].value) -
      aliceAmount;

    const unsignedMergeSplitReturn = await unsignedMergeSplit(
      bobPrivateKey.publicKey,
      utils.getMergeSplitUtxoTemp(mergeObj, issueTx, 2, 3),
      aliceAddr,
      aliceAmount,
      bobAddr,
      bobAmount,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey.publicKey
    );
    const mergeSplitTx = bsv.Transaction(unsignedMergeSplitReturn.hex);
    utils.signScriptWithUnlocking(
      unsignedMergeSplitReturn,
      mergeSplitTx,
      keyMap
    );
    const mergeSplitTxid = await utils.broadcastWithRetry(
      mergeSplitTx.serialize(true)
    );
    expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.000015);
    expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.000035);
    await utils.isTokenBalance(aliceAddr, 11500);
    await utils.isTokenBalance(bobAddr, 3500);
  });

  it("MergeSplit - Successful MergeSplit unsigned With No Fees", async () => {
    const aliceAmount = bitcoinToSatoshis(issueTx.vout[2].value) / 2;
    const bobAmount =
      bitcoinToSatoshis(issueTx.vout[2].value) +
      bitcoinToSatoshis(issueTx.vout[3].value) -
      aliceAmount;

    const unsignedMergeSplitReturn = await unsignedMergeSplit(
      bobPrivateKey.publicKey,
      utils.getMergeSplitUtxoTemp(mergeObj, issueTx, 2, 3),
      aliceAddr,
      aliceAmount,
      bobAddr,
      bobAmount,
      null,
      null
    );
    const mergeSplitTx = bsv.Transaction(unsignedMergeSplitReturn.hex);
    utils.signScriptWithUnlocking(
      unsignedMergeSplitReturn,
      mergeSplitTx,
      keyMap
    );
    const mergeSplitTxid = await utils.broadcastWithRetry(
      mergeSplitTx.serialize(true)
    );
    expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.000015);
    expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.000035);
    await utils.isTokenBalance(aliceAddr, 11500);
    await utils.isTokenBalance(bobAddr, 3500);
  });

  it("MergeSplit - Incorrect Split Amount 1", async () => {
    const bobAmount = bitcoinToSatoshis(issueTx.vout[0].value) / 2;
    const mergeSplitHex = await mergeSplit(
      alicePrivateKey,
      utils.getMergeSplitUtxoTemp(mergeObj, issueTx, 0, 1),
      aliceAddr,
      100, // incorrect amount
      bobAddr,
      bobAmount,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    );
    try {
      await broadcast(mergeSplitHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.response.data).to.contain(
        "mandatory-script-verify-flag-failed (Script failed an OP_VERIFY operation)"
      );
    }
  });

  it("MergeSplit - Incorrect Split Amount 2", async () => {
    const aliceAmountSatoshis = bitcoinToSatoshis(issueTx.vout[0].value) / 2;

    const mergeSplitHex = await mergeSplit(
      alicePrivateKey,
      utils.getMergeSplitUtxoTemp(mergeObj, issueTx, 0, 1),
      aliceAddr,
      aliceAmountSatoshis,
      bobAddr,
      100, // incorrect amount
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    );
    try {
      await broadcast(mergeSplitHex);
      expect(false).toBeTruthy();
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.response.data).to.contain(
        "mandatory-script-verify-flag-failed (Script failed an OP_NUMEQUALVERIFY operation)"
      );
    }
  });

  it("MergeSplit - Incorrect Owner Private Key Throws Error", async () => {
    const aliceAmountSatoshis = bitcoinToSatoshis(issueTx.vout[0].value) / 2;
    const bobAmountSatoshis =
      bitcoinToSatoshis(issueTx.vout[0].value) +
      bitcoinToSatoshis(issueTx.vout[1].value) -
      aliceAmountSatoshis;
    const incorrectPrivateKey = bsv.PrivateKey();

    const mergeSplitHex = await mergeSplit(
      incorrectPrivateKey,
      utils.getMergeSplitUtxoTemp(mergeObj, issueTx, 0, 1),
      aliceAddr,
      aliceAmountSatoshis,
      bobAddr,
      bobAmountSatoshis,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
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
    const aliceAmountSatoshis = bitcoinToSatoshis(issueTx.vout[0].value) / 2;
    const bobAmountSatoshis =
      bitcoinToSatoshis(issueTx.vout[0].value) +
      bitcoinToSatoshis(issueTx.vout[1].value) -
      aliceAmountSatoshis;
    const incorrectPrivateKey = bsv.PrivateKey();

    const mergeSplitHex = await mergeSplit(
      issuerPrivateKey,
      utils.getMergeSplitUtxoTemp(mergeObj, issueTx, 0, 1),
      aliceAddr,
      aliceAmountSatoshis,
      bobAddr,
      bobAmountSatoshis,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
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
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString();
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString();
  contractUtxos = await getFundsFromFaucet(
    issuerPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  fundingUtxos = await getFundsFromFaucet(
    fundingPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    issuerPrivateKey.publicKey.toBuffer()
  ).toString("hex");
  const symbol = "TAALT";
  const supply = 15000;
  const schema = utils.schema(publicKeyHash, symbol, supply);

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
    [
      {
        addr: aliceAddr,
        satoshis: 7000,
      },
      {
        addr: aliceAddr,
        satoshis: 3000,
      },
      {
        addr: bobAddr,
        satoshis: 3000,
      },
      {
        addr: bobAddr,
        satoshis: 2000,
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
  issueOutFundingVout = issueTx.vout.length - 1;
  mergeObj = new bsv.Transaction(issueHex);
}
