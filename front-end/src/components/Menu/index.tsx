import React, { useContext } from 'react'
import { useWallet } from '@binance-chain/bsc-use-wallet'
import { allLanguages } from 'config/localisation/languageCodes'
import useUserAccount from 'hooks/useUserAccount'
import { LanguageContext } from 'contexts/Localisation/languageContext'
import useTheme from 'hooks/useTheme'
import { usePriceCakeBusd } from 'state/hooks'
import { Menu as UikitMenu } from 'components/CustomMenu';
import config from './config'

const Menu = (props) => {
  const { account } = useUserAccount()
  const { connect, reset } = useWallet()
  const { selectedLanguage, setSelectedLanguage } = useContext(LanguageContext)
  const { isDark, toggleTheme } = useTheme()
  const cakePriceUsd = usePriceCakeBusd()

  return (
    <UikitMenu
      account={account}
      login={connect}
      logout={reset}
      isDark={isDark}
      toggleTheme={toggleTheme}
      currentLang={selectedLanguage && selectedLanguage.code}
      langs={allLanguages}
      setLang={setSelectedLanguage}
      // cakePriceUsd={cakePriceUsd.toNumber()}
      links={config}
      priceLink="https://bscscan.com/token/0x896eDE222D3f7f3414e136a2791BDB08AAa25Ce0"
      {...props}
    />
  )
}

export default Menu
