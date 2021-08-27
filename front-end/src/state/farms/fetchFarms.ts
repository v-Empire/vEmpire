import BigNumber from 'bignumber.js'
import React from 'react'
import erc20 from 'config/abi/erc20.json'
import masterchefABI from 'config/abi/masterchef.json'
import { getDepositFees, getPoolInfo, getUserInfo, getPendingVEMP, getLpPairAmount, getTotalLiquidity } from 'utils/farmHarvest'
import multicall from 'utils/multicall'
import { getMasterChefAddress } from 'utils/addressHelpers'
import farmsConfig from 'config/constants/farms'
import { QuoteToken } from '../../config/constants/types'




const fetchFarms = async () => {

  const data = await Promise.all(
    farmsConfig.map(async (farmConfig) => {
      const deposit = await getLpPairAmount(farmConfig.lpAddresses)
      const poolMultiplier = await getPoolInfo(farmConfig.pid)
      const earnAmount = await getPendingVEMP(farmConfig.pid)
      const totalLiquidity = await getTotalLiquidity(farmConfig.lpAddresses)
      const userStakedAmount = await getUserInfo(farmConfig.pid)

      // const allocPoint = new BigNumber(info.allocPoint._hex)
      // const poolWeight = allocPoint.div(new BigNumber(totalAllocPoint))

      return {
        ...farmConfig,
        multiplier: poolMultiplier,
        depositFeeBP: deposit,
        earnAmountFarm: earnAmount,
        stakedAmount: userStakedAmount,
        totalLiquidityAmount: totalLiquidity
        // vikingPerBlock: new BigNumber(vikingPerBlock).toNumber(),
      }
    }),
  )
  return data
}

export default fetchFarms
