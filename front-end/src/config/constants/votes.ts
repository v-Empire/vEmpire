import contracts from './contracts'
import { VoteConfig, QuoteToken } from './types'

const votes: VoteConfig[] = [
  {
    pid: 0,
    risk: 5,
    lpSymbol: 'Stake into DDAO',
    lpAddresses: '0x3d8DAa0C319623Df0f80aaA832ecf539096E9dd0',

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
    lpAddresses: '0x3d8DAa0C319623Df0f80aaA832ecf539096E9dd0',
    tokenSymbol: 'BSCX',
    tokenAddresses: {
      97: '',
      56: '0x5ac52ee5b2a633895292ff6d8a89bb9190451587',
    },
    quoteTokenSymbol: QuoteToken.BUSD,
    quoteTokenAdresses: contracts.busd,
  },
]

export default votes
