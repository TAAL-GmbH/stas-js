require('dotenv').config()
const feeSettings = {
  Sats: process.env.SATS,
  PerByte: process.env.PERBYTE
}

module.exports = feeSettings
