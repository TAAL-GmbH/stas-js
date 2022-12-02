const expect = require("chai").expect;
const utils = require("../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const { contract, issue, transfer, split, redeem } = require("../../index");
const { assert } = require("chai");

const { bitcoinToSatoshis, getTransaction, getFundsFromFaucet, broadcast } =
  require("../../index").utils;

it("Full Life Cycle Test NFT 1", async () => {
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
  const wait = 5000;

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
  console.log(`Contract TX:     ${contractTxid}`);
  const contractTx = await getTransaction(contractTxid);
  const amount = await utils.getVoutAmount(contractTxid, 0);
  expect(amount).to.equal(supply / 100000000);

  let issueHex;
  try {
    issueHex = await issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      false,
      symbol,
      2
    );
  } catch (e) {
    console.log("error issuing token", e);
    return;
  }
  const issueTxid = await utils.broadcastWithRetry(issueHex);
  console.log(`Issue TX:        ${issueTxid}`);
  const issueTx = await getTransaction(issueTxid);
  await new Promise((resolve) => setTimeout(resolve, wait));
  const tokenId = await utils.getToken(issueTxid);
  const response = await utils.getTokenResponse(tokenId);
  expect(response.symbol).to.equal(symbol);
  expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007);
  expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003);
  await utils.isTokenBalance(aliceAddr, 7000);
  await utils.isTokenBalance(bobAddr, 3000);

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
  expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003);
  await utils.isTokenBalance(aliceAddr, 10000);
  await utils.isTokenBalance(bobAddr, 0);

  // Split tokens into 2 - both payable to Bob...
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

  try {
    await split(
      alicePrivateKey,
      utils.getUtxo(transferTxid, transferTx, 0),
      splitDestinations,
      utils.getUtxo(transferTxid, transferTx, 1),
      fundingPrivateKey
    );
    assert(false);
  } catch (e) {
    expect(e).to.be.instanceOf(Error);
    expect(e.message).to.eql("Cannot Split an NFT");
  }

  const redeemHex = await redeem(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(transferTxid, transferTx, 0),
    utils.getUtxo(transferTxid, transferTx, 1),
    fundingPrivateKey
  );
  const redeemTxid = await utils.broadcastWithRetry(redeemHex);
  console.log(`Redeem TX:       ${redeemTxid}`);
  expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.00003);
  await utils.isTokenBalance(aliceAddr, 7000);
  await utils.isTokenBalance(bobAddr, 0);
});
