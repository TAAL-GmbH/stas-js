const bsv = require("bsv");
require("dotenv").config();
const { Varint } = bsv.encoding;
const preimageFn = require("./preimage");
const {
  updateStasScript,
  sighash,
  P2PKH_UNLOCKING_SCRIPT_BYTES,
  getPublicKeyHash,
  removeScriptData,
  getScriptData,
} = require("./stas");
const {
  numberToLESM,
  replaceAll,
  addressToPubkeyhash,
  reverseEndian,
  isMergeScriptSplittable,
} = require("./utils");

const feeSettings = require("./constants");

// merge will take 2 existing STAS UTXOs and combine them and assign the single UTXO to another address.
// The tokenOwnerPrivateKey must own the existing STAS UTXOs, the payment UTXOs and will be the owner of the change, if any.
async function mergeWithCallback(
  tokenOwnerPublicKey,
  mergeUtxos,
  destinationAddr,
  paymentUtxo,
  paymentPublicKey,
  ownerSignatureCallback,
  paymentSignatureCallback
) {
  let isUnsigned = false;
  const signInfoList = []; // for unsigned tx

  const isZeroFee = paymentUtxo === null;

  if (tokenOwnerPublicKey === null) {
    throw new Error("Token owner public key is null");
  }
  if (destinationAddr === null) {
    throw new Error("Destination address is null");
  }
  if (
    mergeUtxos === null ||
    !Array.isArray(mergeUtxos) ||
    mergeUtxos.length === 0
  ) {
    throw new Error("MergeUtxos is invalid");
  }
  if (mergeUtxos.length !== 2) {
    throw new Error("This function can only merge exactly 2 STAS tokens");
  }
  if (!isMergeScriptSplittable(mergeUtxos)) {
    throw new Error("Cannot Split an NFT");
  }
  const utxo1ScriptData = getScriptData(
    mergeUtxos[0].tx.outputs[mergeUtxos[0].vout].script.toHex()
  );
  const utxo2ScriptData = getScriptData(
    mergeUtxos[1].tx.outputs[mergeUtxos[1].vout].script.toHex()
  );
  if (utxo1ScriptData != undefined && utxo1ScriptData !== utxo2ScriptData) {
    throw new Error(
      "This function only merges utxos with identical data properties"
    );
  }
  if (
    mergeUtxos[0].tx.outputs[mergeUtxos[0].vout].script.toHex() !==
    mergeUtxos[1].tx.outputs[mergeUtxos[1].vout].script.toHex()
  ) {
    throw new Error(
      "This function only merges STAS tokens with the same owner"
    );
  }
  if (paymentUtxo !== null && paymentPublicKey === null) {
    throw new Error("Payment UTXO provided but payment key is null");
  }
  if (ownerSignatureCallback === null || ownerSignatureCallback === undefined) {
    isUnsigned = true;
  }

  // Get the locking script (they are the same in each outpoint)...
  const lockingScript =
    mergeUtxos[0].tx.outputs[mergeUtxos[0].vout].script.toHex();
  const scriptToCut = lockingScript.slice(46);

  let stasAmount = 0;

  mergeUtxos.forEach((mutxo) => {
    const s = replaceAll(mutxo.tx.serialize(true), scriptToCut, " ");
    const parts = s.split(" ");
    mutxo.piece = parts.reverse().join(" ");
    mutxo.numberOfPieces = parts.length;
    stasAmount += mutxo.tx.outputs[mutxo.vout].satoshis;
  });
  const destinationPubkeyHash = addressToPubkeyhash(destinationAddr);
  const stasScript = updateStasScript(destinationPubkeyHash, lockingScript);

  const issuerPublicKeyHash = getPublicKeyHash(stasScript);
  const destinationPublicKeyHash = addressToPubkeyhash(destinationAddr);

  if (issuerPublicKeyHash === destinationPublicKeyHash) {
    throw new Error("Token UTXO cannot be sent to issuer address");
  }

  const tx = new bsv.Transaction();

  const stasUtxos = mergeUtxos.map((mutxo) => {
    return {
      txid: mutxo.tx.id,
      vout: mutxo.vout,
      scriptPubKey: mutxo.tx.outputs[mutxo.vout].script.toHex(),
      satoshis: mutxo.tx.outputs[mutxo.vout].satoshis,
    };
  });

  tx.from(stasUtxos);

  if (!isZeroFee) {
    tx.from(paymentUtxo);
  }
  tx.addOutput(
    new bsv.Transaction.Output({
      script: stasScript,
      satoshis: Math.floor(stasAmount),
    })
  );

  const extraBytesForPieces =
    mergeUtxos[0].piece.length + 8 + mergeUtxos[1].piece.length + 8;
  if (!isZeroFee) {
    handleChangeForMerge(tx, extraBytesForPieces, paymentPublicKey);
  }
  const preimageBuf = preimageFn(
    tx,
    sighash,
    0,
    bsv.Script(lockingScript),
    new bsv.crypto.BN(mergeUtxos[0].tx.outputs[mergeUtxos[0].vout].satoshis)
  );
  const preimage = preimageBuf.buf.toString("hex");
  const preimageBufMerge = preimageFn(
    tx,
    sighash,
    1,
    bsv.Script(lockingScript),
    new bsv.crypto.BN(mergeUtxos[1].tx.outputs[mergeUtxos[1].vout].satoshis)
  );
  const preimageMerge = preimageBufMerge.buf.toString("hex");

  let reversedFundingTXID;
  let paymentPubKeyHash;
  if (!isZeroFee) {
    reversedFundingTXID = reverseEndian(paymentUtxo.txid);
    paymentPubKeyHash = bsv.crypto.Hash.sha256ripemd160(
      paymentPublicKey.toBuffer()
    ).toString("hex");
  }

  for (let i = 0; i < tx.inputs.length; i++) {
    const input = tx.inputs[i];
    if (i === 0) {
      // STAS input
      partialStasMergeScript(
        mergeUtxos,
        1,
        destinationPubkeyHash,
        stasAmount,
        preimage,
        paymentPubKeyHash,
        paymentUtxo,
        reversedFundingTXID,
        tx,
        isZeroFee
      );

      if (!isUnsigned) {
        const sigASM = await ownerSignatureCallback(
          tx,
          i,
          input.output._script,
          input.output._satoshisBN
        );
        const endSscript = sigASM + " " + tokenOwnerPublicKey.toString("hex");
        const partialScript = tx.inputs[0].script.toASM();
        tx.inputs[0].setScript(
          bsv.Script.fromASM(partialScript + " " + endSscript)
        );
      } else {
        // add to signInfo
        signInfoList.push({
          inputIndex: i,
          publicKey: tokenOwnerPublicKey,
          sighash: sighash,
          // have to pass in script and satoshis because of serialisation bug in BSV.js
          script: input.output._script.toString("hex"),
          satoshis: input.output.satoshis,
          type: "stas",
        });
      }
    } else if (i === 1) {
      partialStasMergeScript(
        mergeUtxos,
        0,
        destinationPubkeyHash,
        stasAmount,
        preimageMerge,
        paymentPubKeyHash,
        paymentUtxo,
        reversedFundingTXID,
        tx,
        isZeroFee
      );

      if (!isUnsigned) {
        const sigASM = await ownerSignatureCallback(
          tx,
          i,
          input.output._script,
          input.output._satoshisBN
        );
        const endSscript = sigASM + " " + tokenOwnerPublicKey.toString("hex");
        const partialScript = tx.inputs[1].script.toASM();
        tx.inputs[1].setScript(
          bsv.Script.fromASM(partialScript + " " + endSscript)
        );
      } else {
        // add to signInfo
        signInfoList.push({
          inputIndex: i,
          publicKey: tokenOwnerPublicKey,
          sighash: sighash,
          // have to pass in script and satoshis because of serialisation bug in BSV.js
          script: input.output._script.toString("hex"),
          satoshis: input.output.satoshis,
          type: "stas",
        });
      }
    } else if (!isZeroFee) {
      if (!isUnsigned) {
        const signature = await paymentSignatureCallback(
          tx,
          i,
          input.output._script,
          input.output._satoshisBN
        );
        const unlockingScript = bsv.Script.fromASM(
          signature + " " + paymentPublicKey.toString("hex")
        );
        input.setScript(unlockingScript);
      } else {
        // add to signInfo
        signInfoList.push({
          inputIndex: i,
          publicKey: paymentPublicKey,
          sighash: sighash,
          script: input.output._script.toString("hex"),
          satoshis: input.output.satoshis,
        });
      }
    }
  }
  if (isUnsigned) {
    return {
      hex: tx.toString(),
      json: JSON.stringify(tx),
      signingInfo: signInfoList,
    };
  }
  return tx.serialize(true);
}

function handleChangeForMerge(tx, extraDataBytes, publicKey) {
  // In this implementation, we will always add a change output...

  // Create a change output. The satoshi amount will be updated after we calculate the fees.
  // ---------------------------------------------------------------------------------------
  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    publicKey.toBuffer()
  ).toString("hex");

  const changeScript = bsv.Script.fromASM(
    `OP_DUP OP_HASH160 ${publicKeyHash} OP_EQUALVERIFY OP_CHECKSIG`
  );
  tx.addOutput(
    new bsv.Transaction.Output({
      script: changeScript,
      satoshis: 0,
    })
  );

  // Now we need to calculate the preimage of the transaction.  This will become part of the unlocking script
  // and therefore increases the size and cost of the overall TX.
  const image = preimageFn(
    tx,
    sighash,
    0,
    tx.inputs[0].output.script,
    tx.inputs[0].output.satoshisBN
  );
  const preimageLen = new Varint()
    .fromNumber(image.buf.length)
    .toBuffer().length;

  // Calculate the fee required
  // ---------------------------------------------------------------------------------------
  // The actual unlocking script for STAS will be:
  // STAS amount                                       Up to 9 bytes
  // pubkeyhash                                        21 bytes
  // OP_FALSE OP_FALSE OP_FALSE OP_FALSE (4 bytes)     4
  // Output funding index                              Up to 9 bytes
  // TXID                                              33 bytes
  // Output index                                      Up to 9 bytes
  // Pieces (Partly P2PSH)                             (passed in to function)
  // Size of the number of pieces                      1 byte
  // OP_PUSH(<len(preimage)                             preimageLen  // There are 2 preimages, 1 for input 0 and 1 for input 1
  // Preimage (len(preimage)                           len(preimage)
  // OP_PUSH_72                                           1 byte
  // <signature> DER-encoded signature (70-72 bytes) -   72 bytes
  // OP_PUSH_33                                           1 byte
  // <public key> - compressed SEC-encoded public key  - 33 bytes

  // Calculate the fees required...
  let txSizeInBytes =
    tx.toBuffer().length +
    9 +
    21 +
    4 +
    9 +
    33 +
    9 +
    extraDataBytes +
    (preimageLen + image.buf.length) * 2 +
    1 +
    72 +
    1 +
    33;
  txSizeInBytes += (tx.inputs.length - 1) * P2PKH_UNLOCKING_SCRIPT_BYTES;

  let satoshis = 0;
  tx.inputs.forEach((input, i) => {
    if (i > 1) {
      // Skip the 2 STAS inputs...
      satoshis += input.output.satoshis;
    }
  });

  const fee = Math.ceil(
    (txSizeInBytes * feeSettings.Sats) / feeSettings.PerByte
  );
  const outputSats = satoshis - fee;
  if (outputSats < 1) {
    throw new Error(
      `The Fee for transaction of ${fee} is higher than the amount of satoshis supplied ${satoshis} for funding`
    );
  }
  tx.outputs[tx.outputs.length - 1].satoshis = satoshis - fee;
}

function partialStasMergeScript(
  mergeUtxos,
  mergeUtxoIndex,
  destinationPubkeyHash,
  stasAmount,
  preimageMerge,
  paymentPubKeyHash,
  paymentUtxo,
  reversedFundingTXID,
  tx,
  isZeroFee
) {
  let outputFundingVoutScript;
  if (!isZeroFee) {
    if (paymentUtxo.vout <= 16) {
      outputFundingVoutScript = "OP_" + paymentUtxo.vout;
    } else {
      outputFundingVoutScript = numberToLESM(paymentUtxo.vout);
    }
  }

  let s;
  if (isZeroFee) {
    s =
      numberToLESM(stasAmount) +
      " " +
      destinationPubkeyHash +
      " " +
      "OP_FALSE OP_FALSE" +
      " " +
      "OP_FALSE OP_FALSE" +
      " " +
      `OP_${mergeUtxos[mergeUtxoIndex].vout}` +
      " " +
      mergeUtxos[mergeUtxoIndex].piece +
      " " +
      `OP_${mergeUtxos[mergeUtxoIndex].numberOfPieces}` +
      " " +
      preimageMerge;
  } else {
    s =
      numberToLESM(stasAmount) +
      " " +
      destinationPubkeyHash +
      " " +
      numberToLESM(tx.outputs[1].satoshis) +
      " " +
      paymentPubKeyHash +
      " " +
      outputFundingVoutScript +
      " " +
      reversedFundingTXID +
      " " +
      `OP_${mergeUtxos[mergeUtxoIndex].vout}` +
      " " +
      mergeUtxos[mergeUtxoIndex].piece +
      " " +
      `OP_${mergeUtxos[mergeUtxoIndex].numberOfPieces}` +
      " " +
      preimageMerge;
  }
  let i = 0;
  if (mergeUtxoIndex === 0) {
    i = 1;
  }
  tx.inputs[i].setScript(bsv.Script.fromASM(s));
}

module.exports = mergeWithCallback;
