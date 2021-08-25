const {BN} = require('@openzeppelin/test-helpers');

const MockToken = artifacts.require("MockToken");
const xVEMPToken = artifacts.require("xVEMPToken");
const xsVEMP = artifacts.require("xsVEMPToken");
const MasterChefVemp = artifacts.require("MasterChefVemp");
const MasterChefMana = artifacts.require("MasterChefMana");
const GovernorAlpha = artifacts.require("GovernorAlpha");
const Timelock = artifacts.require("Timelock");

async function deployContracts(deployer) {
  const deployerAddress = deployer.provider.addresses;
  
  const _testMana = await deployer.deploy(MockToken, "Test MANA", "MANA");
  const _testVEMP = await deployer.deploy(MockToken, "Test VEMP", "VEMP");
  const _xVEMPToken = await deployer.deploy(xVEMPToken);
  const _xsVEMP = await deployer.deploy(xsVEMP);
  const _masterChefMana = await deployer.deploy(MasterChefMana, _testMana.address, deployerAddress[0], "1000000000000000000", "0");
  const _masterChefVemp = await deployer.deploy(MasterChefVemp, _testVEMP.address, deployerAddress[0], "1000000000000000000", "0", "28829760");
  const _timelock = await deployer.deploy(Timelock, deployerAddress[0], 300);
  const _governorAlpha = await deployer.deploy(GovernorAlpha, _timelock.address, _xVEMPToken.address, deployerAddress[0]);
}

module.exports = function (deployer) {
  deployer.then(async () => {
    console.log(deployer.network);
    switch (deployer.network) {
      case 'development':
      case 'rinkeby':
      case 'ropsten':
        await deployContracts(deployer);
        break;
      case 'kovan':
        await deployContracts(deployer);
        break;
      case 'mainnet':
      case 'mainnet-fork':
        await deployContracts(deployer);
        break;
      default:
        throw ("Unsupported network");
    }
  }) 
};