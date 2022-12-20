const utils = require("../test/utils/test_utils");
const bsv = require("bsv");
const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

const {
  contract,
  issue,
  transfer,
  split,
  merge,
  mergeSplit,
  redeem,
  redeemSplit,
} = require("../index");

const { bitcoinToSatoshis } = require("../index").utils;

(async () => {
  const issuerFunderPrivateKeyWif = "";
  const issuerFundingPrivateKey = bsv.PrivateKey(issuerFunderPrivateKeyWif);
  const issuerFundingAddress = "1H986HfxABD39X4nMXP1VP8Kd45uW6mvoc";
  const alicePrivateKey = new bsv.PrivateKey();
  const aliceAddress = alicePrivateKey.toAddress("mainnet").toString();

  const contractTxArray = await getContractTx(issuerFundingAddress);
  const fundingTxArray = await getTransactions(issuerFundingAddress);
  const contractTxIn = await getTransactionMainnet(contractTxArray[0].txid);
  const fundingTxIn = await getTransactionMainnet(fundingTxArray[0].txid);
  const broadcastArray = [];

  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    issuerFundingPrivateKey.publicKey.toBuffer()
  ).toString("hex");
  const supply = 100;
  const symbol = "TAALT";
  const schema = utils.schema(publicKeyHash, symbol, supply);

  const contractUtxo = [
    {
      txid: contractTxArray[0].txid,
      vout: contractTxArray[0].vout,
      scriptPubKey: contractTxIn.vout[contractTxArray[0].vout].scriptPubKey.hex,
      satoshis: bitcoinToSatoshis(
        contractTxIn.vout[contractTxArray[0].vout].value
      ),
    },
  ];
  const fundingUtxo = [
    {
      txid: fundingTxArray[0].txid,
      vout: fundingTxArray[0].vout,
      scriptPubKey: fundingTxIn.vout[fundingTxArray[0].vout].scriptPubKey.hex,
      satoshis: fundingTxArray[0].satoshis,
    },
  ];

  const contractHex = await contract(
    issuerFundingPrivateKey,
    contractUtxo,
    fundingUtxo,
    issuerFundingPrivateKey,
    schema,
    supply
  );

  const contractTxid = await broadcastMapi(contractHex);
  console.log(`Contract TX:     ${contractTxid}`);
  const contractTx = await getTransactionMainnet(contractTxid);

  const issueHex = await issue(
    issuerFundingPrivateKey,
    [
      {
        addr: aliceAddress,
        satoshis: 100,
      },
    ],
    utils.getUtxo(contractTxid, contractTx, 0),
    utils.getUtxo(contractTxid, contractTx, 1),
    issuerFundingPrivateKey,
    true,
    symbol,
    2
  );
  const issueTxid = await broadcastMapi(issueHex);
  console.log(`Issue TX:     ${issueTxid}`);
  const issueTx = await getTransactionMainnet(issueTxid);
  const fundingTxIn1 = await getTransactionMainnet(fundingTxArray[1].txid);
  const changeAmount = bitcoinToSatoshis(issueTx.vout[0].value) - 3;
  const splitDestinations = [];
  splitDestinations[0] = {
    address: aliceAddress,
    satoshis: 1,
  };
  splitDestinations[1] = {
    address: aliceAddress,
    satoshis: 1,
  };
  splitDestinations[2] = {
    address: aliceAddress,
    satoshis: 1,
  };
  splitDestinations[3] = {
    address: aliceAddress,
    satoshis: changeAmount,
  };
  const splitHex = await split(
    alicePrivateKey,
    {
      txid: issueTxid,
      vout: 0,
      scriptPubKey: issueTx.vout[0].scriptPubKey.hex,
      satoshis: bitcoinToSatoshis(issueTx.vout[0].value),
    },
    splitDestinations,
    {
      txid: fundingTxArray[1].txid,
      vout: fundingTxArray[1].vout,
      scriptPubKey: fundingTxIn1.vout[fundingTxArray[1].vout].scriptPubKey.hex,
      satoshis: fundingTxArray[1].satoshis,
    },
    issuerFundingPrivateKey
  );
  const splitStr = `{"rawtx": "${splitHex}"}`;
  broadcastArray.push(splitStr);

  const splitTx = bsv.Transaction(splitHex);
  const fundingTxIn2 = await getTransactionMainnet(fundingTxArray[2].txid);
  const changeAmountNew = splitTx.outputs[3].satoshis - 3;
  const splitDestinationsNew = [];
  splitDestinationsNew[0] = {
    address: aliceAddress,
    satoshis: 1,
  };
  splitDestinationsNew[1] = {
    address: aliceAddress,
    satoshis: 1,
  };
  splitDestinationsNew[2] = {
    address: aliceAddress,
    satoshis: 1,
  };
  splitDestinationsNew[3] = {
    address: aliceAddress,
    satoshis: changeAmountNew,
  };
  const splitHex2 = await split(
    alicePrivateKey,
    {
      txid: splitTx.id,
      vout: 3,
      scriptPubKey: splitTx.outputs[3]._scriptBuffer.toString("hex"),
      satoshis: splitTx.outputs[3].satoshis,
    },
    splitDestinationsNew,
    {
      txid: fundingTxArray[2].txid,
      vout: fundingTxArray[2].vout,
      scriptPubKey: fundingTxIn2.vout[fundingTxArray[2].vout].scriptPubKey.hex,
      satoshis: fundingTxArray[2].satoshis,
    },
    issuerFundingPrivateKey
  );
  const splitStrLoop = `{"rawtx": "${splitHex2}"}`;
  broadcastArray.push(splitStrLoop);
  let splitTxLoop;
  splitTxLoop = bsv.Transaction(splitHex2);

  for (i = 3; i < 30; i++) {
    const fundingTxIn = await getTransactionMainnet(fundingTxArray[i].txid);
    console.log(fundingTxIn);
    const changeAmount = splitTxLoop.outputs[3].satoshis - 3;
    const splitDestinations = [];
    splitDestinations[0] = {
      address: aliceAddress,
      satoshis: 1,
    };
    splitDestinations[1] = {
      address: aliceAddress,
      satoshis: 1,
    };
    splitDestinations[2] = {
      address: aliceAddress,
      satoshis: 1,
    };
    splitDestinations[3] = {
      address: aliceAddress,
      satoshis: changeAmount,
    };
    console.log(splitTxLoop.id + " " + i);
    const splitHexLoop = await split(
      alicePrivateKey,
      {
        txid: splitTxLoop.id,
        vout: 3,
        scriptPubKey: splitTxLoop.outputs[3]._scriptBuffer.toString("hex"),
        satoshis: splitTxLoop.outputs[3].satoshis,
      },
      splitDestinations,
      {
        txid: fundingTxArray[i].txid,
        vout: fundingTxArray[i].vout,
        scriptPubKey: fundingTxIn.vout[fundingTxArray[i].vout].scriptPubKey.hex,
        satoshis: fundingTxArray[i].satoshis,
      },
      issuerFundingPrivateKey
    );
    const splitStrLoop = `{"rawtx": "${splitHexLoop}"}`;
    broadcastArray.push(splitStrLoop);
    splitTxLoop = bsv.Transaction(splitHexLoop);
    console.log("got here loop ", i);
  }
  writeFile(broadcastArray);
})();

async function getTransactions(address) {
  const url = `https://api.whatsonchain.com/v1/bsv/main/address/${address}/unspent`;

  let response;
  try {
    response = await axios({
      method: "get",
      url,
    });
  } catch (error) {
    console.log(error);
  }
  const txArray = [];
  response.data.forEach((data) => {
    if (data.value > 500 && data.value < 10000) {
      const obj = {
        txid: data.tx_hash,
        vout: data.tx_pos,
        satoshis: data.value,
      };
      txArray.push(obj);
    }
  });
  return txArray;
}

async function getContractTx(address) {
  const url = `https://api.whatsonchain.com/v1/bsv/main/address/${address}/unspent`;

  let response;
  try {
    response = await axios({
      method: "get",
      url,
    });
  } catch (error) {
    console.log(error);
  }
  const txArray = [];
  response.data.forEach((data) => {
    if (data.value > 100000) {
      const obj = {
        txid: data.tx_hash,
        vout: data.tx_pos,
      };
      txArray.push(obj);
    }
    return;
  });
  return txArray;
}

async function getTransactionMainnet(txid) {
  await new Promise((resolve) => setTimeout(resolve, 7000));
  const url = `https://api.whatsonchain.com/v1/bsv/main/tx/hash/${txid}`;
  let response;
  try {
    response = await axios({
      method: "get",
      url,
    });
  } catch (err) {
    console.log(err);
  }

  return response.data;
}

async function broadcastMapi(tx) {
  if (Buffer.isBuffer(tx)) {
    tx = tx.toString("hex");
  }
  const url = "https://api.taal.com/mapi/tx";

  const response = await axios({
    method: "post",
    headers: { Authorization: `mainnet_4aef81fcd8f87a12d8f36f2cf5528844` },
    url,
    data: {
      rawTx: tx,
    },
  });
  const json = JSON.parse(response.data.payload);
  return json.txid;
}

function writeFile(data) {
  try {
    fs.writeFileSync("hex.txt", data.toString());
    // file written successfully
  } catch (err) {
    console.error(err);
  }
}
