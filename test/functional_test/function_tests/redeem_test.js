const expect = require("chai").expect;
const utils = require("../../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const {
  contract,
  issue,
  redeem,
  redeemWithCallback,
  unsignedRedeem,
} = require("../../../index");

const { getTransaction, getFundsFromFaucet, broadcast } =
  require("../../../index").utils;

const { sighash } = require("../../../lib/stas");
const { bitcoinToSatoshis } = require("../../../lib/utils");

let issuerPrivateKey;
let fundingPrivateKey;
let bobPrivateKey;
let alicePrivateKey;
let contractUtxos;
let fundingUtxos;
let publicKeyHash;
let bobAddr;
let aliceAddr;
let issueTxid;
let issueTx;
const keyMap = new Map();

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

beforeEach(async () => {
  await setup();
});

describe("Redeem Functional test", () => {
  it("Redeem - Successful Redeem 1", async () => {
    const redeemHex = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemHex);
    expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.00007);
    await utils.isTokenBalance(aliceAddr, 0);
    await utils.isTokenBalance(bobAddr, 3000);
  });

  it("Redeem - Successful Redeem 2", async () => {
    const redeemHex = await redeem(
      bobPrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemHex);
    expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.00003);
    await utils.isTokenBalance(aliceAddr, 7000);
    await utils.isTokenBalance(bobAddr, 0);
  });

  it("Redeem - Successful Redeem No Fee ", async () => {
    const redeemHex = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      null,
      null
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemHex);
    expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.00007);
    await utils.isTokenBalance(aliceAddr, 0);
    await utils.isTokenBalance(bobAddr, 3000);
  });

  it("Redeem - Successful Redeem With Callback and Fee", async () => {
    const redeemHex = await redeemWithCallback(
      alicePrivateKey.publicKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey.publicKey,
      aliceSignatureCallback,
      paymentSignatureCallback
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemHex);
    expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.00007);
    await utils.isTokenBalance(aliceAddr, 0);
    await utils.isTokenBalance(bobAddr, 3000);
  });

  it("Redeem - Successful Redeem With Callback and No Fee", async () => {
    const redeemHex = await redeemWithCallback(
      alicePrivateKey.publicKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      null,
      null,
      aliceSignatureCallback,
      null
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemHex);
    expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.00007);
    await utils.isTokenBalance(aliceAddr, 0);
    await utils.isTokenBalance(bobAddr, 3000);
  });

  it("Redeem - Successful Redeem With Unsigned & Fee", async () => {
    const unsignedRedeemReturn = await unsignedRedeem(
      alicePrivateKey.publicKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey.publicKey
    );
    const redeemTx = bsv.Transaction(unsignedRedeemReturn.hex);
    utils.signScriptWithUnlocking(unsignedRedeemReturn, redeemTx, keyMap);
    const redeemTxid = await utils.broadcastWithRetry(redeemTx.serialize(true));
    expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.00007);
    await utils.isTokenBalance(aliceAddr, 0);
    await utils.isTokenBalance(bobAddr, 3000);
  });

  it("Redeem - Successful Redeem With Unsigned & No Fee", async () => {
    const unsignedRedeemReturn = await unsignedRedeem(
      alicePrivateKey.publicKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      null,
      null
    );
    const redeemTx = bsv.Transaction(unsignedRedeemReturn.hex);
    utils.signScriptWithUnlocking(unsignedRedeemReturn, redeemTx, keyMap);
    const redeemTxid = await utils.broadcastWithRetry(redeemTx.serialize(true));
    expect(await utils.getAmount(redeemTxid, 0)).to.equal(0.00007);
    await utils.isTokenBalance(aliceAddr, 0);
    await utils.isTokenBalance(bobAddr, 3000);
  });

  it("Redeem - Incorrect Stas UTXO Amount Throws Error", async () => {
    const redeemHex = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      {
        txid: issueTxid,
        vout: 0,
        scriptPubKey: issueTx.vout[0].scriptPubKey.hex,
        satoshis: 1000,
      },
      {
        txid: issueTxid,
        vout: 2,
        scriptPubKey: issueTx.vout[2].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(issueTx.vout[2].value),
      },
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

  it("Redeem - Incorrect Funding UTXO Amount Throws Error", async () => {
    const redeemHex = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      {
        txid: issueTxid,
        vout: 0,
        scriptPubKey: issueTx.vout[0].scriptPubKey.hex,
        satoshis: bitcoinToSatoshis(issueTx.vout[0].value),
      },
      {
        txid: issueTxid,
        vout: 2,
        scriptPubKey: issueTx.vout[2].scriptPubKey.hex,
        satoshis: 1000,
      },
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
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString();
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString();
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
