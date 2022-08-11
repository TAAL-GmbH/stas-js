'use strict'

const stas = {}

stas.contract = require('./lib/contract')
stas.contractWithCallback = require('./lib/contractWithCallback')
stas.unsignedContract = require('./lib/unsignedContract')

stas.issue = require('./lib/issue')
stas.issueWithCallback = require('./lib/issueWithCallback')
stas.unsignedIssue = require('./lib/unsignedIssue')

stas.transfer = require('./lib/transfer')
stas.transferWithCallback = require('./lib/transferWithCallback')
stas.unsignedTransfer = require('./lib/unsignedTransfer')

stas.split = require('./lib/split')
stas.splitWithCallback = require('./lib/splitWithCallback')
stas.unsignedSplit = require('./lib/unsignedSplit')

stas.redeemSplit = require('./lib/redeemSplit')
stas.redeemSplitWithCallback = require('./lib/redeemSplitWithCallback')
stas.unsignedRedeemSplit = require('./lib/unsignedRedeemSplit')

stas.redeem = require('./lib/redeem')
stas.redeemWithCallback = require('./lib/redeemWithCallback')
stas.unsignedRedeem = require('./lib/unsignedRedeem')

stas.merge = require('./lib/merge')
stas.mergeWithCallback = require('./lib/mergeWithCallback')
stas.unsignedMerge = require('./lib/unsignedMerge')

stas.mergeSplit = require('./lib/mergeSplit')
stas.mergeSplitWithCallback = require('./lib/mergeSplitWithCallback')
stas.unsignedMergeSplit = require('./lib/unsignedMergeSplit')

stas.swap = require('./lib/swap')

stas.utils = require('./lib/utils')

module.exports = stas
