const expect = require("chai").expect;
const utils = require("../../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const {
  contract,
  issue,
  split,
  splitWithCallback,
  unsignedSplit,
} = require("../../../index");

const { bitcoinToSatoshis, getTransaction, getFundsFromFaucet, broadcast } =
  require("../../../index").utils;

const { sighash } = require("../../../lib/stas");

let issuerPrivateKey;
let fundingPrivateKey;
let contractUtxos;
let fundingUtxos;
let publicKeyHash;
let bobPrivateKey;
let alicePrivateKey;
let bobAddr;
let aliceAddr;
let issueTxid;
let issueTx;
const wait = 10000;
const keyMap = new Map();

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

beforeEach(async () => {
  await setup(); // contract and issue
});

describe("Split Functional Test", () => {
  it("Split - Successful Split Into Two Tokens With Fee", async () => {
    const issueTxSats = issueTx.vout[0].value;
    const bobAmount1 = issueTxSats / 2;
    const bobAmount2 = issueTxSats - bobAmount1;
    const splitDestinations = [];
    splitDestinations[0] = {
      address: aliceAddr,
      satoshis: bitcoinToSatoshis(bobAmount1),
    }; // 3500 tokens
    splitDestinations[1] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(bobAmount2),
    }; // 3500 tokens

    const splitHex = await split(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    );
    const splitTxid = await utils.broadcastWithRetry(splitHex);
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.000035);
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.000035);
    await utils.isTokenBalance(aliceAddr, 3500);
    await utils.isTokenBalance(bobAddr, 6500);
  });

  it("Split - Successful Split Into Three Tokens", async () => {
    const issueTxSats = issueTx.vout[0].value;
    const bobAmount = issueTxSats / 2;
    const bobAmount2 = bobAmount / 2;
    const bobAmount3 = issueTxSats - bobAmount - bobAmount2;
    const splitDestinations = [];
    splitDestinations[0] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(bobAmount),
    };
    splitDestinations[1] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(bobAmount2),
    };
    splitDestinations[2] = {
      address: aliceAddr,
      satoshis: bitcoinToSatoshis(bobAmount3),
    };

    const splitHex = await split(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    );
    const splitTxid = await utils.broadcastWithRetry(splitHex);
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.000035);
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.0000175);
    expect(await utils.getVoutAmount(splitTxid, 2)).to.equal(0.0000175);
    await utils.isTokenBalance(aliceAddr, 1750);
    await utils.isTokenBalance(bobAddr, 8250);
  });

  it("Split - Successful Split Into Four Tokens 1", async () => {
    const issueTxSats = issueTx.vout[0].value;
    const amount = issueTxSats / 4;
    const splitDestinations = [];
    splitDestinations[0] = {
      address: aliceAddr,
      satoshis: bitcoinToSatoshis(amount),
    };
    splitDestinations[1] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(amount),
    };
    splitDestinations[2] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(amount),
    };
    splitDestinations[3] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(amount),
    };

    const splitHex = await split(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    );
    const splitTxid = await utils.broadcastWithRetry(splitHex);
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.0000175);
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.0000175);
    expect(await utils.getVoutAmount(splitTxid, 2)).to.equal(0.0000175);
    expect(await utils.getVoutAmount(splitTxid, 3)).to.equal(0.0000175);
    await utils.isTokenBalance(aliceAddr, 1750);
    await utils.isTokenBalance(bobAddr, 8250);
  });

  it("Split - Successful Split Into Four Tokens 2", async () => {
    const davePrivateKey = bsv.PrivateKey();
    const daveAddr = davePrivateKey.toAddress(process.env.NETWORK).toString();
    const emmaPrivateKey = bsv.PrivateKey();
    const emmaAddr = emmaPrivateKey.toAddress(process.env.NETWORK).toString();
    const issueTxSats = issueTx.vout[0].value;
    const amount = issueTxSats / 4;
    const splitDestinations = [];
    splitDestinations[0] = {
      address: daveAddr,
      satoshis: bitcoinToSatoshis(amount),
    };
    splitDestinations[1] = {
      address: emmaAddr,
      satoshis: bitcoinToSatoshis(amount),
    };
    splitDestinations[2] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(amount),
    };
    splitDestinations[3] = {
      address: aliceAddr,
      satoshis: bitcoinToSatoshis(amount),
    };

    const splitHex = await split(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    );
    const splitTxid = await utils.broadcastWithRetry(splitHex);
    await new Promise((resolve) => setTimeout(resolve, wait));
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.0000175);
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.0000175);
    expect(await utils.getVoutAmount(splitTxid, 2)).to.equal(0.0000175);
    expect(await utils.getVoutAmount(splitTxid, 3)).to.equal(0.0000175);
    await utils.isTokenBalance(aliceAddr, 1750);
    await utils.isTokenBalance(bobAddr, 4750);
    await utils.isTokenBalance(aliceAddr, 1750);
    await utils.isTokenBalance(bobAddr, 4750);
  });

  it("Split - No Split Completes Successfully", async () => {
    const bobAmount = issueTx.vout[0].value;
    const splitDestinations = [];
    splitDestinations[0] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(bobAmount),
    };

    const splitHex = await split(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    );
    const splitTxid = await utils.broadcastWithRetry(splitHex);
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.00007);
    await utils.isTokenBalance(bobAddr, 10000);
  });

  it("Split - Successful Split Into Two Tokens With No Fee", async () => {
    const issueTxSats = issueTx.vout[0].value;
    const bobAmount1 = issueTxSats / 2;
    const bobAmount2 = issueTxSats - bobAmount1;
    const splitDestinations = [];
    splitDestinations[0] = {
      address: aliceAddr,
      satoshis: bitcoinToSatoshis(bobAmount1),
    }; // 3500 tokens
    splitDestinations[1] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(bobAmount2),
    }; // 3500 tokens

    const splitHex = await split(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      null,
      null
    );
    const splitTxid = await utils.broadcastWithRetry(splitHex);
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.000035);
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.000035);
    await utils.isTokenBalance(aliceAddr, 3500);
    await utils.isTokenBalance(bobAddr, 6500);
  });

  it("Split - Successful Split With Callback and Fee", async () => {
    const issueTxSats = issueTx.vout[0].value;
    const bobAmount1 = issueTxSats / 2;
    const bobAmount2 = issueTxSats - bobAmount1;
    console.log(bobAmount1);
    console.log(bobAmount2);
    const splitDestinations = [];
    splitDestinations[0] = {
      address: aliceAddr,
      satoshis: bitcoinToSatoshis(bobAmount1),
    }; // 3500 tokens
    splitDestinations[1] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(bobAmount2),
    }; // 3500 tokens

    const splitHex = await splitWithCallback(
      alicePrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey.publicKey,
      aliceSignatureCallback,
      paymentSignatureCallback
    );
    const splitTxid = await utils.broadcastWithRetry(splitHex);
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.000035);
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.000035);
    await utils.isTokenBalance(aliceAddr, 3500);
    await utils.isTokenBalance(bobAddr, 6500);
  });

  it("Split - Successful Split With Callback and No Fee ", async () => {
    const issueTxSats = issueTx.vout[0].value;
    const bobAmount1 = issueTxSats / 2;
    const bobAmount2 = issueTxSats - bobAmount1;
    const splitDestinations = [];
    splitDestinations[0] = {
      address: aliceAddr,
      satoshis: bitcoinToSatoshis(bobAmount1),
    };
    splitDestinations[1] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(bobAmount2),
    };

    const splitHex = await splitWithCallback(
      alicePrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      null,
      null,
      aliceSignatureCallback,
      null
    );
    const splitTxid = await utils.broadcastWithRetry(splitHex);
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.000035);
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.000035);
    await utils.isTokenBalance(aliceAddr, 3500);
    await utils.isTokenBalance(bobAddr, 6500);
  });

  it("Split - Successful Split With Unsigned & Fee", async () => {
    const issueTxSats = issueTx.vout[0].value;
    const bobAmount1 = issueTxSats / 2;
    const bobAmount2 = issueTxSats - bobAmount1;
    const splitDestinations = [];
    splitDestinations[0] = {
      address: aliceAddr,
      satoshis: bitcoinToSatoshis(bobAmount1),
    }; // 3500 tokens
    splitDestinations[1] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(bobAmount2),
    }; // 3500 tokens

    const unsignedSplitReturn = await unsignedSplit(
      alicePrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey.publicKey
    );
    console.log(unsignedSplitReturn.hex);
    const splitTx = bsv.Transaction(unsignedSplitReturn.hex);
    utils.signScriptWithUnlocking(unsignedSplitReturn, splitTx, keyMap);
    const splitTxid = await utils.broadcastWithRetry(splitTx.serialize(true));
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.000035);
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.000035);
    await utils.isTokenBalance(aliceAddr, 3500);
    await utils.isTokenBalance(bobAddr, 6500);
  });

  it("Split - Successful Split With Unsigned & No Fee", async () => {
    const issueTxSats = issueTx.vout[0].value;
    const bobAmount1 = issueTxSats / 2;
    const bobAmount2 = issueTxSats - bobAmount1;
    const splitDestinations = [];
    splitDestinations[0] = {
      address: aliceAddr,
      satoshis: bitcoinToSatoshis(bobAmount1),
    }; // 3500 tokens
    splitDestinations[1] = {
      address: bobAddr,
      satoshis: bitcoinToSatoshis(bobAmount2),
    }; // 3500 tokens

    const unsignedSplitReturn = await unsignedSplit(
      alicePrivateKey.publicKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      null,
      null
    );
    const splitTx = bsv.Transaction(unsignedSplitReturn.hex);
    utils.signScriptWithUnlocking(unsignedSplitReturn, splitTx, keyMap);
    const splitTxid = await utils.broadcastWithRetry(splitTx.serialize(true));
    expect(await utils.getVoutAmount(splitTxid, 0)).to.equal(0.000035);
    expect(await utils.getVoutAmount(splitTxid, 1)).to.equal(0.000035);
    await utils.isTokenBalance(aliceAddr, 3500);
    await utils.isTokenBalance(bobAddr, 6500);
  });

  it("Split - Send to Issuer Address Throws Error", async () => {
    const bobAmount1 = issueTx.vout[0].value / 2;
    const bobAmount2 = issueTx.vout[0].value - bobAmount1;
    const issuerAddr = issuerPrivateKey
      .toAddress(process.env.NETWORK)
      .toString();
    const splitDestinations = [];
    splitDestinations[0] = {
      address: issuerAddr,
      satoshis: bitcoinToSatoshis(bobAmount1),
    };
    splitDestinations[1] = {
      address: issuerAddr,
      satoshis: bitcoinToSatoshis(bobAmount2),
    };
    try {
      await split(
        alicePrivateKey,
        utils.getUtxo(issueTxid, issueTx, 0),
        splitDestinations,
        utils.getUtxo(issueTxid, issueTx, 2),
        fundingPrivateKey
      );
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      console.log(e);
      expect(e.toString()).to.contain(
        "Token UTXO cannot be sent to issuer address"
      );
    }
  });

  it("Split - Incorrect Owner Private Key Throws Error", async () => {
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
    const incorrectPrivateKey = bsv.PrivateKey();

    const splitHex = await split(
      incorrectPrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      fundingPrivateKey
    );
    try {
      await broadcast(splitHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.eql("Request failed with status code 400");
    }
  });

  it("Split - Incorrect Payments Private Key Throws Error", async () => {
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
    const incorrectPrivateKey = bsv.PrivateKey();

    const splitHex = await split(
      alicePrivateKey,
      utils.getUtxo(issueTxid, issueTx, 0),
      splitDestinations,
      utils.getUtxo(issueTxid, issueTx, 2),
      incorrectPrivateKey
    );
    try {
      await broadcast(splitHex);
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.eql("Request failed with status code 400");
    }
  });
});

async function setup() {
  issuerPrivateKey = bsv.PrivateKey();
  keyMap.set(issuerPrivateKey.publicKey, issuerPrivateKey);
  fundingPrivateKey = bsv.PrivateKey();
  keyMap.set(fundingPrivateKey.publicKey, fundingPrivateKey);
  bobPrivateKey = bsv.PrivateKey();
  keyMap.set(bobPrivateKey.publicKey, bobPrivateKey);
  alicePrivateKey = bsv.PrivateKey();
  keyMap.set(alicePrivateKey.publicKey, alicePrivateKey);
  contractUtxos = await getFundsFromFaucet(
    issuerPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  fundingUtxos = await getFundsFromFaucet(
    fundingPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    issuerPrivateKey.publicKey.toBuffer()
  ).toString("hex");
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString();
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString();

  const symbol = "TAALT";
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
  const contractTxid = await utils.broadcastWithRetry(contractHex);
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
  issueTxid = await utils.broadcastWithRetry(issueHex);
  issueTx = await getTransaction(issueTxid);
}
