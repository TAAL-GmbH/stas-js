// config.js
const config = {
  app: {
    // mining fee settings
    // 500 sats / 1000 bytes = 0.5 sats / byte.
    // change the sats to your fee.
    sats: 500,
    // don't change the perByte setting unless you know what you are doing
    perByte: 1000
  }
}

module.exports = config
