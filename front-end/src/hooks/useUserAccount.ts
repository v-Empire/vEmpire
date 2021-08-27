import { useWallet } from "@binance-chain/bsc-use-wallet";
import { useEffect, useState } from "react";
import { checkConnectedAndGetAddress, openMetamask } from "utils/farmHarvest";


declare const window: any;

const useUserAccount = () => {
  const { connect } = useWallet()
  const [account, setAccount] = useState(localStorage.getItem('account'));


  const getUserAccount = async () => {
    const _account = await checkConnectedAndGetAddress();
    if (_account && localStorage.getItem('accountStatus')) {
      setAccount(_account);
      localStorage.setItem('account', _account)
    } else {
      setAccount('');
      localStorage.setItem('account', '')
    }
  }

  const login = async () => {
    connect('injected')
  }


  useEffect(() => {
    getUserAccount();

    if (localStorage.getItem('accountStatus')) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts?.length) {
          setAccount(accounts[0]);
          localStorage.setItem('account', accounts[0])
        } else {
          setAccount('');
          localStorage.setItem('account', '')
        }
      })
    }


    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStorage.getItem('accountStatus')])


  return { account, login }
}


export default useUserAccount;
