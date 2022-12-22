const expect = require("chai").expect;
const utils = require("../../utils/test_utils");
const bsv = require("bsv");
const fs = require("fs");
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

const { getTransaction, getFundsFromFaucet, tapiBroadcast, bitcoinToSatoshis } =
  require("../../../index").utils;

it("Full Life Cycle Test 10mb of", async () => {
  const issuerPrivateKey = bsv.PrivateKey();
  const fundingPrivateKey = bsv.PrivateKey();

  const alicePrivateKey = bsv.PrivateKey();
  const aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString();

  const bobPrivateKey = bsv.PrivateKey();
  const bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString();
  console.log(aliceAddr);
  console.log(bobAddr);

  const contractUtxos = await getFundsFromFaucet(
    issuerPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  const fundingUtxos = await getFundsFromFaucet(
    fundingPrivateKey.toAddress(process.env.NETWORK).toString()
  );

  const fundingUtxos2 = await getFundsFromFaucet(
    fundingPrivateKey.toAddress(process.env.NETWORK).toString()
  );

  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    issuerPrivateKey.publicKey.toBuffer()
  ).toString("hex");

  const supply = 50000;
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
  const contractTxid = await utils.tapiBroadcast(contractHex);
  await new Promise((resolve) => setTimeout(resolve, 5000));
  console.log(`Contract TX:     ${contractTxid}`);
  const contractTx = await getTransaction(contractTxid);
  const issueHex = await issue(
    issuerPrivateKey,
    [
      {
        addr: aliceAddr,
        satoshis: 50000,
        data: utils.addData(50), //1000 bytes
      },
    ],
    utils.getUtxo(contractTxid, contractTx, 0),
    utils.getUtxo(contractTxid, contractTx, 1),
    fundingPrivateKey,
    true,
    symbol,
    2
  );

  const issueTxid = await utils.tapiBroadcast(issueHex);
  await new Promise((resolve) => setTimeout(resolve, 5000));
  console.log(`Issue TX:     ${issueTxid}`);
  const issueTx = await getTransaction(issueTxid);
  // const tokenId = await utils.getToken(issueTxid);
  // console.log(`Token ID:        ${tokenId}`);
  // const response = await utils.getTokenResponse(tokenId);
  // await new Promise((resolve) => setTimeout(resolve, wait));
  // expect(response.symbol).to.equal(symbol);
  // expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007);
  // expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003);
  // await utils.isTokenBalance(aliceAddr, 10000);

  const issueOutFundingVout = issueTx.vout.length - 1;
  const transferHex = await transfer(
    alicePrivateKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    bobAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  );
  writeFile(transferHex);
  const transferTxid = await utils.tapiBroadcast(transferHex); // fails here
  await new Promise((resolve) => setTimeout(resolve, 5000));
  console.log(`Transfer TX:     ${transferTxid}`);
  const transferTx = await getTransaction(transferTxid);
  expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.0001);
  await utils.isTokenBalance(aliceAddr, 0);
  await utils.isTokenBalance(bobAddr, 10000);

  const bobAmount1 = transferTx.vout[0].value / 2;
  const bobAmount2 = transferTx.vout[0].value - bobAmount1;
  const splitDestinations = [];
  splitDestinations[0] = {
    address: aliceAddr,
    satoshis: bitcoinToSatoshis(bobAmount1),
  };
  splitDestinations[1] = {
    address: aliceAddr,
    satoshis: bitcoinToSatoshis(bobAmount2),
  };

  const splitHex = await split(
    bobPrivateKey,
    utils.getUtxo(transferTxid, transferTx, 0),
    splitDestinations,
    utils.getUtxo(transferTxid, transferTx, 1),
    fundingPrivateKey
  );
  const splitTxid = await utils.tapiBroadcast(splitHex);
  await new Promise((resolve) => setTimeout(resolve, 5000));
  console.log(`Split TX:        ${splitTxid}`);
  const splitTx = await getTransaction(splitTxid);
  expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.00005);
  expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.00005);
  await utils.isTokenBalance(aliceAddr, 10000);
  await utils.isTokenBalance(bobAddr, 0);

  // Now let's merge the last split back together
  const splitTxObj = new bsv.Transaction(splitHex);

  const mergeHex = await merge(
    alicePrivateKey,
    utils.getMergeUtxo(splitTxObj),
    bobAddr,
    utils.getUtxo(splitTxid, splitTx, 2),
    fundingPrivateKey
  );

  const mergeTxid = await utils.tapiBroadcast(mergeHex);
  await new Promise((resolve) => setTimeout(resolve, 5000));
  console.log(`Merge TX:        ${mergeTxid}`);
  const mergeTx = await getTransaction(mergeTxid);
  expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.0001);
  const tokenIdMerge = await utils.getToken(mergeTxid);
  const responseMerge = await utils.getTokenResponse(tokenIdMerge);
  expect(responseMerge.symbol).to.equal(symbol);
  await utils.isTokenBalance(aliceAddr, 0);
  await utils.isTokenBalance(bobAddr, 10000);

  const amount = bitcoinToSatoshis(mergeTx.vout[0].value / 2);

  const split2Destinations = [];
  split2Destinations[0] = { address: aliceAddr, satoshis: amount };
  split2Destinations[1] = { address: aliceAddr, satoshis: amount };

  const splitHex2 = await split(
    bobPrivateKey,
    utils.getUtxo(mergeTxid, mergeTx, 0),
    split2Destinations,
    utils.getUtxo(mergeTxid, mergeTx, 1),
    fundingPrivateKey
  );
  const splitTxid2 = await utils.tapiBroadcast(splitHex2);
  await new Promise((resolve) => setTimeout(resolve, 5000));
  console.log(`Split TX2:       ${splitTxid2}`);
  const splitTx2 = await getTransaction(splitTxid2);
  expect(await utils.getVoutAmount(splitTxid2, 0)).to.equal(0.00005);
  expect(await utils.getVoutAmount(splitTxid2, 1)).to.equal(0.00005);
  await utils.isTokenBalance(aliceAddr, 10000);
  await utils.isTokenBalance(bobAddr, 0);

  // Now mergeSplit
  const splitTxObj2 = new bsv.Transaction(splitHex2);

  const aliceAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[0].value) / 2;
  const bobAmountSatoshis =
    bitcoinToSatoshis(splitTx2.vout[0].value) +
    bitcoinToSatoshis(splitTx2.vout[1].value) -
    aliceAmountSatoshis;

  const mergeSplitHex = await mergeSplit(
    alicePrivateKey,
    utils.getMergeSplitUtxo(splitTxObj2, splitTx2),
    aliceAddr,
    aliceAmountSatoshis,
    bobAddr,
    bobAmountSatoshis,
    utils.getUtxo(splitTxid2, splitTx2, 2),
    fundingPrivateKey
  );

  const mergeSplitTxid = await utils.tapiBroadcast(mergeSplitHex);
  await new Promise((resolve) => setTimeout(resolve, 5000));
  console.log(`MergeSplit TX:   ${mergeSplitTxid}`);
  const mergeSplitTx = await getTransaction(mergeSplitTxid);
  expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.000025);
  expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.000075);
  await utils.isTokenBalance(aliceAddr, 2500);
  await utils.isTokenBalance(bobAddr, 7500);

  // Alice wants to redeem the money from bob...
  const redeemHex = await redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(mergeSplitTxid, mergeSplitTx, 0),
    utils.getUtxo(mergeSplitTxid, mergeSplitTx, 2),
    fundingPrivateKey
  );
  const redeemTxid = await utils.tapiBroadcast(redeemHex);
  await new Promise((resolve) => setTimeout(resolve, 5000));
  console.log(`Redeem TX:       ${redeemTxid}`);
  expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.000025);
  await utils.isTokenBalance(aliceAddr, 0);
  await utils.isTokenBalance(bobAddr, 7500);
});

function writeFile(data) {
  try {
    fs.writeFileSync("hex.txt", data.toString());
    // file written successfully
  } catch (err) {
    console.error(err);
  }
}
