import Web3 from "web3";
import BigNumber from "bignumber.js";
import { ethers } from 'ethers';
import cheffAbi from '../config/abi/masterchefVemp.json'
import erc20 from '../config/abi/erc20.json';
import cheffAbifarm from '../config/abi/masterchef.json'
import { getCakeAddress, getMasterChefAddressVemp, getVempAddress } from "./addressHelpers";



declare const window: any;
window.web3 = new Web3(window.ethereum);
// const cheffAddress = Address.getCheffAddress
// const tokenAddress = Address.getTokenAddress

const cheffAddress = getMasterChefAddressVemp()

const cheffvemp = getVempAddress()

export const fetchAccounts = () => {
    return new Promise((resolve, reject) => {
        const ethAccounts = getAccounts();
        resolve(ethAccounts)
    });
};

export const getChainId = async () => {
    try {
        const chainId = await window.web3?.eth?.getChainId()
        localStorage.setItem('chainId', chainId)
        return chainId;
    }
    catch (e) {
        return '';
    }
}

export const getAccounts = async () => {
    try {
        return await window.web3?.eth?.getAccounts();
    } catch (e) {
        return '';
    }
}

export const openMetamask = async () => {
    window.web3 = new Web3(window.ethereum);
    let addresses = await getAccounts();
    if (!addresses.length) {
        try {
            addresses = await window.ethereum.enable();
        } catch (e) {
            return false;
        }
    }
    return addresses.length ? addresses[0] : null;
};

// Get user Viking balance

export const getBalanceOf = async (lpAddress) => {
    try {
        const totalBalance = await window.web3.eth.getBalance(lpAddress, function (err: any, result: any) {
            if (err) {
                console.log(err)
            }
        })
        const totalUserBalance = totalBalance / 10 ** 18
        return totalUserBalance || 0;
    } catch (e) {
        return NaN;
    }
}

// total liquidity

export const getTotalLiquidity = async (lpAddress) => {
    try {
        if (lpAddress) {
            const contract = new window.web3.eth.Contract(
                erc20,
                lpAddress,
            );
            let lpPairResponse = await contract.methods.balanceOf(cheffAddress).call();
            lpPairResponse = (lpPairResponse / 10 ** 18 || 0).toFixed(2)
            return lpPairResponse
        }
        return ""
    }
    catch (error) {
        return NaN
    }
}

export const getLpPairAmount = async (lpAddress) => {
    const account = await checkConnectedAndGetAddress();
    try {
        if (lpAddress) {
            const contract = new window.web3.eth.Contract(
                erc20,
                lpAddress,
            );
            let lpPairResponse = await contract.methods.balanceOf(account).call();
            lpPairResponse = (lpPairResponse / 10 ** 18 || 0).toFixed(2)
            return lpPairResponse
        }
        return ""
    }
    catch (error) {
        return NaN
    }
}

// Get BNB balance

export const getBnbBalanceOf = async () => {
    try {
        const account = await checkConnectedAndGetAddress();
        const totalBalance = await window.web3.eth.getBalance(account, function (err: any, result: any) {
            if (err) {
                console.log(err)
            }
        })
        const totalUserBalance = totalBalance / 10 ** 18
        return totalUserBalance || 0;
    } catch (e) {
        return NaN;
    }
}

// Function to get userAddress

export const checkConnectedAndGetAddress = async () => {
    // console.log('web3', window.web3);
    let addresses = await window?.web3?.eth?.getAccounts();
    if (!addresses?.length) {
        addresses = await window.ethereum.enable();

    }
    return addresses[0];
};

export const getBalanceVemp = async () => {
    const account = await checkConnectedAndGetAddress();
    try {
        if (cheffvemp) {

            const contract = new window.web3.eth.Contract(
                erc20,
                cheffvemp,
            );

            let balanceof = await contract.methods.balanceOf(account).call();

            balanceof = Math.floor(balanceof / 10 ** 18)

            return balanceof;
        }
        return ""
    }
    catch (error) {
        return NaN
    }
}

// Function to call donate function

export const stake = async (pId: number, amount) => {
    try {
        if (cheffAddress) {
            const account = await checkConnectedAndGetAddress();
            const contract = new window.web3.eth.Contract(
                cheffAbi,
                cheffAddress,
            );
            const reqAmount = new BigNumber(amount).times(new BigNumber(10).pow(18)).toString()
            const cheffResponse = await contract.methods.deposit(pId, reqAmount)
                .send({ from: account });
            return cheffResponse;
        }
        return ""
    }
    catch (error) {
        const errorMessage = error.message;
        console.log(errorMessage)
        return []
    }
}

export const approve = async (lpAddress) => {
    const lpPairAddress = lpAddress
    try {
        if (lpPairAddress) {
            const account = await checkConnectedAndGetAddress();
            const contract = new window.web3.eth.Contract(
                erc20,
                lpPairAddress,
            );
            const cheffResponse = await contract.methods.approve(cheffAddress, ethers.constants.MaxUint256)
                .send({ from: account });

            return cheffResponse;
        }
        return ""
    }
    catch (error) {
        const errorMessage = error.message;
        console.log(errorMessage)
        return ''
    }
}


// Function to call withdraw amount function

export const withdraw = async (pid, amount) => {
    try {
        if (cheffAddress) {
            const account = await checkConnectedAndGetAddress();
            const contract = new window.web3.eth.Contract(
                cheffAbi,
                cheffAddress,
            );
            const reqAmount = new BigNumber(amount).times(new BigNumber(10).pow(18)).toString()

            const cheffResponse = await contract.methods.withdraw(pid, reqAmount)
                .send({ from: account });
            return cheffResponse;
        }
        return ""
    }
    catch (error) {
        const errorMessage = error.message;
        console.log(errorMessage)
        return ''
    }
}

// Function to get staked amount

export const getUserInfo = async (pId) => {
    try {
        if (cheffAddress) {
            const account = await checkConnectedAndGetAddress();
            const contract = new window.web3.eth.Contract(
                cheffAbi,
                cheffAddress,
            );
            const cheffResponse = await contract.methods.userInfo(pId, account)
                .call()
            const reqResult = new BigNumber(cheffResponse.amount).div(new BigNumber(10).pow(18)).toString()
            return reqResult
        }
        return ""
    }
    catch (error) {
        return 'NaN'
    }
}


export const getAllowances = async (lpAddress) => {
    const lpPairAddress = lpAddress
    const account = await checkConnectedAndGetAddress();
    try {
        if (lpPairAddress) {
            const contract = new window.web3.eth.Contract(
                erc20,
                lpPairAddress,
            );
            const allowanceResponse: any = await contract.methods.allowance(account, cheffAddress).call();
            return allowanceResponse
        }
        return ""
    }
    catch (error) {
        return NaN
    }
}


export const pendingxVEMP = async (pid) => {
    const account = await checkConnectedAndGetAddress();
    try {
        if (cheffAddress) {

            const contract = new window.web3.eth.Contract(
                cheffAbi,
                cheffAddress,
            );

            let pendingEggsResponse = await contract.methods.pendingxVEMP(pid, account).call();

            pendingEggsResponse = ((pendingEggsResponse / 10 ** 18) || 0)

            return pendingEggsResponse

        }
        return ""

    }
    catch (error) {
        return NaN
    }
}

// to get multiplier value
export const getPoolInfo = async (pid) => {
    try {
        if (cheffAddress) {

            const contract = new window.web3.eth.Contract(
                cheffAbi,
                cheffAddress,
            );

            let poolInfo = await contract.methods.poolInfo(pid).call();
            poolInfo = (poolInfo.allocPoint) / 100;

            return poolInfo;
        }
        return ""
    }
    catch (error) {
        return NaN
    }
}

export const getDepositFees = async (pid) => {
    try {
        if (cheffAddress) {
            const account = await checkConnectedAndGetAddress();
            const contract = new window.web3.eth.Contract(
                cheffAbi,
                cheffAddress,
            );
            const depositFee = await contract.methods.userInfo(pid, account).call();

            return depositFee.amount;

        }
        return ""
    }
    catch (error) {
        return NaN
    }
}

