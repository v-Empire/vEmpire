const { accounts, contract, privateKeys } = require('@openzeppelin/test-environment');

const { BN, expectRevert, time, expectEvent, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { signTypedData } = require('eth-sig-util');

const MAX_DEPLOYED_BYTECODE_SIZE = 24576;
const MasterChefLPPool = contract.fromArtifact('MasterChefLPPool');
const MockToken = contract.fromArtifact('MockToken');

const {
    encodeParameters
} = require('../Utils/Ethereum');

describe('MasterChefLPPool', function () {
    const [ ownerAddress, userAddress1, userAddress2, userAddress3, userAddress4 ] = accounts;
    beforeEach(async function () {
        this.vemp = await MockToken.new("VEMP", "VEMP", {from: ownerAddress, gas: 8000000});
        this.lp = await MockToken.new("lp", "lp", {from: ownerAddress, gas: 8000000});
        this.chef = await MasterChefLPPool.new({from: ownerAddress, gas: 8000000});
        await this.chef.initialize(this.vemp.address, ownerAddress, "1000", "0", {from: ownerAddress, gas: 8000000});
        await this.vemp.mint(ownerAddress, "1000000000000000000000000");
        await this.lp.mint(ownerAddress, "1000000000000000000000000");
        await this.lp.mint(userAddress1, "1000000000000000000000000", {from: userAddress1, gas: 8000000});
        await this.lp.mint(userAddress3, "1000000000000000000000000", {from: userAddress3, gas: 8000000});
        await this.lp.mint(userAddress2, "1000000000000000000000000", {from: userAddress2, gas: 8000000});
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
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            expect(await this.chef.rewardEndStatus()).to.equal(false)
            await expectRevert(this.chef.updateRewardEndStatus(true, 100, { from: userAddress1 }), "Ownable: caller is not the owner")
            await this.chef.updateRewardEndStatus(true, 30000, { from: ownerAddress })
            expect(await this.chef.rewardEndStatus()).to.equal(true)
            await this.chef.updateRewardEndStatus(false, 31000,  { from: ownerAddress })
            expect(await this.chef.rewardEndStatus()).to.equal(false)
        })

        it("should allow admin and only admin to update updateWithdrawStatus", async function () {
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            expect(await this.chef.withdrawStatus()).to.equal(false)
            await expectRevert(this.chef.updateWithdrawStatus(true, { from: userAddress1 }), "Ownable: caller is not the owner")
            await this.chef.updateWithdrawStatus(true, { from: ownerAddress })
            expect(await this.chef.withdrawStatus()).to.equal(true)
            await this.chef.updateWithdrawStatus(false, { from: ownerAddress })
            expect(await this.chef.withdrawStatus()).to.equal(false)
        })
    });

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
        it("allow withdraw staked tokens", async function () {
            await this.lp.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            await this.chef.deposit(0, "100", { from: userAddress2 })
            await this.chef.withdraw(0, 100,{ from: userAddress2 });

            let userInfo = await this.chef.userInfo(0, userAddress2);
            expect(userInfo[0]).to.be.bignumber.equal(new BN(0));
            expect(userInfo[1]).to.be.bignumber.equal(new BN(0));
        })

        it("not allow withdraw staked tokens", async function () {
            await this.lp.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            await this.chef.deposit(0, "100", { from: userAddress2 })
            await this.chef.updateWithdrawStatus(true, { from: ownerAddress })
            await expectRevert(this.chef.withdraw(0, 100,{ from: userAddress2 }), "Withdraw not allowed");
        })
    });

    describe("With ERC/LP token added to the field", function () {
        it("should give out vemp only after farming time", async function () {
            this.chef = await MasterChefLPPool.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, ownerAddress, "100", "21600", {from: ownerAddress, gas: 8000000});
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })

            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });
            
            await this.lp.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.chef.deposit(0, "100", { from: userAddress2 })
            await time.advanceBlockTo("21589")

            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 90
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0));
            await time.advanceBlockTo("21594")

            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 95
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            await time.advanceBlockTo("21599")

            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 100
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            await time.advanceBlockTo("21600")

            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 101
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(100))

            await time.advanceBlockTo("21604")
            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 105

            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(500))
        })

        it("should not distribute vemp if no one deposit", async function () {
            // 100 per block farming rate starting at block 200 with bonus until block 1000
            this.chef = await MasterChefLPPool.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, ownerAddress, "100", "21700", {from: ownerAddress, gas: 8000000});
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })

            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });
            
            await time.advanceBlockTo("21699")
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            await time.advanceBlockTo("21704")
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            await time.advanceBlockTo("21709")
            await this.lp.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.chef.deposit(0, "10", { from: userAddress2 }) // block 210
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
        })

        it("should distribute vemp properly for each staker", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefLPPool.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, ownerAddress, "100", "22100", {from: ownerAddress, gas: 8000000});
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })

            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.lp.approve(this.chef.address, "1000000000000", { from: userAddress1 });
            await this.lp.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.lp.approve(this.chef.address, "1000000000000", { from: userAddress3 });

            // userAddress1 deposits 10 LPs at block 310
            await time.advanceBlockTo("22109")
            await this.chef.deposit(0, "10", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 314
            await time.advanceBlockTo("22113")
            await this.chef.deposit(0, "20", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 318
            await time.advanceBlockTo("22117")
            await this.chef.deposit(0, "30", { from: userAddress3 })
            
            await time.advanceBlockTo("22119")
            await this.chef.deposit(0, "10", { from: userAddress1 })
            expect(await this.vemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(566))
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            expect(await this.vemp.balanceOf(userAddress3)).to.be.bignumber.equal(new BN(0))
            
            await time.advanceBlockTo("22129")
            expect(await this.chef.pendingVEMP(0, userAddress1)).to.be.bignumber.equal(new BN(257))
            expect(await this.chef.pendingVEMP(0, userAddress2)).to.be.bignumber.equal(new BN(590))
            expect(await this.chef.pendingVEMP(0, userAddress3)).to.be.bignumber.equal(new BN(486))
        })
        
        it("Transfer Ownership", async function () {
            this.chef = await MasterChefLPPool.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, ownerAddress, "100", "22660", {from: ownerAddress, gas: 8000000});
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })

            await expectRevert(this.chef.transferOwnership(userAddress1, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner");

            await this.chef.transferOwnership(userAddress1, {from: ownerAddress, gas: 8000000});
            expect(await this.chef.owner()).to.equal(userAddress1)
        })
    })
})


