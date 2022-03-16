const { ethers, upgrades } = require("hardhat");

async function main() {
  // Get the Address from Ganache Chain to deploy.
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address", deployer.address);

  // Loading the contract before deploying.
  const tokenContract = await ethers.getContractFactory("NFT");
  const nft = await upgrades.deployProxy(
    tokenContract,
    ["Test", "Test", 4500],
    { kind: "uups" }
  );
  await nft.deployed();
  // Print the address of deployed contract
  console.log("Contract deployed to:", nft.address);

  // Loading the contract before deploying.
  const saleContract = await ethers.getContractFactory("Sale");
  // Deploy proxy.
  const sale = await upgrades.deployProxy(
    saleContract,
    [nft.address, 100, 100, 100, 100, 100],
    { kind: "uups" }
  );
  // Waiting till the transaction is completed.
  await sale.deployed();
  // Print the address of deployed contract
  console.log("Sale deployed to:", sale.address);

  const stakeToken = await ethers.getContractFactory("StakeNFT");
  const erc20Contract = await ethers.getContractFactory("SampleToken");

  const erc20Token = await upgrades.deployProxy(erc20Contract, []);
  await erc20Token.deployed();

  console.log("Erc20 deployed to:", erc20Token.address);

  const stakeContract = await upgrades.deployProxy(stakeToken, [
    erc20Token.address,
    nft.address,
  ]);
  await stakeContract.deployed();

  console.log("Stake deployed to:", stakeToken.address);
}

main();
