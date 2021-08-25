import Web3 from "web3";
import BigNumber from "bignumber.js";
import { ethers } from 'ethers';
import cheffAbi from '../config/abi/masterchef.json';
import governorAbi from '../config/abi/governor.json';
import { getCakeAddress, getMasterChefAddress } from "./addressHelpers";
import Address from '../config/constants/addresses'



declare const window: any;
window.web3 = new Web3(window.ethereum);
// const cheffAddress = Address.getCheffAddress
const governorAddress = Address.governorAlphaAddress



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

// Function to get userAddress

export const checkConnectedAndGetAddress = async () => {
    // console.log('web3', window.web3);
    let addresses = await window?.web3?.eth?.getAccounts();
    if (!addresses?.length) {
        addresses = await window.ethereum.enable();

    }
    return addresses[0];
};

export const castVote = async (proposalId, support) => {
    try {
        if (governorAddress) {
            const account = await checkConnectedAndGetAddress();
            const contract = new window.web3.eth.Contract(
                governorAbi,
                governorAddress,
            );
            const castVoteResponse = await contract.methods.castVote(proposalId, support).send({ from: account });
            return castVoteResponse
        }
        return ""
    }
    catch (error) {
        return NaN
    }
}

export const propose = async () => {
    try {
        if (governorAddress) {
            const account = await checkConnectedAndGetAddress();
            const contract = new window.web3.eth.Contract(
                governorAbi,
                governorAddress,
            );
            const castVoteResponse = await contract.methods.propose().send({ from: account });
            return castVoteResponse
        }
        return ""
    }
    catch (error) {
        return NaN
    }
}

export const proposeCount = async () => {
    try {
        if (governorAddress) {
            const contract = new window.web3.eth.Contract(
                governorAbi,
                governorAddress,
            );
            const castVoteResponse = await contract.methods.proposeCount().call();
            return castVoteResponse
        }
        return ""
    }
    catch (error) {
        return NaN
    }
}
