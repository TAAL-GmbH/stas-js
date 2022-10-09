const bsv = require('bsv')
const preimage = require('./preimage')
require('dotenv').config()
const {
  Varint
} = bsv.encoding
const {
  numberToLESM,
  replaceAll,
  reverseEndian,
  MIN_SYMBOL_SIZE,
  MAX_SYMBOL_SIZE
} = require('./utils')

const feeSettings = require('./constants')

/*
EVALUATION LICENSE AGREEMENT
This evaluation license agreement (“Agreement”) is between Taal DIT GmbH (“Taal”), a Swiss corporation and the person or entity on whose behalf this Agreement is accepted (“User”).  This Agreement is effective as of the date (“Effective Date”) the User first downloads, accesses or uses the Product (as defined below) from the website on which this Agreement is acknowledged.  If the User is an entity, the individual agreeing to this Agreement represents and warrants that he or she is authorized to accept this Agreement on behalf of the entity as an authorized representative of such entity.
By accessing and/or downloading the Product, the User agrees to be bound by the terms of this Agreement.  If the User does not agree to the terms of this Agreement, the User may not use the Product.

1. DEFINITIONS
1.1. “Confidential Information” means any information, technical data or know-how, of Taal including without limitation, that which relates to Taal computer software programs, documentation, specifications, source code, object code, research, inventions, processes, designs, drawings, engineering, products, services, customers, benchmark tests, markets, prices, or finances, which should reasonably be considered Confidential Information.  Confidential Information will not include any information that: (a) has been or is obtained by the receiving party from an independent source without obligation of confidentiality, (b) is or becomes publicly available other than as a result of an unauthorized disclosure by the receiving party or its personnel, or (c) is independently developed by the receiving party without reliance in any way on the Confidential Information disclosed.
1.4. “Product” means the template software code providing a method to encode tokens onto the Bitcoin SV blockchain.
1.5. “Documentation” means any technical information, white papers, user manuals generally made available to Users of the Product.  The Documentation constitutes an integral part of this Agreement and is part of the Product.
1.6. “Evaluation Term” the period after the Effective Date prior to the date Taal publishes a revocation of the license granted by this Agreement on the website.

2. GRANT OF RIGHTS
2.1. Licenses.
(a) Evaluation License.  Subject to the terms and conditions of this Agreement, Taal hereby grants to User, during the Evaluation Term, a non-exclusive, non-transferable, revocable worldwide right and license (without a right to sublicense) to install and operate, modify, use publish and distributed on the Bitcoin SV blockchain the Product solely in a non-production, non-commercial environment limited to experimentation, evaluation and study purposes with respect to token generation and smart contracts.  Any use other than for non-commercial purposes requires a commercial license.
(b) Documentation License.  Subject to the terms and conditions of this Agreement, Taal hereby grants to User a non-exclusive, non-transferable, worldwide right and license (without a right to sublicense) to use the Documentation, solely for User’s internal use and solely for the purpose of exercising the rights granted in Section 2.1(a).  User acknowledges that no right is granted to modify, adapt, translate, publicly display, publish, create derivative works or distribute the Documentation.
2.2. Limitations.  User will not: (a) assign, sublicense, transfer, lease, rent or distribute any of its rights in the Product; (b) use the Product for the benefit of any third party including as part of any service bureau, time sharing or third party training arrangement; or (c) publish any benchmark testing results on the Product without Taal’s written consent.  The above copyright notice shall be included in all copies or substantial portions of the Product that you modify: © 2020 TAAL DIT GmbH. You must cause any modifications and / or derivative works of the Product to carry prominent notices stating that you changed the Product and clearly identify the modifications.  The mere use of the templates and completion of required fields, shall not be considered to be modification.
2.3. Third-Party Restrictions.  User will undertake all measures necessary to ensure that its use of the Product complies in all respects with any contractual or other legally binding obligations of Taal to any third party, provided that Taal has notified User with respect to any such obligations.
2.4. Ownership and Reservation of Rights.  Except for the licenses granted User in this Section 2, Taal will retain all right, title and interest in and to the Product and all copies.  Such right, title and interest will include ownership of, without limitation, all copyrights, patents, trade secrets and other intellectual property rights.  User will not claim or assert title to any portion of the Product or any copies.  In the event User modifies or authorizes the modification or translation of the Product, including any Documentation, User hereby assigns all right, title and interest in any derivative work to Taal and agrees to cooperate as reasonably requested by Taal to perfect any such rights. Any such modifications or translations shall also fall under this license.

3. OBLIGATIONS OF USER
3.1. User will be solely responsible for obtaining and installing all proper hardware and support software (including with-out limitation operating systems and network devices) and for proper installation of the Product.  Further details are specified in the Documentation.
3.2. User will be solely responsible for maintaining all software and hardware (including without limitation network systems) that are necessary for User to properly exercise the licenses granted hereunder.  This includes, in particular, the minimum requirements specified in the Documentation.
3.3. Taal will have no responsibility or liability under this Agreement for any unavailability, failure of, nonconformity, or defect in, any of the Product.
3.4. User will be solely responsible for creating and maintaining back-ups, security updates and compatible versions of all data used in connection with the Product.
3.5. User will undertake all measures necessary to ensure that its use of the Product complies in all respects with applicable laws, statutes, regulations, ordinances or other rules promulgated by governing authorities having jurisdiction over User or the Product.  User shall not use the Product unless such use is in compliance with applicable laws.

4. SUPPORT AND MAINTENANCE SERVICES
4.1. Taal will have no obligation to provide or perform any support and maintenance services for or on behalf of User.
4.2. Any support and maintenance services shall require the execution of a separate service agreement between the Parties.

5. PROFESSIONAL SERVICES
5.1. Unless otherwise agreed between the parties in writing, Taal will have no obligation to provide or perform any professional services for or on behalf of User.
5.2. Any professional services shall require the execution of a separate service agreement between the Parties.

6. NO FEES
The evaluation license will be granted free-of-charge during the Evaluation Term.

7. WARRANTY DISCLAIMER
7.1. Delivery.  The Product will be delivered to the User via download link on the Taal website.
7.2. Disclaimer.  THE PRODUCT IS DELIVERED “AS IS”. TAAL DISCLAIMS ALL WARRANTIES RELATED TO THE PRODUCT, DOCUMENTATION AND SERVICES, EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, SECURITY, NO INFRINGEMENT, QUIET ENJOYMENT, COURSE OF DEALING OR USAGE OF TRADE.

8. NONDISCLOSURE AND CONFIDENTIALITY
8.1. Nondisclosure Obligations.  All Confidential Information: (a) will not be copied or distributed, disclosed, or disseminated in any way or form by the User to anyone except its own employees, agents, or contractors, who have a reasonable need to know the Confidential Information; (b) will be treated by the User with the same degree of care as is used with respect to the receiving party’s own information of like importance, but with no less than reasonable care; (c) will not be used by the User for any other purpose except as set forth in this Agreement, without the express written permission of Taal; and (d) will remain the property of and be returned to the Taal (along with all copies thereof) within thirty (30) days of receipt by the User of a written request from Taal setting forth the Confidential Information to be returned or upon expiration or termination of this Agreement.
8.2. Compelled Legal Disclosure.  In the event the User becomes legally compelled to disclose any Confidential Information, the User will provide Taal party with prompt prior written notice of such requirement and the User will reasonably cooperate in any effort by Taal to petition the authority compelling such disclosure for an order that such disclosure not occur or that it occur pursuant to terms and conditions designed to ensure continued confidentiality or minimized disclosure.
8.3. Term.  The confidentiality provisions of this Sec. 8 will survive termination or expiration of this Agreement.

9. INDEMNIFICATION
User Indemnity.  User will indemnify, defend and hold harmless Taal, its directors, officers, employees and representatives, from and against any and all losses, damages, liability, costs and expenses awarded by a court or agreed upon in settlement, as well as all reasonable and related attorneys’ fees and court costs, arising out of any third party claim arising out of a User breach of any term of this Agreement or if the alleged claim arises, in whole or in part, from: (a) any modification, servicing or addition made to the Product or any part thereof by the User; (b) any use of the Product by User in a manner outside the scope of any right granted or in breach of this Agreement; (c) the use of such Product or any part thereof as a part or combination with any materials, devices, parts, software or processes not provided by or approved by Taal; or (d) the use of other than the then-current, unaltered release of the Product or any part thereof available from Taal.

10. AUDITS AND CERTIFICATION OF COMPLIANCE
10.1. Audits.  Taal will have the right to audit User’s records to ensure compliance with the terms of this Agreement, upon reasonable written notice.  Such audits may be conducted by Taal personnel or by an independent third party auditor appointed by Taal.  User will grant Taal and/or an independent third party auditor appointed by Taal reasonable access to its personnel, records and facilities for such purpose.  All such audits will be conducted during normal business hours.
10.2. Anonymous Usage Tracking.  Taal reserves the right to collect and store the IP addresses of devices used to access the Product as well as anonymous usage data regarding the Product (e.g., information on the product version used).

11. TERM AND TERMINATION
11.1. Term.  This Agreement becomes effective on the Effective Date and is and shall run for the Evaluation Term.
11.2. Conditions of Termination.  Following termination of this Agreement, for any reason, the license in the Product granted hereunder to User will terminate and User will discontinue the use of the Product and all Confidential Information that had been furnished to User by Taal pursuant to this Agreement.  User will immediately: (a) delete the Confidential Information from its computer storage or any other media, including, but not limited to, online and off-line libraries; (b) return to Taal, or at Taal’s option, destroy, all copies of Confidential Information then in its possession.
11.3. Survival. Paragraphs 1, 2.2, 2.4, 3 and 7 through 13 will survive termination or expiration of this Agreement.

12. PROPRIETARY RIGHTS
12.1. Copyright and Trademark Notices.  User will duplicate all proprietary notices and legends of Taal upon any and all copies of the Product, including any Documentation, made by User.
12.2. No Removal.  User will not remove, alter or obscure any such proprietary notice or legend.

13. GENERAL PROVISIONS
13.1. Notices.  All notices will be posted on the Taal website where this Agreement is posted.  It is the responsibility of the User to review notices, which shall be binding ten (10) days after posting.
13.2. Marketing.  The User agrees that Taal shall be entitled to refer to the cooperation with the User and to use the name and logo of the User for marketing purposes, e.g. on Taal’s website.
13.3. Force Majeure.  Neither party will be responsible for delay or failure in performance resulting from acts beyond the control of such party.  Such acts will include, but not be limited to: an act of God; an act of war; an act of terrorism; riot; an epidemic; fire; flood or other disaster; an act of government; a strike or lockout; a communication line failure; power failure or failure of the computer equipment.
13.4. Governing Law.  This Agreement will be governed by and construed in accordance with the laws of the Switzerland excluding its conflicts of law rules.  The U.N. Convention on the International Sale of Goods (CISG) will not apply to this Agreement in whole or in part.  The parties agree that Zug, Switzerland will be the exclusive venue for claims arising out of or in connection with this Agreement and all parties submit to the jurisdiction of the courts in Switzerland.
13.5. Assignment.  Taal may, upon written notice to User, assign this Agreement to another party.  User may not assign this Agreement.
13.6. Entire Agreement.  This Agreement contains the entire understanding of the parties with respect to the matter contained herein and supersedes all prior and contemporaneous understandings.  This Agreement may not be modified except in writing and signed by authorized representatives of Taal and User.  Digital signatures are deemed to be equivalent to original signatures for purposes of this Agreement.
*/

const marker = '0011223344556677889900112233445566778899'
// const flagMarker = '0100'

// Unfortunately, bsv.js v1.x.x does not define all BSV opcodes.  As a workaround, we define the script in hex rather than ASM
const stasV2 = '76a914[destinationPublicKeyHash]88ac6976aa607f5f7f7c5e7f7c5d7f7c5c7f7c5b7f7c5a7f7c597f7c587f7c577f7c567f7c557f7c547f7c537f7c527f7c517f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7c5f7f7c5e7f7c5d7f7c5c7f7c5b7f7c5a7f7c597f7c587f7c577f7c567f7c557f7c547f7c537f7c527f7c517f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e01007e818b21414136d08c5ed2bf3ba048afe6dcaebafeffffffffffffffffffffffffffffff007d976e7c5296a06394677768827601249301307c7e23022079be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798027e7c7e7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c8276638c687f7c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e01417e21038ff83d8cf12121491609c4939dc11c4aa35503508fe432dc5a5c1905608b9218ad547f7701207f01207f7701247f517f7801007e8102fd00a063546752687f7801007e817f727e7b01177f777b557a766471567a577a786354807e7e676d68aa880067765158a569765187645294567a5379587a7e7e78637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6878637c8c7c53797e577a7e6867567a6876aa587a7d54807e577a597a5a7a786354807e6f7e7eaa727c7e676d6e7eaa7c687b7eaa587a7d877663516752687c72879b69537a647500687c7b547f77517f7853a0916901247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f77788c6301247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f777852946301247f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e816854937f77686877517f7c52797d8b9f7c53a09b91697c76638c7c587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f777c6876638c7c587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f777c6863587f77517f7c01007e817602fc00a06302fd00a063546752687f7c01007e81687f7768587f517f7801007e817602fc00a06302fd00a063546752687f7801007e81727e7b7b687f75537f7c0376a9148801147f775379645579887567726881766968789263556753687a76026c057f7701147f8263517f7c766301007e817f7c6775006877686b537992635379528763547a6b547a6b677c6b567a6b537a7c717c71716868547a587f7c81547a557964936755795187637c686b687c547f7701207f75748c7a7669765880748c7a76567a876457790376a9147e7c7e557967041976a9147c7e0288ac687e7e5579636c766976748c7a9d58807e6c0376a9147e748c7a7e6c7e7e676c766b8263828c007c80517e846864745aa0637c748c7a76697d937b7b58807e56790376a9147e748c7a7e55797e7e6868686c567a5187637500678263828c007c80517e846868647459a0637c748c7a76697d937b7b58807e55790376a9147e748c7a7e55797e7e687459a0637c748c7a76697d937b7b58807e55790376a9147e748c7a7e55797e7e68687c537a9d547963557958807e041976a91455797e0288ac7e7e68aa87726d77776a14[redemptionPublicKeyHash]'
const script2 = stasV2.replace('[destinationPublicKeyHash]', marker).replace('[redemptionPublicKeyHash]', marker)// .replace('[flags]', flagMarker)
const stasV2Regex = new RegExp('^' + replaceAll(script2, marker, '[0-9a-fA-F]{40}') + '(0100|0101).*$')

// group 1: isSplittable flag, group 2: symbol, group 3: data
const stasV2DataRegex = /OP_RETURN [0-9a-fA-F]{40} (00|01)([\s]?[\S]*[\s]?)([a-f0-9]*)+$/

const stasUpdateHashRegex = /^(76a914)([a-z0-9]{40})*(88ac697[a-z0-9]*)/
const sighash = bsv.crypto.Signature.SIGHASH_ALL | bsv.crypto.Signature.SIGHASH_FORKID
const P2PKH_UNLOCKING_SCRIPT_BYTES = 1 + 72 + 1 + 33

function handleChange(tx, publicKey) {
  // In this implementation, we will always add a change output...

  // Create a change output. The satoshi amount will be updated after we calculate the fees.
  // ---------------------------------------------------------------------------------------
  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer()).toString('hex')

  const changeScript = bsv.Script.fromASM(`OP_DUP OP_HASH160 ${publicKeyHash} OP_EQUALVERIFY OP_CHECKSIG`)
  tx.addOutput(new bsv.Transaction.Output({
    script: changeScript,
    satoshis: 0
  }))

  // Now we need to calculate the preimage of the transaction.  This will become part of the unlocking script
  // and therefore increases the size and cost of the overall TX.
  const image = preimage(tx, sighash, 0, tx.inputs[0].output.script, tx.inputs[0].output.satoshisBN)

  const preimageLen = new Varint().fromNumber(image.buf.length).toBuffer().length

  // Calculate the fee required
  // ---------------------------------------------------------------------------------------
  // The actual unlocking script for STAS will be:
  // STAS amount + pubkeyhash (max 28 bytes)           2 or up to 30 bytes
  // OP_FALSE OP_FALSE (2 bytes)                       2 or up to 30 bytes
  // Amount of change + pubkeyhash (max 28 bytes)      2 or up to 39 bytes
  // Output funding index                              up to 9 bytes
  //  0x14 + Funding txid                              33 bytes
  // OP_PUSH(<len(preimage)                            preimageLen
  // Preimage (len(preimage)                           len(preimage)
  // OP_PUSH_72                                           1 byte
  // <signature> DER-encoded signature (70-72 bytes) -   72 bytes
  // OP_PUSH_33                                           1 byte
  // <public key> - compressed SEC-encoded public key  - 33 bytes

  // Calculate the fees required...
  // Of the 3 outputs they will always have minimum OP_FALSE OF_FALSE (2 bytes) hence 2 x 3 = 6.  If there is an output it could take up 28 more bytes...
  let txSizeInBytes = tx.toBuffer().length + 6 + (tx.outputs.length * 28) + 9 + 33 + preimageLen + image.buf.length + 1 + 72 + 1 + 33
  txSizeInBytes += ((tx.inputs.length - 1) * P2PKH_UNLOCKING_SCRIPT_BYTES)

  let satoshis = 0
  tx.inputs.forEach((input, i) => {
    if (i > 0) { // Skip the STAS input...
      satoshis += input.output.satoshis
    }
  })

  const fee = Math.ceil(txSizeInBytes * feeSettings.Sats / feeSettings.PerByte)
  const outputSats = satoshis - fee
  if (outputSats < 1) {
    throw new Error(`The Fee for transaction of ${fee} is higher than the amount of satoshis supplied ${satoshis} for funding`)
  }
  tx.outputs[tx.outputs.length - 1].satoshis = satoshis - fee
}

// partialSTASUnlockingScript takes a bitcoin transaction where the 1st input is a STAS UTXO which has been signed
// as a standard P2PKH script, and prepends the necessary scripts to complete the STAS unlocking script...
// A STAS locking script is made up of 3 satoshi/public key hash "segments" where the 2nd and 3rd can be nil.
// Nil segments are filled with a pair of OP_FALSE opcodes.
function partialSTASUnlockingScript(tx, segments, version, isZeroFee) {
  if (tx.inputs.length < 1) {
    throw new Error('There must be at least 1 input')
  }

  if (!tx.inputs[0].script) {
    throw new Error('First input must be signed')
  }

  if (segments.length > 5) {
    throw new Error('Must have less than 5 segments')
  }

  // Build the STAS unlocking script.
  // ---------------------------------------------------------------------------------------
  let script = ' '

  segments.forEach(segment => {
    if (segment) {
      if (segment.satoshis <= 16) {
        script += 'OP_' + segment.satoshis
        script += ' '
        script += Buffer.from(segment.publicKey)
        script += ' '
      } else {
        script += numberToLESM(segment.satoshis)
        script += ' '
        script += Buffer.from(segment.publicKey)
        script += ' '
      }
    }
  })

  script = script.trim()

  if (version === 2) {
    // may not exist
    if (isZeroFee) {
      // no funding input
      script += ' OP_FALSE'
      script += ' '
      script += 'OP_FALSE'
      // no change output
      script += ' OP_FALSE'
      script += ' '
      script += 'OP_FALSE'
    } else {
      const outpointFundingIndex = tx.inputs[tx.inputs.length - 1].outputIndex
      const reversedFundingTXID = reverseEndian(tx.inputs[tx.inputs.length - 1].prevTxId)

      if (outpointFundingIndex <= 16) {
        script += ' OP_' + outpointFundingIndex
      } else {
        script += ' ' + numberToLESM(outpointFundingIndex)
      }
      script += ' ' + Buffer.from(reversedFundingTXID)
    }
    // add funding index and reverse tx id
    // if
  }

  // If v2 of script, we need to add extra data
  // OP_0 = Basic
  // OP_1 = SWAP (for the future)
  // OP_2 - OP_5 = MERGE with tx "cuts" added to unlocking script
  if (version === 2) {
    script += ' OP_0'
  }

  script += ' ' + preimage(tx, sighash, 0, tx.inputs[0].output.script, tx.inputs[0].output.satoshisBN).buf.toString('hex')

  tx.inputs[0].setScript(bsv.Script.fromASM(script))
}

// getStasScript adds the destination public key hash and redemption public key hash (token id)
// to the appropriate version of STAS script
// only add hex encoded data to version one of script
function getStasScript(destinationPublicKeyHash, redemptionPublicKey, data, isSplittable, symbol) {
  const redemptionPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(redemptionPublicKey.toBuffer()).toString('hex')

  let script = stasV2.replace('[destinationPublicKeyHash]', destinationPublicKeyHash).replace('[redemptionPublicKeyHash]', redemptionPublicKeyHash)
  let asm = ''
  if (isSplittable) {
    asm += '00'
  } else {
    asm += '01'
  }
  // add the symbol
  if (symbol) {
    asm += ` ${symbol}`
  }
  if (data) {
    asm += ` ${data}`
  }
  const s = bsv.Script.fromASM(asm)
  const h = s.toHex()
  script += h
  return script
}

// updates a stas script with a new destination public key hash
function updateStasScript(destinationPublicKeyHash, stasScript) {
  if (stasScript.match(stasUpdateHashRegex) === null) {
    throw new Error('Invalid STAS script')
  }
  return stasScript.replace(stasUpdateHashRegex, `$1${destinationPublicKeyHash}$3`)
}

function getScriptData(script, version) {
  const b = bsv.Script.fromHex(script).toASM()

  const res = b.toString().match(stasV2DataRegex)
  if (res && res.length > 3) {
    return res[3]
  }
  return null
}

function getScriptFlags(script) {
  const b = bsv.Script.fromHex(script).toASM()
  const res = b.toString().match(stasV2DataRegex)
  if (res && res.length > 1) {
    return res[1]
  }
  return null
}

function getPublicKeyHash(script) {
  const b = bsv.Script.fromHex(script).toASM()
  const split = b.split('OP_RETURN')[1]
  const publicKeyHash = split.split(' ')[1]
  return publicKeyHash
}

function getSymbol(script) {
  const b = bsv.Script.fromHex(script).toASM()
  const res = b.toString().match(stasV2DataRegex)
  if (res && res.length > 2) {
    return res[2].trim()
  }
  return null
}

function isSplittable(script) {
  let isSplittable = true
  const flags = getScriptFlags(script)
  if (flags === '01') {
    isSplittable = false
  }
  return isSplittable
}

function getVersion(script) {
  if (stasV2Regex.test(script)) {
    return 2
  }

  return 0
}

function isStasScript(script) {
  if (stasV2Regex.test(script)) {
    return true
  }
  return false
}

function validateSymbol(symbol) {
  if (symbol === null) {
    return false
  }
  if (symbol.length < MIN_SYMBOL_SIZE || symbol.length > MAX_SYMBOL_SIZE) {
    return false
  }
  const reg = /^[\w-]+$/
  const a = reg.test(symbol)

  return a
}

function validateSplitDestinations(splitDestinations) {
  splitDestinations.forEach(sd => {
    if (sd.address === null || sd.address === '') {
      throw new Error('Invalid address in split destination')
    }
    try {
      bsv.Address.fromString(sd.address)
    } catch (e) {
      throw new Error('Invalid address in split destination')
    }
    if (sd.satoshis <= 0) {
      throw new Error('Invalid amount in split destination')
    }
  })
  return true
}

module.exports = {
  P2PKH_UNLOCKING_SCRIPT_BYTES,
  sighash,
  stasV2DataRegex,
  getStasScript,
  isStasScript,
  updateStasScript,
  getVersion,
  getScriptData,
  getScriptFlags,
  getPublicKeyHash,
  getSymbol,
  isSplittable,
  handleChange,
  partialSTASUnlockingScript,
  validateSymbol,
  validateSplitDestinations
}
