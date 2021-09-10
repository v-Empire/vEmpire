const { accounts, contract, privateKeys } = require('@openzeppelin/test-environment');

const { BN, expectRevert, time, expectEvent, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { signTypedData } = require('eth-sig-util');

const MAX_DEPLOYED_BYTECODE_SIZE = 24576;
const MasterChefAxs = contract.fromArtifact('MasterChefAxs');
const MockToken = contract.fromArtifact('MockToken');

const {
    encodeParameters
} = require('../Utils/Ethereum');

describe('MasterChefAxs', function () {
    const [ ownerAddress, userAddress1, userAddress2, userAddress3, userAddress4 ] = accounts;
    beforeEach(async function () {
        this.vemp = await MockToken.new("VEMP", "VEMP", {from: ownerAddress, gas: 8000000});
        this.slp = await MockToken.new("SLP", "SLP", {from: ownerAddress, gas: 8000000});
        this.lp = await MockToken.new("AXS", "AXS", {from: ownerAddress, gas: 8000000});
        this.chef = await MasterChefAxs.new(this.vemp.address, this.slp.address, ownerAddress, "1000", "4500", {from: ownerAddress, gas: 8000000});
        await this.vemp.mint(ownerAddress, "1000000000000000000000000");
        await this.lp.mint(ownerAddress, "1000000000000000000000000");
        await this.slp.mint(ownerAddress, "1000000000000000000000000");

    });

    describe('set/update variables', function () {
        it("should set correct state variables", async function () {
            const vemp = await this.chef.VEMP();
            const slp = await this.chef.SLP();
            const adminaddr = await this.chef.adminaddr();

            expect(vemp).to.equal(this.vemp.address);
            expect(slp).to.equal(this.slp.address);
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

            this.chef = await MasterChefAxs.new(this.vemp.address, this.slp.address, ownerAddress, "100", "4600", {from: ownerAddress, gas: 8000000});
            
            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });
            
            await this.lp.approve(this.chef.address, "1000", { from: userAddress2 })
            await this.chef.deposit(0, "100", { from: userAddress2 })
            await time.advanceBlockTo("4589")

            await this.chef.deposit(0, "0", { from: userAddress2 }) 
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0));
            await time.advanceBlockTo("4594")

            await this.chef.deposit(0, "0", { from: userAddress2 }) 
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            await time.advanceBlockTo("4599")

            await this.chef.deposit(0, "0", { from: userAddress2 }) 
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            await time.advanceBlockTo("4600")

            await this.chef.deposit(0, "0", { from: userAddress2 }) 
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(100))

            await time.advanceBlockTo("4604")
            await this.chef.deposit(0, "0", { from: userAddress2 }) 

            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(500))
        })

        it("should not distribute vemp if no one deposit", async function () {

            this.chef = await MasterChefAxs.new(this.vemp.address, this.slp.address, ownerAddress, "100", "4700", {from: ownerAddress, gas: 8000000});
            
            await this.vemp.transfer(this.chef.address, "100000000", { from: ownerAddress });

            await this.chef.add("100", this.lp.address, true, { from: ownerAddress })
            
            await this.lp.approve(this.chef.address, "1000", { from: userAddress2 })
            await time.advanceBlockTo("4699")
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            await time.advanceBlockTo("4704")
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            await time.advanceBlockTo("4709")
            await this.chef.deposit(0, "10", { from: userAddress2 }) // block 210
            expect(await this.vemp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100000000))
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            expect(await this.lp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(990))
        })

        it("should distribute vemp properly for each staker", async function () {

            this.chef = await MasterChefAxs.new(this.vemp.address, this.slp.address, ownerAddress, "100", "4800", {from: ownerAddress, gas: 8000000});
            
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
            // userAddress1 deposits 10 LPs at block 4810
            await time.advanceBlockTo("4809")
            await this.chef.deposit(0, "10", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 4814
            await time.advanceBlockTo("4813")
            await this.chef.deposit(0, "20", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 4850
            await time.advanceBlockTo("4817")
            await this.chef.deposit(0, "30", { from: userAddress3 })
            
            await time.advanceBlockTo("4819")
            await this.chef.deposit(0, "10", { from: userAddress1 })
            expect(await this.vemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(566))
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0))
            expect(await this.vemp.balanceOf(userAddress3)).to.be.bignumber.equal(new BN(0))
            
            await time.advanceBlockTo("4829")
            expect(await this.chef.pendingVEMP(0, userAddress1)).to.be.bignumber.equal(new BN(257))
            expect(await this.chef.pendingVEMP(0, userAddress2)).to.be.bignumber.equal(new BN(590))
            expect(await this.chef.pendingVEMP(0, userAddress3)).to.be.bignumber.equal(new BN(486))
        })
        
        it("Transfer Ownership", async function () {
            this.chef = await MasterChefAxs.new(this.vemp.address, this.slp.address, ownerAddress, "100", "4900", {from: ownerAddress, gas: 8000000});
            
            await expectRevert(this.chef.transferOwnership(userAddress1, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner");

            await this.chef.transferOwnership(userAddress1, {from: ownerAddress, gas: 8000000});
            expect(await this.chef.owner()).to.equal(userAddress1)
        })
    })

    describe("Access Axs Tokens by Admin", function () {
        beforeEach(async function () {
            await this.lp.transfer(userAddress1, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress2, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress3, "1000", { from: ownerAddress })
        })

        it("Failed if any user(not admin) want to access AXS tokens", async function () {

            this.chef = await MasterChefAxs.new(this.vemp.address, this.slp.address, ownerAddress, "100", "5000", {from: ownerAddress, gas: 8000000});
            
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
            // userAddress1 deposits 10 LPs at block 5010
            await time.advanceBlockTo("5009")
            await this.chef.deposit(0, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 5014
            await time.advanceBlockTo("5013")
            await this.chef.deposit(0, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 5050
            await time.advanceBlockTo("5017")
            await this.chef.deposit(0, "60", { from: userAddress3 })

            await expectRevert(this.chef.accessAXSTokens(0, userAddress4, 101, {from: userAddress1, gas: 8000000}), "sender must be admin address");
        })

        it("Failed if any admin want to access AXS tokens more then locked amount", async function () {

            this.chef = await MasterChefAxs.new(this.vemp.address, this.slp.address, ownerAddress, "100", "5100", {from: ownerAddress, gas: 8000000});
            
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
            // userAddress1 deposits 10 LPs at block 5110
            await time.advanceBlockTo("5109")
            await this.chef.deposit(0, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 5114
            await time.advanceBlockTo("5113")
            await this.chef.deposit(0, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 5150
            await time.advanceBlockTo("5117")
            await this.chef.deposit(0, "60", { from: userAddress3 })

            await expectRevert(this.chef.accessAXSTokens(0, userAddress4, 120, {from: ownerAddress, gas: 8000000}), "Amount must be less than staked AXS amount");
        })

        it("Update All variables on stake and access AXS tokens", async function () {

            this.chef = await MasterChefAxs.new(this.vemp.address, this.slp.address, ownerAddress, "100", "5200", {from: ownerAddress, gas: 8000000});
            
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
            // userAddress1 deposits 10 LPs at block 5210
            await time.advanceBlockTo("5209")
            await this.chef.deposit(0, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 5214
            await time.advanceBlockTo("5213")
            await this.chef.deposit(0, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 5250
            await time.advanceBlockTo("5217")
            await this.chef.deposit(0, "60", { from: userAddress3 })

            expect(await this.chef.totalAXSStaked()).to.be.bignumber.equal(new BN(100));

            await this.chef.accessAXSTokens(0, userAddress4, 80, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.totalAXSUsedForPurchase()).to.be.bignumber.equal(new BN(80))
            expect(await this.chef.totalAXSStaked()).to.be.bignumber.equal(new BN(100))
            expect(await this.lp.balanceOf(userAddress4)).to.be.bignumber.equal(new BN(80))
        })
    })

    describe("Re-Distribution of AXS tokens to all stake holders in rewards", function () {
        beforeEach(async function () {
            await this.lp.transfer(userAddress1, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress2, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress3, "1000", { from: ownerAddress })
        })

        it("Re-Distribute AXS tokens by Admin", async function () {

            this.chef = await MasterChefAxs.new(this.vemp.address, this.slp.address, ownerAddress, "100", "5300", {from: ownerAddress, gas: 8000000});
            
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
            // userAddress1 deposits 10 LPs at block 5310
            await time.advanceBlockTo("5309")
            await this.chef.deposit(0, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 5314
            await time.advanceBlockTo("5313")
            await this.chef.deposit(0, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 5350
            await time.advanceBlockTo("5317")
            await this.chef.deposit(0, "60", { from: userAddress3 })

            await this.lp.transfer(this.chef.address, 100, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingAXS(0, userAddress1)).to.be.bignumber.equal(new BN(15))
            expect(await this.chef.pendingAXS(0, userAddress2)).to.be.bignumber.equal(new BN(25))
            expect(await this.chef.pendingAXS(0, userAddress3)).to.be.bignumber.equal(new BN(60))

            await this.lp.transfer(this.chef.address, 100, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingAXS(0, userAddress1)).to.be.bignumber.equal(new BN(30))
            expect(await this.chef.pendingAXS(0, userAddress2)).to.be.bignumber.equal(new BN(50))
            expect(await this.chef.pendingAXS(0, userAddress3)).to.be.bignumber.equal(new BN(120))
        })
    })

    describe("Claim AXS Reward tokens", function () {
        beforeEach(async function () {
            await this.lp.transfer(userAddress1, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress2, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress3, "1000", { from: ownerAddress })
        })

        it("Claim AXS tokens by stakers", async function () {

            this.chef = await MasterChefAxs.new(this.vemp.address, this.slp.address, ownerAddress, "100", "5400", {from: ownerAddress, gas: 8000000});
            
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
            // userAddress1 deposits 10 LPs at block 5410
            await time.advanceBlockTo("5409")
            await this.chef.deposit(0, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 5414
            await time.advanceBlockTo("5413")
            await this.chef.deposit(0, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 5450
            await time.advanceBlockTo("5417")
            await this.chef.deposit(0, "60", { from: userAddress3 })

            await this.lp.transfer(this.chef.address, 100, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingAXS(0, userAddress1)).to.be.bignumber.equal(new BN(15))
            expect(await this.chef.pendingAXS(0, userAddress2)).to.be.bignumber.equal(new BN(25))
            expect(await this.chef.pendingAXS(0, userAddress3)).to.be.bignumber.equal(new BN(60))

            await this.lp.transfer(this.chef.address, 100, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingAXS(0, userAddress1)).to.be.bignumber.equal(new BN(30))
            expect(await this.chef.pendingAXS(0, userAddress2)).to.be.bignumber.equal(new BN(50))
            expect(await this.chef.pendingAXS(0, userAddress3)).to.be.bignumber.equal(new BN(120))

            await this.chef.claimAXS(0, {from: userAddress1, gas: 8000000});
            await this.chef.claimAXS(0, {from: userAddress2, gas: 8000000});
            await this.chef.claimAXS(0, {from: userAddress3, gas: 8000000});

            expect(await this.lp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(1015))
            expect(await this.lp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(1025))
            expect(await this.lp.balanceOf(userAddress3)).to.be.bignumber.equal(new BN(1060))

            expect(await this.lp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100))
        })
    })

    describe("Re-Distribution of SLP tokens to all stake holders in rewards", function () {
        beforeEach(async function () {
            await this.lp.transfer(userAddress1, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress2, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress3, "1000", { from: ownerAddress })
        })

        it("Re-Distribute SLP tokens by Admin", async function () {

            this.chef = await MasterChefAxs.new(this.vemp.address, this.slp.address, ownerAddress, "100", "5500", {from: ownerAddress, gas: 8000000});
            
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
            // userAddress1 deposits 10 LPs at block 5510
            await time.advanceBlockTo("5509")
            await this.chef.deposit(0, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 5514
            await time.advanceBlockTo("5513")
            await this.chef.deposit(0, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 5550
            await time.advanceBlockTo("5517")
            await this.chef.deposit(0, "60", { from: userAddress3 })

            await this.slp.transfer(this.chef.address, 100, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingSLP(0, userAddress1)).to.be.bignumber.equal(new BN(15))
            expect(await this.chef.pendingSLP(0, userAddress2)).to.be.bignumber.equal(new BN(25))
            expect(await this.chef.pendingSLP(0, userAddress3)).to.be.bignumber.equal(new BN(60))

            await this.slp.transfer(this.chef.address, 100, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingSLP(0, userAddress1)).to.be.bignumber.equal(new BN(30))
            expect(await this.chef.pendingSLP(0, userAddress2)).to.be.bignumber.equal(new BN(50))
            expect(await this.chef.pendingSLP(0, userAddress3)).to.be.bignumber.equal(new BN(120))
        })
    })

    describe("Claim SLP Reward tokens", function () {
        beforeEach(async function () {
            await this.lp.transfer(userAddress1, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress2, "1000", { from: ownerAddress })
            await this.lp.transfer(userAddress3, "1000", { from: ownerAddress })
        })

        it("Claim SLP tokens by stakers", async function () {

            this.chef = await MasterChefAxs.new(this.vemp.address, this.slp.address, ownerAddress, "100", "5600", {from: ownerAddress, gas: 8000000});
            
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
            // userAddress1 deposits 10 LPs at block 5610
            await time.advanceBlockTo("5609")
            await this.chef.deposit(0, "15", { from: userAddress1 })
            // userAddress2 deposits 20 LPs at block 5614
            await time.advanceBlockTo("5613")
            await this.chef.deposit(0, "25", { from: userAddress2 })
            // userAddress3 deposits 30 LPs at block 5650
            await time.advanceBlockTo("5617")
            await this.chef.deposit(0, "60", { from: userAddress3 })

            await this.slp.transfer(this.chef.address, 100, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingSLP(0, userAddress1)).to.be.bignumber.equal(new BN(15))
            expect(await this.chef.pendingSLP(0, userAddress2)).to.be.bignumber.equal(new BN(25))
            expect(await this.chef.pendingSLP(0, userAddress3)).to.be.bignumber.equal(new BN(60))

            await this.slp.transfer(this.chef.address, 100, {from: ownerAddress, gas: 8000000});

            expect(await this.chef.pendingSLP(0, userAddress1)).to.be.bignumber.equal(new BN(30))
            expect(await this.chef.pendingSLP(0, userAddress2)).to.be.bignumber.equal(new BN(50))
            expect(await this.chef.pendingSLP(0, userAddress3)).to.be.bignumber.equal(new BN(120))

            await this.chef.claimSLP(0, {from: userAddress1, gas: 8000000});
            await this.chef.claimSLP(0, {from: userAddress2, gas: 8000000});
            await this.chef.claimSLP(0, {from: userAddress3, gas: 8000000});

            expect(await this.slp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(30))
            expect(await this.slp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(50))
            expect(await this.slp.balanceOf(userAddress3)).to.be.bignumber.equal(new BN(120))

            expect(await this.lp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(985))
            expect(await this.lp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(975))
            expect(await this.lp.balanceOf(userAddress3)).to.be.bignumber.equal(new BN(940))

            expect(await this.lp.balanceOf(this.chef.address)).to.be.bignumber.equal(new BN(100))
        })
    })    
})


