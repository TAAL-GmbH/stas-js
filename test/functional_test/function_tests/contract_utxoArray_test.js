const utils = require("../../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const { contract } = require("../../../index");

const { getFundsFromFaucet, broadcast, bitcoinToSatoshis } =
  require("../../../index").utils;

//todo - share setup
describe("Contract Multiple UTXO tests", () => {
  it.only("Multiple Contract UTXOs", async () => {
    const issuerPrivateKey = bsv.PrivateKey();
    const fundingPrivateKey = bsv.PrivateKey();
    const contractUtxo = await getFundsFromFaucet(
      issuerPrivateKey.toAddress(process.env.NETWORK).toString()
    );
    const contractUtxo2 = await getFundsFromFaucet(
      issuerPrivateKey.toAddress(process.env.NETWORK).toString()
    );
    const contractUtxo3 = await getFundsFromFaucet(
      issuerPrivateKey.toAddress(process.env.NETWORK).toString()
    );
    const contractUtxojson1 = {
      txid: contractUtxo2[0].txid,
      vout: contractUtxo2[0].vout,
      scriptPubKey: contractUtxo2[0].scriptPubKey,
      satoshis: contractUtxo2[0].satoshis,
    };
    const contractUtxojson2 = {
      txid: contractUtxo3[0].txid,
      vout: contractUtxo3[0].vout,
      scriptPubKey: contractUtxo3[0].scriptPubKey,
      satoshis: contractUtxo3[0].satoshis,
    };
    contractUtxo.push(contractUtxojson1, contractUtxojson2);
    const fundingUtxo = await getFundsFromFaucet(
      fundingPrivateKey.toAddress(process.env.NETWORK).toString()
    );
    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(
      issuerPrivateKey.publicKey.toBuffer()
    ).toString("hex");
    const supply = 2000000;
    const symbol = "TAALT";
    const schema = utils.schema(publicKeyHash, symbol, supply);
    const contractHex = await contract(
      issuerPrivateKey,
      contractUtxo,
      fundingUtxo,
      fundingPrivateKey,
      schema,
      supply
    );
    const contractTxid = await utils.broadcastWithRetry(contractHex);
    console.log(`Contract TX:     ${contractTxid}`);
    const amountIndex0 = await utils.getVoutAmount(contractTxid, 0);
    const amountIndex1 = await utils.getVoutAmount(contractTxid, 1);
    console.log(bitcoinToSatoshis(amountIndex0));
    console.log(bitcoinToSatoshis(amountIndex1));
    expect(bitcoinToSatoshis(amountIndex0)).toEqual(supply);
    expect(bitcoinToSatoshis(amountIndex1)).toBeGreaterThan(1900000);
  });

  it("Multiple Funding UTXOs", async () => {
    const issuerPrivateKey = bsv.PrivateKey();
    const fundingPrivateKey = bsv.PrivateKey();
    const contractUtxo = await getFundsFromFaucet(
      issuerPrivateKey.toAddress(process.env.NETWORK).toString()
    );
    const fundingUtxo = await getFundsFromFaucet(
      fundingPrivateKey.toAddress(process.env.NETWORK).toString()
    );
    const fundingUtxo2 = await getFundsFromFaucet(
      fundingPrivateKey.toAddress(process.env.NETWORK).toString()
    );
    const fundingUtxo3 = await getFundsFromFaucet(
      fundingPrivateKey.toAddress(process.env.NETWORK).toString()
    );
    const fundingUtxoJson1 = {
      txid: fundingUtxo2[0].txid,
      vout: fundingUtxo2[0].vout,
      scriptPubKey: fundingUtxo2[0].scriptPubKey,
      satoshis: fundingUtxo2[0].satoshis,
    };
    const fundingUtxoJson2 = {
      txid: fundingUtxo3[0].txid,
      vout: fundingUtxo3[0].vout,
      scriptPubKey: fundingUtxo3[0].scriptPubKey,
      satoshis: fundingUtxo3[0].satoshis,
    };
    fundingUtxo.push(fundingUtxoJson1, fundingUtxoJson2);
    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(
      issuerPrivateKey.publicKey.toBuffer()
    ).toString("hex");
    const supply = 10000;
    const symbol = "TAALT";
    const schema = utils.schema(publicKeyHash, symbol, supply);

    const contractHex = await contract(
      issuerPrivateKey,
      contractUtxo,
      fundingUtxo,
      fundingPrivateKey,
      schema,
      supply
    );
    const contractTxid = await utils.broadcastWithRetry(contractHex);
    console.log(`Contract TX:     ${contractTxid}`);
    const amountIndex0 = await utils.getVoutAmount(contractTxid, 0);
    const amountIndex1 = await utils.getVoutAmount(contractTxid, 1);
    console.log(bitcoinToSatoshis(amountIndex0));
    console.log(bitcoinToSatoshis(amountIndex1));
    expect(bitcoinToSatoshis(amountIndex0)).toEqual(supply);
    expect(bitcoinToSatoshis(amountIndex1)).toBeGreaterThan(3980000);
  });
});
