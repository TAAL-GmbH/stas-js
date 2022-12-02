const expect = require("chai").expect;
const utils = require("../../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const { contract, issue, split, merge, mergeSplit } = require("../../../index");

const { bitcoinToSatoshis, getTransaction, getFundsFromFaucet, broadcast } =
  require("../../../index").utils;

let issuerPrivateKey;
let fundingPrivateKey;
let bobPrivateKey;
let alicePrivateKey;
let bobAddr;
let aliceAddr;
let contractUtxos;
let fundingUtxos;
let publicKeyHash;
let contractTxid;
let contractTx;
let issueTxid;
let issueTx;
let splitTxid;
let splitTxid2;
let splitTx2;
let splitTxObj;
let splitTxObj2;

beforeEach(async () => {
  await setup();
});

it("Merge - Attempt To Merge With Different Symbol", async () => {
  const mergeHex = await merge(
    bobPrivateKey,
    [
      {
        tx: splitTxObj,
        vout: 0,
      },
      {
        tx: splitTxObj2,
        vout: 0,
      },
    ],
    aliceAddr,
    utils.getUtxo(splitTxid2, splitTx2, 2),
    fundingPrivateKey
  );
  try {
    await broadcast(mergeHex);
  } catch (e) {
    expect(e).to.be.instanceOf(Error);
    expect(e.response.data).to.eql(
      "unexpected response code 500: 16: bad-txns-inputs-duplicate"
    );
  }
});

// needs fixed
it("MergeSplit - Attempt To Merge With Different Symbol", async () => {
  const aliceAmountSatoshis = bitcoinToSatoshis(splitTx2.vout[0].value) / 2;
  const bobAmountSatoshis =
    bitcoinToSatoshis(splitTx2.vout[0].value) +
    bitcoinToSatoshis(splitTx2.vout[1].value) -
    aliceAmountSatoshis;
  const mergeHex = await mergeSplit(
    bobPrivateKey,
    [
      {
        tx: splitTxObj,
        vout: 0,
      },
      {
        tx: splitTxObj2,
        vout: 0,
      },
    ],
    aliceAddr,
    aliceAmountSatoshis,
    bobAddr,
    bobAmountSatoshis,
    utils.getUtxo(splitTxid2, splitTx2, 2),
    fundingPrivateKey
  );
  try {
    await utils.broadcast(mergeHex);
  } catch (e) {
    expect(e).to.be.instanceOf(Error);
    expect(e.response.data).to.eql(
      "unexpected response code 500: 16: bad-txns-inputs-duplicate"
    );
  }
});

async function setup() {
  issuerPrivateKey = bsv.PrivateKey();
  fundingPrivateKey = bsv.PrivateKey();
  bobPrivateKey = bsv.PrivateKey();
  alicePrivateKey = bsv.PrivateKey();
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString();
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString();
  contractUtxos = await getFundsFromFaucet(
    issuerPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  fundingUtxos = await getFundsFromFaucet(
    fundingPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  const contractUtxos2 = await getFundsFromFaucet(
    issuerPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  const fundingUtxos2 = await getFundsFromFaucet(
    fundingPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    issuerPrivateKey.publicKey.toBuffer()
  ).toString("hex");
  const symbol = "TAALT";
  const symbol2 = "TAALT2";
  const supply = 10000;
  const schema = utils.schema(publicKeyHash, symbol, supply);
  const schema2 = utils.schema(publicKeyHash, symbol2, supply);
  const issueInfo = [
    {
      addr: aliceAddr,
      satoshis: 10000,
      data: "one",
    },
  ];

  const contractHex = await contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  );
  contractTxid = await utils.broadcastWithRetry(contractHex);
  contractTx = await getTransaction(contractTxid);

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
  issueTxid = await utils.broadcastWithRetry(issueHex);
  issueTx = await getTransaction(issueTxid);

  const issueOutFundingVout = issueTx.vout.length - 1;

  const bobAmount1 = issueTx.vout[0].value / 2;
  const bobAmount2 = issueTx.vout[0].value - bobAmount1;
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
    utils.getUtxo(issueTxid, issueTx, 0),
    splitDestinations,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  );
  splitTxid = await utils.broadcastWithRetry(splitHex);
  splitTxObj = new bsv.Transaction(splitHex);

  // issue token with different symbol
  const contractHex2 = await contract(
    issuerPrivateKey,
    contractUtxos2,
    fundingUtxos2,
    fundingPrivateKey,
    schema2,
    supply
  );
  const contractTxid2 = await utils.broadcastWithRetry(contractHex2);
  const contractTx2 = await getTransaction(contractTxid2);

  const issueHex2 = await issue(
    issuerPrivateKey,
    issueInfo,
    utils.getUtxo(contractTxid2, contractTx2, 0),
    utils.getUtxo(contractTxid2, contractTx2, 1),
    fundingPrivateKey,
    true,
    symbol2,
    2
  );
  const issueTxid2 = await utils.broadcastWithRetry(issueHex2);
  const issueTx2 = await getTransaction(issueTxid2);

  const amount = issueTx.vout[0].value / 2;
  const splitDestinations2 = [];
  splitDestinations2[0] = {
    address: bobAddr,
    satoshis: bitcoinToSatoshis(amount),
  };
  splitDestinations2[1] = {
    address: bobAddr,
    satoshis: bitcoinToSatoshis(amount),
  };

  const splitHex2 = await split(
    alicePrivateKey,
    utils.getUtxo(issueTxid2, issueTx2, 0),
    splitDestinations,
    utils.getUtxo(issueTxid2, issueTx2, issueOutFundingVout),
    fundingPrivateKey
  );
  splitTxid2 = await utils.broadcastWithRetry(splitHex2);
  splitTx2 = await getTransaction(splitTxid);
  splitTxObj2 = new bsv.Transaction(splitHex);
}
