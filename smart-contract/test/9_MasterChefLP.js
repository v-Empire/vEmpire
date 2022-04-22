const { accounts, contract, privateKeys } = require('@openzeppelin/test-environment');

const { BN, expectRevert, time, expectEvent, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { signTypedData } = require('eth-sig-util');

const MAX_DEPLOYED_BYTECODE_SIZE = 24576;
const MasterChefLP = contract.fromArtifact('MasterChefLP');
const MockToken = contract.fromArtifact('MockToken');
const xVEMP = contract.fromArtifact('xVEMPBEP20Token');

const {
    encodeParameters
} = require('../Utils/Ethereum');

describe('MasterChefLP', function () {
    const [ ownerAddress, userAddress1, userAddress2, userAddress3, userAddress4 ] = accounts;
    beforeEach(async function () {
        this.vemp = await MockToken.new("VEMP", "VEMP", {from: ownerAddress, gas: 8000000});
        this.LP = await MockToken.new("LP", "LP", {from: ownerAddress, gas: 8000000});
        this.chef = await MasterChefLP.new({from: ownerAddress, gas: 8000000});
        this.xvemp = await xVEMP.new("xVEMP", "xVEMP", {from: ownerAddress});
        await this.chef.initialize(this.vemp.address, this.LP.address, this.xvemp.address, ownerAddress, "1000", "0", 125, 100, 120, 150, {from: ownerAddress, gas: 8000000});
        await this.xvemp.addMinter([this.chef.address], {from: ownerAddress, gas: 8000000});
        await this.vemp.mint(ownerAddress, "1000000000000000000000000");
        await this.LP.mint(ownerAddress, "1000000000000000000000000");
        await this.LP.mint(userAddress1, "1000000000000000000000000", {from: userAddress1, gas: 8000000});
        await this.LP.mint(userAddress3, "1000000000000000000000000", {from: userAddress3, gas: 8000000});
        await this.LP.mint(userAddress2, "1000000000000000000000000", {from: userAddress2, gas: 8000000});
    });

    describe('set/update variables', function () {
        it("should set correct state variables", async function () {
            const vemp = await this.chef.VEMP();
            const adminaddr = await this.chef.adminaddr();

            expect(vemp).to.equal(this.vemp.address);
            expect(adminaddr).to.equal(ownerAddress);
        })

        it("should allow admin and only admin to update admin", async function () {
            expect(await this.chef.adminaddr()).to.equal(ownerAddress)
            await expectRevert(this.chef.admin(userAddress1, { from: userAddress1 }), "admin: wut?")
            await this.chef.admin(userAddress1, { from: ownerAddress })
            expect(await this.chef.adminaddr()).to.equal(userAddress1)
            await this.chef.admin(ownerAddress, { from: userAddress1 })
            expect(await this.chef.adminaddr()).to.equal(ownerAddress)
        })

        it("should allow admin and only admin to update updateRewardEndStatus", async function () {
            expect(await this.chef.rewardEndStatus()).to.equal(false)
            await expectRevert(this.chef.updateRewardEndStatus(true, 100, { from: userAddress1 }), "Ownable: caller is not the owner")
            await this.chef.updateRewardEndStatus(true, 100, { from: ownerAddress })
            expect(await this.chef.rewardEndStatus()).to.equal(true)
            await this.chef.updateRewardEndStatus(false, 500,  { from: ownerAddress })
            expect(await this.chef.rewardEndStatus()).to.equal(false)
        })

        it("should allow admin and only admin to update updateWithdrawStatus", async function () {
            expect(await this.chef.withdrawStatus()).to.equal(false)
            await expectRevert(this.chef.updateWithdrawStatus(true, { from: userAddress1 }), "Ownable: caller is not the owner")
            await this.chef.updateWithdrawStatus(true, { from: ownerAddress })
            expect(await this.chef.withdrawStatus()).to.equal(true)
            await this.chef.updateWithdrawStatus(false, { from: ownerAddress })
            expect(await this.chef.withdrawStatus()).to.equal(false)
        })

        it("should set correct xVemp address", async function () {
            const xvemp = await this.chef.xVEMP();
            expect(this.xvemp.address).to.equal(xvemp);
        })

        it("should set correct Vemp burn percent", async function () {
            const vempBurnPercent = await this.chef.vempBurnPercent();
            expect(vempBurnPercent).to.be.bignumber.equal(new BN(125))
        })

        it("should set correct xVemp hold percent", async function () {
            const xVempHoldPercent = await this.chef.xVempHoldPercent();
            expect(xVempHoldPercent).to.be.bignumber.equal(new BN(100))
        })

        it("should set correct Vemp lock percent", async function () {
            const vempLockPercent = await this.chef.vempLockPercent();
            expect(vempLockPercent).to.be.bignumber.equal(new BN(150))
        })
    });

    describe("updateVempBurnPercent", function () {
        it("If non-admin try to update updateVempBurnPercent", async function () {
            await expectRevert(this.chef.updateVempBurnPercent(101, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner.");
        })

        it("If admin try to update updateVempBurnPercent", async function () {
            await this.chef.updateVempBurnPercent(101, {from: ownerAddress, gas: 8000000});
            expect(await this.chef.vempBurnPercent()).to.be.bignumber.equal(new BN(101))
        })
    })

    describe("updatexVempHoldPercent", function () {
        it("If non-admin try to update updatexVempHoldPercent", async function () {
            await expectRevert(this.chef.updateVempBurnPercent(101, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner.");
        })

        it("If admin try to update updatexVempHoldPercent", async function () {
            await this.chef.updatexVempHoldPercent(101, {from: ownerAddress, gas: 8000000});
            expect(await this.chef.xVempHoldPercent()).to.be.bignumber.equal(new BN(101))
        })
    })

    describe("updateVempLockPercent", function () {
        it("If non-admin try to update updateVempLockPercent", async function () {
            await expectRevert(this.chef.updateVempLockPercent(101, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner.");
        })

        it("If admin try to update updateVempLockPercent", async function () {
            await this.chef.updateVempLockPercent(101, {from: ownerAddress, gas: 8000000});
            expect(await this.chef.vempLockPercent()).to.be.bignumber.equal(new BN(101))
        })
    })

    describe("updateLockPeriod", function () {
        it("If non-admin try to update updateLockPeriod", async function () {
            await expectRevert(this.chef.updateLockPeriod(101, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner.");
        })

        it("If admin try to update updateLockPeriod", async function () {
            await this.chef.updateLockPeriod(101, {from: ownerAddress, gas: 8000000});
            expect(await this.chef.lockPeriod()).to.be.bignumber.equal(new BN(101))
        })
    })

    describe("lock", function () {
        it("Lock vemp Tokens", async function () {
            await this.LP.approve(this.chef.address, "1000", {from: ownerAddress })
            await this.chef.deposit(ownerAddress, "100", { from: ownerAddress })
            await this.vemp.approve(this.chef.address, "1000000000000000000000", {from: ownerAddress, gas: 8000000});
            await this.xvemp.mint(ownerAddress, 10000, {from: ownerAddress, gas: 8000000});
            await this.chef.lock(15, {from: ownerAddress, gas: 8000000});

            let userLockInfo = await this.chef.userLockInfo(ownerAddress);
            expect(userLockInfo[0]).to.be.bignumber.equal(new BN(15));

            expect(userLockInfo[1]).to.be.bignumber.equal(new BN(await time.latest()));
        })

        it("Lock vemp Tokens again", async function () {
            await this.LP.approve(this.chef.address, "1000", {from: ownerAddress })
            await this.chef.deposit(ownerAddress, "100", { from: ownerAddress })
            await this.vemp.approve(this.chef.address, "1000000000000000000000", {from: ownerAddress, gas: 8000000});
            await this.xvemp.mint(ownerAddress, 10000, {from: ownerAddress, gas: 8000000});
            await this.chef.lock(15, {from: ownerAddress, gas: 8000000});
            
            let latestTime = await time.latest();

            await this.chef.lock(1, {from: ownerAddress, gas: 8000000});

            let userLockInfo = await this.chef.userLockInfo(ownerAddress);
            expect(userLockInfo[0]).to.be.bignumber.equal(new BN(16));
            expect(userLockInfo[1]).to.be.bignumber.equal(new BN(latestTime));
        })
    })

    describe('emergency withdraw reward tokens', function () {
        it("not allow non-admin to withdraw tokens", async function () {
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });
            await expectRevert(this.chef.emergencyWithdrawRewardTokens(ownerAddress, 100,{ from: userAddress1 }), "sender must be admin address");
        })

        it("allow only admin to withdraw tokens", async function () {
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });
            await this.chef.emergencyWithdrawRewardTokens(userAddress1, 100,{ from: ownerAddress });

            expect(await this.vemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(100))
        })
    });

    describe('Only admin can stop to withdraw tokens', function () {
        it("allow withdraw staked tokens with lock periode", async function () {
            await this.LP.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.chef.deposit(userAddress2, "100", { from: userAddress2 })
            await this.vemp.transfer(userAddress2, "1000000000000000000000", {from: ownerAddress, gas: 8000000});
            await this.vemp.approve(this.chef.address, "1000000000000000000000", {from: userAddress2, gas: 8000000});
            await this.xvemp.mint(userAddress2, 10000, {from: ownerAddress, gas: 8000000});
            await this.chef.lock(15, {from: userAddress2, gas: 8000000});

            await time.increase(121);
            await this.chef.withdraw(100, false, { from: userAddress2 });

            let userInfo = await this.chef.userInfo(userAddress2);
            expect(userInfo[0]).to.be.bignumber.equal(new BN(0));
            expect(userInfo[1]).to.be.bignumber.equal(new BN(0));
            expect(userInfo[2]).to.be.bignumber.equal(new BN(0));
        })

        it("allow withdraw staked tokens with-out lock periode", async function () {
            await this.LP.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.chef.deposit(userAddress2, "100", { from: userAddress2 })
            await this.vemp.transfer(userAddress2, "1000000000000000000000", {from: ownerAddress, gas: 8000000});
            await this.vemp.approve(this.chef.address, "1000000000000000000000", {from: userAddress2, gas: 8000000});
            await this.chef.withdraw(100, true, { from: userAddress2 });

            let userInfo = await this.chef.userInfo(userAddress2);
            expect(userInfo[0]).to.be.bignumber.equal(new BN(0));
            expect(userInfo[1]).to.be.bignumber.equal(new BN(0));
            expect(userInfo[2]).to.be.bignumber.equal(new BN(0));
        })

        it("not allow withdraw staked tokens", async function () {
            await this.LP.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.chef.deposit(userAddress2, "100", { from: userAddress2 })
            await this.chef.updateWithdrawStatus(true, { from: ownerAddress })
            await expectRevert(this.chef.withdraw(100,{ from: userAddress2 }), "Withdraw not allowed");
        })
    });

    describe("With ERC/LP token added to the field", function () {
        it("should give out vemp only after farming time", async function () {
            this.chef = await MasterChefLP.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, this.LP.address, this.xvemp.address, ownerAddress, "100", "13700", 125, 100, 120, 150, {from: ownerAddress, gas: 8000000});
    
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });
            
            await this.LP.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.chef.deposit(userAddress2, "100", { from: userAddress2 })
            await time.advanceBlockTo("13551")

            await this.chef.deposit(userAddress2, "0", { from: userAddress2 }) // block 100
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            await time.advanceBlockTo("13700")

            await this.chef.deposit(userAddress2, "0", { from: userAddress2 }) // block 101
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(100))

            await time.advanceBlockTo("13704")
            await this.chef.deposit(userAddress2, "0", { from: userAddress2 }) // block 105

            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(500))
        })

        it("should not distribute vemp if no one deposit", async function () {
            // 100 per block farming rate starting at block 200 with bonus until block 1000
            this.chef = await MasterChefLP.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, this.LP.address, this.xvemp.address, ownerAddress, "100", "13800", 125, 100, 120, 150, {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });
            
            await time.advanceBlockTo("13799")
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            await time.advanceBlockTo("13804")
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            await time.advanceBlockTo("13809")
            await this.LP.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.chef.deposit(userAddress2, "10", { from: userAddress2 }) // block 210
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
        })

        it("should distribute vemp properly for each staker", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefLP.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, this.LP.address, this.xvemp.address, ownerAddress, "100", "14100", 125, 100, 120, 150, {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.LP.approve(this.chef.address, "1000000000000", { from: userAddress1 });
            await this.LP.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.LP.approve(this.chef.address, "1000000000000", { from: userAddress3 });

            // userAddress1 deposits 10 LPs at block 310
            await time.advanceBlockTo("14109")
            await this.chef.deposit(userAddress1, "10", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 314
            await time.advanceBlockTo("14113")
            await this.chef.deposit(userAddress2, "20", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 318
            await time.advanceBlockTo("14117")
            await this.chef.deposit(userAddress3, "30", { from: userAddress3 })
            
            await time.advanceBlockTo("14119")
            await this.chef.deposit(userAddress1, "10", { from: userAddress1 })
            expect(await this.vemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(566))
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            expect(await this.vemp.balanceOf(userAddress3)).to.be.bignumber.equal(new BN(0))
            
            await time.advanceBlockTo("14129")
            expect(await this.chef.pendingVEMP(userAddress1)).to.be.bignumber.equal(new BN(257))
            expect(await this.chef.pendingVEMP(userAddress2)).to.be.bignumber.equal(new BN(590))
            expect(await this.chef.pendingVEMP(userAddress3)).to.be.bignumber.equal(new BN(486))
        })
        
        it("Transfer Ownership", async function () {
            this.chef = await MasterChefLP.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, this.LP.address, this.xvemp.address, ownerAddress, "100", "14660", 125, 100, 120, 150, {from: ownerAddress, gas: 8000000});
            
            await expectRevert(this.chef.transferOwnership(userAddress1, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner");

            await this.chef.transferOwnership(userAddress1, {from: ownerAddress, gas: 8000000});
            expect(await this.chef.owner()).to.equal(userAddress1)
        })
    })

    describe("Access LP Tokens by Admin", function () {
        it("Failed if any user(not admin) want to access LP tokens", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefLP.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, this.LP.address, this.xvemp.address, ownerAddress, "100", "15200", 125, 100, 120, 150, {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.LP.approve(this.chef.address, "1000000000000", { from: userAddress1 });
            await this.LP.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.LP.approve(this.chef.address, "1000000000000", { from: userAddress3 });

            // userAddress1 deposits 10 LPs at block 810
            await time.advanceBlockTo("15209")
            await this.chef.deposit(userAddress1, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 814
            await time.advanceBlockTo("15213")
            await this.chef.deposit(userAddress2, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 818
            await time.advanceBlockTo("15217")
            await this.chef.deposit(userAddress3, "60", { from: userAddress3 })

            await expectRevert(this.chef.accessLPTokens(userAddress4, 20, {from: userAddress1, gas: 8000000}), "sender must be admin address");
        })

        it("Failed if any admin want to access LP tokens more then locked amount", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefLP.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, this.LP.address, this.xvemp.address, ownerAddress, "100", "15700", 125, 100, 120, 150, {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.LP.approve(this.chef.address, "1000000000000", { from: userAddress1 });
            await this.LP.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.LP.approve(this.chef.address, "1000000000000", { from: userAddress3 });

            // userAddress1 deposits 10 LPs at block 910
            await time.advanceBlockTo("15709")
            await this.chef.deposit(userAddress1, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 914
            await time.advanceBlockTo("15713")
            await this.chef.deposit(userAddress2, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 918
            await time.advanceBlockTo("15717")
            await this.chef.deposit(userAddress3, "60", { from: userAddress3 })

            await expectRevert(this.chef.accessLPTokens(userAddress4, 101, {from: ownerAddress, gas: 8000000}), "Amount must be less than staked LP amount");
        })

        it("Update All variables on stake and access LP tokens", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefLP.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, this.LP.address, this.xvemp.address, ownerAddress, "100", "16200", 125, 100, 120, 150, {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.LP.approve(this.chef.address, "1000000000000", { from: userAddress1 });
            await this.LP.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.LP.approve(this.chef.address, "1000000000000", { from: userAddress3 });

            // userAddress1 deposits 10 LPs at block 1010
            await time.advanceBlockTo("16209")
            await this.chef.deposit(userAddress1, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 1014
            await time.advanceBlockTo("16213")
            await this.chef.deposit(userAddress2, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 1018
            await time.advanceBlockTo("16217")
            await this.chef.deposit(userAddress3, "60", { from: userAddress3 })

            expect(await this.chef.totalLPStaked()).to.be.bignumber.equal(new BN(100));

            await this.chef.accessLPTokens(userAddress4, 80, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.totalLPUsedForPurchase()).to.be.bignumber.equal(new BN(80))
            expect(await this.chef.totalLPStaked()).to.be.bignumber.equal(new BN(100))
        })
    })

    describe("Re-Distribution of LP tokens to all stake holders in rewards", function () {
        it("Re-Distribute LP tokens by Admin", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefLP.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, this.LP.address, this.xvemp.address, ownerAddress, "100", "16800", 125, 100, 120, 150, {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.LP.approve(this.chef.address, "1000000000000", { from: userAddress1 });
            await this.LP.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.LP.approve(this.chef.address, "1000000000000", { from: userAddress3 });

            // userAddress1 deposits 10 LPs at block 110
            await time.advanceBlockTo("16809")
            await this.chef.deposit(userAddress1, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 1114
            await time.advanceBlockTo("16813")
            await this.chef.deposit(userAddress2, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 1118
            await time.advanceBlockTo("16817")
            await this.chef.deposit(userAddress3, "60", { from: userAddress3 })

            await this.LP.mint(this.chef.address, "100", {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingLP(userAddress1)).to.be.bignumber.equal(new BN(15))
            expect(await this.chef.pendingLP(userAddress2)).to.be.bignumber.equal(new BN(25))
            expect(await this.chef.pendingLP(userAddress3)).to.be.bignumber.equal(new BN(60))

            await this.LP.mint(this.chef.address, "100", {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingLP(userAddress1)).to.be.bignumber.equal(new BN(30))
            expect(await this.chef.pendingLP(userAddress2)).to.be.bignumber.equal(new BN(50))
            expect(await this.chef.pendingLP(userAddress3)).to.be.bignumber.equal(new BN(120))
        })
    })

    describe("Claim LP Reward tokens", function () {
        it("Claim LP tokens by stakers", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefLP.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, this.LP.address, this.xvemp.address, ownerAddress, "100", "17300", 125, 100, 120, 150, {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.LP.approve(this.chef.address, "1000000000000", { from: userAddress1 });
            await this.LP.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.LP.approve(this.chef.address, "1000000000000", { from: userAddress3 });

            // userAddress1 deposits 10 LPs at block 1210
            await time.advanceBlockTo("17309")
            await this.chef.deposit(userAddress1, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 1214
            await time.advanceBlockTo("17313")
            await this.chef.deposit(userAddress2, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 1218
            await time.advanceBlockTo("17317")
            await this.chef.deposit(userAddress3, "60", { from: userAddress3 })

            await this.LP.mint(this.chef.address, "100", {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingLP(userAddress1)).to.be.bignumber.equal(new BN(15))
            expect(await this.chef.pendingLP(userAddress2)).to.be.bignumber.equal(new BN(25))
            expect(await this.chef.pendingLP(userAddress3)).to.be.bignumber.equal(new BN(60))

            await this.LP.mint(this.chef.address, "100", {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingLP(userAddress1)).to.be.bignumber.equal(new BN(30))
            expect(await this.chef.pendingLP(userAddress2)).to.be.bignumber.equal(new BN(50))
            expect(await this.chef.pendingLP(userAddress3)).to.be.bignumber.equal(new BN(120))

            await this.chef.claimLP({from: userAddress1, gas: 8000000});
            await this.chef.claimLP({from: userAddress2, gas: 8000000});
            await this.chef.claimLP({from: userAddress3, gas: 8000000});
        })
    })
})


