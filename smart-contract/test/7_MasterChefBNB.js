const { accounts, contract, privateKeys } = require('@openzeppelin/test-environment');

const { BN, expectRevert, time, expectEvent, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { signTypedData } = require('eth-sig-util');

const MAX_DEPLOYED_BYTECODE_SIZE = 24576;
const MasterChefBNB = contract.fromArtifact('MasterChefBNB');
const MockToken = contract.fromArtifact('MockToken');
const MockSendETH = contract.fromArtifact('MockSendEth');

const {
    encodeParameters
} = require('../Utils/Ethereum');

describe('MasterChefBNB', function () {
    const [ ownerAddress, userAddress1, userAddress2, userAddress3, userAddress4 ] = accounts;
    beforeEach(async function () {
        this.vemp = await MockToken.new("VEMP", "VEMP", {from: ownerAddress, gas: 8000000});
        this.sendETH = await MockSendETH.new({from: ownerAddress, gas: 8000000});
        this.chef = await MasterChefBNB.new({from: ownerAddress, gas: 8000000});
        await this.chef.initialize(this.vemp.address, ownerAddress, "1000", "0", {from: ownerAddress, gas: 8000000});
        await this.vemp.mint(ownerAddress, "1000000000000000000000000");
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
            await expectRevert(this.chef.updateRewardEndStatus(true, { from: userAddress1 }), "Ownable: caller is not the owner")
            await this.chef.updateRewardEndStatus(true, { from: ownerAddress })
            expect(await this.chef.rewardEndStatus()).to.equal(true)
            await this.chef.updateRewardEndStatus(false, { from: ownerAddress })
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

    describe('should not allow withdraw before admin allow', function () {
        it("not allow withdraw staked tokens", async function () {
            await this.chef.deposit("100", { from: userAddress2, value: 100 })
            await expectRevert(this.chef.withdraw(100,{ from: userAddress2 }), "Withdraw not allowed");
        })

        it("allow withdraw staked tokens", async function () {
            await this.chef.deposit("100", { from: userAddress2, value: 100 })
            await this.chef.updateWithdrawStatus(true, { from: ownerAddress })
            await this.chef.withdraw(100,{ from: userAddress2 });
        })
    });

    describe("With ERC/LP token added to the field", function () {
        it("should give out vemp only after farming time", async function () {
            this.chef = await MasterChefBNB.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, ownerAddress, "100", "8200", {from: ownerAddress, gas: 8000000});
    
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });
            
            await this.chef.deposit("100", { from: userAddress2, value: 100 })
            await time.advanceBlockTo("8189")

            await this.chef.deposit("0", { from: userAddress2 }) // block 90
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0));
            await time.advanceBlockTo("8194")

            await this.chef.deposit("0", { from: userAddress2 }) // block 95
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            await time.advanceBlockTo("8199")

            await this.chef.deposit("0", { from: userAddress2 }) // block 100
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            await time.advanceBlockTo("8200")

            await this.chef.deposit("0", { from: userAddress2 }) // block 101
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(100))

            await time.advanceBlockTo("8204")
            await this.chef.deposit("0", { from: userAddress2 }) // block 105
            
            await expectRevert(this.chef.deposit(20, {from: userAddress1, gas: 8000000}), "BNB must be equal to staked amount.");
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(500))
        })

        it("should not distribute vemp if no one deposit", async function () {
            // 100 per block farming rate starting at block 200 with bonus until block 1000
            this.chef = await MasterChefBNB.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, ownerAddress, "100", "8300", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });
            
            await time.advanceBlockTo("8299")
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            await time.advanceBlockTo("8304")
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            await time.advanceBlockTo("8309")
            await this.chef.deposit("10", { from: userAddress2, value: 10 }) // block 210
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
        })

        it("should distribute vemp properly for each staker", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefBNB.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, ownerAddress, "100", "8400", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            // userAddress1 deposits 10 LPs at block 310
            await time.advanceBlockTo("8409")
            await this.chef.deposit("10", { from: userAddress1, value: 10 })
            // userAddress2 deposits 20 LPs at block 314
            await time.advanceBlockTo("8413")
            await this.chef.deposit("20", { from: userAddress2, value: 20 })
            // userAddress3 deposits 30 LPs at block 318
            await time.advanceBlockTo("8417")
            await this.chef.deposit("30", { from: userAddress3, value: 30 })
            
            await time.advanceBlockTo("8419")
            await this.chef.deposit("10", { from: userAddress1, value:10 })
            expect(await this.vemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(566))
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            expect(await this.vemp.balanceOf(userAddress3)).to.be.bignumber.equal(new BN(0))
            
            await time.advanceBlockTo("8429")
            expect(await this.chef.pendingVEMP(userAddress1)).to.be.bignumber.equal(new BN(257))
            expect(await this.chef.pendingVEMP(userAddress2)).to.be.bignumber.equal(new BN(590))
            expect(await this.chef.pendingVEMP(userAddress3)).to.be.bignumber.equal(new BN(486))
        })
        
        it("Transfer Ownership", async function () {
            this.chef = await MasterChefBNB.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, ownerAddress, "100", "8460", {from: ownerAddress, gas: 8000000});
            
            await expectRevert(this.chef.transferOwnership(userAddress1, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner");

            await this.chef.transferOwnership(userAddress1, {from: ownerAddress, gas: 8000000});
            expect(await this.chef.owner()).to.equal(userAddress1)
        })
    })

    describe("Access BNB Tokens by Admin", function () {
        it("Failed if any user(not admin) want to access BNB tokens", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefBNB.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, ownerAddress, "100", "8500", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            // userAddress1 deposits 10 LPs at block 810
            await time.advanceBlockTo("8509")
            await this.chef.deposit("15", { from: userAddress1, value: 15 })
            // userAddress2 deposits 20 LPs at block 814
            await time.advanceBlockTo("8513")
            await this.chef.deposit("25", { from: userAddress2, value: 25 })
            // userAddress3 deposits 30 LPs at block 818
            await time.advanceBlockTo("8517")
            await this.chef.deposit("60", { from: userAddress3, value: 60 })

            await expectRevert(this.chef.accessBNBTokens(userAddress4, 20, {from: userAddress1, gas: 8000000}), "sender must be admin address");
        })

        it("Failed if any admin want to access BNB tokens more then locked amount", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefBNB.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, ownerAddress, "100", "8600", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            // userAddress1 deposits 10 LPs at block 910
            await time.advanceBlockTo("8609")
            await this.chef.deposit("15", { from: userAddress1, value: 15 })
            // userAddress2 deposits 20 LPs at block 914
            await time.advanceBlockTo("8613")
            await this.chef.deposit("25", { from: userAddress2, value: 25 })
            // userAddress3 deposits 30 LPs at block 918
            await time.advanceBlockTo("8617")
            await this.chef.deposit("60", { from: userAddress3, value: 60 })

            await expectRevert(this.chef.accessBNBTokens(userAddress4, 101, {from: ownerAddress, gas: 8000000}), "Amount must be less than staked BNB amount");
        })

        it("Update All variables on stake and access BNB tokens", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefBNB.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, ownerAddress, "100", "9000", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            // userAddress1 deposits 10 LPs at block 1010
            await time.advanceBlockTo("9009")
            await this.chef.deposit("15", { from: userAddress1, value: 15 })
            // userAddress2 deposits 20 LPs at block 1014
            await time.advanceBlockTo("9013")
            await this.chef.deposit("25", { from: userAddress2, value: 25 })
            // userAddress3 deposits 30 LPs at block 1018
            await time.advanceBlockTo("9017")
            await this.chef.deposit("60", { from: userAddress3, value: 60 })

            expect(await this.chef.totalBNBStaked()).to.be.bignumber.equal(new BN(100));

            await this.chef.accessBNBTokens(userAddress4, 80, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.totalBNBUsedForPurchase()).to.be.bignumber.equal(new BN(80))
            expect(await this.chef.totalBNBStaked()).to.be.bignumber.equal(new BN(100))
        })
    })

    describe("Re-Distribution of BNB tokens to all stake holders in rewards", function () {
        it("Re-Distribute BNB tokens by Admin", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefBNB.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, ownerAddress, "100", "9100", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            // userAddress1 deposits 10 LPs at block 110
            await time.advanceBlockTo("9109")
            await this.chef.deposit("15", { from: userAddress1, value: 15 })
            // userAddress2 deposits 20 LPs at block 1114
            await time.advanceBlockTo("9113")
            await this.chef.deposit("25", { from: userAddress2, value: 25 })
            // userAddress3 deposits 30 LPs at block 1118
            await time.advanceBlockTo("9117")
            await this.chef.deposit("60", { from: userAddress3, value: 60 })

            await this.sendETH.sendETH(this.chef.address, {from: ownerAddress, value:100, gas: 8000000});

            expect(await this.chef.pendingBNB(userAddress1)).to.be.bignumber.equal(new BN(15))
            expect(await this.chef.pendingBNB(userAddress2)).to.be.bignumber.equal(new BN(25))
            expect(await this.chef.pendingBNB(userAddress3)).to.be.bignumber.equal(new BN(60))

            await this.sendETH.sendETH(this.chef.address, {from: ownerAddress, value:100, gas: 8000000});

            expect(await this.chef.pendingBNB(userAddress1)).to.be.bignumber.equal(new BN(30))
            expect(await this.chef.pendingBNB(userAddress2)).to.be.bignumber.equal(new BN(50))
            expect(await this.chef.pendingBNB(userAddress3)).to.be.bignumber.equal(new BN(120))
        })
    })

    describe("Claim BNB Reward tokens", function () {
        it("Claim BNB tokens by stakers", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefBNB.new({from: ownerAddress, gas: 8000000});
            await this.chef.initialize(this.vemp.address, ownerAddress, "100", "9200", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            // userAddress1 deposits 10 LPs at block 1210
            await time.advanceBlockTo("9209")
            await this.chef.deposit("15", { from: userAddress1, value: 15 })
            // userAddress2 deposits 20 LPs at block 1214
            await time.advanceBlockTo("9213")
            await this.chef.deposit("25", { from: userAddress2, value: 25 })
            // userAddress3 deposits 30 LPs at block 1218
            await time.advanceBlockTo("9217")
            await this.chef.deposit("60", { from: userAddress3, value: 60 })

            await this.sendETH.sendETH(this.chef.address, {from: ownerAddress, value:100, gas: 8000000});

            expect(await this.chef.pendingBNB(userAddress1)).to.be.bignumber.equal(new BN(15))
            expect(await this.chef.pendingBNB(userAddress2)).to.be.bignumber.equal(new BN(25))
            expect(await this.chef.pendingBNB(userAddress3)).to.be.bignumber.equal(new BN(60))

            await this.sendETH.sendETH(this.chef.address, {from: ownerAddress, value:100, gas: 8000000});

            expect(await this.chef.pendingBNB(userAddress1)).to.be.bignumber.equal(new BN(30))
            expect(await this.chef.pendingBNB(userAddress2)).to.be.bignumber.equal(new BN(50))
            expect(await this.chef.pendingBNB(userAddress3)).to.be.bignumber.equal(new BN(120))

            await this.chef.claimBNB({from: userAddress1, gas: 8000000});
            await this.chef.claimBNB({from: userAddress2, gas: 8000000});
            await this.chef.claimBNB({from: userAddress3, gas: 8000000});
        })
    })
})


