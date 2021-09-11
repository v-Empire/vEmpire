const {BN} = require('@openzeppelin/test-helpers');

const MockToken = artifacts.require("MockToken");
const MockSLP = artifacts.require("MockSLP");
const xVEMPToken = artifacts.require("xVEMPToken");
const xsVEMP = artifacts.require("xsVEMPToken");
const MasterChefVemp = artifacts.require("MasterChefVemp");
const MasterChefMana = artifacts.require("MasterChefMana");
const MasterChefETH = artifacts.require("MasterChefETH");
const MasterChefAxs = artifacts.require("MasterChefAxs");
const MasterChefSAND = artifacts.require("MasterChefSAND");
const MasterChefSTARL = artifacts.require("MasterChefSTARL");
const GovernorAlpha = artifacts.require("GovernorAlpha");
const Timelock = artifacts.require("Timelock");

async function deployContracts(deployer) {
  const deployerAddress = deployer.provider.addresses;
  
  const _testMana = await deployer.deploy(MockToken, "Test MANA", "MANA");
  const _testVEMP = await deployer.deploy(MockToken, "Test VEMP", "VEMP");
  const _testAXS = await deployer.deploy(MockToken, "Test AXS", "AXS");
  const _testSand = await deployer.deploy(MockToken, "Test SAND", "SAND");
  const _testStarl = await deployer.deploy(MockToken, "Test STARL", "STARL");
  const _testSLP = await deployer.deploy(MockSLP, "Test SLP", "SLP");
  const _xVEMPToken = await deployer.deploy(xVEMPToken);
  const _xsVEMP = await deployer.deploy(xsVEMP);
  const _masterChefMana = await deployer.deploy(MasterChefMana, _testVEMP.address, deployerAddress[0], "1000000000000000000", "0");
  const _masterChefVemp = await deployer.deploy(MasterChefVemp, _xVEMPToken.address, deployerAddress[0], "1000000000000000000", "0", "38829760");
  const _masterChefETH = await deployer.deploy(MasterChefETH, _testVEMP.address, deployerAddress[0], "1000000000000000000", "0");
  const _masterChefAxs = await deployer.deploy(MasterChefAxs, _testVEMP.address, _testSLP.address, deployerAddress[0], "1000000000000000000", "0");
  const _masterChefSand = await deployer.deploy(MasterChefSAND, _testVEMP.address, deployerAddress[0], "1000000000000000000", "0");
  const _masterChefStarl = await deployer.deploy(MasterChefSTARL, _testVEMP.address, deployerAddress[0], "1000000000000000000", "0");
  const _timelock = await deployer.deploy(Timelock, deployerAddress[0], 300);
  const _governorAlpha = await deployer.deploy(GovernorAlpha, _timelock.address, _xVEMPToken.address, deployerAddress[0]);

  const testVEMP = await MockToken.at(_testVEMP.address);
  await testVEMP.mint(_masterChefMana.address, "10000000000000000000000000");
  await testVEMP.mint(_masterChefETH.address, "10000000000000000000000000");
  await testVEMP.mint(_masterChefAxs.address, "10000000000000000000000000");
  await testVEMP.mint(_masterChefSand.address, "10000000000000000000000000");
  await testVEMP.mint(_masterChefStarl.address, "10000000000000000000000000");

  const timelock = await Timelock.at(_timelock.address);
  await timelock.setPendingAdmin(_governorAlpha.address);

  const governorAlpha = await GovernorAlpha.at(_governorAlpha.address);
  await governorAlpha.__acceptAdmin();

  const masterChefMana = await MasterChefMana.at(_masterChefMana.address);
  await masterChefMana.add(100, _testMana.address, true);

  const masterChefVemp = await MasterChefVemp.at(_masterChefVemp.address);
  await masterChefVemp.add(100, _xsVEMP.address, true);

  const masterChefAxs = await MasterChefAxs.at(_masterChefAxs.address);
  await masterChefAxs.add(100, _testAXS.address, true);

  const masterChefSand = await MasterChefSAND.at(_masterChefSand.address);
  await masterChefSand.add(100, _testSand.address, true);

  const masterChefStarl = await MasterChefSTARL.at(_masterChefStarl.address);
  await masterChefStarl.add(100, _testStarl.address, true);

  const xVEMPTokens = await xVEMPToken.at(_xVEMPToken.address);
  await xVEMPTokens.addMinter("["+ _masterChefVemp.address +"]");
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