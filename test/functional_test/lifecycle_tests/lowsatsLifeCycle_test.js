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

const { bitcoinToSatoshis, getTransaction, getFundsFromFaucet } =
  require("../../../index").utils;

describe("LifeCycle Low Sat Tests", () => {
  it("Full Life Cycle Test Low Sats 100 supply", async () => {
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
    const supply = 100;
    const symbol = "TAALT";
    const schema = utils.schema(publicKeyHash, symbol, supply);
    const wait = 3000;

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

    const issueHex = await issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 70, bobAddr, 30),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol,
      2
    );
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    const issueTx = await getTransaction(issueTxid);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const tokenId = await utils.getToken(issueTxid);
    const response = await utils.getTokenResponse(tokenId);
    expect(response.symbol).to.equal(symbol);
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.0000007);
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.0000003);
    await utils.isTokenBalance(aliceAddr, 70);
    await utils.isTokenBalance(bobAddr, 30);

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
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.0000003);
    await utils.isTokenBalance(aliceAddr, 100);
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
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.00000015);
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.00000015);
    await utils.isTokenBalance(aliceAddr, 70);
    await utils.isTokenBalance(bobAddr, 30);

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
    expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.0000003);
    await utils.isTokenBalance(aliceAddr, 100);
    await utils.isTokenBalance(bobAddr, 0);

    // Split again - both payable to Alice...
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
    expect(await utils.getVoutAmount(splitTxid2, 0)).to.equal(0.00000015);
    expect(await utils.getVoutAmount(splitTxid2, 1)).to.equal(0.00000015);
    await utils.isTokenBalance(aliceAddr, 100);
    await utils.isTokenBalance(bobAddr, 0);

    // Now mergeSplit
    const splitTxObj2 = new bsv.Transaction(splitHex2);

    const bobAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[0].value);
    const aliceAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[1].value);

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
    const mergeSplitTxid = await utils.broadcastWithRetry(mergeSplitHex);
    console.log(`MergeSplit TX:   ${mergeSplitTxid}`);
    const mergeSplitTx = await getTransaction(mergeSplitTxid);
    expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.00000015);
    expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.00000015);
    await utils.isTokenBalance(aliceAddr, 85);
    await utils.isTokenBalance(bobAddr, 15);

    const redeemHex = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(mergeSplitTxid, mergeSplitTx, 0),
      utils.getUtxo(mergeSplitTxid, mergeSplitTx, 2),
      fundingPrivateKey
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemHex);
    console.log(`Redeem TX:       ${redeemTxid}`);
    const redeemTx = await getTransaction(redeemTxid);
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.00000015);
    await utils.isTokenBalance(aliceAddr, 70);
    await utils.isTokenBalance(bobAddr, 15);

    const redeemHex2 = await redeem(
      bobPrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(mergeSplitTxid, mergeSplitTx, 1),
      utils.getUtxo(redeemTxid, redeemTx, 1),
      fundingPrivateKey
    );
    const redeemTxid2 = await utils.broadcastWithRetry(redeemHex2);
    console.log(`Redeem TX2:       ${redeemTxid2}`);
    expect(await utils.getVoutAmount(redeemTxid2, 0)).to.equal(0.00000015);
    await utils.isTokenBalance(aliceAddr, 70);
    await utils.isTokenBalance(bobAddr, 0);
  });

  it("Full Life Cycle Test Low Sats 1000 supply", async () => {
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
    const supply = 1000;
    const symbol = "TAALT";
    const schema = utils.schema(publicKeyHash, symbol, supply);
    const wait = 5000;

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
      utils.getIssueInfo(aliceAddr, 700, bobAddr, 300),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol,
      2
    );
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    const issueTx = await getTransaction(issueTxid);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const tokenId = await utils.getToken(issueTxid);
    const response = await utils.getTokenResponse(tokenId);
    expect(response.symbol).to.equal(symbol);
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.000007);
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.000003);
    await utils.isTokenBalance(aliceAddr, 700);
    await utils.isTokenBalance(bobAddr, 300);

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
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.000003);
    await utils.isTokenBalance(aliceAddr, 1000);
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
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.0000015);
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.0000015);
    await utils.isTokenBalance(aliceAddr, 700);
    await utils.isTokenBalance(bobAddr, 300);

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
    expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.000003);
    await utils.isTokenBalance(aliceAddr, 1000);
    await utils.isTokenBalance(bobAddr, 0);

    // Split again - both payable to Alice...
    const aliceAmount1 = mergeTx.vout[0].value / 2;
    const aliceAmount2 = mergeTx.vout[0].value - aliceAmount1;

    const split2Destinations = [];
    split2Destinations[0] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(aliceAmount1),
    };
    split2Destinations[1] = {
      address: bobAddr,
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
    expect(await utils.getVoutAmount(splitTxid2, 0)).to.equal(0.0000015);
    expect(await utils.getVoutAmount(splitTxid2, 1)).to.equal(0.0000015);
    await utils.isTokenBalance(aliceAddr, 700);
    await utils.isTokenBalance(bobAddr, 300);

    // Now mergeSplit
    const splitTxObj2 = new bsv.Transaction(splitHex2);

    const bobAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[0].value);
    const aliceAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[1].value);

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
    expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.0000015);
    expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.0000015);
    await utils.isTokenBalance(aliceAddr, 850);
    await utils.isTokenBalance(bobAddr, 150);

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
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.0000015);
    await utils.isTokenBalance(aliceAddr, 700);
    await utils.isTokenBalance(bobAddr, 150);
  });

  it("Full Life Cycle Test Low Sats 2 supply", async () => {
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
    const supply = 2;
    const symbol = "TAALT";
    const schema = utils.schema(publicKeyHash, symbol, supply);
    const wait = 5000;

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

    const issueHex = await issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 1, bobAddr, 1),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol,
      2
    );
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    const issueTx = await getTransaction(issueTxid);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const tokenId = await utils.getToken(issueTxid);
    const response = await utils.getTokenResponse(tokenId);
    expect(response.symbol).to.equal(symbol);
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00000001);
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00000001);
    await utils.isTokenBalance(aliceAddr, 1);
    await utils.isTokenBalance(bobAddr, 1);

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
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00000001);
    await utils.isTokenBalance(aliceAddr, 2);
    await utils.isTokenBalance(bobAddr, 0);

    const redeemHex = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(transferTxid, transferTx, 0),
      utils.getUtxo(transferTxid, transferTx, 1),
      fundingPrivateKey
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemHex);
    console.log(`Redeem TX:       ${redeemTxid}`);
    const redeemTx = await getTransaction(redeemTxid);
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.00000001);
    await utils.isTokenBalance(aliceAddr, 1);
    await utils.isTokenBalance(bobAddr, 0);

    const redeemHex2 = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(redeemTxid, redeemTx, 1),
      fundingPrivateKey
    );
    const redeemTxid2 = await utils.broadcastWithRetry(redeemHex2);
    console.log(`Redeem TX2:       ${redeemTxid2}`);
    expect(await utils.getVoutAmount(redeemTxid2, 0)).to.equal(0.00000001);
    await utils.isTokenBalance(aliceAddr, 0);
    await utils.isTokenBalance(bobAddr, 0);
  });

  it("Full Life Cycle Test Low Sats 3 supply", async () => {
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
    const supply = 3;
    const symbol = "TAALT";
    const schema = utils.schema(publicKeyHash, symbol, supply);
    const wait = 5000;

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

    const issueHex = await issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 1, bobAddr, 2),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol,
      2
    );
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    const issueTx = await getTransaction(issueTxid);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const tokenId = await utils.getToken(issueTxid);
    const response = await utils.getTokenResponse(tokenId);
    expect(response.symbol).to.equal(symbol);
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00000001);
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00000002);
    await utils.isTokenBalance(aliceAddr, 1);
    await utils.isTokenBalance(bobAddr, 2);

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
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00000002);
    await utils.isTokenBalance(aliceAddr, 3);
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
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.00000001);
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.00000001);
    await utils.isTokenBalance(aliceAddr, 1);
    await utils.isTokenBalance(bobAddr, 2);

    // Now let's merge the last split back together
    const splitTxObj = new bsv.Transaction(splitHex);
    console.log("splitobj " + splitTxObj.toString());

    const mergeHex = await merge(
      bobPrivateKey,
      utils.getMergeUtxo(splitTxObj),
      aliceAddr,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    );
    console.log(mergeHex);
    const mergeTxid = await utils.broadcastWithRetry(mergeHex);
    console.log(`Merge TX:        ${mergeTxid}`);
    const mergeTx = await getTransaction(mergeTxid);
    expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00000002);
    await utils.isTokenBalance(aliceAddr, 3);
    await utils.isTokenBalance(bobAddr, 0);

    // Split again - both payable to Alice...
    const aliceAmount1 = mergeTx.vout[0].value / 2;
    const aliceAmount2 = mergeTx.vout[0].value - aliceAmount1;

    const split2Destinations = [];
    split2Destinations[0] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(aliceAmount1),
    };
    split2Destinations[1] = {
      address: bobAddr,
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
    expect(await utils.getVoutAmount(splitTxid2, 0)).to.equal(0.00000001);
    expect(await utils.getVoutAmount(splitTxid2, 1)).to.equal(0.00000001);
    await utils.isTokenBalance(aliceAddr, 1);
    await utils.isTokenBalance(bobAddr, 2);

    // Now mergeSplit
    const splitTxObj2 = new bsv.Transaction(splitHex2);

    const bobAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[0].value);
    const aliceAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[1].value);

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
    expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.00000001);
    expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.00000001);
    await utils.isTokenBalance(aliceAddr, 2);
    await utils.isTokenBalance(bobAddr, 1);

    const redeemHex = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(mergeSplitTxid, mergeSplitTx, 0),
      utils.getUtxo(mergeSplitTxid, mergeSplitTx, 2),
      fundingPrivateKey
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemHex);
    console.log(`Redeem TX:       ${redeemTxid}`);
    const redeemTx = await getTransaction(redeemTxid);
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.00000001);
    await utils.isTokenBalance(aliceAddr, 1);
    await utils.isTokenBalance(bobAddr, 1);

    const redeemHex2 = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      utils.getUtxo(redeemTxid, redeemTx, 1),
      fundingPrivateKey
    );
    const redeemTxid2 = await utils.broadcastWithRetry(redeemHex2);
    console.log(`Redeem TX2:       ${redeemTxid2}`);
    expect(await utils.getVoutAmount(redeemTxid2, 0)).to.equal(0.00000001);
    await utils.isTokenBalance(aliceAddr, 0);
    await utils.isTokenBalance(bobAddr, 1);
  });

  it.only("Full Life Cycle Test Low Sats 20 supply", async () => {
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
    const supply = 20;
    const symbol = "TAALT";
    const schema = utils.schema(publicKeyHash, symbol, supply);
    const wait = 3000;

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

    const issueHex = await issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 10, bobAddr, 10),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol,
      2
    );
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    const issueTx = await getTransaction(issueTxid);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const tokenId = await utils.getToken(issueTxid);
    const response = await utils.getTokenResponse(tokenId);
    expect(response.symbol).to.equal(symbol);
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.0000001);
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.0000001);
    await utils.isTokenBalance(aliceAddr, 10);
    await utils.isTokenBalance(bobAddr, 10);

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
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.0000001);
    await utils.isTokenBalance(aliceAddr, 20);
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
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.00000005);
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.00000005);
    await utils.isTokenBalance(aliceAddr, 10);
    await utils.isTokenBalance(bobAddr, 10);

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
    expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.0000001);
    await utils.isTokenBalance(aliceAddr, 20);
    await utils.isTokenBalance(bobAddr, 0);

    // Split again - both payable to Alice...
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
    expect(await utils.getVoutAmount(splitTxid2, 0)).to.equal(0.00000005);
    expect(await utils.getVoutAmount(splitTxid2, 1)).to.equal(0.00000005);
    await utils.isTokenBalance(aliceAddr, 20);
    await utils.isTokenBalance(bobAddr, 0);

    // Now mergeSplit
    const splitTxObj2 = new bsv.Transaction(splitHex2);

    const bobAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[0].value);
    const aliceAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[1].value);

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
    const mergeSplitTxid = await utils.broadcastWithRetry(mergeSplitHex);
    console.log(`MergeSplit TX:   ${mergeSplitTxid}`);
    const mergeSplitTx = await getTransaction(mergeSplitTxid);
    expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.00000005);
    expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.00000005);
    await utils.isTokenBalance(aliceAddr, 15);
    await utils.isTokenBalance(bobAddr, 5);

    const redeemHex = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(mergeSplitTxid, mergeSplitTx, 0),
      utils.getUtxo(mergeSplitTxid, mergeSplitTx, 2),
      fundingPrivateKey
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemHex);
    console.log(`Redeem TX:       ${redeemTxid}`);
    const redeemTx = await getTransaction(redeemTxid);
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.00000005);
    await utils.isTokenBalance(aliceAddr, 10);
    await utils.isTokenBalance(bobAddr, 5);

    const redeemHex2 = await redeem(
      bobPrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(mergeSplitTxid, mergeSplitTx, 1),
      utils.getUtxo(redeemTxid, redeemTx, 1),
      fundingPrivateKey
    );
    const redeemTxid2 = await utils.broadcastWithRetry(redeemHex2);
    console.log(`Redeem TX2:       ${redeemTxid2}`);
    expect(await utils.getVoutAmount(redeemTxid2, 0)).to.equal(0.00000005);
    await utils.isTokenBalance(aliceAddr, 5);
    await utils.isTokenBalance(bobAddr, 5);
  });

  it("Full Life Cycle Test Low Sats 10 supply", async () => {
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
    const supply = 10;
    const symbol = "TAALT";
    const schema = utils.schema(publicKeyHash, symbol, supply);
    const wait = 3000;

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

    const issueHex = await issue(
      issuerPrivateKey,
      utils.getIssueInfo(aliceAddr, 5, bobAddr, 5),
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol,
      2
    );
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    console.log(`issue TX:     ${issueTxid}`);
    const issueTx = await getTransaction(issueTxid);
    await new Promise((resolve) => setTimeout(resolve, wait));
    const tokenId = await utils.getToken(issueTxid);
    const response = await utils.getTokenResponse(tokenId);
    expect(response.symbol).to.equal(symbol);
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00000005);
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00000005);
    await utils.isTokenBalance(aliceAddr, 5);
    await utils.isTokenBalance(bobAddr, 5);

    const issueOutFundingVout = issueTx.vout.length - 1;

    const transferHex = await transfer(
      bobPrivateKey,
      utils.getUtxo(issueTxid, issueTx, 1),
      aliceAddr,
      utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
      fundingPrivateKey
    );
    console.log("kemi1" + transferHex);
    const transferTxid = await utils.broadcastWithRetry(transferHex);
    console.log(`Transfer TX1:     ${transferTxid}`);
    const transferTx = await getTransaction(transferTxid);
    expect(await utils.getVoutAmount(transferTxid, 0)).to.equal(0.00000005);
    await utils.isTokenBalance(aliceAddr, 10);
    await utils.isTokenBalance(bobAddr, 0);

    //Split tokens into 2 - both payable to Bob...
    const bobAmount1 = transferTx.vout[0].value - 2e-8;
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
    console.log("splitAmount1" + splitDestinations[0]);
    console.log("splitAmount2" + splitDestinations[1]);
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
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.00000003);
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.00000002);
    await utils.isTokenBalance(aliceAddr, 5);
    await utils.isTokenBalance(bobAddr, 5);

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
    expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00000005);
    await utils.isTokenBalance(aliceAddr, 10);
    await utils.isTokenBalance(bobAddr, 0);

    // Split again - both payable to Alice...
    const aliceAmount1 = mergeTx.vout[0].value - 2e-8;
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
    expect(await utils.getVoutAmount(splitTxid2, 0)).to.equal(0.00000003);
    expect(await utils.getVoutAmount(splitTxid2, 1)).to.equal(0.00000002);
    await utils.isTokenBalance(aliceAddr, 10);
    await utils.isTokenBalance(bobAddr, 0);

    // Now mergeSplit
    const splitTxObj2 = new bsv.Transaction(splitHex2);

    const bobAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[0].value);
    const aliceAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[1].value);

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
    const mergeSplitTxid = await utils.broadcastWithRetry(mergeSplitHex);
    console.log(`MergeSplit TX:   ${mergeSplitTxid}`);
    const mergeSplitTx = await getTransaction(mergeSplitTxid);
    expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.00000002);
    expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.00000003);
    await utils.isTokenBalance(aliceAddr, 7);
    await utils.isTokenBalance(bobAddr, 3);

    const redeemHex = await redeem(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(mergeSplitTxid, mergeSplitTx, 0),
      utils.getUtxo(mergeSplitTxid, mergeSplitTx, 2),
      fundingPrivateKey
    );
    const redeemTxid = await utils.broadcastWithRetry(redeemHex);
    console.log(`Redeem TX:       ${redeemTxid}`);
    const redeemTx = await getTransaction(redeemTxid);
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.00000002);
    await utils.isTokenBalance(aliceAddr, 5);
    await utils.isTokenBalance(bobAddr, 3);

    const redeemHex2 = await redeem(
      bobPrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(mergeSplitTxid, mergeSplitTx, 1),
      utils.getUtxo(redeemTxid, redeemTx, 1),
      fundingPrivateKey
    );
    const redeemTxid2 = await utils.broadcastWithRetry(redeemHex2);
    console.log(`Redeem TX2:       ${redeemTxid2}`);
    expect(await utils.getVoutAmount(redeemTxid2, 0)).to.equal(0.00000003);
    await utils.isTokenBalance(aliceAddr, 5);
    await utils.isTokenBalance(bobAddr, 0);
  });
});
