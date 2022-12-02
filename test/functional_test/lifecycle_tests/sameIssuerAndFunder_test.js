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

const { getTransaction, getFundsFromFaucet } = require("../../../index").utils;

it("Full Life Cycle Test with same issuer & funder", async () => {
  const issuerAndFundingPrivateKey = bsv.PrivateKey();
  const alicePrivateKey = bsv.PrivateKey();
  const aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString();

  const bobPrivateKey = bsv.PrivateKey();
  const destinationAddress = issuerAndFundingPrivateKey
    .toAddress(process.env.NETWORK)
    .toString();

  const contractUtxos = await getFundsFromFaucet(
    issuerAndFundingPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  const fundingUtxos = await getFundsFromFaucet(
    issuerAndFundingPrivateKey.toAddress(process.env.NETWORK).toString()
  );

  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    issuerAndFundingPrivateKey.publicKey.toBuffer()
  ).toString("hex");
  const supply = 10000;
  const symbol = "TAALT";
  const schema = utils.schema(publicKeyHash, symbol, supply);
  const wait = 5000; // set wait before token balance check

  const contractHex = await contract(
    issuerAndFundingPrivateKey,
    contractUtxos,
    fundingUtxos,
    issuerAndFundingPrivateKey,
    schema,
    supply
  );
  const contractTxid = await utils.utils.broadcastWithRetry(contractHex);
  console.log(`Contract TX:     ${contractTxid}`);
  const contractTx = await getTransaction(contractTxid);
  console.log(utils.getUtxo(contractTxid, contractTx, 1));
  const issueHex = await issue(
    issuerAndFundingPrivateKey,
    utils.getIssueInfo(aliceAddr, 7000, destinationAddress, 3000),
    utils.getUtxo(contractTxid, contractTx, 0),
    utils.getUtxo(contractTxid, contractTx, 1),
    issuerAndFundingPrivateKey,
    true,
    symbol,
    2
  );
  const issueTxid = await utils.utils.broadcastWithRetry(issueHex);
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
  await utils.isTokenBalance(destinationAddress, 3000);

  const issueOutFundingVout = issueTx.vout.length - 1;
  const transferHex = await transfer(
    issuerAndFundingPrivateKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    aliceAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    issuerAndFundingPrivateKey
  );
  const transferTxid = await utils.utils.broadcastWithRetry(transferHex);
  console.log(`Transfer TX:     ${transferTxid}`);
  const transferTx = await getTransaction(transferTxid);
  expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00003);
  await utils.isTokenBalance(aliceAddr, 10000);
  await utils.isTokenBalance(destinationAddress, 0);
});
