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
let issueObj;
let issueObj2;

beforeEach(async () => {
  await setup();
});

it("Merge Valid & Invalid Token", async () => {
  console.log("aliceAddress: " + aliceAddr);
  const mergeHex = await merge(
    bobPrivateKey,
    [
      {
        tx: issueObj,
        vout: 0,
      },
      {
        tx: issueObj2,
        vout: 0,
      },
    ],
    aliceAddr,
    utils.getUtxo(issueTxid, issueTx, 1),
    fundingPrivateKey
  );
  const mergeTxid = await utils.broadcastWithRetry(mergeHex); // should we add some check in sdk to stop invalid merge?
  console.log("MergeTxID = ", mergeTxid);
  await utils.isTokenBalance(aliceAddr, 10000); // if merged balance will be 20k
});

async function setup() {
  issuerPrivateKey = bsv.PrivateKey();
  fundingPrivateKey = bsv.PrivateKey();
  bobPrivateKey = bsv.PrivateKey();
  alicePrivateKey = bsv.PrivateKey();
  const wrongPrivateKey = bsv.PrivateKey(); //incorrect PK we will use for publicKeyHash/RedepmtionAddress
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
  invalidPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    wrongPrivateKey.publicKey.toBuffer()
  ).toString("hex");
  const symbol = "TAALT";
  const supply = 10000;
  const schema = utils.schema(publicKeyHash, symbol, supply);
  const schema2 = utils.schema(invalidPublicKeyHash, symbol, supply);
  const issueInfo = [
    {
      addr: bobAddr,
      satoshis: 10000,
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
  issueObj = new bsv.Transaction(issueHex);

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
    symbol,
    2
  );
  const issueTxid2 = await utils.broadcastWithRetry(issueHex2);
  const issueTx2 = await getTransaction(issueTxid2);
  console.log(issueTxid2);
  issueObj2 = new bsv.Transaction(issueHex2);
}
