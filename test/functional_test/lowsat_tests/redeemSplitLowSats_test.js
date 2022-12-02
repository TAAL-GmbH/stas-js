const expect = require("chai").expect;
const utils = require("../../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const {
  contract,
  issue,
  redeemSplit,
  redeemSplitWithCallback,
} = require("../../../index");

const { bitcoinToSatoshis, getTransaction, getFundsFromFaucet } =
  require("../../../index").utils;

const { sighash } = require("../../../lib/stas");

let issuerPrivateKey;
let fundingPrivateKey;
let bobPrivateKey;
let alicePrivateKey;
let bobAddr;
let aliceAddr;
let contractUtxos;
let fundingUtxos;
let publicKeyHash;
let issueTxid;
let issueTx;

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

describe("RedeemSplit Low Sat Tests", () => {
  it("Successful RedeemSplit With Low Sats (20)", async () => {
    await setup(21);

    const rSplitDestinations = [];
    rSplitDestinations[0] = { address: aliceAddr, satoshis: 10 };
    rSplitDestinations[1] = { address: aliceAddr, satoshis: 10 };

    const redeemSplitHex = await redeemSplit(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      rSplitDestinations,
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey
    );

    const redeemTxid = await utils.broadcastWithRetry(redeemSplitHex);
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.00000001); // first utxo goes to redemption address
    expect(await utils.getVoutAmount(redeemTxid, 1)).to.equal(0.0000001);
    expect(await utils.getVoutAmount(redeemTxid, 2)).to.equal(0.0000001);
    await utils.isTokenBalance(aliceAddr, 20);
  });

  it("Successful RedeemSplit With Low Sats (10)", async () => {
    await setup(11);

    const rSplitDestinations = [];
    rSplitDestinations[0] = { address: aliceAddr, satoshis: 5 };
    rSplitDestinations[1] = { address: aliceAddr, satoshis: 5 };

    const redeemSplitHex = await redeemSplit(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      rSplitDestinations,
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey
    );

    const redeemTxid = await utils.broadcastWithRetry(redeemSplitHex);
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.00000001); // first utxo goes to redemption address
    expect(await utils.getVoutAmount(redeemTxid, 1)).to.equal(0.00000005);
    expect(await utils.getVoutAmount(redeemTxid, 2)).to.equal(0.00000005);
    await utils.isTokenBalance(aliceAddr, 10);
  });

  it("Successful RedeemSplit With Low Sats (5)", async () => {
    await setup(6);

    const rSplitDestinations = [];
    rSplitDestinations[0] = { address: aliceAddr, satoshis: 2 };
    rSplitDestinations[1] = { address: aliceAddr, satoshis: 3 };

    const redeemSplitHex = await redeemSplit(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      rSplitDestinations,
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey
    );

    const redeemTxid = await utils.broadcastWithRetry(redeemSplitHex);
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.00000001); // first utxo goes to redemption address
    expect(await utils.getVoutAmount(redeemTxid, 1)).to.equal(0.00000002);
    expect(await utils.getVoutAmount(redeemTxid, 2)).to.equal(0.00000003);
    await utils.isTokenBalance(aliceAddr, 5);
  });

  it("Successful RedeemSplit With Low Sats (1)", async () => {
    await setup(3);

    const rSplitDestinations = [];
    rSplitDestinations[0] = { address: aliceAddr, satoshis: 1 };
    rSplitDestinations[1] = { address: aliceAddr, satoshis: 1 };

    const redeemSplitHex = await redeemSplit(
      alicePrivateKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      rSplitDestinations,
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey
    );

    const redeemTxid = await utils.broadcastWithRetry(redeemSplitHex);
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.00000001); // first utxo goes to redemption address
    expect(await utils.getVoutAmount(redeemTxid, 1)).to.equal(0.00000001);
    expect(await utils.getVoutAmount(redeemTxid, 2)).to.equal(0.00000001);
    await utils.isTokenBalance(aliceAddr, 2);
  });

  it("Successful RedeemSplit With Callback & Fees", async () => {
    await setup(3);
    const amount = issueTx.vout[0].value / 5;
    const rSplitDestinations = [];
    rSplitDestinations[0] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(amount),
    };
    rSplitDestinations[1] = {
      address: aliceAddr,
      satoshis: bitcoinToSatoshis(amount),
    };

    const redeemSplitHex = await redeemSplitWithCallback(
      alicePrivateKey.publicKey,
      issuerPrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      rSplitDestinations,
      utils.getUtxo(issueTxid, issueTx, 1),
      fundingPrivateKey.publicKey,
      aliceSignatureCallback,
      paymentSignatureCallback
    );
    console.log(redeemSplitHex);
    const redeemTxid = await utils.broadcastWithRetry(redeemSplitHex);
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.00000001); // first utxo goes to redemption address
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.00000001); // first utxo goes to redemption address
    expect(await utils.getVoutAmount(redeemTxid, 0)).to.equal(0.00000001); // first utxo goes to redemption address
    await utils.isTokenBalance(aliceAddr, 2);
  });
});

async function setup(satSupply) {
  issuerPrivateKey = bsv.PrivateKey();
  fundingPrivateKey = bsv.PrivateKey();
  alicePrivateKey = bsv.PrivateKey();
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString();
  bobPrivateKey = bsv.PrivateKey();
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString();
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
  const schema = utils.schema(publicKeyHash, symbol, satSupply);

  const contractHex = await contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    satSupply
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
  issueTxid = await utils.broadcastWithRetry(issueHex);
  issueTx = await getTransaction(issueTxid);
}
