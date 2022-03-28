const { ethers, upgrades } = require('hardhat')

async function main() {
  // Get the Address from Ganache Chain to deploy.
  const [deployer] = await ethers.getSigners()
  console.log('Deployer address', deployer.address)

  // Loading the contract before deploying.
  let mockNFTContract = await ethers.getContractFactory('NFT')
  const nft = await upgrades.deployProxy(mockNFTContract, [])
  await nft.deployed()
  console.log('NFT deployed to:', nft.address)

  // Loading the contract before deploying.
  const erc20Contract = await ethers.getContractFactory('SampleToken')
  const erc20Token = await upgrades.deployProxy(erc20Contract, [])
  await erc20Token.deployed()
  console.log('Erc20 deployed to:', erc20Token.address)

  // Loading the contract before deploying.
  const stakeNFTContract = await ethers.getContractFactory('NFTStake')
  const stakeContract = await upgrades.deployProxy(stakeNFTContract, [
    erc20Token.address,
    nft.address,
  ])
  await stakeContract.deployed()

  console.log('Stake deployed to:', stakeContract.address)
}

main()
