const { accounts, contract, privateKeys } = require('@openzeppelin/test-environment');

const { BN, expectRevert, time, expectEvent, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { signTypedData } = require('eth-sig-util');
const { address } = require('../Utils/Ethereum');

const Sanctuary = contract.fromArtifact('VempDao');
const MockToken = contract.fromArtifact('MockToken');
const xVEMPBEP20Token = contract.fromArtifact('xVEMPBEP20Token');

describe('VempDao', function () {
    const [ ownerAddress, userAddress1, userAddress2, userAddress3, userAddress4, userAddress5, userAddress6 ] = accounts;
    beforeEach(async function () {
        this.vemp = await MockToken.new("VEMP", "VEMP", {from: ownerAddress, gas: 8000000});
        this.xvemp = await xVEMPBEP20Token.new("xVEMP", "xVEMP", {from: ownerAddress, gas: 8000000});
        this.sanctuary = await Sanctuary.new({from: ownerAddress, gas: 8000000});
        
        await this.sanctuary.initialize(ownerAddress, this.vemp.address, this.xvemp.address, {from: ownerAddress, gas: 8000000});
        await this.xvemp.addMinter([this.sanctuary.address], {from: ownerAddress, gas: 8000000});

        await this.vemp.mint(ownerAddress, "1000000000000000000000000", {from: ownerAddress, gas: 8000000});
        await this.vemp.mint(userAddress1, "1000000000000000000000000", {from: ownerAddress, gas: 8000000});
        await this.vemp.mint(userAddress2, "1000000000000000000000000", {from: ownerAddress, gas: 8000000});
        await this.vemp.mint(userAddress3, "1000000000000000000000000", {from: ownerAddress, gas: 8000000});
        await this.vemp.mint(userAddress4, "1000000000000000000000000", {from: ownerAddress, gas: 8000000});

        await this.vemp.approve(this.sanctuary.address, "1000000000000000000000", {from: ownerAddress, gas: 8000000});
        await this.vemp.approve(this.sanctuary.address, "1000000000000000000000", {from: userAddress1, gas: 8000000});
        await this.vemp.approve(this.sanctuary.address, "1000000000000000000000", {from: userAddress2, gas: 8000000});
        await this.vemp.approve(this.sanctuary.address, "1000000000000000000000", {from: userAddress3, gas: 8000000});
        await this.vemp.approve(this.sanctuary.address, "1000000000000000000000", {from: userAddress4, gas: 8000000});

        await this.xvemp.approve(this.sanctuary.address, "1000000000000000000000", {from: ownerAddress, gas: 8000000});
        await this.xvemp.approve(this.sanctuary.address, "1000000000000000000000", {from: userAddress1, gas: 8000000});
        await this.xvemp.approve(this.sanctuary.address, "1000000000000000000000", {from: userAddress2, gas: 8000000});
        await this.xvemp.approve(this.sanctuary.address, "1000000000000000000000", {from: userAddress3, gas: 8000000});
        await this.xvemp.approve(this.sanctuary.address, "1000000000000000000000", {from: userAddress4, gas: 8000000});
    });

    describe('Initialize Values', function () {
        it("should set correct xVemp address", async function () {
            const xvemp = await this.sanctuary.xVEMP();
            expect(ownerAddress).to.equal(await this.sanctuary.owner());
            expect(xvemp).to.equal(this.xvemp.address);
        })

        it("should set correct Vemp address", async function () {
            const vemp = await this.sanctuary.VEMP();
            expect(vemp).to.equal(this.vemp.address);
        })
    });

    describe('Stake/Enter', function () {
        it("Stake VEMP token(Single User)", async function () {
            await this.sanctuary.enter(10000, {from: ownerAddress, gas: 8000000});
            expect(await this.xvemp.balanceOf(ownerAddress)).to.be.bignumber.equal(new BN("10000"));
            expect(await this.vemp.balanceOf(this.sanctuary.address)).to.be.bignumber.equal(new BN("10000"));
        })

        it("Failed if not approve", async function () {
            await this.vemp.mint(userAddress5, "1000000000000000000000000", {from: ownerAddress, gas: 8000000});
            await expectRevert(this.sanctuary.enter(10000, {from: userAddress5, gas: 8000000}), "ERC20: transfer amount exceeds allowance");
        })

        it("Multiple users stake", async function () {
            await this.sanctuary.enter(10000, {from: ownerAddress, gas: 8000000});
            await this.sanctuary.enter(10000, {from: userAddress1, gas: 8000000});
            await this.sanctuary.enter(10000, {from: userAddress2, gas: 8000000});
            expect(await this.xvemp.balanceOf(ownerAddress)).to.be.bignumber.equal(new BN("10000"));
            expect(await this.xvemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN("10000"));
            expect(await this.xvemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN("10000"));
            expect(await this.vemp.balanceOf(this.sanctuary.address)).to.be.bignumber.equal(new BN("30000"));
        })

        it("Stake by user1 and send xvemp to user2 wallet address", async function () {
            await this.sanctuary.enter(10000, {from: ownerAddress, gas: 8000000});
            await this.sanctuary.enter(10000, {from: userAddress1, gas: 8000000});
            expect(await this.xvemp.balanceOf(ownerAddress)).to.be.bignumber.equal(new BN("10000"));
            expect(await this.xvemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN("10000"));
            await expectRevert(this.sanctuary.leave(10000, {from: userAddress2, gas: 8000000}), "ERC20: burn amount exceeds balance");
        })
    });

    describe('Unstake/Leave', function () {
        it("Leave VEMP token(Single User)", async function () {
            await this.sanctuary.enter(10000, {from: ownerAddress, gas: 8000000});
            await this.sanctuary.leave(10000, {from: ownerAddress, gas: 8000000});
            expect(await this.xvemp.balanceOf(ownerAddress)).to.be.bignumber.equal(new BN("0"));
            expect(await this.vemp.balanceOf(this.sanctuary.address)).to.be.bignumber.equal(new BN("0"));
            expect(await this.vemp.balanceOf(ownerAddress)).to.be.bignumber.equal(new BN("1000000000000000000000000"));
        })

        it("Failed if not approve", async function () {
            await this.vemp.mint(userAddress5, "1000000000000000000000000", {from: ownerAddress, gas: 8000000});
            await this.vemp.approve(this.sanctuary.address, "1000000000000000000000", {from: userAddress5, gas: 8000000});
            await this.sanctuary.enter(10000, {from: userAddress5, gas: 8000000});
            await expectRevert(this.sanctuary.leave(10000, {from: userAddress5, gas: 8000000}), "BEP20: burn amount exceeds allowance.");
        })

        it("Failed if not xvemp", async function () {
            await this.sanctuary.enter(10000, {from: ownerAddress, gas: 8000000});
            await expectRevert(this.sanctuary.leave(10000, {from: userAddress5, gas: 8000000}), "BEP20: burn amount exceeds allowance");
        })

        it("Multiple users leave", async function () {
            await this.sanctuary.enter(10000, {from: ownerAddress, gas: 8000000});
            await this.sanctuary.enter(10000, {from: userAddress1, gas: 8000000});
            await this.sanctuary.enter(10000, {from: userAddress2, gas: 8000000});
            await this.sanctuary.leave(10000, {from: ownerAddress, gas: 8000000});
            await this.sanctuary.leave(10000, {from: userAddress1, gas: 8000000});
            await this.sanctuary.leave(10000, {from: userAddress2, gas: 8000000});
            expect(await this.xvemp.balanceOf(ownerAddress)).to.be.bignumber.equal(new BN("0"));
            expect(await this.xvemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN("0"));
            expect(await this.xvemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN("0"));
            expect(await this.vemp.balanceOf(this.sanctuary.address)).to.be.bignumber.equal(new BN("0"));
        })

        it("Leave by user1 and send VEMP to user2 wallet address", async function () {
            await this.sanctuary.enter(10000, {from: ownerAddress, gas: 8000000});
            await this.sanctuary.enter(10000, {from: userAddress1, gas: 8000000});
            await this.sanctuary.leave(10000, {from: ownerAddress, gas: 8000000});
            await this.sanctuary.leave(10000, {from: userAddress1, gas: 8000000});
            expect(await this.xvemp.balanceOf(ownerAddress)).to.be.bignumber.equal(new BN("0"));
            expect(await this.xvemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN("0"));
            await this.vemp.transfer(userAddress2, 10000, {from: userAddress1, gas: 8000000});
            expect(await this.vemp.balanceOf(userAddress2)).to.be.bignumber.equal(new BN("1000000000000000000010000"));
            expect(await this.vemp.balanceOf(userAddress3)).to.be.bignumber.equal(new BN("1000000000000000000000000"));
            expect(await this.vemp.balanceOf(this.sanctuary.address)).to.be.bignumber.equal(new BN("0"));
            expect(await this.vemp.balanceOf(userAddress5)).to.be.bignumber.equal(new BN("0"));
            expect(await this.vemp.balanceOf(userAddress6)).to.be.bignumber.equal(new BN("0"));
        })

        it("Non-Paused state", async function() {
            await this.xvemp.updatePauseStatus({from: ownerAddress, gas: 8000000});
            await this.sanctuary.enter(10000, {from: ownerAddress, gas: 8000000});
            await this.xvemp.transfer(userAddress1, 10000, {from: ownerAddress, gas: 8000000});
            expect(await this.xvemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN("10000"));
        })

        it("Paused state", async function() {
            await this.sanctuary.enter(10000, {from: ownerAddress, gas: 8000000});
            await expectRevert(this.xvemp.transfer(userAddress1, 10000, {from: ownerAddress, gas: 8000000}), "Pausable: not paused");
        })
    });

    describe('emergencyWithdrawVempTokens', function () {
        beforeEach(async function () {
            await this.sanctuary.enter(10000, {from: ownerAddress, gas: 8000000});
        });

        it("If msg.sender is not an owner", async function () {
            await expectRevert(this.sanctuary.emergencyWithdrawVempTokens(this.vemp.address, userAddress5, 100, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner.");
        })

        it("If msg.sender is owner", async function () {
            await this.sanctuary.emergencyWithdrawVempTokens(this.vemp.address, userAddress5, 100, {from: ownerAddress, gas: 8000000});
            expect(await this.vemp.balanceOf(this.sanctuary.address)).to.be.bignumber.equal(new BN("9900"));
            expect(await this.vemp.balanceOf(userAddress5)).to.be.bignumber.equal(new BN("100"));
        })
    });
})