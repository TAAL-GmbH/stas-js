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
  redeem,
} = require("../../../index");

const { bitcoinToSatoshis, getTransaction, getFundsFromFaucet } =
  require("../../../index").utils;

const issuerPrivateKey = bsv.PrivateKey();
const fundingPrivateKey = bsv.PrivateKey();
const bobPrivateKey = bsv.PrivateKey();
const bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString();
const alicePrivateKey = bsv.PrivateKey();
const aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString();
const davePrivateKey = bsv.PrivateKey();
const daveAddr = davePrivateKey.toAddress(process.env.NETWORK).toString();
const emmaPrivateKey = bsv.PrivateKey();
const emmaAddr = emmaPrivateKey.toAddress(process.env.NETWORK).toString();
const wait = 5000;

it("Full Life Cycle Test With Multiple Transfers & Splits", async () => {
  const contractUtxos = await getFundsFromFaucet(
    issuerPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  const fundingUtxos = await getFundsFromFaucet(
    fundingPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    issuerPrivateKey.publicKey.toBuffer()
  ).toString("hex");
  const supply = 40000;
  const symbol = "TAALT";
  const schema = utils.schema(publicKeyHash, symbol, supply);

  // change goes back to the fundingPrivateKey
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

  const issueInfo = [
    {
      addr: bobAddr,
      satoshis: 10000,
      data: "1_data",
    },
    {
      addr: aliceAddr,
      satoshis: 10000,
      data: "2_data",
    },
    {
      addr: daveAddr,
      satoshis: 10000,
      data: "3_data",
    },
    {
      addr: emmaAddr,
      satoshis: 10000,
      data: "4_data",
    },
  ];

  const issueHex = await issue(
    issuerPrivateKey,
    issueInfo,
    utils.getUtxo(contractTxid, contractTx, 0),
    utils.getUtxo(contractTxid, contractTx, 1),
    fundingPrivateKey,
    true,
    symbol,
    2
  );
  const issueTxid = await utils.broadcastWithRetry(issueHex);
  await new Promise((resolve) => setTimeout(resolve, wait));
  const issueTx = await getTransaction(issueTxid);
  const tokenId = await utils.getToken(issueTxid);
  console.log(`Token ID:        ${tokenId}`);
  const response = await utils.getTokenResponse(tokenId); // token issuance fails intermittingly
  expect(response.symbol).to.equal(symbol);

  for (let i = 1; i < 4; i++) {
    expect(await utils.getVoutAmount(issueTxid, i)).to.equal(0.0001);
  }
  await utils.isTokenBalance(bobAddr, 10000);
  await utils.isTokenBalance(aliceAddr, 10000);
  await utils.isTokenBalance(daveAddr, 10000);
  await utils.isTokenBalance(emmaAddr, 10000);

  const issueOutFundingVout = issueTx.vout.length - 1;

  const transferHex = await transfer(
    bobPrivateKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    aliceAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  );
  const transferTxid = await utils.broadcastWithRetry(transferHex);
  console.log(`Transfer TX:     ${transferTxid}`);
  const transferTx = await getTransaction(transferTxid);
  await utils.isTokenBalance(bobAddr, 0);
  await utils.isTokenBalance(aliceAddr, 20000);
  await utils.isTokenBalance(daveAddr, 10000);
  await utils.isTokenBalance(emmaAddr, 10000);

  const transferHex2 = await transfer(
    alicePrivateKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    emmaAddr,
    utils.getUtxo(transferTxid, transferTx, 1),
    fundingPrivateKey
  );
  const transferTxid2 = await utils.broadcastWithRetry(transferHex2);
  console.log(`Transfer TX2:     ${transferTxid2}`);
  const transferTx2 = await getTransaction(transferTxid2);
  await utils.isTokenBalance(bobAddr, 0);
  await utils.isTokenBalance(aliceAddr, 10000);
  await utils.isTokenBalance(daveAddr, 10000);
  await utils.isTokenBalance(emmaAddr, 20000);

  const transferHex3 = await transfer(
    davePrivateKey,
    utils.getUtxo(issueTxid, issueTx, 2),
    emmaAddr,
    utils.getUtxo(transferTxid2, transferTx2, 1),
    fundingPrivateKey
  );
  const transferTxid3 = await utils.broadcastWithRetry(transferHex3);
  console.log(`Transfer TX3:     ${transferTxid3}`);
  const transferTx3 = await getTransaction(transferTxid3);
  await utils.isTokenBalance(bobAddr, 0);
  await utils.isTokenBalance(aliceAddr, 10000);
  await utils.isTokenBalance(daveAddr, 0);
  await utils.isTokenBalance(emmaAddr, 30000);

  const transferHex4 = await transfer(
    emmaPrivateKey,
    utils.getUtxo(issueTxid, issueTx, 3),
    bobAddr,
    utils.getUtxo(transferTxid3, transferTx3, 1),
    fundingPrivateKey
  );
  const transferTxid4 = await utils.broadcastWithRetry(transferHex4);
  console.log(`Transfer TX4:     ${transferTxid4}`);
  const transferTx4 = await getTransaction(transferTxid4);
  expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.0001);
  await utils.isTokenBalance(bobAddr, 10000);
  await utils.isTokenBalance(aliceAddr, 10000);
  await utils.isTokenBalance(daveAddr, 0);
  await utils.isTokenBalance(emmaAddr, 20000);

  const bobAmount1 = transferTx.vout[0].value / 2;
  const bobAmount2 = transferTx.vout[0].value - bobAmount1;
  const splitDestinations = [];
  splitDestinations[0] = {
    address: daveAddr,
    satoshis: bitcoinToSatoshis(bobAmount1),
  };
  splitDestinations[1] = {
    address: daveAddr,
    satoshis: bitcoinToSatoshis(bobAmount2),
  };

  const splitHex = await split(
    bobPrivateKey,
    utils.getUtxo(transferTxid4, transferTx4, 0),
    splitDestinations,
    utils.getUtxo(transferTxid4, transferTx4, 1),
    fundingPrivateKey
  );
  const splitTxid = await utils.broadcastWithRetry(splitHex);
  console.log(`Split TX:        ${splitTxid}`);
  const splitTx = await getTransaction(splitTxid);
  expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.00005);
  expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.00005);
  await utils.isTokenBalance(bobAddr, 0);
  await utils.isTokenBalance(aliceAddr, 10000);
  await utils.isTokenBalance(daveAddr, 10000);
  await utils.isTokenBalance(emmaAddr, 20000);

  const splitTxObj = new bsv.Transaction(splitHex);

  const mergeHex = await merge(
    davePrivateKey,
    utils.getMergeUtxo(splitTxObj),
    aliceAddr,
    utils.getUtxo(splitTxid, splitTx, 2),
    fundingPrivateKey
  );
  const mergeTxid = await utils.broadcastWithRetry(mergeHex);
  console.log(`Merge TX:        ${mergeTxid}`);
  const mergeTx = await getTransaction(mergeTxid);
  expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.0001);
  await utils.isTokenBalance(bobAddr, 0);
  await utils.isTokenBalance(aliceAddr, 20000);
  await utils.isTokenBalance(daveAddr, 0);
  await utils.isTokenBalance(emmaAddr, 20000);

  const aliceAmount1 = mergeTx.vout[0].value / 2;
  const aliceAmount2 = mergeTx.vout[0].value - aliceAmount1;

  const split2Destinations = [];
  split2Destinations[0] = {
    address: aliceAddr,
    satoshis: bitcoinToSatoshis(aliceAmount1),
  };
  split2Destinations[1] = {
    address: aliceAddr,
    satoshis: bitcoinToSatoshis(aliceAmount2),
  };

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
  expect(await utils.getVoutAmount(splitTxid2, 0)).to.equal(0.00005);
  expect(await utils.getVoutAmount(splitTxid2, 1)).to.equal(0.00005);
  await utils.isTokenBalance(bobAddr, 0);
  await utils.isTokenBalance(aliceAddr, 20000);
  await utils.isTokenBalance(daveAddr, 0);
  await utils.isTokenBalance(emmaAddr, 20000);

  const redeemHex = await redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(splitTxid2, splitTx2, 0),
    utils.getUtxo(splitTxid2, splitTx2, 2),
    fundingPrivateKey
  );
  const redeemTxid = await utils.broadcastWithRetry(redeemHex);
  console.log(`Redeem TX:       ${redeemTxid}`);
  expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.00005);
  await utils.isTokenBalance(bobAddr, 0);
  await utils.isTokenBalance(aliceAddr, 15000);
  await utils.isTokenBalance(daveAddr, 0);
  await utils.isTokenBalance(emmaAddr, 20000);
});
