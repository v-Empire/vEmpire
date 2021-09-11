const { accounts, contract, privateKeys } = require('@openzeppelin/test-environment');

const { BN, expectRevert, time, expectEvent, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { signTypedData } = require('eth-sig-util');

const MAX_DEPLOYED_BYTECODE_SIZE = 24576;
const MasterChefMana = contract.fromArtifact('MasterChefMana');
const MockToken = contract.fromArtifact('MockToken');

const {
    encodeParameters
} = require('../Utils/Ethereum');

describe('MasterChefMana', function () {
    const [ ownerAddress, userAddress1, userAddress2, userAddress3, userAddress4 ] = accounts;
    beforeEach(async function () {
        this.vemp = await MockToken.new("VEMP", "VEMP", {from: ownerAddress, gas: 8000000});
        this.lp = await MockToken.new("MANA", "MANA", {from: ownerAddress, gas: 8000000});
        this.chef = await MasterChefMana.new(this.vemp.address, ownerAddress, "1000", "0", {from: ownerAddress, gas: 8000000});
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
            this.chef = await MasterChefMana.new(this.vemp.address, ownerAddress, "100", "1400", {from: ownerAddress, gas: 8000000});
            
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });
            
            await this.lp.approve(this.chef.address, "1000", { from: userAddress2 })
            await this.chef.deposit(0, "100", { from: userAddress2 })
            await time.advanceBlockTo("1389")

            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 90
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0));
            await time.advanceBlockTo("1394")

            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 95
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            await time.advanceBlockTo("1399")

            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 100
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            await time.advanceBlockTo("1400")

            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 101
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(100))

            await time.advanceBlockTo("1404")
            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 105

            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(500))
        })

        it("should not distribute vemp if no one deposit", async function () {
            // 100 per block farming rate starting at block 200 with bonus until block 1000
            this.chef = await MasterChefMana.new(this.vemp.address, ownerAddress, "100", "1400", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            
            await this.lp.approve(this.chef.address, "1000", { from: userAddress2 })
            await time.advanceBlockTo("1499")
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            await time.advanceBlockTo("1504")
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            await time.advanceBlockTo("1509")
            await this.chef.deposit(0, "10", { from: userAddress2 }) // block 210
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            expect(await this.lp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(990))
        })

        it("should distribute vemp properly for each staker", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefMana.new(this.vemp.address, ownerAddress, "100", "1600", {from: ownerAddress, gas: 8000000});
            
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
            await time.advanceBlockTo("1609")
            await this.chef.deposit(0, "10", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 314
            await time.advanceBlockTo("1613")
            await this.chef.deposit(0, "20", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 318
            await time.advanceBlockTo("1617")
            await this.chef.deposit(0, "30", { from: userAddress3 })
            
            await time.advanceBlockTo("1619")
            await this.chef.deposit(0, "10", { from: userAddress1 })
            expect(await this.vemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(566))
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            expect(await this.vemp.balanceOf(userAddress3)).to.be.bignumber.equal(new BN(0))
            
            await time.advanceBlockTo("1629")
            expect(await this.chef.pendingVEMP(0, userAddress1)).to.be.bignumber.equal(new BN(257))
            expect(await this.chef.pendingVEMP(0, userAddress2)).to.be.bignumber.equal(new BN(590))
            expect(await this.chef.pendingVEMP(0, userAddress3)).to.be.bignumber.equal(new BN(486))
        })
        
        it("Transfer Ownership", async function () {
            this.chef = await MasterChefMana.new(this.vemp.address, ownerAddress, "100", "1650", {from: ownerAddress, gas: 8000000});
            
            await expectRevert(this.chef.transferOwnership(userAddress1, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner");

            await this.chef.transferOwnership(userAddress1, {from: ownerAddress, gas: 8000000});
            expect(await this.chef.owner()).to.equal(userAddress1)
        })
    })

    describe("Access Mana Tokens by Admin", function () {
        beforeEach(async function () {
            await this.lp.transfer(userAddress1, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress2, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress3, "1000", { from: ownerAddress })
        })

        it("Failed if any user(not admin) want to access MANA tokens", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefMana.new(this.vemp.address, ownerAddress, "100", "1700", {from: ownerAddress, gas: 8000000});
            
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
            await time.advanceBlockTo("1709")
            await this.chef.deposit(0, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 814
            await time.advanceBlockTo("1713")
            await this.chef.deposit(0, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 818
            await time.advanceBlockTo("1717")
            await this.chef.deposit(0, "60", { from: userAddress3 })

            await expectRevert(this.chef.accessMANATokens(0, userAddress4, 20, {from: userAddress1, gas: 8000000}), "sender must be admin address");
        })

        it("Failed if any admin want to access MANA tokens more then locked amount", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefMana.new(this.vemp.address, ownerAddress, "100", "1800", {from: ownerAddress, gas: 8000000});
            
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
            await time.advanceBlockTo("1809")
            await this.chef.deposit(0, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 914
            await time.advanceBlockTo("1813")
            await this.chef.deposit(0, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 918
            await time.advanceBlockTo("1817")
            await this.chef.deposit(0, "60", { from: userAddress3 })

            await expectRevert(this.chef.accessMANATokens(0, userAddress4, 101, {from: ownerAddress, gas: 8000000}), "Amount must be less than staked MANA amount");
        })

        it("Update All variables on stake and access MANA tokens", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefMana.new(this.vemp.address, ownerAddress, "100", "1900", {from: ownerAddress, gas: 8000000});
            
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
            await time.advanceBlockTo("1909")
            await this.chef.deposit(0, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 1014
            await time.advanceBlockTo("1913")
            await this.chef.deposit(0, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 1018
            await time.advanceBlockTo("1917")
            await this.chef.deposit(0, "60", { from: userAddress3 })

            expect(await this.chef.totalMANAStaked()).to.be.bignumber.equal(new BN(100));

            await this.chef.accessMANATokens(0, userAddress4, 80, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.totalManaUsedForPurchase()).to.be.bignumber.equal(new BN(80))
            expect(await this.chef.totalMANAStaked()).to.be.bignumber.equal(new BN(100))
            expect(await this.lp.balanceOf(userAddress4)).to.be.bignumber.equal(new BN(80))
        })
    })

    describe("Re-Distribution of MANA tokens to all stake holders in rewards", function () {
        beforeEach(async function () {
            await this.lp.transfer(userAddress1, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress2, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress3, "1000", { from: ownerAddress })
        })

        it("Re-Distribute MANA tokens by Admin", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefMana.new(this.vemp.address, ownerAddress, "100", "2000", {from: ownerAddress, gas: 8000000});
            
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
            await time.advanceBlockTo("2009")
            await this.chef.deposit(0, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 1114
            await time.advanceBlockTo("2013")
            await this.chef.deposit(0, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 1118
            await time.advanceBlockTo("2017")
            await this.chef.deposit(0, "60", { from: userAddress3 })

            await this.lp.transfer(this.chef.address, 100, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingMANA(0, userAddress1)).to.be.bignumber.equal(new BN(15))
            expect(await this.chef.pendingMANA(0, userAddress2)).to.be.bignumber.equal(new BN(25))
            expect(await this.chef.pendingMANA(0, userAddress3)).to.be.bignumber.equal(new BN(60))

            await this.lp.transfer(this.chef.address, 100, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingMANA(0, userAddress1)).to.be.bignumber.equal(new BN(30))
            expect(await this.chef.pendingMANA(0, userAddress2)).to.be.bignumber.equal(new BN(50))
            expect(await this.chef.pendingMANA(0, userAddress3)).to.be.bignumber.equal(new BN(120))
        })
    })

    describe("Claim MANA Reward tokens", function () {
        beforeEach(async function () {
            await this.lp.transfer(userAddress1, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress2, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress3, "1000", { from: ownerAddress })
        })

        it("Claim MANA tokens by stakers", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefMana.new(this.vemp.address, ownerAddress, "100", "2100", {from: ownerAddress, gas: 8000000});
            
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
            await time.advanceBlockTo("2109")
            await this.chef.deposit(0, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 1214
            await time.advanceBlockTo("2113")
            await this.chef.deposit(0, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 1218
            await time.advanceBlockTo("2117")
            await this.chef.deposit(0, "60", { from: userAddress3 })

            await this.lp.transfer(this.chef.address, 100, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingMANA(0, userAddress1)).to.be.bignumber.equal(new BN(15))
            expect(await this.chef.pendingMANA(0, userAddress2)).to.be.bignumber.equal(new BN(25))
            expect(await this.chef.pendingMANA(0, userAddress3)).to.be.bignumber.equal(new BN(60))

            await this.lp.transfer(this.chef.address, 100, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingMANA(0, userAddress1)).to.be.bignumber.equal(new BN(30))
            expect(await this.chef.pendingMANA(0, userAddress2)).to.be.bignumber.equal(new BN(50))
            expect(await this.chef.pendingMANA(0, userAddress3)).to.be.bignumber.equal(new BN(120))

            await this.chef.claimMANA(0, {from: userAddress1, gas: 8000000});
            await this.chef.claimMANA(0, {from: userAddress2, gas: 8000000});
            await this.chef.claimMANA(0, {from: userAddress3, gas: 8000000});

            expect(await this.lp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(1015))
            expect(await this.lp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(1025))
            expect(await this.lp.balanceOf(userAddress3)).to.be.bignumber.equal(new BN(1060))

            expect(await this.lp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100))
        })
    })
})


