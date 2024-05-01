const { latest } = require('@openzeppelin/test-helpers/src/time');
const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

describe("LiquidityETHPoolV2", function () {
  beforeEach(async function () {
    VEMP = await ethers.getContractFactory('VEMP');
    ETHV1 = await ethers.getContractFactory('ETHV1');
    ETHV2 = await ethers.getContractFactory('ETHV2');
    POOL = await ethers.getContractFactory('LiquidityETHPoolV2');

    [ownerAddress, userAddress1, userAddress2, userAddress3, userAddress4, userAddress5, userAddress6, userAddress7, userAddress8, userAddress9, userAddress10, userAddress11] = await ethers.getSigners();

    vemp = await VEMP.deploy();
    ethv1 = await ETHV1.deploy();
    ethv2 = await ETHV2.deploy();
    pool = await upgrades.deployProxy(POOL, [
      ownerAddress.address,
      ethv1.address,
      ethv2.address
    ]);
    await pool.deployed();

    await ethv1.connect(userAddress1).deposit(1000, { value: 1000 });
    await ethv1.connect(userAddress2).deposit(2000, { value: 2000 });
    await ethv1.connect(userAddress3).deposit(3000, { value: 3000 });
    await ethv1.connect(userAddress4).deposit(4000, { value: 4000 });

    await ethv2.connect(userAddress4).deposit(userAddress4.address, 1000, { value: 1000 });
  });

  describe('Initial Variables', function () {
    it('Correct Owner', async function () {
      expect(await pool.owner()).to.be.equal(ownerAddress.address);
    });

    it('Correct ETH V1 Address', async function () {
      expect(await pool.masterChefETHV1()).to.be.equal(ethv1.address);
    });

    it('Correct ETH V2 Address', async function () {
      expect(await pool.masterChefETHV2()).to.be.equal(ethv2.address);
    });
  });


  describe('Queue', function () {
    it('Failed if not deposit in ETH V1', async function () {
      await expect(
        pool.connect(userAddress5).queueRequest(false)
      ).to.be.revertedWith(
        'Not Staked In V1 Pool'
      );
    });

    it('Failed to queue again', async function () {
      await pool.connect(userAddress1).queueRequest(false);
      await expect(
        pool.connect(userAddress1).queueRequest(false)
      ).to.be.revertedWith(
        'Already Queued/Unstake'
      );
    });

    it('Queued if deposit in ETH V1(Migrate false)', async function () {
      await pool.connect(userAddress1).queueRequest(false);
      let info = await pool.withdrawInfo(userAddress1.address);
      expect(info[0]).to.be.equal("1000");
      expect(info[1]).to.be.equal(true);
      expect(info[2]).to.be.equal(false);
      expect(info[3]).to.be.equal(false);
      expect(info[4]).to.be.equal(false);
      expect(info[5]).to.be.equal(1000);
      expect(info[6]).to.be.equal(0);
    });

    it('Queued if deposit in ETH V1(Migrate True)', async function () {
      await pool.connect(userAddress1).queueRequest(true);
      let info = await pool.withdrawInfo(userAddress1.address);
      expect(info[0]).to.be.equal("1000");
      expect(info[1]).to.be.equal(true);
      expect(info[2]).to.be.equal(true);
      expect(info[3]).to.be.equal(false);
      expect(info[4]).to.be.equal(false);
      expect(info[5]).to.be.equal(1000);
      expect(info[6]).to.be.equal(0);
    });

    it('Queued Position(Migrate True)', async function () {
      await pool.connect(userAddress1).queueRequest(true);
      let info = await pool.withdrawInfo(userAddress1.address);
      expect(info[0]).to.be.equal("1000");
      expect(info[1]).to.be.equal(true);
      expect(info[2]).to.be.equal(true);
      expect(info[3]).to.be.equal(false);
      expect(info[4]).to.be.equal(false);
      expect(info[5]).to.be.equal(1000);
      expect(info[6]).to.be.equal(0);

      await pool.connect(userAddress2).queueRequest(true);
      let info1 = await pool.withdrawInfo(userAddress2.address);
      expect(info1[0]).to.be.equal("2000");
      expect(info1[1]).to.be.equal(true);
      expect(info1[2]).to.be.equal(true);
      expect(info1[3]).to.be.equal(false);
      expect(info1[4]).to.be.equal(false);
      expect(info1[5]).to.be.equal(3000);
      expect(info1[6]).to.be.equal(1);

      await pool.connect(userAddress3).queueRequest(true);
      let info3 = await pool.withdrawInfo(userAddress3.address);
      expect(info3[0]).to.be.equal("3000");
      expect(info3[1]).to.be.equal(true);
      expect(info3[2]).to.be.equal(true);
      expect(info3[3]).to.be.equal(false);
      expect(info3[4]).to.be.equal(false);
      expect(info3[5]).to.be.equal(6000);
      expect(info3[6]).to.be.equal(2);

      await pool.connect(userAddress4).queueRequest(true);
      let info4 = await pool.withdrawInfo(userAddress4.address);
      expect(info4[0]).to.be.equal("4000");
      expect(info4[1]).to.be.equal(true);
      expect(info4[2]).to.be.equal(true);
      expect(info4[3]).to.be.equal(false);
      expect(info4[4]).to.be.equal(false);
      expect(info4[5]).to.be.equal(10000);
      expect(info4[6]).to.be.equal(3);
    });
  });

  describe('Un-stake', function () {
    it('Failed if not queued', async function () {
      await expect(
        pool.connect(userAddress1).unstake()
      ).to.be.revertedWith(
        'Not Staked'
      );
    });

    it('Failed if not enough ETH on pool', async function () {
      await pool.connect(userAddress1).queueRequest(false);
      await expect(
        pool.connect(userAddress1).unstake()
      ).to.be.revertedWith(
        'Not Enough Pool Amount'
      );
    });

    it('Failed if try to unstake multiple times', async function () {
      await pool.connect(userAddress1).queueRequest(false);
      await pool.addETHInPool(4000, { value: 4000 });

      await pool.connect(userAddress1).unstake();
      await expect(
        pool.connect(userAddress1).unstake()
      ).to.be.revertedWith(
        'Already Unstake or Not Queued'
      );
    });

    it('Unstake (Migrate False)', async function () {
      await pool.connect(userAddress1).queueRequest(false);
      await pool.addETHInPool(4000, { value: 4000 });

      await pool.connect(userAddress1).unstake();
      let info = await pool.withdrawInfo(userAddress1.address);
      expect(info[0]).to.be.equal("1000");
      expect(info[1]).to.be.equal(true);
      expect(info[2]).to.be.equal(false);
      expect(info[3]).to.be.equal(true);
      expect(info[4]).to.be.equal(false);
      expect(info[5]).to.be.equal(1000);
      expect(info[6]).to.be.equal(0);

      let ethV2Info = await ethv2.userInfo(userAddress1.address);
      expect(ethV2Info[0]).to.be.equal("0");
    });

    it('Failed if non owner try to add eth in pool', async function () {
      await expect(
        pool.connect(userAddress1).addETHInPool(1000, { value: 1000 })
      ).to.be.revertedWith(
        'OwnableUnauthorizedAccount(\"' + userAddress1.address + "\")"
      );
    });

    it('Unstake (Migrate true)', async function () {
      await pool.connect(userAddress1).queueRequest(true);
      await pool.addETHInPool(4000, { value: 4000 });

      await pool.connect(userAddress1).unstake();
      let info = await pool.withdrawInfo(userAddress1.address);
      expect(info[0]).to.be.equal("1000");
      expect(info[1]).to.be.equal(true);
      expect(info[2]).to.be.equal(true);
      expect(info[3]).to.be.equal(true);
      expect(info[4]).to.be.equal(false);
      expect(info[5]).to.be.equal(1000);
      expect(info[6]).to.be.equal(0);

      let ethV2Info = await ethv2.userInfo(userAddress1.address);
      expect(ethV2Info[0]).to.be.equal("1000");
    });

    it('Allow Unstake only sufficient users', async function () {
      await pool.connect(userAddress1).queueRequest(true);
      await pool.connect(userAddress2).queueRequest(true);
      await pool.connect(userAddress3).queueRequest(true);
      await pool.connect(userAddress4).queueRequest(true);
      await pool.addETHInPool(4000, { value: 4000 });

      await pool.connect(userAddress1).unstake();
      await pool.connect(userAddress2).unstake();

      expect(await pool.totalPooledETH()).to.be.equal("4000");

      await expect(
        pool.connect(userAddress3).unstake()
      ).to.be.revertedWith(
        "Not Enough Pool Amount"
      );

      await expect(
        pool.connect(userAddress4).unstake()
      ).to.be.revertedWith(
        "Not Enough Pool Amount"
      );
    });

    it('Allow Unstake only sufficient users add more fund', async function () {
      await pool.connect(userAddress1).queueRequest(true);
      await pool.connect(userAddress2).queueRequest(true);
      await pool.connect(userAddress3).queueRequest(true);
      await pool.connect(userAddress4).queueRequest(true);
      await pool.addETHInPool(4000, { value: 4000 });

      await pool.connect(userAddress1).unstake();
      await pool.connect(userAddress2).unstake();

      expect(await pool.totalPooledETH()).to.be.equal("4000");

      await expect(
        pool.connect(userAddress3).unstake()
      ).to.be.revertedWith(
        "Not Enough Pool Amount"
      );

      await expect(
        pool.connect(userAddress4).unstake()
      ).to.be.revertedWith(
        "Not Enough Pool Amount"
      );

      await pool.addETHInPool(4000, { value: 4000 });
      await pool.connect(userAddress3).unstake();
      await pool.addETHInPool(4000, { value: 4000 });
      await pool.connect(userAddress4).unstake();

      let ethV2Info = await ethv2.userInfo(userAddress4.address);
      expect(ethV2Info[0]).to.be.equal("5000");
    });

    it('Emergency Withdraw Fund', async function () {
      await pool.addETHInPool(4000, { value: 4000 });

      await pool.emergencyWithdrawTokens(userAddress1.address, 4000);

      await expect(
        pool.emergencyWithdrawTokens(userAddress1.address, 1)
      ).to.be.revertedWith(
        "Insufficient amount"
      );
    });
  });
});
