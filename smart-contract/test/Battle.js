const { accounts, contract, privateKeys } = require('@openzeppelin/test-environment');

const { BN, expectRevert, time, expectEvent, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { signTypedData } = require('eth-sig-util');
const { address } = require('../Utils/Ethereum');

const Game = contract.fromArtifact('Battle');
const MockToken = contract.fromArtifact('MockToken');
const BattleToken = contract.fromArtifact('xsVEMPToken');

describe('Battle Token Game', function () {
    const [ ownerAddress, userAddress1, userAddress2, userAddress3, userAddress4, userAddress5, userAddress6 ] = accounts;
    beforeEach(async function () {
        this.vemp = await MockToken.new("VEMP", "VEMP", {from: ownerAddress, gas: 8000000});
        this.xsVemp = await BattleToken.new({from: ownerAddress, gas: 8000000});
        this.game = await Game.new({from: ownerAddress, gas: 8000000});
        
        await this.game.initialize(ownerAddress, this.xsVemp.address, this.vemp.address, {from: ownerAddress, gas: 8000000});
        await this.xsVemp.addMinter([this.game.address], {from: ownerAddress, gas: 8000000});

        await this.vemp.mint(ownerAddress, "1000000000000000000000000");
        await this.vemp.mint(userAddress1, "1000000000000000000000000");
        await this.vemp.mint(userAddress2, "1000000000000000000000000");
        await this.vemp.mint(userAddress3, "1000000000000000000000000");
        await this.vemp.mint(userAddress4, "1000000000000000000000000");

        await this.vemp.approve(this.game.address, "1000000000000000000000", {from: ownerAddress, gas: 8000000});
        await this.vemp.approve(this.game.address, "1000000000000000000000", {from: userAddress1, gas: 8000000});
        await this.vemp.approve(this.game.address, "1000000000000000000000", {from: userAddress2, gas: 8000000});
        await this.vemp.approve(this.game.address, "1000000000000000000000", {from: userAddress3, gas: 8000000});
        await this.vemp.approve(this.game.address, "1000000000000000000000", {from: userAddress4, gas: 8000000});

        await this.xsVemp.approve(this.game.address, "1000000000000000000000", {from: ownerAddress, gas: 8000000});
        await this.xsVemp.approve(this.game.address, "1000000000000000000000", {from: userAddress1, gas: 8000000});
        await this.xsVemp.approve(this.game.address, "1000000000000000000000", {from: userAddress2, gas: 8000000});
        await this.xsVemp.approve(this.game.address, "1000000000000000000000", {from: userAddress3, gas: 8000000});
        await this.xsVemp.approve(this.game.address, "1000000000000000000000", {from: userAddress4, gas: 8000000});
    });

    describe('Initialize Values', function () {
        it("should set correct xsVemp address", async function () {
            const xsVemp = await this.game.xsVemp();
            expect(ownerAddress).to.equal(await this.game.owner());
            expect(xsVemp).to.equal(this.xsVemp.address);
        })

        it("should set correct Vemp address", async function () {
            const vemp = await this.game.vemp();
            expect(vemp).to.equal(this.vemp.address);
        })
    });

    describe('Stake/Enter', function () {
        it("Stake VEMP token(Single User)", async function () {
            await this.game.enter(ownerAddress, 10000, {from: ownerAddress, gas: 8000000});
            expect(await this.game.stakedVempAmount()).to.be.bignumber.equal(new BN("10000"));
            expect(await this.xsVemp.balanceOf(ownerAddress)).to.be.bignumber.equal(new BN("10000"));
            expect(await this.vemp.balanceOf(this.game.address)).to.be.bignumber.equal(new BN("10000"));
        })

        it("Failed if not approve", async function () {
            await this.vemp.mint(userAddress5, "1000000000000000000000000", {from: ownerAddress, gas: 8000000});
            await expectRevert(this.game.enter(userAddress5, 10000, {from: userAddress5, gas: 8000000}), "ERC20: transfer amount exceeds allowance");
        })

        it("Multiple users stake", async function () {
            await this.game.enter(ownerAddress, 10000, {from: ownerAddress, gas: 8000000});
            await this.game.enter(userAddress1, 10000, {from: userAddress1, gas: 8000000});
            await this.game.enter(userAddress2, 10000, {from: userAddress2, gas: 8000000});
            expect(await this.game.stakedVempAmount()).to.be.bignumber.equal(new BN("30000"));
            expect(await this.xsVemp.balanceOf(ownerAddress)).to.be.bignumber.equal(new BN("10000"));
            expect(await this.xsVemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN("10000"));
            expect(await this.xsVemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN("10000"));
            expect(await this.vemp.balanceOf(this.game.address)).to.be.bignumber.equal(new BN("30000"));
        })

        it("Stake by user1 and send xsVEMP to user2 wallet address", async function () {
            await this.game.enter(userAddress2, 10000, {from: ownerAddress, gas: 8000000});
            await this.game.enter(userAddress3, 10000, {from: userAddress1, gas: 8000000});
            expect(await this.game.stakedVempAmount()).to.be.bignumber.equal(new BN("20000"));
            expect(await this.xsVemp.balanceOf(ownerAddress)).to.be.bignumber.equal(new BN("0"));
            expect(await this.xsVemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN("0"));
            expect(await this.xsVemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN("10000"));
            expect(await this.xsVemp.balanceOf(userAddress3)).to.be.bignumber.equal(new BN("10000"));
            expect(await this.vemp.balanceOf(this.game.address)).to.be.bignumber.equal(new BN("20000"));
        })
    });

    describe('Unstake/Leave', function () {
        it("Leave VEMP token(Single User)", async function () {
            await this.game.enter(ownerAddress, 10000, {from: ownerAddress, gas: 8000000});
            await this.game.leave(ownerAddress, 10000, {from: ownerAddress, gas: 8000000});
            expect(await this.game.stakedVempAmount()).to.be.bignumber.equal(new BN("0"));
            expect(await this.xsVemp.balanceOf(ownerAddress)).to.be.bignumber.equal(new BN("0"));
            expect(await this.vemp.balanceOf(this.game.address)).to.be.bignumber.equal(new BN("0"));
            expect(await this.vemp.balanceOf(ownerAddress)).to.be.bignumber.equal(new BN("1000000000000000000000000"));
        })

        it("Failed if not approve", async function () {
            await this.vemp.mint(userAddress5, "1000000000000000000000000", {from: ownerAddress, gas: 8000000});
            await this.vemp.approve(this.game.address, "1000000000000000000000", {from: userAddress5, gas: 8000000});
            await this.game.enter(userAddress5, 10000, {from: userAddress5, gas: 8000000});
            await expectRevert(this.game.leave(userAddress5, 10000, {from: userAddress5, gas: 8000000}), "ERC20: burn amount exceeds allowance.");
        })

        it("Failed if not xsVEMP", async function () {
            await this.game.enter(ownerAddress, 10000, {from: ownerAddress, gas: 8000000});
            await expectRevert(this.game.leave(userAddress5, 10000, {from: userAddress5, gas: 8000000}), "Insufficient xsVemp Balance");
        })

        it("Multiple users leave", async function () {
            await this.game.enter(ownerAddress, 10000, {from: ownerAddress, gas: 8000000});
            await this.game.enter(userAddress1, 10000, {from: userAddress1, gas: 8000000});
            await this.game.enter(userAddress2, 10000, {from: userAddress2, gas: 8000000});
            await this.game.leave(ownerAddress, 10000, {from: ownerAddress, gas: 8000000});
            await this.game.leave(userAddress1, 10000, {from: userAddress1, gas: 8000000});
            await this.game.leave(userAddress2, 10000, {from: userAddress2, gas: 8000000});
            expect(await this.game.stakedVempAmount()).to.be.bignumber.equal(new BN("0"));
            expect(await this.xsVemp.balanceOf(ownerAddress)).to.be.bignumber.equal(new BN("0"));
            expect(await this.xsVemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN("0"));
            expect(await this.xsVemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN("0"));
            expect(await this.vemp.balanceOf(this.game.address)).to.be.bignumber.equal(new BN("0"));
        })

        it("Leave by user1 and send VEMP to user2 wallet address", async function () {
            await this.game.enter(userAddress2, 10000, {from: ownerAddress, gas: 8000000});
            await this.game.enter(userAddress3, 10000, {from: userAddress1, gas: 8000000});
            await this.game.leave(userAddress5, 10000, {from: userAddress2, gas: 8000000});
            await this.game.leave(userAddress6, 10000, {from: userAddress3, gas: 8000000});
            expect(await this.game.stakedVempAmount()).to.be.bignumber.equal(new BN("0"));
            expect(await this.xsVemp.balanceOf(ownerAddress)).to.be.bignumber.equal(new BN("0"));
            expect(await this.xsVemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN("0"));
            expect(await this.xsVemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN("0"));
            expect(await this.xsVemp.balanceOf(userAddress3)).to.be.bignumber.equal(new BN("0"));
            expect(await this.vemp.balanceOf(this.game.address)).to.be.bignumber.equal(new BN("0"));
            expect(await this.vemp.balanceOf(userAddress5)).to.be.bignumber.equal(new BN("10000"));
            expect(await this.vemp.balanceOf(userAddress6)).to.be.bignumber.equal(new BN("10000"));
        })
    });

    describe('emergencyWithdrawVempTokens', function () {
        beforeEach(async function () {
            await this.game.enter(ownerAddress, 10000, {from: ownerAddress, gas: 8000000});
        });

        it("If msg.sender is not an owner", async function () {
            await expectRevert(this.game.emergencyWithdrawVempTokens(this.vemp.address, userAddress5, 100, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner.");
        })

        it("If msg.sender is owner", async function () {
            await this.game.emergencyWithdrawVempTokens(this.vemp.address, userAddress5, 100, {from: ownerAddress, gas: 8000000});
            expect(await this.vemp.balanceOf(this.game.address)).to.be.bignumber.equal(new BN("9900"));
            expect(await this.vemp.balanceOf(userAddress5)).to.be.bignumber.equal(new BN("100"));
        })
    });
})