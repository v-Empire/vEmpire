# Commands
NFT Plebeian council Contracts With Unit Testing

Try running some of the following tasks:

```shell
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js
```

# Etherscan verification

To try out Etherscan verification, you first need to deploy a contract to an Ethereum/BSC network.

In this project, copy the .env.example file to a file named .env, and then edit it to fill in the details. Enter your Bscscan API key, your test node URL (eg from Alchemy), and the private key of the account which will send the deployment transaction. With a valid .env file in place, first deploy your contract:

```shell
hardhat run --network testnet scripts/deploy.js
```

Then, copy the deployment address and paste it in to replace `DEPLOYED_CONTRACT_ADDRESS` in this command:

```shell
npx hardhat verify --network testnet DEPLOYED_CONTRACT_ADDRESS "Hello, Hardhat!"
```
