const expect = require("chai").expect;
const utils = require("../../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const {
  contract,
  issue,
  transfer,
  split,
  merge,
  mergeSplit,
  redeem,
} = require("../../../index");

const { getScriptData } = require("../../../lib/stas");

const { getTransaction, getFundsFromFaucet, bitcoinToSatoshis } =
  require("../../../index").utils;

it("Issuance Data LifeCycle Test", async () => {
  const expectedData1 = "646174615f6f6e65";
  const expectedData2 = "646174615f74776f";
  const issuerPrivateKey = bsv.PrivateKey();
  const fundingPrivateKey = bsv.PrivateKey();

  const alicePrivateKey = bsv.PrivateKey();
  const aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString();

  const bobPrivateKey = bsv.PrivateKey();
  const bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString();

  const contractUtxos = await getFundsFromFaucet(
    issuerPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  const fundingUtxos = await getFundsFromFaucet(
    fundingPrivateKey.toAddress(process.env.NETWORK).toString()
  );

  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    issuerPrivateKey.publicKey.toBuffer()
  ).toString("hex");
  const supply = 10000;
  const symbol = "TAALT";
  const schema = utils.schema(publicKeyHash, symbol, supply);
  const wait = 5000; // set wait before token balance check

  const contractHex = await contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  );
  const contractTxid = await utils.broadcastWithRetry(contractHex);
  console.log(`Contract TX:     ${contractTxid}`);
  const contractTx = await getTransaction(contractTxid);
  const issueHex = await issue(
    issuerPrivateKey,
    [
      {
        addr: aliceAddr,
        satoshis: 7000,
        data: "data_one",
      },
      {
        addr: bobAddr,
        satoshis: 3000,
        data: "data_two",
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
  console.log(`Issue TX:     ${issueTxid}`);
  const issueTx = await getTransaction(issueTxid);
  expect(getScriptData(issueTx.vout[0].scriptPubKey.hex)).to.equal(
    expectedData1
  );
  expect(getScriptData(issueTx.vout[1].scriptPubKey.hex)).to.equal(
    expectedData2
  );

  const issueOutFundingVout = issueTx.vout.length - 1;
  const transferHex = await transfer(
    bobPrivateKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    aliceAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  );
  const transferTxid = await utils.broadcastWithRetry(transferHex);
  console.log(`Transfer TX:     ${transferTxid}`);
  const transferTx = await getTransaction(transferTxid);

  expect(getScriptData(transferTx.vout[0].scriptPubKey.hex)).to.equal(
    expectedData2
  );

  const bobAmount1 = transferTx.vout[0].value / 2;
  const bobAmount2 = transferTx.vout[0].value - bobAmount1;
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
    utils.getUtxo(transferTxid, transferTx, 0),
    splitDestinations,
    utils.getUtxo(transferTxid, transferTx, 1),
    fundingPrivateKey
  );
  const splitTxid = await utils.broadcastWithRetry(splitHex);
  console.log(`Split TX:        ${splitTxid}`);
  const splitTx = await getTransaction(splitTxid);
  expect(getScriptData(splitTx.vout[0].scriptPubKey.hex)).to.equal(
    expectedData2
  );
  // Now let's merge the last split back together
  const splitTxObj = new bsv.Transaction(splitHex);

  const mergeHex = await merge(
    bobPrivateKey,
    utils.getMergeUtxo(splitTxObj),
    aliceAddr,
    utils.getUtxo(splitTxid, splitTx, 2),
    fundingPrivateKey
  );

  const mergeTxid = await utils.broadcastWithRetry(mergeHex);
  console.log(`Merge TX:        ${mergeTxid}`);
  const mergeTx = await getTransaction(mergeTxid);
  expect(getScriptData(mergeTx.vout[0].scriptPubKey.hex)).to.equal(
    expectedData2
  );
  const amount = bitcoinToSatoshis(mergeTx.vout[0].value / 2);

  const split2Destinations = [];
  split2Destinations[0] = { address: bobAddr, satoshis: amount };
  split2Destinations[1] = { address: bobAddr, satoshis: amount };

  const splitHex2 = await split(
    alicePrivateKey,
    utils.getUtxo(mergeTxid, mergeTx, 0),
    split2Destinations,
    utils.getUtxo(mergeTxid, mergeTx, 1),
    fundingPrivateKey
  );
  const splitTxid2 = await utils.broadcastWithRetry(splitHex2);
  console.log(`Split TX2:       ${splitTxid2}`);
  const splitTx2 = await getTransaction(splitTxid2);
  expect(getScriptData(splitTx2.vout[0].scriptPubKey.hex)).to.equal(
    expectedData2
  );

  // Now mergeSplit
  const splitTxObj2 = new bsv.Transaction(splitHex2);

  const aliceAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[0].value) / 2;
  const bobAmountSatoshis =
    bitcoinToSatoshis(splitTx2.vout[0].value) +
    bitcoinToSatoshis(splitTx2.vout[1].value) -
    aliceAmountSatoshis;

  const mergeSplitHex = await mergeSplit(
    bobPrivateKey,
    utils.getMergeSplitUtxo(splitTxObj2, splitTx2),
    aliceAddr,
    aliceAmountSatoshis,
    bobAddr,
    bobAmountSatoshis,
    utils.getUtxo(splitTxid2, splitTx2, 2),
    fundingPrivateKey
  );

  const mergeSplitTxid = await utils.broadcastWithRetry(mergeSplitHex);
  console.log(`MergeSplit TX:   ${mergeSplitTxid}`);
  const mergeSplitTx = await getTransaction(mergeSplitTxid);
  expect(getScriptData(mergeSplitTx.vout[0].scriptPubKey.hex)).to.equal(
    expectedData2
  );

  // Alice wants to redeem the money from bob...
  const redeemHex = await redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(mergeSplitTxid, mergeSplitTx, 0),
    utils.getUtxo(mergeSplitTxid, mergeSplitTx, 2),
    fundingPrivateKey
  );
  const redeemTxid = await utils.broadcastWithRetry(redeemHex);
  console.log(`Redeem TX:       ${redeemTxid}`);
});
