import BigNumber from 'bignumber.js'
import React, { useCallback, useMemo, useState } from 'react'
import { Button, Modal } from '@pancakeswap-libs/uikit'
import ModalActions from 'components/ModalActions'
import TokenInput from 'components/TokenInput'
import useI18n from 'hooks/useI18n'
import { getFullDisplayBalance } from 'utils/formatBalance'
import { getLpPairAmount, stake } from 'utils/farmHarvest'

interface DepositModalProps {
  max: BigNumber
  onConfirm: (amount: string) => void
  onDismiss?: () => void
  tokenName?: string
  depositFeeBP?: number
  farm?: any
}

const DepositModal: React.FC<DepositModalProps> = ({ farm, max, onConfirm, onDismiss, tokenName, depositFeeBP = 0 }) => {
  const [val, setVal] = useState('')
  const [userAccountBalance, setUserAccountBalance] = useState<number>(0);
  const [pendingTx, setPendingTx] = useState(false)
  const TranslateString = useI18n()

  React.useEffect(() => {
    const getUserBalance = async () => {
      const userBalance: any = await getLpPairAmount(farm.lpAddresses)
      setUserAccountBalance(userBalance)
    }
    getUserBalance()


  }, [farm.lpAddresses])

  const fullBalance = useMemo(() => {
    return getFullDisplayBalance(max)
  }, [max])
  const handleChange = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      setVal(e.currentTarget.value)
    },
    [setVal],
  )

  const handleSelectMax = useCallback(() => {
    setVal(userAccountBalance.toString())
  }, [userAccountBalance])

  return (
    <Modal title={`${TranslateString(316, 'Deposit')} ${tokenName} Tokens`} onDismiss={onDismiss}>
      <TokenInput
        userAccountBalance={userAccountBalance}
        value={val}
        onSelectMax={handleSelectMax}
        onChange={handleChange}
        max={fullBalance}
        symbol={tokenName}
        depositFeeBP={depositFeeBP}
      />
      <ModalActions>
        <Button variant="secondary" onClick={onDismiss}>
          {TranslateString(462, 'Cancel')}
        </Button>
        <Button
          disabled={pendingTx}
          onClick={async () => {
            setPendingTx(true)
            await stake(farm.pid, val)
            setPendingTx(false)
            onDismiss()
          }}
        >
          {pendingTx ? TranslateString(488, 'Pending Confirmation') : TranslateString(464, 'Confirm')}
        </Button>
      </ModalActions>
    </Modal>
  )
}

export default DepositModal
