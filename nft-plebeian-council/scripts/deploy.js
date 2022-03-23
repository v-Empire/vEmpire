const { ethers, upgrades } = require("hardhat");

async function main() {
  // Get the Address from Ganache Chain to deploy.
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address", deployer.address);

  // Loading the contract before deploying.
  const tokenContract = await ethers.getContractFactory("NFT");
  const saleContract = await ethers.getContractFactory("Sale");
  const stakeToken = await ethers.getContractFactory("StakeNFT");
  const erc20Contract = await ethers.getContractFactory("SampleToken");

  // Deploy NFT
  const nft = await upgrades.deployProxy(
    tokenContract,
    ["Test", "Test", 4500],
    { kind: "uups" }
  );
  await nft.deployed();
  console.log("NFT deployed to:", nft.address);

  // Deploy Sale
  const sale = await upgrades.deployProxy(
    saleContract,
    [nft.address, 100, 100, 100, 100, 100],
    { kind: "uups" }
  );
  await sale.deployed();
  console.log("Sale deployed to:", sale.address);

  // Deploy ERC20. This only required for testing
  const erc20Token = await upgrades.deployProxy(erc20Contract, []);
  await erc20Token.deployed();

  console.log("Erc20 deployed to:", erc20Token.address);

  // Deploy stake contract.
  const stakeContract = await upgrades.deployProxy(stakeToken, [
    erc20Token.address,
    nft.address,
  ]);
  await stakeContract.deployed();

  console.log("Stake deployed to:", stakeContract.address);
}

main();
