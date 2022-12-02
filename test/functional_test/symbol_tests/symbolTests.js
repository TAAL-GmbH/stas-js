const expect = require("chai").expect;
const utils = require("../../utils/test_utils");

const bsv = require("bsv");
require("dotenv").config();

const { contract, issue } = require("../../../index");

const { getTransaction, getFundsFromFaucet } = require("../../../index").utils;

describe("Symbol Tests", () => {
  it("Changed Symbol in issue functions", async () => {
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
    try {
      await issue(
        issuerPrivateKey,
        utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        "wrong_symbol", // symbol changed
        2
      );
      assert(false);
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.equal(
        "The symbol in the contract must equal symbol passed to issue"
      );
    }
  });

  it("Symbol Special Char Test 1", async () => {
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
    const symbol = "TAALT_Special_Chars"; // '-' and '_' are the only acceptable special chars
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
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    const tokenId = await utils.getToken(issueTxid);
    console.log(`Token ID:        ${tokenId}`);
    const response = await utils.getTokenResponse(tokenId, symbol);
    expect(response.symbol).to.equal(symbol);
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007);
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003);
    expect(await utils.isTokenBalance(aliceAddr, 7000));
    expect(await utils.isTokenBalance(bobAddr, 3000));
  });

  it("Symbol Special Char Test 2", async () => {
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
    const symbol = "TAALT-SpecialChars"; // '-' and '_' are the only acceptable special chars
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
    const issueTxid = await utils.broadcastWithRetry(issueHex);
    const tokenId = await utils.getToken(issueTxid);
    console.log(`Token ID:        ${tokenId}`);
    const response = await utils.getTokenResponse(tokenId, symbol);
    expect(response.symbol).to.equal(symbol);
    expect(await utils.getVoutAmount(issueTxid, 0)).to.equal(0.00007);
    expect(await utils.getVoutAmount(issueTxid, 1)).to.equal(0.00003);
    expect(await utils.isTokenBalance(aliceAddr, 7000));
    expect(await utils.isTokenBalance(bobAddr, 3000));
  });
});
