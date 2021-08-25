import contracts from './contracts'
import { FarmConfig, QuoteToken } from './types'

const farms: FarmConfig[] = [
  {
    pid: 0,
    risk: 5,
    lpSymbol: 'MANA Stake',
    lpAddresses: '0x3e23cf68E78291646B9297AF451896A508DC7dE9',

    tokenSymbol: 'VIKING',
    tokenAddresses: {
      97: '',
      56: '0x896eDE222D3f7f3414e136a2791BDB08AAa25Ce0',
    },
    quoteTokenSymbol: QuoteToken.BUSD,
    quoteTokenAdresses: contracts.busd,
  },
  {
    pid: 2,
    risk: 3,
    isTokenOnly: true,
    lpSymbol: 'BSCX',
    lpAddresses: '0x3e23cf68E78291646B9297AF451896A508DC7dE9',
    tokenSymbol: 'BSCX',
    tokenAddresses: {
      97: '',
      56: '0x5ac52ee5b2a633895292ff6d8a89bb9190451587',
    },
    quoteTokenSymbol: QuoteToken.BUSD,
    quoteTokenAdresses: contracts.busd,
  },
]

export default farms
