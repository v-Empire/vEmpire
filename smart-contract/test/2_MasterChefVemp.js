const { accounts, contract, privateKeys } = require('@openzeppelin/test-environment');

const { BN, expectRevert, time, expectEvent, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { signTypedData } = require('eth-sig-util');

const MAX_DEPLOYED_BYTECODE_SIZE = 24576;
const MasterChefVemp = contract.fromArtifact('MasterChefVemp');
const MockToken = contract.fromArtifact('MockToken');

const {
    encodeParameters
} = require('../Utils/Ethereum');

describe('MasterChefVemp', function () {
    const [ ownerAddress, userAddress1, userAddress2, userAddress3 ] = accounts;
    beforeEach(async function () {
        this.xVemp = await MockToken.new("VEMP", "VEMP", {from: ownerAddress, gas: 8000000});
        this.vemp = await MockToken.new("LPToken", "LP", {from: ownerAddress, gas: 8000000});
        this.chef = await MasterChefVemp.new(this.xVemp.address, ownerAddress, "1000", "0", "1000", {from: ownerAddress, gas: 8000000});
        await this.xVemp.mint(ownerAddress, "1000000000000000000000000");
        await this.vemp.mint(ownerAddress, "1000000000000000000000000");
    });

    describe('set/update variables', function () {
        it("should set correct state variables", async function () {
            const xVemp = await this.chef.xVEMP();
            const adminaddr = await this.chef.adminaddr();

            expect(xVemp).to.equal(this.xVemp.address);
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
            await this.vemp.transfer(userAddress1, "1000", { from: ownerAddress })
            await this.vemp.transfer(userAddress2, "1000", { from: ownerAddress })
            await this.vemp.transfer(userAddress3, "1000", { from: ownerAddress })
        })

        it("should allow emergency withdraw", async function () {
            // 100 per block farming rate starting at block 100 with bonus until block 1000
            this.chef = await MasterChefVemp.new(this.xVemp.address, ownerAddress, "1000", "0", "1000", {from: ownerAddress, gas: 8000000});
            
            await this.chef.add("100", this.vemp.address, true, { from: ownerAddress })

            await this.vemp.approve(this.chef.address, "1000", { from: userAddress2 })
            await this.xVemp.approve(this.chef.address, "1000", { from: userAddress2 })
            
            await this.chef.deposit(0, "100", { from: userAddress2 })

            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(900));
            expect(await this.xVemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(100));

            await this.chef.emergencyWithdraw(0, { from: userAddress2 })

            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(1000));
            expect(await this.xVemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0));
        })

        it("should give out xVemp only after farming time", async function () {
            // 100 per block farming rate starting at block 100 with bonus until block 1000
            this.chef = await MasterChefVemp.new(this.xVemp.address, ownerAddress, "100", "2300", "2400", {from: ownerAddress, gas: 8000000});
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.chef.add("100", this.vemp.address, true, { from: ownerAddress })
            
            await this.vemp.approve(this.chef.address, "1000", { from: userAddress2 })
            await this.xVemp.approve(this.chef.address, "1000", { from: userAddress2 })
            await this.chef.deposit(0, "100", { from: userAddress2 })
            await time.advanceBlockTo("2289")

            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 90
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(900));
            expect(await this.xVemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(100));
            await time.advanceBlockTo("2294")

            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 95
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(900));
            expect(await this.xVemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(100))
            await time.advanceBlockTo("2299")

            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 100
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(900));
            expect(await this.xVemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(100))
            await time.advanceBlockTo("2300")

            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 101
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(1000));
            expect(await this.xVemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(100))

            await time.advanceBlockTo("2304")
            await this.chef.deposit(0, "0", { from: userAddress2 }) // block 105

            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(1400));
            expect(await this.xVemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(100))
        })

        it("should not distribute Vemp if no one deposit", async function () {
            // 100 per block farming rate starting at block 200 with bonus until block 1000
            this.chef = await MasterChefVemp.new(this.xVemp.address, ownerAddress, "100", "2400", "2600", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.chef.add("100", this.vemp.address, true, { from: ownerAddress })
            
            await this.vemp.approve(this.chef.address, "1000", { from: userAddress2 })
            await this.xVemp.approve(this.chef.address, "1000", { from: userAddress2 })

            await time.advanceBlockTo("2499")
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            await time.advanceBlockTo("2504")
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            await time.advanceBlockTo("2509")
            await this.chef.deposit(0, "10", { from: userAddress2 }) // block 210
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000010))
            expect(await this.xVemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(10))
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(990))
            await time.advanceBlockTo("2519")
            await this.chef.withdraw(0, "10", { from: userAddress2 }) // block 220
            expect(await this.xVemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(2000))
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(99999000))
        })

        it("should distribute xVemp properly for each staker", async function () {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.chef = await MasterChefVemp.new(this.xVemp.address, ownerAddress, "100", "2600", "2700", {from: ownerAddress, gas: 8000000});
            
            await this.chef.add("100", this.vemp.address, true, { from: ownerAddress })
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.vemp.approve(this.chef.address, "1000", {
                from: userAddress1,
            })
            await this.vemp.approve(this.chef.address, "1000", {
                from: userAddress2,
            })
            await this.vemp.approve(this.chef.address, "1000", {
                from: userAddress3,
            })
            await this.xVemp.approve(this.chef.address, "1000", {
                from: userAddress1,
            })
            await this.xVemp.approve(this.chef.address, "1000", {
                from: userAddress2,
            })
            await this.xVemp.approve(this.chef.address, "1000", {
                from: userAddress3,
            })
            // userAddress1 deposits 10 LPs at block 310
            await time.advanceBlockTo("2609")
            await this.chef.deposit(0, "10", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 314
            await time.advanceBlockTo("2613")
            await this.chef.deposit(0, "20", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 318
            await time.advanceBlockTo("2617")
            await this.chef.deposit(0, "30", { from: userAddress3 })
            
            await time.advanceBlockTo("2619")
            await this.chef.deposit(0, "10", { from: userAddress1 })
            expect(await this.xVemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(20))
            expect(await this.xVemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(20))
            expect(await this.xVemp.balanceOf(userAddress3)).to.be.bignumber.equal(new BN(30))
            expect(await this.vemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(1546))
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(980))
            expect(await this.vemp.balanceOf(userAddress3)).to.be.bignumber.equal(new BN(970))

            await time.advanceBlockTo("2629")
            await this.chef.withdraw(0, "5", { from: userAddress2 })
            expect(await this.xVemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(20))
            expect(await this.xVemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(15))
            expect(await this.xVemp.balanceOf(userAddress3)).to.be.bignumber.equal(new BN(30))
            expect(await this.vemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(1546))
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(1604))
            expect(await this.vemp.balanceOf(userAddress3)).to.be.bignumber.equal(new BN(970))
            
            await time.advanceBlockTo("2639")
            await this.chef.withdraw(0, "20", { from: userAddress1 })
            await time.advanceBlockTo("2649")
            await this.chef.withdraw(0, "15", { from: userAddress2 })
            await time.advanceBlockTo("2659")
            await this.chef.withdraw(0, "30", { from: userAddress3 })
                
            expect(await this.xVemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(0))
            expect(await this.xVemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            expect(await this.xVemp.balanceOf(userAddress3)).to.be.bignumber.equal(new BN(0))
            expect(await this.vemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(2159))
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(2183))
            expect(await this.vemp.balanceOf(userAddress3)).to.be.bignumber.equal(new BN(3657))
        })

        it("should stop giving bonus xVemp after the bonus period ends", async function () {
            // 100 per block farming rate starting at block 500 with bonus until block 600
            this.chef = await MasterChefVemp.new(this.xVemp.address, ownerAddress, "100", "2800", "2900", {from: ownerAddress, gas: 8000000});
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.vemp.approve(this.chef.address, "1000", { from: userAddress1 })
            await this.xVemp.approve(this.chef.address, "1000", { from: userAddress1 })
            await this.chef.add("1", this.vemp.address, true, { from: ownerAddress })
            
            // userAddress1 deposits 10 LPs at block 590
            await time.advanceBlockTo("2889")
            await this.chef.deposit(0, "10", { from: userAddress1 })
            
            await time.advanceBlockTo("2905")
            expect(await this.chef.pendingxVEMP(0, userAddress1)).to.be.bignumber.equal(new BN(1000))
            
            await this.chef.deposit(0, "0", { from: userAddress1 })
            expect(await this.chef.pendingxVEMP(0, userAddress1)).to.be.bignumber.equal(new BN(0))
            expect(await this.xVemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(10))
            expect(await this.vemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(1990))
        })

        it("Transfer Ownership", async function () {
            this.chef = await MasterChefVemp.new(this.xVemp.address, ownerAddress, "100", "2900", "3000", {from: ownerAddress, gas: 8000000});
            
            await expectRevert(this.chef.transferOwnership(userAddress1, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner");

            await this.chef.transferOwnership(userAddress1, {from: ownerAddress, gas: 8000000});
            expect(await this.chef.owner()).to.equal(userAddress1)
        })
    })
})


