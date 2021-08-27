import React, { useState } from 'react'
import BigNumber from 'bignumber.js'
import { Button, Flex, Heading } from '@pancakeswap-libs/uikit'
import useI18n from 'hooks/useI18n'
import { useHarvest } from 'hooks/useHarvest'
import { stake } from 'utils/VoteHarvest'
import { getBalanceNumber } from 'utils/formatBalance'
import styled from 'styled-components'
import useStake from '../../../hooks/useStake'

interface FarmCardActionsProps {
  earnings?: number
  pid?: number
}

const BalanceAndCompound = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: column;
`

const HarvestAction: React.FC<FarmCardActionsProps> = ({ earnings, pid }) => {
  const TranslateString = useI18n()
  const [pendingTx, setPendingTx] = useState(false)


  return (
    <Flex mb='8px' justifyContent='space-between' alignItems='center'>
      <Heading color={earnings === 0 ? 'textDisabled' : 'text'}>{earnings ? (earnings.toFixed(3)) : earnings}</Heading>
      <BalanceAndCompound>

        <Button
          disabled={earnings === 0 || pendingTx}
          onClick={async () => {
            setPendingTx(true)
            await stake(pid, 0)
            setPendingTx(false)
          }}
        >
          {TranslateString(999, 'Loot')}
        </Button>
      </BalanceAndCompound>
    </Flex>
  )
}

export default HarvestAction
