# STAS token library in Javascript

This library will create various types of STAS token transactions that add token functionality to the BSV blockchain.

To use the STAS protocol to issue tokens for commercial purposes, please contact sales@taal.com

## The 8 STAS building functions are:

1. Contract: This will create an OP_RETURN UTXO which contains a JSON schema that provides details about a particular token.
2. Issue: This will spend the contract transaction and create a new STAS UTXO.
3. Transfer: This spends a STAS UTXO and allocates it to a new destination STAS UTXO.
4. Split: This spends a STAS UTXO and allocates it to 2 different STAS UTXOs.
5. Merge: This merges 2 STAS inputs. Only available in Version 2. Can only merge if the in transactions have less than 3 outputs. (including the change)
6. Swap: Swap token for token, P2PKH for token or token for P2PKH
7. RedeemSplit: This spends a STAS UTXO and allocates some of the tokens to a standard P2PKH UTXO and the remainder to a destination STAS UTXO. The P2PKH destination must be the redemption public key hash.
8. Redeem: This spends a STAS UTXO and creates a standard P2PKH of the full amount. The P2PKH destination must be the redemption public key hash.

## Fees

The mining fee is set in the config.js file. The default is currently 500 sats per 1000 bytes which is 0.5 sats per byte. Change the sats to whatever you expect to pay.

## Example Code

We include examples that run on testnet. They contain no real error handling and are not meant to be used in production.

## Env Vars

To use the examples the following environment variables must be set inside the .env file

Network that tests run on - This is only used for creating addresses from keys 
NETWORK=testnet

mining fee settings - 500 sats / 1000 bytes = 0.5 sats / byte.
SATS=250
PERBYTE=1000

## Testing

There is a file called `lifecycle.test.js` that exercises a full lifecycle of a STAS token. This file has limited testing.

```sh
npm install
node examples/lifecycleV2.example.js
```

which will produce a series of transactions:

```
contract -> issue -> transfer -> split -> redeem split -> redeem.
```

There are various tests located in test folder.  
Files ending \_tests contain multiple general tests per function (eg contract_tests.js contains contract tests)
Files with specific names contain tests targeting a specific test case (eg mergeInvalidStasToken.js)

```sh
npm test // runs everything, this will take quite a while and is not recommended for local use
npm run test:smoke:ci // run functional smoke suite, please run before every commit
npm run test:unit:ci // run unit tests, please run before every commit
npm run test  -- datasize1  // run specific file
```

All transactions are submitted to testnet. All tokens created can be viewed at https://test.whatsonchain.com/tokens

## Using in a browser

This library can be used within the browser, but only when configured correctly. `stas-js` is dependent on `bsv.js` which in turn is dependent on `BN.js`. BN.js assumes that Buffer exists globally as it does in NodeJS, however, this is not the case in the browser.

However, `bsv.js` is available as a standard JS library and it includes a copy of `safe-buffer`, which comes to the rescue. By adding this to our index.html, the Buffer polyfill is loaded for us.

## Quick start with React

```sh
npx create-react-app myapp

cd myapp
npm install bsv@1 # very important to choose v1 of this library
npm install --from-git https://github.com/TAAL-GmbH/stas-js.git

cd public
```

Copy the file `../node_modules/bsv/bsv.min.js` into the public folder add

```javascript
<script src="%PUBLIC_URL%/bsv.min.js"></script>
```

to the end of the <head> section in index.html.

```sh
cd ..

yarn start
```

Then you can replace the `src/App.js` with the following code:

```javascript
import bsv from "bsv";
import React, { useState } from "react";

import "./App.css";

import { contract, utils } from "stas-js";

const { getFundsFromFaucet, broadcast } = utils;

function App() {
  const privateKey = bsv.PrivateKey(); // This will be a random privateKey each time the app is reloaded.
  const fundingPrivateKey = bsv.PrivateKey(); // This will be a random privateKey each time the app is reloaded.
  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    privateKey.publicKey.toBuffer()
  ).toString("hex");

  const [schema, setSchema] = useState(
    JSON.stringify(
      {
        schemaId: "Schema STAS Coupon",
        tokenName: "TAALT",
        tokenId: publicKeyHash,
        tokenDescription: "Example token on testnet",
        issuerName: "Taal Technologies SEZC",
        issuerCountry: "CYM",
        issuerLegalForm: "Limited Liability Public Company",
        issuerEmail: "info@taal.com",
        issuerWebsite: "https://taal.com",
        terms:
          "© 2020 TAAL TECHNOLOGIES SEZC\nALL RIGHTS RESERVED. ANY USE OF THIS SOFTWARE IS SUBJECT TO TERMS AND CONDITIONS OF LICENSE. USE OF THIS SOFTWARE WITHOUT LICENSE CONSTITUTES INFRINGEMENT OF INTELLECTUAL PROPERTY. FOR LICENSE DETAILS OF THE SOFTWARE, PLEASE REFER TO: www.taal.com/stas-token-license-agreement",
        governingLaw: "Cayman Islands Law",
        icon: "https://www.taal.com/wp-content/themes/taal_v2/img/favicon/favicon-96x96.png",
        tickerSymbol: "TAALT",
      },
      null,
      2
    )
  );

  function handleChange(event) {
    setSchema(event.target.value);
  }

  async function send() {
    try {
      const contractUtxos = await getFundsFromFaucet(
        privateKey.toAddress("testnet").toString()
      );
      const fundingUtxos = await getFundsFromFaucet(
        fundingPrivateKey.toAddress("testnet").toString()
      );

      const contractHex = contract(
        privateKey,
        contractUtxos,
        fundingUtxos,
        fundingPrivateKey,
        JSON.parse(schema),
        10000
      );

      const contractTxid = await broadcast(contractHex);

      window.alert(`Your contract transaction id is ${contractTxid}`);
    } catch (err) {
      window.alert(`An error occurred: ${err}`);
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <label htmlFor="utxo">Schema:</label>
        <textarea
          id="utxo"
          style={{ minHeight: 300, minWidth: 600 }}
          value={schema}
          onChange={handleChange}
        />

        <button onClick={send}>Send</button>
      </header>
    </div>
  );
}

export default App;
```
