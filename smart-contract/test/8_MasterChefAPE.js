const { accounts, contract, privateKeys } = require('@openzeppelin/test-environment');

const { BN, expectRevert, time, expectEvent, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { signTypedData } = require('eth-sig-util');

const MAX_DEPLOYED_BYTECODE_SIZE = 24576;
const MasterChefAPE = contract.fromArtifact('MasterChefAPE');
const MockToken = contract.fromArtifact('MockToken');

const {
    encodeParameters
} = require('../Utils/Ethereum');

describe('MasterChefAPE', function () {
    const [ ownerAddress, userAddress1, userAddress2, userAddress3, userAddress4 ] = accounts;
    beforeEach(async function () {
        this.vemp = await MockToken.new("VEMP", "VEMP", {from: ownerAddress, gas: 8000000});
        this.ape = await MockToken.new("APE", "APE", {from: ownerAddress, gas: 8000000});
        this.chef = await MasterChefAPE.new({from: ownerAddress, gas: 8000000});
        await this.chef.initialize(this.vemp.address, this.ape.address, ownerAddress, "1000", "0", {from: ownerAddress, gas: 8000000});
        await this.vemp.mint(ownerAddress, "1000000000000000000000000");
        await this.ape.mint(ownerAddress, "1000000000000000000000000");
        await this.ape.mint(userAddress1, "1000000000000000000000000", {from: userAddress1, gas: 8000000});
        await this.ape.mint(userAddress3, "1000000000000000000000000", {from: userAddress3, gas: 8000000});
        await this.ape.mint(userAddress2, "1000000000000000000000000", {from: userAddress2, gas: 8000000});
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
            await this.ape.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.chef.deposit("100", { from: userAddress2 })
            await this.chef.withdraw(100,{ from: userAddress2 });

            let userInfo = await this.chef.userInfo(userAddress2);
            expect(userInfo[0]).to.be.bignumber.equal(new BN(0));
            expect(userInfo[1]).to.be.bignumber.equal(new BN(0));
            expect(userInfo[2]).to.be.bignumber.equal(new BN(0));
        })

        it("not allow withdraw staked tokens", async function () {
            await this.ape.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.chef.deposit("100", { from: userAddress2 })
            await this.chef.updateWithdrawStatus(true, { from: ownerAddress })
            await expectRevert(this.chef.withdraw(100,{ from: userAddress2 }), "Withdraw not allowed");
        })
    });

    describe("With ERC/LP token added to the field", function () {
        it("should give out vemp only after farming time", async function () {
            this.chef = await MasterChefAPE.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, this.ape.address, ownerAddress, "100", "10200", {from: ownerAddress, gas: 8000000});
    
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });
            
            await this.ape.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.chef.deposit("100", { from: userAddress2 })
            await time.advanceBlockTo("10189")

            await this.chef.deposit("0", { from: userAddress2 }) // block 90
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0));
            await time.advanceBlockTo("10194")

            await this.chef.deposit("0", { from: userAddress2 }) // block 95
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            await time.advanceBlockTo("10199")

            await this.chef.deposit("0", { from: userAddress2 }) // block 100
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            await time.advanceBlockTo("10200")

            await this.chef.deposit("0", { from: userAddress2 }) // block 101
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(100))

            await time.advanceBlockTo("10204")
            await this.chef.deposit("0", { from: userAddress2 }) // block 105

            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(500))
        })

        it("should not distribute vemp if no one deposit", async function () {
            // 100 per block farming rate starting at block 200 with bonus until block 1000
            this.chef = await MasterChefAPE.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, this.ape.address, ownerAddress, "100", "10300", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });
            
            await time.advanceBlockTo("10299")
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            await time.advanceBlockTo("10304")
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            await time.advanceBlockTo("10309")
            await this.ape.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.chef.deposit("10", { from: userAddress2 }) // block 210
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
        })

        it("should distribute vemp properly for each staker", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefAPE.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, this.ape.address, ownerAddress, "100", "10400", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.ape.approve(this.chef.address, "1000000000000", { from: userAddress1 });
            await this.ape.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.ape.approve(this.chef.address, "1000000000000", { from: userAddress3 });

            // userAddress1 deposits 10 LPs at block 310
            await time.advanceBlockTo("10409")
            await this.chef.deposit("10", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 314
            await time.advanceBlockTo("10413")
            await this.chef.deposit("20", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 318
            await time.advanceBlockTo("10417")
            await this.chef.deposit("30", { from: userAddress3 })
            
            await time.advanceBlockTo("10419")
            await this.chef.deposit("10", { from: userAddress1 })
            expect(await this.vemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(566))
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            expect(await this.vemp.balanceOf(userAddress3)).to.be.bignumber.equal(new BN(0))
            
            await time.advanceBlockTo("10429")
            expect(await this.chef.pendingVEMP(userAddress1)).to.be.bignumber.equal(new BN(257))
            expect(await this.chef.pendingVEMP(userAddress2)).to.be.bignumber.equal(new BN(590))
            expect(await this.chef.pendingVEMP(userAddress3)).to.be.bignumber.equal(new BN(486))
        })
        
        it("Transfer Ownership", async function () {
            this.chef = await MasterChefAPE.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, this.ape.address, ownerAddress, "100", "10460", {from: ownerAddress, gas: 8000000});
            
            await expectRevert(this.chef.transferOwnership(userAddress1, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner");

            await this.chef.transferOwnership(userAddress1, {from: ownerAddress, gas: 8000000});
            expect(await this.chef.owner()).to.equal(userAddress1)
        })
    })

    describe("Access APE Tokens by Admin", function () {
        it("Failed if any user(not admin) want to access APE tokens", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefAPE.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, this.ape.address, ownerAddress, "100", "10500", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.ape.approve(this.chef.address, "1000000000000", { from: userAddress1 });
            await this.ape.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.ape.approve(this.chef.address, "1000000000000", { from: userAddress3 });

            // userAddress1 deposits 10 LPs at block 810
            await time.advanceBlockTo("10509")
            await this.chef.deposit("15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 814
            await time.advanceBlockTo("10513")
            await this.chef.deposit("25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 818
            await time.advanceBlockTo("10517")
            await this.chef.deposit("60", { from: userAddress3 })

            await expectRevert(this.chef.accessAPETokens(userAddress4, 20, {from: userAddress1, gas: 8000000}), "sender must be admin address");
        })

        it("Failed if any admin want to access APE tokens more then locked amount", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefAPE.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, this.ape.address, ownerAddress, "100", "10600", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.ape.approve(this.chef.address, "1000000000000", { from: userAddress1 });
            await this.ape.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.ape.approve(this.chef.address, "1000000000000", { from: userAddress3 });

            // userAddress1 deposits 10 LPs at block 910
            await time.advanceBlockTo("10609")
            await this.chef.deposit("15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 914
            await time.advanceBlockTo("10613")
            await this.chef.deposit("25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 918
            await time.advanceBlockTo("10617")
            await this.chef.deposit("60", { from: userAddress3 })

            await expectRevert(this.chef.accessAPETokens(userAddress4, 101, {from: ownerAddress, gas: 8000000}), "Amount must be less than staked APE amount");
        })

        it("Update All variables on stake and access APE tokens", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefAPE.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, this.ape.address, ownerAddress, "100", "11000", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.ape.approve(this.chef.address, "1000000000000", { from: userAddress1 });
            await this.ape.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.ape.approve(this.chef.address, "1000000000000", { from: userAddress3 });

            // userAddress1 deposits 10 LPs at block 1010
            await time.advanceBlockTo("11009")
            await this.chef.deposit("15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 1014
            await time.advanceBlockTo("11013")
            await this.chef.deposit("25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 1018
            await time.advanceBlockTo("11017")
            await this.chef.deposit("60", { from: userAddress3 })

            expect(await this.chef.totalAPEStaked()).to.be.bignumber.equal(new BN(100));

            await this.chef.accessAPETokens(userAddress4, 80, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.totalAPEUsedForPurchase()).to.be.bignumber.equal(new BN(80))
            expect(await this.chef.totalAPEStaked()).to.be.bignumber.equal(new BN(100))
        })
    })

    describe("Re-Distribution of APE tokens to all stake holders in rewards", function () {
        it("Re-Distribute APE tokens by Admin", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefAPE.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, this.ape.address, ownerAddress, "100", "11100", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.ape.approve(this.chef.address, "1000000000000", { from: userAddress1 });
            await this.ape.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.ape.approve(this.chef.address, "1000000000000", { from: userAddress3 });

            // userAddress1 deposits 10 LPs at block 110
            await time.advanceBlockTo("11109")
            await this.chef.deposit("15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 1114
            await time.advanceBlockTo("11113")
            await this.chef.deposit("25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 1118
            await time.advanceBlockTo("11117")
            await this.chef.deposit("60", { from: userAddress3 })

            await this.ape.mint(this.chef.address, "100", {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingAPE(userAddress1)).to.be.bignumber.equal(new BN(15))
            expect(await this.chef.pendingAPE(userAddress2)).to.be.bignumber.equal(new BN(25))
            expect(await this.chef.pendingAPE(userAddress3)).to.be.bignumber.equal(new BN(60))

            await this.ape.mint(this.chef.address, "100", {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingAPE(userAddress1)).to.be.bignumber.equal(new BN(30))
            expect(await this.chef.pendingAPE(userAddress2)).to.be.bignumber.equal(new BN(50))
            expect(await this.chef.pendingAPE(userAddress3)).to.be.bignumber.equal(new BN(120))
        })
    })

    describe("Claim APE Reward tokens", function () {
        it("Claim APE tokens by stakers", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefAPE.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, this.ape.address, ownerAddress, "100", "11200", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.ape.approve(this.chef.address, "1000000000000", { from: userAddress1 });
            await this.ape.approve(this.chef.address, "1000000000000", { from: userAddress2 });
            await this.ape.approve(this.chef.address, "1000000000000", { from: userAddress3 });

            // userAddress1 deposits 10 LPs at block 1210
            await time.advanceBlockTo("11209")
            await this.chef.deposit("15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 1214
            await time.advanceBlockTo("11213")
            await this.chef.deposit("25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 1218
            await time.advanceBlockTo("11217")
            await this.chef.deposit("60", { from: userAddress3 })

            await this.ape.mint(this.chef.address, "100", {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingAPE(userAddress1)).to.be.bignumber.equal(new BN(15))
            expect(await this.chef.pendingAPE(userAddress2)).to.be.bignumber.equal(new BN(25))
            expect(await this.chef.pendingAPE(userAddress3)).to.be.bignumber.equal(new BN(60))

            await this.ape.mint(this.chef.address, "100", {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingAPE(userAddress1)).to.be.bignumber.equal(new BN(30))
            expect(await this.chef.pendingAPE(userAddress2)).to.be.bignumber.equal(new BN(50))
            expect(await this.chef.pendingAPE(userAddress3)).to.be.bignumber.equal(new BN(120))

            await this.chef.claimAPE({from: userAddress1, gas: 8000000});
            await this.chef.claimAPE({from: userAddress2, gas: 8000000});
            await this.chef.claimAPE({from: userAddress3, gas: 8000000});
        })
    })
})


