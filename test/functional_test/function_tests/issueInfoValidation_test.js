const expect = require("chai").expect;
const utils = require("../../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const { contract, issue } = require("../../../index");

const { getTransaction, getFundsFromFaucet, broadcast } =
  require("../../../index").utils;

let issuerPrivateKey;
let fundingPrivateKey;
let bobPrivateKey;
let alicePrivateKey;
let contractUtxos;
let fundingUtxos;
let publicKeyHash;
let contractTx;
let contractTxid;
let aliceAddr;

let symbol;

beforeAll(async () => {
  await setup(); // set up contract
});
describe("IssueInfo Validation Tests", () => {
  it("Issue Info with no address", async () => {
    const issueInfo = [
      {
        satoshis: 10000,
        data: "one",
      },
    ];

    try {
      await issue(
        issuerPrivateKey,
        issueInfo,
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        symbol
      );
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.eql(
        "issueInfo requires values for 'addr' and 'satoshis'"
      );
    }
  });
  it("Issue Info with no sats", async () => {
    const issueInfo = [
      {
        addr: aliceAddr,
        data: "one",
      },
    ];

    try {
      await issue(
        issuerPrivateKey,
        issueInfo,
        utils.getUtxo(contractTxid, contractTx, 0),
        utils.getUtxo(contractTxid, contractTx, 1),
        fundingPrivateKey,
        true,
        symbol
      );
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.eql(
        "issueInfo requires values for 'addr' and 'satoshis'"
      );
    }
  });
});

async function setup() {
  issuerPrivateKey = bsv.PrivateKey();
  fundingPrivateKey = bsv.PrivateKey();
  bobPrivateKey = bsv.PrivateKey();
  alicePrivateKey = bsv.PrivateKey();
  contractUtxos = await getFundsFromFaucet(
    issuerPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  fundingUtxos = await getFundsFromFaucet(
    fundingPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    issuerPrivateKey.publicKey.toBuffer()
  ).toString("hex");
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString();
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString();
  fundingAddress = fundingPrivateKey.toAddress(process.env.NETWORK).toString();
  symbol = "TAALT";
  const supply = 10000;
  const schema = utils.schema(publicKeyHash, symbol, supply);

  const contractHex = await contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  );
  contractTxid = await broadcast(contractHex);
  contractTx = await getTransaction(contractTxid);
}
