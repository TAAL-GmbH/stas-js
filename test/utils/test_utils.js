const axios = require("axios");
const expect = require("chai").expect;
const axiosRetry = require("axios-retry");
const bsv = require("bsv");
require("dotenv").config();
const { bitcoinToSatoshis, finaliseSTASUnlockingScript, broadcast } =
  require("../../index").utils;

function schema(publicKeyHash, symbol, supply) {
  const schema = {
    name: "Taal Token",
    tokenId: `${publicKeyHash}`,
    protocolId: "To be decided",
    symbol: `${symbol}`,
    description: "Example token on testnet",
    image:
      "https://www.taal.com/wp-content/themes/taal_v2/img/favicon/favicon-96x96.png",
    totalSupply: supply,
    decimals: 0,
    satsPerToken: 1,
    properties: {
      legal: {
        terms:
          "© 2020 TAAL TECHNOLOGIES SEZC\nALL RIGHTS RESERVED. ANY USE OF THIS SOFTWARE IS SUBJECT TO TERMS AND CONDITIONS OF LICENSE. USE OF THIS SOFTWARE WITHOUT LICENSE CONSTITUTES INFRINGEMENT OF INTELLECTUAL PROPERTY. FOR LICENSE DETAILS OF THE SOFTWARE, PLEASE REFER TO: www.taal.com/stas-token-license-agreement",
        licenceId: "1234",
      },
      issuer: {
        organisation: "Taal Technologies SEZC",
        legalForm: "Limited Liability Public Company",
        governingLaw: "CA",
        mailingAddress: "1 Volcano Stret, Canada",
        issuerCountry: "CYM",
        jurisdiction: "",
        email: "info@taal.com",
      },
      meta: {
        schemaId: "token1",
        website: "https://taal.com",
        legal: {
          terms: "blah blah",
        },
        media: {
          type: "mp4",
        },
      },
    },
  };
  return schema;
}

async function broadcastWithRetry(hex) {
  let txid;
  try {
    txid = await broadcast(hex);
  } catch (err) {
    console.log("retrying: ", err.message);
    txid = await broadcast(hex);
  }
  return txid;
}

// tapi required for scriptsize > 10mb
async function tapiBroadcast(tx) {
  if (Buffer.isBuffer(tx)) {
    tx = tx.toString("hex");
  }
  const url = "https://api.taal.com/api/v1/broadcast";
  let response;
  try {
    response = await axios({
      method: "post",
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      url,
      headers: {
        Authorization: `Bearer testnet_e9a87f7c901067539fd032ebd7c1bb34`,
      },
      data: {
        rawTx: tx,
      },
    });
  } catch (err) {
    console.log(err);
    throw new Error("Broadcast failed: ", err);
  }
  let txid = response.data;

  if (txid[0] === '"') {
    txid = txid.slice(1);
  }

  if (txid.slice(-1) === "\n") {
    txid = txid.slice(0, -1);
  }

  if (txid.slice(-1) === '"') {
    txid = txid.slice(0, -1);
  }

  // Check this is a valid hex string
  if (!txid.match(/^[0-9a-fA-F]{64}$/)) {
    throw new Error(`Failed to broadcast: ${txid}`);
  }

  return txid;
}

function getIssueInfo(addr1, sat1, addr2, sat2) {
  return [
    {
      addr: addr1,
      satoshis: sat1,
      data: "one",
    },
    {
      addr: addr2,
      satoshis: sat2,
      data: "two",
    },
  ];
}

function getUtxo(txid, tx, vout) {
  return {
    txid: txid,
    vout: vout,
    scriptPubKey: tx.vout[vout].scriptPubKey.hex,
    satoshis: bitcoinToSatoshis(tx.vout[vout].value),
  };
}

function getMergeUtxo(mergeObj) {
  return [
    {
      tx: mergeObj,
      vout: 0,
    },
    {
      tx: mergeObj,
      vout: 1,
    },
  ];
}

function getMergeUtxoTemp(mergeObj, vout1, vout2) {
  return [
    {
      tx: mergeObj,
      vout: vout1,
    },
    {
      tx: mergeObj,
      vout: vout2,
    },
  ];
}

function getMergeSplitUtxo(splitTxObj, splitTx) {
  return [
    {
      tx: splitTxObj,
      scriptPubKey: splitTx.vout[0].scriptPubKey.hex,
      vout: 0,
    },
    {
      tx: splitTxObj,
      scriptPubKey: splitTx.vout[1].scriptPubKey.hex,
      vout: 1,
    },
  ];
}

function getMergeSplitUtxoTemp(txObj, tx, vout1, vout2) {
  return [
    {
      tx: txObj,
      scriptPubKey: tx.vout[vout1].scriptPubKey.hex,
      vout: vout1,
    },
    {
      tx: txObj,
      scriptPubKey: tx.vout[vout2].scriptPubKey.hex,
      vout: vout2,
    },
  ];
}

function getTenIssueInfo(
  add1,
  add2,
  add3,
  add4,
  add5,
  add6,
  add7,
  add8,
  add9,
  add10
) {
  return [
    {
      addr: add1,
      satoshis: 1000,
      data: "one",
    },
    {
      addr: add2,
      satoshis: 1000,
      data: "two",
    },
    {
      addr: add3,
      satoshis: 1000,
      data: "two",
    },
    {
      addr: add4,
      satoshis: 1000,
      data: "two",
    },
    {
      addr: add5,
      satoshis: 1000,
      data: "two",
    },
    {
      addr: add6,
      satoshis: 1000,
      data: "two",
    },
    {
      addr: add7,
      satoshis: 1000,
      data: "two",
    },
    {
      addr: add8,
      satoshis: 1000,
      data: "two",
    },
    {
      addr: add9,
      satoshis: 1000,
      data: "two",
    },
    {
      addr: add10,
      satoshis: 1000,
      data: "two",
    },
  ];
}

async function getVoutAmount(txid, vout) {
  const url = `https://api.whatsonchain.com/v1/bsv/test/tx/hash/${txid}`;
  const response = await axios({
    method: "get",
    url,
  });
  return response.data.vout[vout].value;
}

async function getBsvBalance(address, expectedBalance) {
  let response;
  for (let i = 0; i < 30; i++) {
    const url = `https://api.whatsonchain.com/v1/bsv/test/address/${address}/balance`;
    response = await axios({
      method: "get",
      url,
    });
    let balance;
    try {
      balance = response.data.unconfirmed;
    } catch (e) {
      console.log("Balance Not Updated, retrying");
    }
    if (balance === expectedBalance) {
      return;
    }
    try {
      balance = response.data.confirmed;
    } catch (e) {
      console.log("Balance Not Updated, retrying");
    }
    if (balance === expectedBalance) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.log(
    "Incorrect balance, actual balance is " + response.data.unconfirmed
  );
  expect(false).to.true();
}

async function getToken(txid, vout) {
  if (vout === undefined) {
    vout = 0;
  }
  const url = `https://api.whatsonchain.com/v1/bsv/test/tx/hash/${txid}`;
  const response = await axios({
    method: "get",
    url,
  });

  const temp = response.data.vout[vout].scriptPubKey.asm;
  const split = temp.split("OP_RETURN")[1];
  const tokenId = split.split(" ")[1];
  return tokenId;
}

async function getTokenResponse(tokenId, symbol) {
  if (symbol === undefined) {
    symbol = "TAALT";
  }

  axiosRetry(axios, {
    retries: 10, // number of retries
    retryDelay: (retryCount) => {
      console.log(`retry attempt: ${retryCount}`);
      return retryCount * 2000; // time interval between retries
    },
    retryCondition: (error) => {
      // if retry condition is not specified, by default idempotent requests are retried
      return error.response.status === 404;
    },
  });
  let response;
  let url;
  try {
    url = `https://api.whatsonchain.com/v1/bsv/test/token/${tokenId}/${symbol}`;
    response = await axios({
      method: "get",
      url,
    });
  } catch (e) {
    console.log("Token Not Found: " + e, " ", url);
    return "Token Not Found";
  }
  return response.data.token;
}

async function getTokenWithSymbol(txid, symbol, vout) {
  const url = `https://api.whatsonchain.com/v1/bsv/test/token/${txid}/${symbol}`;
  console.log(url);
  let response;
  try {
    response = await axios({
      method: "get",
      url,
    });
  } catch (e) {
    console.log("Token Not Found: " + e);
    return;
  }
  console.log("response", response);
  const temp = response.data.vout[vout].scriptPubKey.asm;
  const split = temp.split("OP_RETURN")[1];
  const tokenId = split.split(" ")[1];
  return tokenId;
}

async function isTokenBalance(address, expectedBalance) {
  let response;
  for (let i = 0; i < 30; i++) {
    const url = `https://api.whatsonchain.com/v1/bsv/test/address/${address}/tokens`;
    response = await axios({
      method: "get",
      url,
    });
    let balance;
    try {
      balance = response.data.tokens[0].balance;
    } catch (e) {
      console.log("Balance Not Updated, retrying");
    }
    if (balance === expectedBalance) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.log(
    "Incorrect balance, actual balance is " + response.data.tokens[0].balance
  );
  expect(false).to.true();
}

async function isTokenBalanceTwoTokens(address, expectedBalance) {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  let response;
  for (let i = 0; i < 30; i++) {
    const url = `https://api.whatsonchain.com/v1/bsv/test/address/${address}/tokens`;
    response = await axios({
      method: "get",
      url,
    });
    let balance;
    try {
      balance =
        response.data.tokens[0].balance + response.data.tokens[1].balance;
    } catch (e) {
      console.log("Balance Not Updated, retrying");
    }
    if (balance === expectedBalance) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.log(
    "Incorrect balance, actual balance is " +
      response.data.tokens[0].balance +
      response.data.tokens[1].balance
  );
  expect(false).to.true();
}

async function getAmount(txid, vout) {
  const url = `https://api.whatsonchain.com/v1/bsv/test/tx/hash/${txid}`;
  const response = await axios({
    method: "get",
    url,
  });
  console.log(response.data.vout[vout].value);
  const amount = response.data.vout[vout].value;
  return amount;
}

function addData(sizeIn1000bytes) {
  let data;
  for (let i = 0; i < sizeIn1000bytes; i++) {
    data +=
      "CallmeIshmaelSomeyearsagonevermindhowlongpreciselyhavinglittleornomoneyinmypurseandnothingparticulartointerestmeonshoreIthoughtIwouldsailaboutalittleandseethewaterypartoftheworldItisawayIhaveofdrivingoffthespleenandregulatingthecirculationWheneverIfindmyselfgrowinggrimaboutthemouthwheneveritisadampdrizzlyNovemberinmysoulwheneverIfindmyselfinvoluntarilypausingbeforecoffinwarehousesandbringinguptherearofeveryfuneralImeetandespeciallywhenevermyhyposgetsuchanupperhandofmethatitrequiresastrongmoralprincipletopreventmefromdeliberatelysteppingintothestreetandmethodicallyknockingpeopleshatsoffthenIaccountithightimetozzgettoseaassoonasIcan.Thisismysubstituteforpistolandball.WithaphilosophicalflourishCatothrowshimselfuponhisswordIquietlytaketotheshipThereisnothingsurprisinginthisIftheybutknewit,almostallmenintheirdegreesometimeorothercherishverynearlythesamefeelingstowardstheoceanwithmeCallmeIshmaelSomeyearsagonevermindhowlongpreciselyhavinglittleornomoneyinmypurseCallmeIshmaelSomeyears";
  }
  return data;
}

function byteCount(s) {
  return encodeURI(s).split(/%..|./).length - 1;
}

async function broadcastToMainNet(tx) {
  if (Buffer.isBuffer(tx)) {
    tx = tx.toString("hex");
  }
  const url = "https://api.whatsonchain.com/v1/bsv/main/tx/raw";

  const response = await axios({
    method: "post",
    url,
    data: {
      txhex: tx,
    },
  });

  let txid = response.data;

  if (txid[0] === '"') {
    txid = txid.slice(1);
  }

  if (txid.slice(-1) === "\n") {
    txid = txid.slice(0, -1);
  }

  if (txid.slice(-1) === '"') {
    txid = txid.slice(0, -1);
  }

  // Check this is a valid hex string
  if (!txid.match(/^[0-9a-fA-F]{64}$/)) {
    throw new Error(`Failed to broadcast: ${txid}`);
  }

  return txid;
}

async function broadcastMapi(tx) {
  const url = "https://mapi.taal.com/mapi/tx";
  let response;
  try {
    response = await axios({
      headers: {
        Authorization: process.env.MAPI_KEY,
        "Content-Type": "application/json",
      },
      method: "post",
      url,
      data: {
        rawTx: tx,
      },
    });
  } catch (error) {
    console.log(error);
  }
  let txid = response.data.payload;
  const split = txid.split('txid":"')[1];
  txid = split.split('"')[0];
  console.log(txid);
  return txid;
}

async function getTransactionMainNet(txid) {
  const url = `https://api.whatsonchain.com/v1/bsv/main/tx/hash/${txid}`;
  let response;
  try {
    response = await axios({
      method: "get",
      url,
    });
  } catch (error) {
    console.log(error);
  }
  return response.data;
}

async function getTokenBalanceMainNet(address, symbolIn) {
  const url = `https://api.whatsonchain.com/v1/bsv/main/address/${address}/tokens`;
  const response = await axios({
    method: "get",
    url,
  });
  const result = response.data.tokens.find(
    ({ symbol }) => symbol === `${symbolIn}`
  );
  return result.balance;
}

async function getTokenMainNet(txid) {
  const url = `https://api.whatsonchain.com/v1/bsv/main/tx/hash/${txid}`;
  const response = await axios({
    method: "get",
    url,
  });

  const temp = response.data.vout[0].scriptPubKey.asm;
  const split = temp.split("OP_RETURN")[1];
  const tokenId = split.split(" ")[1];
  return tokenId;
}

async function getTokenResponseMainNet(tokenId, symbol) {
  let response;
  try {
    const url = `https://api.whatsonchain.com/v1/bsv/main/token/${tokenId}/${symbol}`;
    response = await axios({
      method: "get",
      url,
    });
  } catch (e) {
    console.log("Token Not Found: " + e);
    return;
  }
  return response.data.token;
}

async function getUtxoMainNet(address, forContract) {
  const url = `https://api.whatsonchain.com/v1/bsv/main/address/${address}/unspent`;

  const response = await axios({
    method: "get",
    url,
  });
  const array = [];
  if (forContract) {
    for (const key in response.data) {
      if (response.data[key].value > 30000) {
        array.push(response.data[key].tx_hash);
        array.push(response.data[key].tx_pos);
        break;
      }
    }
  } else {
    for (const key in response.data) {
      // if (response.data[key].value > 10000 && array[0] !== response.data[key].tx_hash) {
      if (
        response.data[key].value > 10000 &&
        response.data[key].value < 30000
      ) {
        array.push(response.data[key].tx_hash);
        array.push(response.data[key].tx_pos);
        break;
      }
    }
  }
  console.log(array);
  return array;
}

async function setupMainNetTest(address, wait, valueOfSats) {
  const rsp = await getUnspentMainNet(address);
  const array = [];
  for (const key in rsp.data) {
    if (rsp.data[key].value === valueOfSats) {
      array.push(rsp.data[key].tx_hash);
      array.push(rsp.data[key].tx_pos);
      array.push(rsp.data[key].value);
      break;
    }
  }
  const amount3 = Math.round(array[2] / 2) - 5000; // 5000 removed to cover tx fee

  const inputTxID = array[0]; // id of tx to be used as UTXO
  const destinationAddress = address; // address we are sending sats to
  const changeAddress = address; // address that change from tx is returned to
  const satAmount = amount3; // the amount in satoshes we are sending
  const senderPrivateKey = process.env.ISSUERWIF; // private key of owner of UTXO to sign transaction

  const inputTx = await getTransactionMainNet(inputTxID);
  const inputVout = array[1]; // which output of UTXO we are consuming

  const utxo = new bsv.Transaction.UnspentOutput({
    txId: inputTxID,
    outputIndex: inputVout,
    address: inputTx.vout[inputVout].scriptPubKey.addresses[0],
    script: inputTx.vout[inputVout].scriptPubKey.hex,
    satoshis: array[2],
  });
  const transaction = new bsv.Transaction()
    .from(utxo)
    .to(destinationAddress, satAmount)
    .change(changeAddress)
    .sign(senderPrivateKey);
  console.log(transaction.toString()); // if broadcast fails goto 'https://whatsonchain.com/broadcast' and put in tx hex to check error

  const txid = await broadcastMapi(transaction.toString());
  await new Promise((resolve) => setTimeout(resolve, wait));
  const tx = await getTransactionMainNet(txid);
  console.log(bitcoinToSatoshis(tx.vout[0].value));

  const response2 = await getUnspentMainNet(address);

  const responseArray = [];
  for (const key in response2.data) {
    if (response2.data[key].value === bitcoinToSatoshis(tx.vout[0].value)) {
      responseArray.push(response2.data[key].tx_hash);
      responseArray.push(response2.data[key].tx_pos);
      break;
    }
  }

  const response3 = await getUnspentMainNet(address);
  for (const key in response3.data) {
    if (response3.data[key].value > bitcoinToSatoshis(tx.vout[1].value)) {
      responseArray.push(response3.data[key].tx_hash);
      responseArray.push(response3.data[key].tx_pos);
      break;
    }
  }
  return responseArray;
}

async function getUnspentMainNet(address) {
  const url = `https://api.whatsonchain.com/v1/bsv/main/address/${address}/unspent`;

  const response = await axios({
    method: "get",
    url,
  });
  return response;
}

function randomSymbol(length) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function calcuateFeesForContract(inputTx, utxo, fundingUtxo) {
  let outputSats = 0;
  for (let i = 0; i < inputTx.vout.length; i++) {
    outputSats += inputTx.vout[i].value;
  }
  let inputSats = 0;
  if (fundingUtxo == null) {
    inputSats = utxo[0].satoshis;
  } else {
    inputSats = utxo[0].satoshis + fundingUtxo[0].satoshis;
  }

  const fees = inputSats - bitcoinToSatoshis(outputSats);
  console.log(fees);
  return fees;
}

/*
  Fees are calucated by inputs - outputs.
  To calculate input sats we get the vouts of the tx used for the input
  then iterate over all outputs of tx used as input to retrieve sat amounts
*/
function calcuateFees(inputTx, outputTx) {
  const vinIndexArray = [];
  for (let i = 0; i < outputTx.vin.length; i++) {
    vinIndexArray.push(outputTx.vin[i].vout);
  }
  let inputSats = 0;
  for (let i = 0; i < vinIndexArray.length; i++) {
    inputSats += inputTx.vout[vinIndexArray[i]].value;
  }

  let outputSats = 0;
  for (let i = 0; i < outputTx.vout.length; i++) {
    outputSats += outputTx.vout[i].value;
  }
  const fees = bitcoinToSatoshis(inputSats) - bitcoinToSatoshis(outputSats);
  return fees;
}

function signScript(hex, tx, keyMap) {
  let signingPrivateKey;
  for (let i = 0; i < hex.signingInfo.length; i++) {
    const signingInfo = hex.signingInfo[i];
    if (!keyMap.has(signingInfo.publicKey)) {
      throw new Error("unknown public key: " + signingInfo.publicKey);
    }
    signingPrivateKey = keyMap.get(signingInfo.publicKey);

    const sig = bsv.Transaction.sighash
      .sign(
        tx,
        signingPrivateKey,
        signingInfo.sighash,
        signingInfo.inputIndex,
        signingInfo.script,
        new bsv.crypto.BN(signingInfo.satoshis)
      )
      .toTxFormat()
      .toString("hex");
    const unlockingScript = bsv.Script.fromASM(
      sig + " " + signingInfo.publicKey.toString("hex")
    );
    tx.inputs[signingInfo.inputIndex].setScript(unlockingScript);
  }
}

function signScriptWithUnlocking(unsignedReturn, tx, keyMap) {
  let signingPrivateKey;
  // now sign the tx
  for (let i = 0; i < unsignedReturn.signingInfo.length; i++) {
    const signingInfo = unsignedReturn.signingInfo[i];
    if (!keyMap.has(signingInfo.publicKey)) {
      throw new Error("unknown public key: " + signingInfo.publicKey);
    }
    signingPrivateKey = keyMap.get(signingInfo.publicKey);

    const sig = bsv.Transaction.sighash
      .sign(
        tx,
        signingPrivateKey,
        signingInfo.sighash,
        signingInfo.inputIndex,
        signingInfo.script,
        new bsv.crypto.BN(signingInfo.satoshis)
      )
      .toTxFormat()
      .toString("hex");
    if (signingInfo.type === "stas") {
      const finalScript = finaliseSTASUnlockingScript(
        tx,
        signingInfo.inputIndex,
        signingInfo.publicKey.toString("hex"),
        sig
      );
      tx.inputs[signingInfo.inputIndex].setScript(
        bsv.Script.fromASM(finalScript)
      );
    } else {
      const unlockingScript = bsv.Script.fromASM(
        sig + " " + signingInfo.publicKey.toString("hex")
      );
      tx.inputs[signingInfo.inputIndex].setScript(unlockingScript);
    }
  }
}

module.exports = {
  schema,
  getIssueInfo,
  getUtxo,
  getMergeUtxo,
  getMergeSplitUtxo,
  getVoutAmount,
  getToken,
  getTokenResponse,
  getTenIssueInfo,
  getTokenWithSymbol,
  getMergeUtxoTemp,
  getMergeSplitUtxoTemp,
  addData,
  byteCount,
  getAmount,
  broadcastToMainNet,
  getTransactionMainNet,
  getTokenBalanceMainNet,
  broadcastMapi,
  getTokenMainNet,
  getTokenResponseMainNet,
  getUtxoMainNet,
  getUnspentMainNet,
  setupMainNetTest,
  randomSymbol,
  isTokenBalance,
  calcuateFeesForContract,
  calcuateFees,
  signScript,
  signScriptWithUnlocking,
  getBsvBalance,
  isTokenBalanceTwoTokens,
  broadcastWithRetry,
  tapiBroadcast,
};
