const { accounts, contract, privateKeys } = require('@openzeppelin/test-environment');

const { BN, expectRevert, time, expectEvent, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { signTypedData } = require('eth-sig-util');

const MAX_DEPLOYED_BYTECODE_SIZE = 24576;
const MasterChefSAND = contract.fromArtifact('MasterChefSAND');
const MockToken = contract.fromArtifact('MockToken');

const {
    encodeParameters
} = require('../Utils/Ethereum');

describe('MasterChefSAND', function () {
    const [ ownerAddress, userAddress1, userAddress2, userAddress3, userAddress4 ] = accounts;
    beforeEach(async function () {
        this.vemp = await MockToken.new("VEMP", "VEMP", {from: ownerAddress, gas: 8000000});
        this.lp = await MockToken.new("SAND", "SAND", {from: ownerAddress, gas: 8000000});
        this.chef = await MasterChefSAND.new(this.vemp.address, ownerAddress, "1000", "3000", {from: ownerAddress, gas: 8000000});
        await this.vemp.mint(ownerAddress, "1000000000000000000000000");
        await this.lp.mint(ownerAddress, "1000000000000000000000000");
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

    });

    describe("With ERC/LP token added to the field", function () {
        beforeEach(async function () {
            await this.lp.transfer(userAddress1, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress2, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress3, "1000", { from: ownerAddress })
        })

        it("should give out vemp only after farming time", async function () {
            // 100 per block farming rate starting at block 100 with bonus until block 1000
            this.chef = await MasterChefSAND.new(this.vemp.address, ownerAddress, "100", "3100", {from: ownerAddress, gas: 8000000});
            
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });
            
            await this.lp.approve(this.chef.address, "1000", { from: userAddress2 })
            await this.chef.deposit(0, "100", { from: userAddress2 })
            await time.advanceBlockTo("3089")

            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 90
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0));
            await time.advanceBlockTo("3094")

            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 95
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            await time.advanceBlockTo("3099")

            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 100
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            await time.advanceBlockTo("3100")

            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 101
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(100))

            await time.advanceBlockTo("3104")
            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 105

            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(500))
        })

        it("should not distribute vemp if no one deposit", async function () {
            // 100 per block farming rate starting at block 200 with bonus until block 1000
            this.chef = await MasterChefSAND.new(this.vemp.address, ownerAddress, "100", "3200", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            
            await this.lp.approve(this.chef.address, "1000", { from: userAddress2 })
            await time.advanceBlockTo("3199")
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            await time.advanceBlockTo("3204")
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            await time.advanceBlockTo("3209")
            await this.chef.deposit(0, "10", { from: userAddress2 }) // block 210
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            expect(await this.lp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(990))
        })

        it("should distribute vemp properly for each staker", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefSAND.new(this.vemp.address, ownerAddress, "100", "3300", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            
            await this.lp.approve(this.chef.address, "1000", {
                from: userAddress1,
            })
            await this.lp.approve(this.chef.address, "1000", {
                from: userAddress2,
            })
            await this.lp.approve(this.chef.address, "1000", {
                from: userAddress3,
            })
            // userAddress1 deposits 10 LPs at block 310
            await time.advanceBlockTo("3309")
            await this.chef.deposit(0, "10", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 314
            await time.advanceBlockTo("3313")
            await this.chef.deposit(0, "20", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 318
            await time.advanceBlockTo("3317")
            await this.chef.deposit(0, "30", { from: userAddress3 })
            
            await time.advanceBlockTo("3319")
            await this.chef.deposit(0, "10", { from: userAddress1 })
            expect(await this.vemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(566))
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            expect(await this.vemp.balanceOf(userAddress3)).to.be.bignumber.equal(new BN(0))
            
            await time.advanceBlockTo("3329")
            expect(await this.chef.pendingVEMP(0, userAddress1)).to.be.bignumber.equal(new BN(257))
            expect(await this.chef.pendingVEMP(0, userAddress2)).to.be.bignumber.equal(new BN(590))
            expect(await this.chef.pendingVEMP(0, userAddress3)).to.be.bignumber.equal(new BN(486))
        })
        
        it("Transfer Ownership", async function () {
            this.chef = await MasterChefSAND.new(this.vemp.address, ownerAddress, "100", "3400", {from: ownerAddress, gas: 8000000});
            
            await expectRevert(this.chef.transferOwnership(userAddress1, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner");

            await this.chef.transferOwnership(userAddress1, {from: ownerAddress, gas: 8000000});
            expect(await this.chef.owner()).to.equal(userAddress1)
        })
    })

    describe("Access SAND Tokens by Admin", function () {
        beforeEach(async function () {
            await this.lp.transfer(userAddress1, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress2, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress3, "1000", { from: ownerAddress })
        })

        it("Failed if any user(not admin) want to access SAND tokens", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefSAND.new(this.vemp.address, ownerAddress, "100", "3500", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            
            await this.lp.approve(this.chef.address, "1000", {
                from: userAddress1,
            })
            await this.lp.approve(this.chef.address, "1000", {
                from: userAddress2,
            })
            await this.lp.approve(this.chef.address, "1000", {
                from: userAddress3,
            })
            // userAddress1 deposits 10 LPs at block 810
            await time.advanceBlockTo("3509")
            await this.chef.deposit(0, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 814
            await time.advanceBlockTo("3513")
            await this.chef.deposit(0, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 818
            await time.advanceBlockTo("3517")
            await this.chef.deposit(0, "60", { from: userAddress3 })

            await expectRevert(this.chef.accessSANDTokens(0, userAddress4, 20, {from: userAddress1, gas: 8000000}), "sender must be admin address");
        })

        it("Failed if any admin want to access SAND tokens more then locked amount", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefSAND.new(this.vemp.address, ownerAddress, "100", "3600", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            
            await this.lp.approve(this.chef.address, "1000", {
                from: userAddress1,
            })
            await this.lp.approve(this.chef.address, "1000", {
                from: userAddress2,
            })
            await this.lp.approve(this.chef.address, "1000", {
                from: userAddress3,
            })
            // userAddress1 deposits 10 LPs at block 910
            await time.advanceBlockTo("3609")
            await this.chef.deposit(0, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 914
            await time.advanceBlockTo("3613")
            await this.chef.deposit(0, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 918
            await time.advanceBlockTo("3617")
            await this.chef.deposit(0, "60", { from: userAddress3 })

            await expectRevert(this.chef.accessSANDTokens(0, userAddress4, 101, {from: ownerAddress, gas: 8000000}), "Amount must be less than staked SAND amount");
        })

        it("Update All variables on stake and access SAND tokens", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefSAND.new(this.vemp.address, ownerAddress, "100", "3700", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            
            await this.lp.approve(this.chef.address, "1000", {
                from: userAddress1,
            })
            await this.lp.approve(this.chef.address, "1000", {
                from: userAddress2,
            })
            await this.lp.approve(this.chef.address, "1000", {
                from: userAddress3,
            })
            // userAddress1 deposits 10 LPs at block 1010
            await time.advanceBlockTo("3709")
            await this.chef.deposit(0, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 1014
            await time.advanceBlockTo("3713")
            await this.chef.deposit(0, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 1018
            await time.advanceBlockTo("3717")
            await this.chef.deposit(0, "60", { from: userAddress3 })

            expect(await this.chef.totalSANDStaked()).to.be.bignumber.equal(new BN(100));

            await this.chef.accessSANDTokens(0, userAddress4, 80, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.totalSANDUsedForPurchase()).to.be.bignumber.equal(new BN(80))
            expect(await this.chef.totalSANDStaked()).to.be.bignumber.equal(new BN(100))
            expect(await this.lp.balanceOf(userAddress4)).to.be.bignumber.equal(new BN(80))
        })
    })

    describe("Re-Distribution of SAND tokens to all stake holders in rewards", function () {
        beforeEach(async function () {
            await this.lp.transfer(userAddress1, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress2, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress3, "1000", { from: ownerAddress })
        })

        it("Re-Distribute SAND tokens by Admin", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefSAND.new(this.vemp.address, ownerAddress, "100", "3800", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            
            await this.lp.approve(this.chef.address, "1000", {
                from: userAddress1,
            })
            await this.lp.approve(this.chef.address, "1000", {
                from: userAddress2,
            })
            await this.lp.approve(this.chef.address, "1000", {
                from: userAddress3,
            })
            // userAddress1 deposits 10 LPs at block 110
            await time.advanceBlockTo("3809")
            await this.chef.deposit(0, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 1114
            await time.advanceBlockTo("3813")
            await this.chef.deposit(0, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 1118
            await time.advanceBlockTo("3817")
            await this.chef.deposit(0, "60", { from: userAddress3 })

            await this.lp.transfer(this.chef.address, 100, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingSAND(0, userAddress1)).to.be.bignumber.equal(new BN(15))
            expect(await this.chef.pendingSAND(0, userAddress2)).to.be.bignumber.equal(new BN(25))
            expect(await this.chef.pendingSAND(0, userAddress3)).to.be.bignumber.equal(new BN(60))

            await this.lp.transfer(this.chef.address, 100, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingSAND(0, userAddress1)).to.be.bignumber.equal(new BN(30))
            expect(await this.chef.pendingSAND(0, userAddress2)).to.be.bignumber.equal(new BN(50))
            expect(await this.chef.pendingSAND(0, userAddress3)).to.be.bignumber.equal(new BN(120))
        })
    })

    describe("Claim SAND Reward tokens", function () {
        beforeEach(async function () {
            await this.lp.transfer(userAddress1, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress2, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress3, "1000", { from: ownerAddress })
        })

        it("Claim SAND tokens by stakers", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefSAND.new(this.vemp.address, ownerAddress, "100", "3900", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            
            await this.lp.approve(this.chef.address, "1000", {
                from: userAddress1,
            })
            await this.lp.approve(this.chef.address, "1000", {
                from: userAddress2,
            })
            await this.lp.approve(this.chef.address, "1000", {
                from: userAddress3,
            })
            // userAddress1 deposits 10 LPs at block 1210
            await time.advanceBlockTo("3909")
            await this.chef.deposit(0, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 1214
            await time.advanceBlockTo("3913")
            await this.chef.deposit(0, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 1218
            await time.advanceBlockTo("3917")
            await this.chef.deposit(0, "60", { from: userAddress3 })

            await this.lp.transfer(this.chef.address, 100, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingSAND(0, userAddress1)).to.be.bignumber.equal(new BN(15))
            expect(await this.chef.pendingSAND(0, userAddress2)).to.be.bignumber.equal(new BN(25))
            expect(await this.chef.pendingSAND(0, userAddress3)).to.be.bignumber.equal(new BN(60))

            await this.lp.transfer(this.chef.address, 100, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingSAND(0, userAddress1)).to.be.bignumber.equal(new BN(30))
            expect(await this.chef.pendingSAND(0, userAddress2)).to.be.bignumber.equal(new BN(50))
            expect(await this.chef.pendingSAND(0, userAddress3)).to.be.bignumber.equal(new BN(120))

            await this.chef.claimSAND(0, {from: userAddress1, gas: 8000000});
            await this.chef.claimSAND(0, {from: userAddress2, gas: 8000000});
            await this.chef.claimSAND(0, {from: userAddress3, gas: 8000000});

            expect(await this.lp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(1015))
            expect(await this.lp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(1025))
            expect(await this.lp.balanceOf(userAddress3)).to.be.bignumber.equal(new BN(1060))

            expect(await this.lp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100))
        })
    })
})