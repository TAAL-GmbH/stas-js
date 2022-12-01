const expect = require("chai").expect;
const utils = require("../../utils/test_utils");
const bsv = require("bsv");
require("dotenv").config();

const { contract } = require("../../../index");

const { getFundsFromFaucet } = require("../../../index").utils;

let issuerPrivateKey;
let fundingPrivateKey;
let contractUtxos;
let fundingUtxos;
let publicKeyHash;
let supply;
const symbol = "TAALT";

beforeAll(async () => {
  await setup();
});

describe("Invalid Schema Tests", () => {
  it("Issue With Invalid Schema Null TokenID", async () => {
    const invalidSchema = invalidSchemaNullTokenId();
    console.log(invalidSchema);
    try {
      await contract(
        issuerPrivateKey,
        contractUtxos,
        fundingUtxos,
        fundingPrivateKey,
        invalidSchema,
        supply
      );
      expect(false).to.eql(true);
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.eql("Token id is required");
    }
  });

  it("Issue With Invalid Schema Null Symbol", async () => {
    const invalidSchema = invalidSchemaNullSymbol();
    console.log(invalidSchema);
    try {
      await contract(
        issuerPrivateKey,
        contractUtxos,
        fundingUtxos,
        fundingPrivateKey,
        invalidSchema,
        supply
      );
      expect(false).to.eql(true);
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.eql(
        "Invalid Symbol. Must be between 1 and 128 long and contain alpahnumeric, '-', '_' chars."
      );
    }
  });

  it("Issue With Invalid Schema undefined Symbol", async () => {
    const invalidSchema = utils.schema(publicKeyHash, "", 5000);
    try {
      await contract(
        issuerPrivateKey,
        contractUtxos,
        fundingUtxos,
        fundingPrivateKey,
        invalidSchema,
        supply
      );
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.eql(
        "Invalid Symbol. Must be between 1 and 128 long and contain alpahnumeric, '-', '_' chars."
      );
    }
  });

  it("Issue With Invalid Schema Null Total Supply", async () => {
    const invalidSchema = invalidSchemaNullTotalSupply();
    try {
      await contract(
        issuerPrivateKey,
        contractUtxos,
        fundingUtxos,
        fundingPrivateKey,
        invalidSchema,
        supply
      );
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.eql("Total Supply is required");
    }
  });

  it("Issue With Invalid Schema Null SatsPerToken", async () => {
    const invalidSchema = invalidSchemaNullSatsPertoken();
    try {
      await contract(
        issuerPrivateKey,
        contractUtxos,
        fundingUtxos,
        fundingPrivateKey,
        invalidSchema,
        supply
      );
      expect(false).toBeTruthy();
      return;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.eql("Invalid satsPerToken. Must be over 0.");
    }
  });
});

async function setup() {
  issuerPrivateKey = bsv.PrivateKey();
  fundingPrivateKey = bsv.PrivateKey();
  contractUtxos = await getFundsFromFaucet(
    issuerPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  fundingUtxos = await getFundsFromFaucet(
    fundingPrivateKey.toAddress(process.env.NETWORK).toString()
  );
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    issuerPrivateKey.publicKey.toBuffer()
  ).toString("hex");
  supply = 10000;
}

function invalidSchemaNullSymbol() {
  const schema = {
    tokenId: `${publicKeyHash}`,
    description: "Example token on testnet",
    image:
      "https://www.taal.com/wp-content/themes/taal_v2/img/favicon/favicon-96x96.png",
    totalSupply: supply,
    satsPerToken: 1,
  };
  return schema;
}

function invalidSchemaNullTotalSupply() {
  const schema = {
    tokenId: `${publicKeyHash}`,
    symbol: `${symbol}`,
    description: "Example token on testnet",
    image:
      "https://www.taal.com/wp-content/themes/taal_v2/img/favicon/favicon-96x96.png",
    satsPerToken: 1,
  };
  return schema;
}

function invalidSchemaNullTokenId(publicKeyHash, symbol, supply) {
  const schema = {
    protocolId: "To be decided",
    symbol: `${symbol}`,
    description: "Example token on testnet",
    image:
      "https://www.taal.com/wp-content/themes/taal_v2/img/favicon/favicon-96x96.png",
    totalSupply: supply,
    satsPerToken: 1,
  };
  return schema;
}

function invalidSchemaNullSatsPertoken() {
  const schema = {
    tokenId: `${publicKeyHash}`,
    symbol: `${symbol}`,
    description: "Example token on testnet",
    image:
      "https://www.taal.com/wp-content/themes/taal_v2/img/favicon/favicon-96x96.png",
    totalSupply: supply,
  };
  return schema;
}
