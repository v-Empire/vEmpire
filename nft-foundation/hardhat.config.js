require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-truffle5");
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "rinkeby",
  networks: {
    hardhat: {
      blockGasLimit: 10000000,
    },
    rinkeby: {
      // You need to pass provider. Here I have used Alchemy API provider
      url: "",
      // You need to manually pass the array of private of accounts
      // accounts: ["You_Account_Private_Key"]
      accounts: [
        "",
      ],
    },
    ganache: {
      url: "http://127.0.0.1:7545",
    },
  },
  etherscan: {
    // This will used to verify the contract
    // apiKey: "Etherscan_API_KEY"
    apiKey: "",
  },
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
};
