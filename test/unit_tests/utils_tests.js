const { numberToLESM } = require('../../lib/utils')

describe('utils unit tests', () => {
  it('should convert 1 correctly', () => {
    expect(numberToLESM(1)).toEqual('OP_1')
  })
  it('should convert 16 correctly', () => {
    expect(numberToLESM(16)).toEqual('OP_16')
  })
  it('should convert 17 correctly', () => {
    expect(numberToLESM(17)).toEqual('11')
  })
  it('should convert 100 correctly', () => {
    expect(numberToLESM(100)).toEqual('64')
  })

})
