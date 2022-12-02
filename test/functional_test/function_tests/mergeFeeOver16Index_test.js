const expect = require("chai").expect;
const utils = require("../../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const { contract, issue, transfer, split, merge } = require("../../../index");

const { getTransaction, getFundsFromFaucet, broadcast, bitcoinToSatoshis } =
  require("../../../index").utils;

it("Attempting Merge With A Fee UTXO Index > 16 Throws Error", async () => {
  const issuerPrivateKey = bsv.PrivateKey();
  const fundingPrivateKey = bsv.PrivateKey();

  const alicePrivateKey = bsv.PrivateKey();
  const aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString();

  const bobPrivateKey = bsv.PrivateKey();
  const bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString();

  const contractUtxos = await getFundsFromFaucet(
    issuerPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  const contractUtxos2 = await getFundsFromFaucet(
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
  const supply = 8500;
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
  const contractTxid = await utils.broadcastWithRetry(contractHex);
  console.log(`Contract TX:     ${contractTxid}`);
  const contractTx = await getTransaction(contractTxid);

  const contractHex2 = await contract(
    issuerPrivateKey,
    contractUtxos2,
    fundingUtxos2,
    fundingPrivateKey,
    schema,
    supply
  );
  const contractTxid2 = await utils.broadcastWithRetry(contractHex2);
  console.log(`Contract TX2:     ${contractTxid2}`);
  const contractTx2 = await getTransaction(contractTxid2);

  const issueHex = await issue(
    issuerPrivateKey,
    issue17(aliceAddr, 500, bobAddr, 500),
    utils.getUtxo(contractTxid, contractTx, 0),
    utils.getUtxo(contractTxid, contractTx, 1),
    fundingPrivateKey,
    true,
    symbol,
    2
  );
  const issueTxid = await utils.broadcastWithRetry(issueHex);
  console.log(`Issue TX:     ${issueTxid}`);
  const issueTx = await getTransaction(issueTxid);
  console.log(issueTx);

  const tokenId = await utils.getToken(issueTxid);
  console.log(`Token ID:        ${tokenId}`);
  const response = await utils.getTokenResponse(tokenId);
  await new Promise((resolve) => setTimeout(resolve, wait));
  expect(response.symbol).to.equal(symbol);

  const transferHex = await transfer(
    bobPrivateKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    aliceAddr,
    utils.getUtxo(contractTxid2, contractTx2, 1),
    fundingPrivateKey
  );
  const transferTxid = await utils.broadcastWithRetry(transferHex);
  console.log(`Transfer TX:     ${transferTxid}`);
  const transferTx = await getTransaction(transferTxid);

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

  // Now let's merge the last split back together
  const splitTxObj = new bsv.Transaction(splitHex);
  console.log(issueTx);

  const mergeHex = await merge(
    bobPrivateKey,
    utils.getMergeUtxo(splitTxObj),
    aliceAddr,
    utils.getUtxo(issueTxid, issueTx, 17),
    fundingPrivateKey
  );
  const mergeTxid = await utils.broadcastWithRetry(mergeHex);
  console.log(`Merge TX:        ${mergeTxid}`);
});

function issue17(addr1, sat1, addr2, sat2) {
  return [
    {
      addr: addr1,
      satoshis: sat1,
    },
    {
      addr: addr2,
      satoshis: sat2,
    },
    {
      addr: addr1,
      satoshis: sat1,
    },
    {
      addr: addr2,
      satoshis: sat2,
    },
    {
      addr: addr1,
      satoshis: sat1,
    },
    {
      addr: addr2,
      satoshis: sat2,
    },
    {
      addr: addr1,
      satoshis: sat1,
    },
    {
      addr: addr2,
      satoshis: sat2,
    },
    {
      addr: addr1,
      satoshis: sat1,
    },
    {
      addr: addr2,
      satoshis: sat2,
    },
    {
      addr: addr1,
      satoshis: sat1,
    },
    {
      addr: addr2,
      satoshis: sat2,
    },
    {
      addr: addr1,
      satoshis: sat1,
    },
    {
      addr: addr2,
      satoshis: sat2,
    },
    {
      addr: addr1,
      satoshis: sat1,
    },
    {
      addr: addr2,
      satoshis: sat2,
    },
    {
      addr: addr1,
      satoshis: sat1,
    },
    // {
    //   addr: addr2,
    //   satoshis: sat2
    // }, {
    //   addr: addr1,
    //   satoshis: sat1
    // },
    // {
    //   addr: addr2,
    //   satoshis: sat2
    // }
  ];
}
