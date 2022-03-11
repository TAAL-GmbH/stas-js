'use strict'

const stas = {}

stas.contract = require('./lib/contract')
stas.contractWithCallback = require('./lib/contractWithCallback')
stas.issue = require('./lib/issue')
stas.issueWithCallback = require('./lib/issueWithCallback')
stas.transfer = require('./lib/transfer')
stas.transferWithCallback = require('./lib/transferWithCallback')
stas.split = require('./lib/split')
stas.splitWithCallback = require('./lib/splitWithCallback')
stas.redeemSplit = require('./lib/redeemSplit')
stas.redeemSplitWithCallback = require('./lib/redeemSplitWithCallback')
stas.redeem = require('./lib/redeem')
stas.redeemWithCallback = require('./lib/redeemWithCallback')
stas.merge = require('./lib/merge')
stas.mergeWithCallback = require('./lib/mergeWithCallback')
stas.mergeSplit = require('./lib/mergeSplit')
stas.mergeSplitWithCallback = require('./lib/mergeSplitWithCallback')
stas.swap = require('./lib/swap')

stas.utils = require('./lib/utils')

module.exports = stas
