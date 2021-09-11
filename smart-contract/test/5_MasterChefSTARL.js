const { accounts, contract, privateKeys } = require('@openzeppelin/test-environment');

const { BN, expectRevert, time, expectEvent, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { signTypedData } = require('eth-sig-util');

const MAX_DEPLOYED_BYTECODE_SIZE = 24576;
const MasterChefSTARL = contract.fromArtifact('MasterChefSTARL');
const MockToken = contract.fromArtifact('MockToken');

const {
    encodeParameters
} = require('../Utils/Ethereum');

describe('MasterChefSTARL', function () {
    const [ ownerAddress, userAddress1, userAddress2, userAddress3, userAddress4 ] = accounts;
    beforeEach(async function () {
        this.vemp = await MockToken.new("VEMP", "VEMP", {from: ownerAddress, gas: 8000000});
        this.lp = await MockToken.new("STARL", "STARL", {from: ownerAddress, gas: 8000000});
        this.chef = await MasterChefSTARL.new(this.vemp.address, ownerAddress, "1000", "6000", {from: ownerAddress, gas: 8000000});
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
            this.chef = await MasterChefSTARL.new(this.vemp.address, ownerAddress, "100", "6100", {from: ownerAddress, gas: 8000000});
            
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });
            
            await this.lp.approve(this.chef.address, "1000", { from: userAddress2 })
            await this.chef.deposit(0, "100", { from: userAddress2 })
            await time.advanceBlockTo("6089")

            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 90
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0));
            await time.advanceBlockTo("6094")

            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 95
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            await time.advanceBlockTo("6099")

            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 100
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            await time.advanceBlockTo("6100")

            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 101
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(100))

            await time.advanceBlockTo("6104")
            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 105

            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(500))
        })

        it("should not distribute vemp if no one deposit", async function () {
            // 100 per block farming rate starting at block 200 with bonus until block 1000
            this.chef = await MasterChefSTARL.new(this.vemp.address, ownerAddress, "100", "6200", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            
            await this.lp.approve(this.chef.address, "1000", { from: userAddress2 })
            await time.advanceBlockTo("6199")
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            await time.advanceBlockTo("6204")
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            await time.advanceBlockTo("6209")
            await this.chef.deposit(0, "10", { from: userAddress2 }) // block 210
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            expect(await this.lp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(990))
        })

        it("should distribute vemp properly for each staker", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefSTARL.new(this.vemp.address, ownerAddress, "100", "6300", {from: ownerAddress, gas: 8000000});
            
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
            await time.advanceBlockTo("6309")
            await this.chef.deposit(0, "10", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 314
            await time.advanceBlockTo("6313")
            await this.chef.deposit(0, "20", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 318
            await time.advanceBlockTo("6317")
            await this.chef.deposit(0, "30", { from: userAddress3 })
            
            await time.advanceBlockTo("6319")
            await this.chef.deposit(0, "10", { from: userAddress1 })
            expect(await this.vemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(566))
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            expect(await this.vemp.balanceOf(userAddress3)).to.be.bignumber.equal(new BN(0))
            
            await time.advanceBlockTo("6329")
            expect(await this.chef.pendingVEMP(0, userAddress1)).to.be.bignumber.equal(new BN(257))
            expect(await this.chef.pendingVEMP(0, userAddress2)).to.be.bignumber.equal(new BN(590))
            expect(await this.chef.pendingVEMP(0, userAddress3)).to.be.bignumber.equal(new BN(486))
        })
        
        it("Transfer Ownership", async function () {
            this.chef = await MasterChefSTARL.new(this.vemp.address, ownerAddress, "100", "6400", {from: ownerAddress, gas: 8000000});
            
            await expectRevert(this.chef.transferOwnership(userAddress1, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner");

            await this.chef.transferOwnership(userAddress1, {from: ownerAddress, gas: 8000000});
            expect(await this.chef.owner()).to.equal(userAddress1)
        })
    })

    describe("Access STARL Tokens by Admin", function () {
        beforeEach(async function () {
            await this.lp.transfer(userAddress1, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress2, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress3, "1000", { from: ownerAddress })
        })

        it("Failed if any user(not admin) want to access STARL tokens", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefSTARL.new(this.vemp.address, ownerAddress, "100", "6500", {from: ownerAddress, gas: 8000000});
            
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
            await time.advanceBlockTo("6509")
            await this.chef.deposit(0, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 814
            await time.advanceBlockTo("6513")
            await this.chef.deposit(0, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 818
            await time.advanceBlockTo("6517")
            await this.chef.deposit(0, "60", { from: userAddress3 })

            await expectRevert(this.chef.accessSTARLTokens(0, userAddress4, 20, {from: userAddress1, gas: 8000000}), "sender must be admin address");
        })

        it("Failed if any admin want to access STARL tokens more then locked amount", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefSTARL.new(this.vemp.address, ownerAddress, "100", "6600", {from: ownerAddress, gas: 8000000});
            
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
            await time.advanceBlockTo("6609")
            await this.chef.deposit(0, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 914
            await time.advanceBlockTo("6613")
            await this.chef.deposit(0, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 918
            await time.advanceBlockTo("6617")
            await this.chef.deposit(0, "60", { from: userAddress3 })

            await expectRevert(this.chef.accessSTARLTokens(0, userAddress4, 101, {from: ownerAddress, gas: 8000000}), "Amount must be less than staked STARL amount");
        })

        it("Update All variables on stake and access STARL tokens", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefSTARL.new(this.vemp.address, ownerAddress, "100", "6700", {from: ownerAddress, gas: 8000000});
            
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
            await time.advanceBlockTo("6709")
            await this.chef.deposit(0, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 1014
            await time.advanceBlockTo("6713")
            await this.chef.deposit(0, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 1018
            await time.advanceBlockTo("6717")
            await this.chef.deposit(0, "60", { from: userAddress3 })

            expect(await this.chef.totalSTARLStaked()).to.be.bignumber.equal(new BN(100));

            await this.chef.accessSTARLTokens(0, userAddress4, 80, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.totalSTARLUsedForPurchase()).to.be.bignumber.equal(new BN(80))
            expect(await this.chef.totalSTARLStaked()).to.be.bignumber.equal(new BN(100))
            expect(await this.lp.balanceOf(userAddress4)).to.be.bignumber.equal(new BN(80))
        })
    })

    describe("Re-Distribution of STARL tokens to all stake holders in rewards", function () {
        beforeEach(async function () {
            await this.lp.transfer(userAddress1, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress2, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress3, "1000", { from: ownerAddress })
        })

        it("Re-Distribute STARL tokens by Admin", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefSTARL.new(this.vemp.address, ownerAddress, "100", "6800", {from: ownerAddress, gas: 8000000});
            
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
            await time.advanceBlockTo("6809")
            await this.chef.deposit(0, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 1114
            await time.advanceBlockTo("6813")
            await this.chef.deposit(0, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 1118
            await time.advanceBlockTo("6817")
            await this.chef.deposit(0, "60", { from: userAddress3 })

            await this.lp.transfer(this.chef.address, 100, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingSTARL(0, userAddress1)).to.be.bignumber.equal(new BN(15))
            expect(await this.chef.pendingSTARL(0, userAddress2)).to.be.bignumber.equal(new BN(25))
            expect(await this.chef.pendingSTARL(0, userAddress3)).to.be.bignumber.equal(new BN(60))

            await this.lp.transfer(this.chef.address, 100, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingSTARL(0, userAddress1)).to.be.bignumber.equal(new BN(30))
            expect(await this.chef.pendingSTARL(0, userAddress2)).to.be.bignumber.equal(new BN(50))
            expect(await this.chef.pendingSTARL(0, userAddress3)).to.be.bignumber.equal(new BN(120))
        })
    })

    describe("Claim STARL Reward tokens", function () {
        beforeEach(async function () {
            await this.lp.transfer(userAddress1, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress2, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress3, "1000", { from: ownerAddress })
        })

        it("Claim STARL tokens by stakers", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefSTARL.new(this.vemp.address, ownerAddress, "100", "6900", {from: ownerAddress, gas: 8000000});
            
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
            await time.advanceBlockTo("6909")
            await this.chef.deposit(0, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 1214
            await time.advanceBlockTo("6913")
            await this.chef.deposit(0, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 1218
            await time.advanceBlockTo("6917")
            await this.chef.deposit(0, "60", { from: userAddress3 })

            await this.lp.transfer(this.chef.address, 100, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingSTARL(0, userAddress1)).to.be.bignumber.equal(new BN(15))
            expect(await this.chef.pendingSTARL(0, userAddress2)).to.be.bignumber.equal(new BN(25))
            expect(await this.chef.pendingSTARL(0, userAddress3)).to.be.bignumber.equal(new BN(60))

            await this.lp.transfer(this.chef.address, 100, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingSTARL(0, userAddress1)).to.be.bignumber.equal(new BN(30))
            expect(await this.chef.pendingSTARL(0, userAddress2)).to.be.bignumber.equal(new BN(50))
            expect(await this.chef.pendingSTARL(0, userAddress3)).to.be.bignumber.equal(new BN(120))

            await this.chef.claimSTARL(0, {from: userAddress1, gas: 8000000});
            await this.chef.claimSTARL(0, {from: userAddress2, gas: 8000000});
            await this.chef.claimSTARL(0, {from: userAddress3, gas: 8000000});

            expect(await this.lp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(1015))
            expect(await this.lp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(1025))
            expect(await this.lp.balanceOf(userAddress3)).to.be.bignumber.equal(new BN(1060))

            expect(await this.lp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100))
        })
    })
})