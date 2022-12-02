const expect = require("chai").expect;
const utils = require("../../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const {
  contract,
  issue,
  split,
  mergeSplit,
  mergeSplitWithCallback,
} = require("../../../index");

const { bitcoinToSatoshis, getTransaction, getFundsFromFaucet } =
  require("../../../index").utils;

const { sighash } = require("../../../lib/stas");

let issuerPrivateKey;
let fundingPrivateKey;
let contractUtxos;
let fundingUtxos;
let publicKeyHash;
let alicePrivateKey;
let aliceAddr;
let splitTxid;
let splitTx;
let splitTxObj;

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

describe("MergeSplit Low Sat Tests", () => {
  it("MergeSplit - Successful MergeSplit With Low Sats(20)", async () => {
    await setup(40); // contract, issue, transfer then split

    const issueOutFundingVout = splitTx.vout.length - 1;

    const amount = bitcoinToSatoshis(splitTx.vout[0].value);

    const mergeSplitHex = await mergeSplit(
      alicePrivateKey,
      utils.getMergeSplitUtxo(splitTxObj, splitTx),
      aliceAddr,
      amount,
      aliceAddr,
      amount,
      utils.getUtxo(splitTxid, splitTx, issueOutFundingVout),
      fundingPrivateKey
    );
    const mergeSplitTxid = await utils.broadcastWithRetry(mergeSplitHex);
    expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.0000002);
    expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.0000002);
    await utils.isTokenBalance(aliceAddr, 40);
  });

  it("MergeSplit - Successful MergeSplit With Low Sats(10)", async () => {
    await setup(20); // contract, issue, transfer then split

    const issueOutFundingVout = splitTx.vout.length - 1;

    const amount = bitcoinToSatoshis(splitTx.vout[0].value);

    const mergeSplitHex = await mergeSplit(
      alicePrivateKey,
      utils.getMergeSplitUtxo(splitTxObj, splitTx),
      aliceAddr,
      amount,
      aliceAddr,
      amount,
      utils.getUtxo(splitTxid, splitTx, issueOutFundingVout),
      fundingPrivateKey
    );
    const mergeSplitTxid = await utils.broadcastWithRetry(mergeSplitHex);
    expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.0000001);
    expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.0000001);
    await utils.isTokenBalance(aliceAddr, 20);
  });

  it("MergeSplit - Successful MergeSplit With Low Sats(5)", async () => {
    await setup(10); // contract, issue, transfer then split

    const issueOutFundingVout = splitTx.vout.length - 1;

    const amount = bitcoinToSatoshis(splitTx.vout[0].value);

    const mergeSplitHex = await mergeSplit(
      alicePrivateKey,
      utils.getMergeSplitUtxo(splitTxObj, splitTx),
      aliceAddr,
      amount,
      aliceAddr,
      amount,
      utils.getUtxo(splitTxid, splitTx, issueOutFundingVout),
      fundingPrivateKey
    );
    const mergeSplitTxid = await utils.broadcastWithRetry(mergeSplitHex);
    expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.00000005);
    expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.00000005);
    await utils.isTokenBalance(aliceAddr, 10);
  });

  it("MergeSplit - Successful MergeSplit With Low Sats(1)", async () => {
    await setup(2); // contract, issue, transfer then split

    const issueOutFundingVout = splitTx.vout.length - 1;

    const amount = bitcoinToSatoshis(splitTx.vout[0].value);

    const mergeSplitHex = await mergeSplit(
      alicePrivateKey,
      utils.getMergeSplitUtxo(splitTxObj, splitTx),
      aliceAddr,
      amount,
      aliceAddr,
      amount,
      utils.getUtxo(splitTxid, splitTx, issueOutFundingVout),
      fundingPrivateKey
    );
    const mergeSplitTxid = await utils.broadcastWithRetry(mergeSplitHex);
    expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.00000001);
    expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.00000001);
    await utils.isTokenBalance(aliceAddr, 2);
  });

  it("MergeSplit - Successful MergeSplit With Callback and low fees", async () => {
    await setup(2); // contract, issue, transfer then split

    const issueOutFundingVout = splitTx.vout.length - 1;
    const amount = bitcoinToSatoshis(splitTx.vout[0].value);

    const mergeSplitHex = await mergeSplitWithCallback(
      alicePrivateKey.publicKey,
      utils.getMergeSplitUtxo(splitTxObj, splitTx),
      aliceAddr,
      amount,
      aliceAddr,
      amount,
      utils.getUtxo(splitTxid, splitTx, issueOutFundingVout),
      fundingPrivateKey.publicKey,
      aliceSignatureCallback,
      paymentSignatureCallback
    );
    const mergeSplitTxid = await utils.broadcastWithRetry(mergeSplitHex);
    expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.00000001);
    expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.00000001);
    await utils.isTokenBalance(aliceAddr, 2);
  });
});

async function setup(satSupply) {
  issuerPrivateKey = bsv.PrivateKey();
  fundingPrivateKey = bsv.PrivateKey();
  alicePrivateKey = bsv.PrivateKey();
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
  const supply = satSupply;
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
  const issueTxid = await utils.broadcastWithRetry(issueHex);
  const issueTx = await getTransaction(issueTxid);

  const issueOutFundingVout = issueTx.vout.length - 1;

  const amount = issueTx.vout[0].value / 2;
  const splitDestinations = [];
  splitDestinations[0] = {
    address: aliceAddr,
    satoshis: bitcoinToSatoshis(amount),
  };
  splitDestinations[1] = {
    address: aliceAddr,
    satoshis: bitcoinToSatoshis(amount),
  };

  const splitHex = await split(
    alicePrivateKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    splitDestinations,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  );
  splitTxid = await utils.broadcastWithRetry(splitHex);
  splitTx = await getTransaction(splitTxid);
  splitTxObj = new bsv.Transaction(splitHex);
}
