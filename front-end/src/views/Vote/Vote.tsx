import React, { useEffect, useCallback, useState } from 'react'
import { Route, useRouteMatch } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import BigNumber from 'bignumber.js'
import { useWallet } from '@binance-chain/bsc-use-wallet'
import { provider } from 'web3-core'
import { Image, Heading } from '@pancakeswap-libs/uikit'
import { BLOCKS_PER_YEAR, CAKE_PER_BLOCK, CAKE_POOL_PID } from 'config'
import FlexLayout from 'components/layout/Flex'
import Page from 'components/layout/Page'
import { useVotes, usePriceBnbBusd, usePriceCakeBusd } from 'state/hooks'
import useRefresh from 'hooks/useRefresh'
import { fetchVoteUserDataAsync } from 'state/actions'
import { QuoteToken } from 'config/constants/types'
import useI18n from 'hooks/useI18n'
import VoteCard, { FarmWithStakedValue } from './VoteCard/VoteCard'
// import FarmTabButtons from './components/FarmTabButtons'


export interface FarmsProps {
  tokenMode?: boolean
}

const Vote: React.FC<FarmsProps> = (farmsProps) => {
  const { path } = useRouteMatch()
  const farmsLP = useVotes()
  const cakePrice = usePriceCakeBusd()
  const bnbPrice = usePriceBnbBusd()
  const { account, ethereum }: { account: string; ethereum: provider } = useWallet()
  const { tokenMode } = farmsProps;
  const dispatch = useDispatch()
  const { fastRefresh } = useRefresh()
  useEffect(() => {
    if (account) {

      dispatch(fetchVoteUserDataAsync(account))

    }
  }, [account, dispatch, fastRefresh])

  const [stakedOnly, setStakedOnly] = useState(false)

  const activeFarms = farmsLP.filter((farm) => !!farm.isTokenOnly === !!tokenMode && farm.multiplier !== '0X')
  const inactiveFarms = farmsLP.filter((farm) => !!farm.isTokenOnly === !!tokenMode && farm.multiplier === '0X')

  // const stakedOnlyFarms = activeFarms.filter(
  //   (farm) => farm.userData && new BigNumber(farm.userData.stakedBalance).isGreaterThan(0),
  // )
  const stakedOnlyFarms = activeFarms


  const farmsList = useCallback(
    (farmsDisplay, removed: boolean) => {

      const farmsToDisplayWithAPY: FarmWithStakedValue[] = farmsDisplay.map((farm) => {
        const cakeRewardPerBlock = new BigNumber(farm.vikingPerBlock || 1).times(new BigNumber(farm.poolWeight)).div(new BigNumber(10).pow(18))
        const cakeRewardPerYear = cakeRewardPerBlock.times(BLOCKS_PER_YEAR)

        let apy = cakePrice.times(cakeRewardPerYear);

        let totalValue = new BigNumber(farm.lpTotalInQuoteToken || 0);

        if (farm.quoteTokenSymbol === QuoteToken.BNB) {
          totalValue = totalValue.times(bnbPrice);
        }

        if (totalValue.comparedTo(0) > 0) {
          apy = apy.div(totalValue);
        }

        return { ...farm, apy }
      })
      return farmsToDisplayWithAPY.map((farm) => (
        <VoteCard
          key={farm.pid}
          farm={farm}
          removed={removed}
          bnbPrice={bnbPrice}
          cakePrice={cakePrice}
          ethereum={ethereum}
          account={account}
        />
      ))
    },
    [cakePrice, bnbPrice, ethereum, account],
  )

  return (
    <Page>


      <FlexLayout>
        <Route exact path={`${path}`}>
          {/* {stakedOnly ? farmsList(stakedOnlyFarms, false) : farmsList(farmsLP, false)} */}
          {farmsList(stakedOnlyFarms, false)}
        </Route>
        <Route exact path={`${path}/history`}>
          {farmsList(inactiveFarms, true)}
        </Route>
      </FlexLayout>

    </Page>
  )
}

export default Vote
