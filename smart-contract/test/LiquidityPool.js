const { accounts, contract } = require('@openzeppelin/test-environment');

const { BN, expectRevert, time} = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const MasterChefMana = contract.fromArtifact('MasterChefMana');
const MockToken = contract.fromArtifact('MockToken');
const xVEMP = contract.fromArtifact('xVEMPBEP20Token');
const LiquidityPool = contract.fromArtifact('LiquidityPool');   
const Sanctuary = contract.fromArtifact('VempDao');

describe('LiquidityPool', function () {
    const [ ownerAddress, userAddress1, userAddress2, userAddress3, userAddress4 ] = accounts;
    beforeEach(async function () {
        this.vemp = await MockToken.new("VEMP", "VEMP", {from: ownerAddress, gas: 8000000});
        this.xvemp = await xVEMP.new("xVEMP", "xVEMP", {from: ownerAddress});
        this.lp = await MockToken.new("MANA", "MANA", {from: ownerAddress, gas: 8000000});
        this.chef = await MasterChefMana.new(this.vemp.address, ownerAddress, "1000", "0", {from: ownerAddress, gas: 8000000});
        await this.vemp.mint(ownerAddress, "1000000000000000000000000");
        await this.lp.mint(ownerAddress, "1000000000000000000000000", {from: ownerAddress, gas: 8000000});

        this.liquidityPool = await LiquidityPool.new({from: ownerAddress});
        await this.liquidityPool.initialize(ownerAddress, this.vemp.address, this.xvemp.address, 100, 125, 60, 150, {from: ownerAddress, gas: 8000000});

        this.sanctuary = await Sanctuary.new({from: ownerAddress, gas: 8000000});
        await this.sanctuary.initialize(ownerAddress, this.vemp.address, this.xvemp.address, {from: ownerAddress, gas: 8000000});
        await this.xvemp.addMinter([this.sanctuary.address], {from: ownerAddress, gas: 8000000});
    });

    describe('set/update variables', function () {
        it("should set correct owner", async function () {
            const owner = await this.liquidityPool.owner();
            expect(owner).to.equal(ownerAddress);
        })

        it("should set correct vemp address", async function () {
            const vemp = await this.liquidityPool.VEMP();
            expect(this.vemp.address).to.equal(vemp);
        })

        it("should set correct xVemp address", async function () {
            const xvemp = await this.liquidityPool.xVEMP();
            expect(this.xvemp.address).to.equal(xvemp);
        })

        it("should set correct Vemp burn percent", async function () {
            const vempBurnPercent = await this.liquidityPool.vempBurnPercent();
            expect(vempBurnPercent).to.be.bignumber.equal(new BN(100))
        })

        it("should set correct xVemp hold percent", async function () {
            const xVempHoldPercent = await this.liquidityPool.xVempHoldPercent();
            expect(xVempHoldPercent).to.be.bignumber.equal(new BN(125))
        })

        it("should set correct Vemp lock percent", async function () {
            const vempLockPercent = await this.liquidityPool.vempLockPercent();
            expect(vempLockPercent).to.be.bignumber.equal(new BN(150))
        })
    });

    describe("WhiteList MasterChef Address", function () {
        it("If non-admin try to whitelist chef address", async function () {
            await expectRevert(this.liquidityPool.whiteListMasterChef(this.chef.address, true, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner.");
        })

        it("If admin try to whitelist 0 address", async function () {
            await expectRevert(this.liquidityPool.whiteListMasterChef("0x0000000000000000000000000000000000000000", true, {from: ownerAddress, gas: 8000000}), "Invalid address");
        })

        it("If admin try to whitelist same address", async function () {
            await this.liquidityPool.whiteListMasterChef(userAddress1, true, {from: ownerAddress, gas: 8000000});
            await expectRevert(this.liquidityPool.whiteListMasterChef(userAddress1, true, {from: ownerAddress, gas: 8000000}), "Already in same status");
        })

        it("If admin try to whitelist correct address", async function () {
            await this.liquidityPool.whiteListMasterChef(userAddress1, true, {from: ownerAddress, gas: 8000000});
            expect(await this.liquidityPool.masterChefStatus(userAddress1)).to.equal(true);
        })
    })

    describe("updateVempBurnPercent", function () {
        it("If non-admin try to update updateVempBurnPercent", async function () {
            await expectRevert(this.liquidityPool.updateVempBurnPercent(101, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner.");
        })

        it("If admin try to update updateVempBurnPercent", async function () {
            await this.liquidityPool.updateVempBurnPercent(101, {from: ownerAddress, gas: 8000000});
            expect(await this.liquidityPool.vempBurnPercent()).to.be.bignumber.equal(new BN(101))
        })
    })

    describe("updatexVempHoldPercent", function () {
        it("If non-admin try to update updatexVempHoldPercent", async function () {
            await expectRevert(this.liquidityPool.updateVempBurnPercent(101, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner.");
        })

        it("If admin try to update updatexVempHoldPercent", async function () {
            await this.liquidityPool.updatexVempHoldPercent(101, {from: ownerAddress, gas: 8000000});
            expect(await this.liquidityPool.xVempHoldPercent()).to.be.bignumber.equal(new BN(101))
        })
    })

    describe("updateVempLockPercent", function () {
        it("If non-admin try to update updateVempLockPercent", async function () {
            await expectRevert(this.liquidityPool.updateVempLockPercent(101, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner.");
        })

        it("If admin try to update updateVempLockPercent", async function () {
            await this.liquidityPool.updateVempLockPercent(101, {from: ownerAddress, gas: 8000000});
            expect(await this.liquidityPool.vempLockPercent()).to.be.bignumber.equal(new BN(101))
        })
    })

    describe("updateLockPeriod", function () {
        it("If non-admin try to update updateLockPeriod", async function () {
            await expectRevert(this.liquidityPool.updateLockPeriod(101, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner.");
        })

        it("If admin try to update updateLockPeriod", async function () {
            await this.liquidityPool.updateLockPeriod(101, {from: ownerAddress, gas: 8000000});
            expect(await this.liquidityPool.lockPeriod()).to.be.bignumber.equal(new BN(101))
        })
    })

    describe('emergencyWithdrawTokens', function () {
        beforeEach(async function () {
            await this.vemp.transfer(this.liquidityPool.address, 10000, {from: ownerAddress, gas: 8000000});
        });

        it("If msg.sender is not an owner", async function () {
            await expectRevert(this.liquidityPool.emergencyWithdrawTokens(this.vemp.address, userAddress2, 100, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner.");
        })

        it("If msg.sender is owner", async function () {
            await this.liquidityPool.emergencyWithdrawTokens(this.vemp.address, userAddress2, 100, {from: ownerAddress, gas: 8000000});
            expect(await this.vemp.balanceOf(this.liquidityPool.address)).to.be.bignumber.equal(new BN("9900"));
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN("100"));
        })
    });

    describe("lock", function () {
        it("Failed if masterchef address 0", async function () {
            await expectRevert(this.liquidityPool.lock("0x0000000000000000000000000000000000000000", 100, {from: ownerAddress, gas: 8000000}), "Invalid masterChef Address.");
        })

        it("Failed if masterchef not whitelisted", async function () {
            await expectRevert(this.liquidityPool.lock(userAddress1, 100, {from: ownerAddress, gas: 8000000}), "MasterChef not whiteListed.");
        })

        it("If try to lock low vemp amount", async function () {
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            await this.lp.approve(this.chef.address, "1000", {from: ownerAddress })
            await this.chef.deposit(0, "100", { from: ownerAddress })
            await this.vemp.approve(this.sanctuary.address, "1000000000000000000000", {from: ownerAddress, gas: 8000000});
            await this.sanctuary.enter(10000, {from: ownerAddress, gas: 8000000});
            await this.liquidityPool.whiteListMasterChef(this.chef.address, true, {from: ownerAddress, gas: 8000000});
            
            await expectRevert(this.liquidityPool.lock(this.chef.address, 14, {from: ownerAddress, gas: 8000000}), "Insufficient VEMP Locked.");
        })

        it("Lock vemp Tokens", async function () {
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            await this.lp.approve(this.chef.address, "1000", {from: ownerAddress })
            await this.chef.deposit(0, "100", { from: ownerAddress })
            await this.vemp.approve(this.sanctuary.address, "1000000000000000000000", {from: ownerAddress, gas: 8000000});
            await this.vemp.approve(this.liquidityPool.address, "1000000000000000000000", {from: ownerAddress, gas: 8000000});
            await this.sanctuary.enter(10000, {from: ownerAddress, gas: 8000000});
            await this.liquidityPool.whiteListMasterChef(this.chef.address, true, {from: ownerAddress, gas: 8000000});
            await this.liquidityPool.lock(this.chef.address, 15, {from: ownerAddress, gas: 8000000});

            let userLockInfo = await this.liquidityPool.userLockInfo(this.chef.address, ownerAddress);
            expect(userLockInfo[0]).to.be.bignumber.equal(new BN(15));

            expect(userLockInfo[1]).to.be.bignumber.equal(new BN(await time.latest()));
        })

        it("Lock vemp Tokens again", async function () {
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            await this.lp.approve(this.chef.address, "1000", {from: ownerAddress })
            await this.chef.deposit(0, "100", { from: ownerAddress })
            await this.vemp.approve(this.sanctuary.address, "1000000000000000000000", {from: ownerAddress, gas: 8000000});
            await this.vemp.approve(this.liquidityPool.address, "1000000000000000000000", {from: ownerAddress, gas: 8000000});
            await this.sanctuary.enter(10000, {from: ownerAddress, gas: 8000000});
            await this.liquidityPool.whiteListMasterChef(this.chef.address, true, {from: ownerAddress, gas: 8000000});
            await this.liquidityPool.lock(this.chef.address, 15, {from: ownerAddress, gas: 8000000});
            
            let latestTime = await time.latest();

            await this.liquidityPool.lock(this.chef.address, 1, {from: ownerAddress, gas: 8000000});

            let userLockInfo = await this.liquidityPool.userLockInfo(this.chef.address, ownerAddress);
            expect(userLockInfo[0]).to.be.bignumber.equal(new BN(16));
            expect(userLockInfo[1]).to.be.bignumber.equal(new BN(latestTime));
        })
    })

    describe("unStake(with lock period)", function () {
        it("Failed if masterchef address 0", async function () {
            await expectRevert(this.liquidityPool.unstake("0x0000000000000000000000000000000000000000", false, false, {from: ownerAddress, gas: 8000000}), "Invalid masterChef Address.");
        })

        it("Failed if masterchef not whitelisted", async function () {
            await expectRevert(this.liquidityPool.unstake(userAddress1, false, false, {from: ownerAddress, gas: 8000000}), "MasterChef not whiteListed.");
        })

        it("If try to unstake when not staked in masterchef 0 token", async function () {
            await this.liquidityPool.whiteListMasterChef(this.chef.address, true, {from: ownerAddress, gas: 8000000});
            await expectRevert(this.liquidityPool.unstake(this.chef.address, false, false, {from: ownerAddress, gas: 8000000}), "Not Staked");
        })

        it("If try to unstake when not holding xVEMP", async function () {
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            await this.lp.approve(this.chef.address, "1000", {from: ownerAddress })
            await this.chef.deposit(0, "100", { from: ownerAddress })
            await this.vemp.approve(this.sanctuary.address, "1000000000000000000000", {from: ownerAddress, gas: 8000000});
            await this.vemp.approve(this.liquidityPool.address, "1000000000000000000000", {from: ownerAddress, gas: 8000000});
            await this.sanctuary.enter(9, {from: ownerAddress, gas: 8000000});
            await this.liquidityPool.whiteListMasterChef(this.chef.address, true, {from: ownerAddress, gas: 8000000});
            await this.liquidityPool.lock(this.chef.address, 15, {from: ownerAddress, gas: 8000000});
            
            await expectRevert(this.liquidityPool.unstake(this.chef.address, false, false, {from: ownerAddress, gas: 8000000}), "Insufficient xVEMP Hold Amount");
        })

        it("If try to unstake when not lock VEMP", async function () {
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            await this.lp.approve(this.chef.address, "1000", {from: ownerAddress })
            await this.chef.deposit(0, "100", { from: ownerAddress })
            await this.vemp.approve(this.sanctuary.address, "1000000000000000000000", {from: ownerAddress, gas: 8000000});
            await this.vemp.approve(this.liquidityPool.address, "1000000000000000000000", {from: ownerAddress, gas: 8000000});
            await this.sanctuary.enter(13, {from: ownerAddress, gas: 8000000});
            await this.liquidityPool.whiteListMasterChef(this.chef.address, true, {from: ownerAddress, gas: 8000000});
            
            await expectRevert(this.liquidityPool.unstake(this.chef.address, false, false, {from: ownerAddress, gas: 8000000}), "Insufficient VEMP Locked");
        })

        it("If try to unstake when holding xVEMP and lock vemp", async function () {
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            await this.lp.approve(this.chef.address, "1000", {from: ownerAddress })
            await this.chef.deposit(0, "100", { from: ownerAddress })
            await this.lp.transfer(this.liquidityPool.address, "10000", {from: ownerAddress });
            await this.vemp.approve(this.sanctuary.address, "1000000000000000000000", {from: ownerAddress, gas: 8000000});
            await this.vemp.approve(this.liquidityPool.address, "1000000000000000000000", {from: ownerAddress, gas: 8000000});
            await this.sanctuary.enter(13, {from: ownerAddress, gas: 8000000});
            await this.liquidityPool.whiteListMasterChef(this.chef.address, true, {from: ownerAddress, gas: 8000000});
            await this.liquidityPool.lock(this.chef.address, 15, {from: ownerAddress, gas: 8000000});
            
            await time.increase(60);

            await this.liquidityPool.unstake(this.chef.address, false, false, {from: ownerAddress, gas: 8000000});
            let withdrawInfo = await this.liquidityPool.withdrawInfo(this.chef.address, ownerAddress);
            expect(withdrawInfo[0]).to.be.bignumber.equal(new BN(100));
            expect(withdrawInfo[1]).to.equal(true);
            expect(await this.lp.balanceOf(this.liquidityPool.address)).to.be.bignumber.equal(new BN(9900));
        })

        it("Failed if try to unstake again", async function () {
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            await this.lp.approve(this.chef.address, "1000", {from: ownerAddress })
            await this.chef.deposit(0, "100", { from: ownerAddress })
            await this.lp.transfer(this.liquidityPool.address, "10000", {from: ownerAddress });
            await this.vemp.approve(this.sanctuary.address, "1000000000000000000000", {from: ownerAddress, gas: 8000000});
            await this.vemp.approve(this.liquidityPool.address, "1000000000000000000000", {from: ownerAddress, gas: 8000000});
            await this.sanctuary.enter(13, {from: ownerAddress, gas: 8000000});
            await this.liquidityPool.whiteListMasterChef(this.chef.address, true, {from: ownerAddress, gas: 8000000});
            await this.liquidityPool.lock(this.chef.address, 15, {from: ownerAddress, gas: 8000000});
            
            await time.increase(60);

            await this.liquidityPool.unstake(this.chef.address, false, false, {from: ownerAddress, gas: 8000000});
            let withdrawInfo = await this.liquidityPool.withdrawInfo(this.chef.address, ownerAddress);
            expect(withdrawInfo[0]).to.be.bignumber.equal(new BN(100));
            expect(withdrawInfo[1]).to.equal(true);
            expect(await this.lp.balanceOf(this.liquidityPool.address)).to.be.bignumber.equal(new BN(9900));

            await expectRevert(this.liquidityPool.unstake(this.chef.address, false, false, {from: ownerAddress, gas: 8000000}), "Can not withdraw");
        })
    })

    describe("unStake(with no lock period)", function () {
        it("If try to unstake when not holding vemp for Burn", async function () {
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            await this.lp.approve(this.chef.address, "1000", {from: userAddress1 })
            await this.lp.transfer(userAddress1, "1000", {from: ownerAddress })
            await this.chef.deposit(0, "100", { from: userAddress1 })
            await this.vemp.approve(this.sanctuary.address, "1000000000000000000000", {from: userAddress1, gas: 8000000});
            await this.vemp.approve(this.liquidityPool.address, "1000000000000000000000", {from: userAddress1, gas: 8000000});
            await this.liquidityPool.whiteListMasterChef(this.chef.address, true, {from: ownerAddress, gas: 8000000});
            
            await expectRevert(this.liquidityPool.unstake(this.chef.address, true, false, {from: userAddress1, gas: 8000000}), "Insufficient VEMP Burn Amount");
        })

        it("If try to unstake when holding vemp for Burn but not allowance", async function () {
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            await this.lp.approve(this.chef.address, "1000", {from: userAddress1 })
            await this.lp.transfer(userAddress1, "1000", {from: ownerAddress })
            await this.chef.deposit(0, "100", { from: userAddress1 })
            await this.vemp.approve(this.sanctuary.address, "1000000000000000000000", {from: userAddress1, gas: 8000000});
            await this.vemp.transfer(userAddress1, "10000", {from: ownerAddress, gas: 8000000});
            await this.sanctuary.enter(9, {from: userAddress1, gas: 8000000});
            await this.liquidityPool.whiteListMasterChef(this.chef.address, true, {from: ownerAddress, gas: 8000000});
            
            await expectRevert(this.liquidityPool.unstake(this.chef.address, true, false, {from: userAddress1, gas: 8000000}), "ERC20: transfer amount exceeds allowance.");
        })

        it("If try to unstake when holding vemp for Burn directly", async function () {
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            await this.lp.approve(this.chef.address, "1000", {from: userAddress1 })
            await this.lp.transfer(userAddress1, "1000", {from: ownerAddress })
            await this.chef.deposit(0, "100", { from: userAddress1 })
            await this.vemp.approve(this.sanctuary.address, "1000000000000000000000", {from: userAddress1, gas: 8000000});
            await this.vemp.approve(this.liquidityPool.address, "1000000000000000000000", {from: userAddress1, gas: 8000000});
            await this.vemp.transfer(userAddress1, "10000", {from: ownerAddress, gas: 8000000});
            await this.lp.transfer(this.liquidityPool.address, "10000", {from: ownerAddress, gas: 8000000});
            await this.liquidityPool.whiteListMasterChef(this.chef.address, true, {from: ownerAddress, gas: 8000000});
            
            await this.liquidityPool.unstake(this.chef.address, true, false, {from: userAddress1, gas: 8000000});

            let withdrawInfo = await this.liquidityPool.withdrawInfo(this.chef.address, userAddress1);
            expect(withdrawInfo[0]).to.be.bignumber.equal(new BN(100));
            expect(withdrawInfo[1]).to.equal(true);
            expect(await this.lp.balanceOf(this.liquidityPool.address)).to.be.bignumber.equal(new BN(9900));
            expect(await this.vemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(9990));
        })

        it("If try to unstake when holding vemp for Burn with less than half lock time", async function () {
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            await this.lp.approve(this.chef.address, "1000", {from: userAddress1 })
            await this.lp.transfer(userAddress1, "1000", {from: ownerAddress })
            await this.chef.deposit(0, "100", { from: userAddress1 })
            await this.vemp.approve(this.sanctuary.address, "1000000000000000000000", {from: userAddress1, gas: 8000000});
            await this.vemp.approve(this.liquidityPool.address, "1000000000000000000000", {from: userAddress1, gas: 8000000});
            await this.vemp.transfer(userAddress1, "10000", {from: ownerAddress, gas: 8000000});
            await this.lp.transfer(this.liquidityPool.address, "10000", {from: ownerAddress, gas: 8000000});
            await this.liquidityPool.whiteListMasterChef(this.chef.address, true, {from: ownerAddress, gas: 8000000});
            await this.liquidityPool.lock(this.chef.address, 20, {from: userAddress1, gas: 8000000});

            await time.increase(25);
            await this.liquidityPool.unstake(this.chef.address, true, false, {from: userAddress1, gas: 8000000});

            let withdrawInfo = await this.liquidityPool.withdrawInfo(this.chef.address, userAddress1);
            expect(withdrawInfo[0]).to.be.bignumber.equal(new BN(100));
            expect(withdrawInfo[1]).to.equal(true);
            expect(await this.lp.balanceOf(this.liquidityPool.address)).to.be.bignumber.equal(new BN(9900));
            expect(await this.vemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(9980));
        })

        it("If try to unstake when holding vemp for Burn with half lock time", async function () {
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            await this.lp.approve(this.chef.address, "1000", {from: userAddress1 })
            await this.lp.transfer(userAddress1, "1000", {from: ownerAddress })
            await this.chef.deposit(0, "100", { from: userAddress1 })
            await this.vemp.approve(this.sanctuary.address, "1000000000000000000000", {from: userAddress1, gas: 8000000});
            await this.vemp.approve(this.liquidityPool.address, "1000000000000000000000", {from: userAddress1, gas: 8000000});
            await this.vemp.transfer(userAddress1, "10000", {from: ownerAddress, gas: 8000000});
            await this.lp.transfer(this.liquidityPool.address, "10000", {from: ownerAddress, gas: 8000000});
            await this.liquidityPool.whiteListMasterChef(this.chef.address, true, {from: ownerAddress, gas: 8000000});
            await this.liquidityPool.lock(this.chef.address, 20, {from: userAddress1, gas: 8000000});

            await time.increase(30);
            await this.liquidityPool.unstake(this.chef.address, true, false, {from: userAddress1, gas: 8000000});

            let withdrawInfo = await this.liquidityPool.withdrawInfo(this.chef.address, userAddress1);
            expect(withdrawInfo[0]).to.be.bignumber.equal(new BN(100));
            expect(withdrawInfo[1]).to.equal(true);
            expect(await this.lp.balanceOf(this.liquidityPool.address)).to.be.bignumber.equal(new BN(9900));
            expect(await this.vemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(9995));
        })

        it("If try to unstake when holding vemp for Burn with more than half lock time", async function () {
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            await this.lp.approve(this.chef.address, "1000", {from: userAddress1 })
            await this.lp.transfer(userAddress1, "1000", {from: ownerAddress })
            await this.chef.deposit(0, "100", { from: userAddress1 })
            await this.vemp.approve(this.sanctuary.address, "1000000000000000000000", {from: userAddress1, gas: 8000000});
            await this.vemp.approve(this.liquidityPool.address, "1000000000000000000000", {from: userAddress1, gas: 8000000});
            await this.vemp.transfer(userAddress1, "10000", {from: ownerAddress, gas: 8000000});
            await this.lp.transfer(this.liquidityPool.address, "10000", {from: ownerAddress, gas: 8000000});
            await this.liquidityPool.whiteListMasterChef(this.chef.address, true, {from: ownerAddress, gas: 8000000});
            await this.liquidityPool.lock(this.chef.address, 20, {from: userAddress1, gas: 8000000});

            await time.increase(55);
            await this.liquidityPool.unstake(this.chef.address, true, false, {from: userAddress1, gas: 8000000});

            let withdrawInfo = await this.liquidityPool.withdrawInfo(this.chef.address, userAddress1);
            expect(withdrawInfo[0]).to.be.bignumber.equal(new BN(100));
            expect(withdrawInfo[1]).to.equal(true);
            expect(await this.lp.balanceOf(this.liquidityPool.address)).to.be.bignumber.equal(new BN(9900));
            expect(await this.vemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(9995));
        })

        it("If try to unstake when holding vemp for Burn with more than lock time", async function () {
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            await this.lp.approve(this.chef.address, "1000", {from: userAddress1 })
            await this.lp.transfer(userAddress1, "1000", {from: ownerAddress })
            await this.chef.deposit(0, "100", { from: userAddress1 })
            await this.vemp.approve(this.sanctuary.address, "1000000000000000000000", {from: userAddress1, gas: 8000000});
            await this.vemp.approve(this.liquidityPool.address, "1000000000000000000000", {from: userAddress1, gas: 8000000});
            await this.vemp.transfer(userAddress1, "10000", {from: ownerAddress, gas: 8000000});
            await this.lp.transfer(this.liquidityPool.address, "10000", {from: ownerAddress, gas: 8000000});
            await this.liquidityPool.whiteListMasterChef(this.chef.address, true, {from: ownerAddress, gas: 8000000});
            await this.liquidityPool.lock(this.chef.address, 20, {from: userAddress1, gas: 8000000});

            await time.increase(60);
            await this.liquidityPool.unstake(this.chef.address, true, false, {from: userAddress1, gas: 8000000});

            let withdrawInfo = await this.liquidityPool.withdrawInfo(this.chef.address, userAddress1);
            expect(withdrawInfo[0]).to.be.bignumber.equal(new BN(100));
            expect(withdrawInfo[1]).to.equal(true);
            expect(await this.lp.balanceOf(this.liquidityPool.address)).to.be.bignumber.equal(new BN(9900));
            expect(await this.vemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(10000));
        })
    })
})


