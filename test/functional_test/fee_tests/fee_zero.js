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

const { getTransaction, getFundsFromFaucet, broadcast, bitcoinToSatoshis } =
  require("../../../index").utils;

it("Full Life Cycle Test With Zero Fees", async () => {
  const issuerPrivateKey = bsv.PrivateKey();
  const alicePrivateKey = bsv.PrivateKey();
  const aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString();
  const bobPrivateKey = bsv.PrivateKey();
  const bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString();
  const contractUtxos = await getFundsFromFaucet(
    issuerPrivateKey.toAddress(process.env.NETWORK).toString()
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
    null,
    null,
    schema,
    supply
  );
  const contractTxid = await utils.broadcastWithRetry(contractHex);
  console.log(`Contract TX:     ${contractTxid}`);
  const contractTx = await getTransaction(contractTxid);
  const contractFees = utils.calcuateFeesForContract(
    contractTx,
    contractUtxos,
    null
  );
  expect(contractFees).to.equal(0);

  const issueHex = await issue(
    issuerPrivateKey,
    utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
    utils.getUtxo(contractTxid, contractTx, 0),
    null,
    null,
    true,
    symbol,
    2
  );
  const issueTxid = await utils.broadcastWithRetry(issueHex);
  console.log(`Issue TX:     ${issueTxid}`);
  const issueTx = await getTransaction(issueTxid);
  const tokenId = await utils.getToken(issueTxid);
  console.log(`Token ID:        ${tokenId}`);
  const response = await utils.getTokenResponse(tokenId);
  await new Promise((resolve) => setTimeout(resolve, wait));
  expect(response.symbol).to.equal(symbol);
  expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007);
  expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003);
  await utils.isTokenBalance(aliceAddr, 7000);
  await utils.isTokenBalance(bobAddr, 3000);
  const issueFees = utils.calcuateFees(contractTx, issueTx);
  expect(issueFees).to.equal(0);

  const transferHex = await transfer(
    bobPrivateKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    aliceAddr,
    null,
    null
  );
  const transferTxid = await utils.broadcastWithRetry(transferHex);
  console.log(`Transfer TX:     ${transferTxid}`);
  const transferTx = await getTransaction(transferTxid);
  expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003);
  await utils.isTokenBalance(aliceAddr, 10000);
  await utils.isTokenBalance(bobAddr, 0);
  const transferFees = utils.calcuateFees(issueTx, transferTx);
  expect(transferFees).to.equal(0);

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
    null,
    null
  );
  const splitTxid = await utils.broadcastWithRetry(splitHex);
  console.log(`Split TX:        ${splitTxid}`);
  const splitTx = await getTransaction(splitTxid);
  expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.000015);
  expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.000015);
  await utils.isTokenBalance(aliceAddr, 7000);
  await utils.isTokenBalance(bobAddr, 3000);
  const splitFees = utils.calcuateFees(transferTx, splitTx);
  expect(splitFees).to.equal(0);

  // Now let's merge the last split back together
  const splitTxObj = new bsv.Transaction(splitHex);

  const mergeHex = await merge(
    bobPrivateKey,
    utils.getMergeUtxo(splitTxObj),
    aliceAddr,
    null,
    null
  );

  const mergeTxid = await utils.broadcastWithRetry(mergeHex);
  console.log(`Merge TX:        ${mergeTxid}`);
  const mergeTx = await getTransaction(mergeTxid);
  expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00003);
  const tokenIdMerge = await utils.getToken(mergeTxid);
  const responseMerge = await utils.getTokenResponse(tokenIdMerge);
  expect(responseMerge.symbol).to.equal(symbol);
  await utils.isTokenBalance(aliceAddr, 10000);
  await utils.isTokenBalance(bobAddr, 0);
  console.log(utils.calcuateFees(splitTx, mergeTx));
  const mergeFees = utils.calcuateFees(splitTx, mergeTx);
  expect(mergeFees).to.equal(0);

  const amount = bitcoinToSatoshis(mergeTx.vout[0].value / 2);
  const split2Destinations = [];
  split2Destinations[0] = { address: bobAddr, satoshis: amount };
  split2Destinations[1] = { address: bobAddr, satoshis: amount };

  const splitHex2 = await split(
    alicePrivateKey,
    utils.getUtxo(mergeTxid, mergeTx, 0),
    split2Destinations,
    null,
    null
  );
  const splitTxid2 = await utils.broadcastWithRetry(splitHex2);
  console.log(`Split TX2:       ${splitTxid2}`);
  const splitTx2 = await getTransaction(splitTxid2);
  expect(await utils.getVoutAmount(splitTxid2, 0)).to.equal(0.000015);
  expect(await utils.getVoutAmount(splitTxid2, 1)).to.equal(0.000015);
  await utils.isTokenBalance(aliceAddr, 7000);
  await utils.isTokenBalance(bobAddr, 3000);

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
    null,
    null
  );

  const mergeSplitTxid = await utils.broadcastWithRetry(mergeSplitHex);
  console.log(`MergeSplit TX:   ${mergeSplitTxid}`);
  const mergeSplitTx = await getTransaction(mergeSplitTxid);
  expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.0000075);
  expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.0000225);
  await utils.isTokenBalance(aliceAddr, 7750);
  await utils.isTokenBalance(bobAddr, 2250);
  const mergeSplitFees = utils.calcuateFees(splitTx2, mergeSplitTx);
  expect(mergeSplitFees).to.equal(0);

  // Alice wants to redeem the money from bob...
  const redeemHex = await redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(mergeSplitTxid, mergeSplitTx, 0),
    null,
    null
  );
  const redeemTxid = await utils.broadcastWithRetry(redeemHex);
  const redeemTx = await getTransaction(redeemTxid);
  console.log(`Redeem TX:       ${redeemTxid}`);
  expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.0000075);
  await utils.isTokenBalance(aliceAddr, 7000);
  await utils.isTokenBalance(bobAddr, 2250);
  const redeemFees = utils.calcuateFees(mergeSplitTx, redeemTx);
  expect(redeemFees).to.equal(0);
});
