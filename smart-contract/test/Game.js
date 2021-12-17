const { accounts, contract, privateKeys } = require('@openzeppelin/test-environment');

const { BN, expectRevert, time, expectEvent, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { signTypedData } = require('eth-sig-util');
const { address } = require('../Utils/Ethereum');

const Game = contract.fromArtifact('vEmpireGame');
const MockToken = contract.fromArtifact('MockToken');

describe('Game', function () {
    const [ ownerAddress, userAddress1, userAddress2, userAddress3, userAddress4, userAddress5, userAddress6, userAddress7 ] = accounts;
    beforeEach(async function () {
        this.xsVemp = await MockToken.new("xsVEMP", "xsVEMP", {from: ownerAddress, gas: 8000000});
        this.game = await Game.new({from: ownerAddress, gas: 8000000});
        await this.game.initialize(ownerAddress, this.xsVemp.address, userAddress5, 20, userAddress7, {from: ownerAddress, gas: 8000000});

        await this.xsVemp.mint(ownerAddress, "1000000000000000000000000");
        await this.xsVemp.mint(userAddress1, "1000000000000000000000000");
        await this.xsVemp.mint(userAddress2, "1000000000000000000000000");
        await this.xsVemp.mint(userAddress3, "1000000000000000000000000");
        await this.xsVemp.mint(userAddress4, "1000000000000000000000000");

        await this.xsVemp.approve(this.game.address, "1000000000000000000000", {from: userAddress1, gas: 8000000});
        await this.xsVemp.approve(this.game.address, "1000000000000000000000", {from: userAddress2, gas: 8000000});
        await this.xsVemp.approve(this.game.address, "1000000000000000000000", {from: userAddress3, gas: 8000000});
        await this.xsVemp.approve(this.game.address, "1000000000000000000000", {from: userAddress4, gas: 8000000});

        await this.game.updateAdmin(ownerAddress, true, {from: ownerAddress, gas: 8000000});
    });

    describe('set/update variables', function () {
        it("should set correct state variables", async function () {
            const xsVemp = await this.game.xsVemp();
            expect(ownerAddress).to.equal(await this.game.owner());
            expect(xsVemp).to.equal(this.xsVemp.address);
        })

        it("should allow admin and only admin to update admin", async function () {
            const adminaddr = await this.game.adminStatus(ownerAddress);
            expect(adminaddr).to.equal(true);
        })
    });

    describe('updateAdmin', function () {
        it("If msg.sender is not an owner", async function () {
            await expectRevert(this.game.updateAdmin(userAddress1, true, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner.");
        })

        it("If msg.sender is owner", async function () {
            const adminaddr = await this.game.updateAdmin(userAddress1, true, {from: ownerAddress, gas: 8000000});
            expect(await this.game.adminStatus(ownerAddress)).to.equal(true);
        })

        it("If already same status", async function () {
            await expectRevert(this.game.updateAdmin(ownerAddress, true, {from: ownerAddress, gas: 8000000}), "Already in same status");
        })
    });

    describe('updateMinBattleTokens', function () {
        it("If msg.sender is not an owner", async function () {
            await expectRevert(this.game.updateMinBattleTokens(100, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner.");
        })

        it("If msg.sender is owner", async function () {
            await this.game.updateMinBattleTokens(100, {from: ownerAddress, gas: 8000000});
            expect(await this.game.minBattleTokens()).to.be.bignumber.equal(new BN("100"));
        })

        it("Default updateMinBattleTokens 1", async function () {
            const adminaddr = await this.game.updateAdmin(userAddress1, true, {from: ownerAddress, gas: 8000000});
            expect(await this.game.minBattleTokens()).to.be.bignumber.equal(new BN("1000000000000000000"));
        })
    });

    describe('emergencyWithdrawxsVempTokens', function () {
        it("If msg.sender is not an owner", async function () {
            await expectRevert(this.game.emergencyWithdrawxsVempTokens(userAddress2, 100, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner.");
        })

        it("If msg.sender is owner", async function () {
            await this.xsVemp.transfer(this.game.address, 100, {from: ownerAddress, gas: 8000000});
            await this.game.emergencyWithdrawxsVempTokens(userAddress1, 100, {from: ownerAddress, gas: 8000000});
            expect(await this.xsVemp.balanceOf(this.game.address)).to.be.bignumber.equal(new BN("0"));
        })

        it("If msg.sender is not owner but admin", async function () {
            await this.xsVemp.transfer(this.game.address, 100, {from: ownerAddress, gas: 8000000});
            await this.game.updateAdmin(userAddress1, true, {from: ownerAddress, gas: 8000000});
            await expectRevert(this.game.emergencyWithdrawxsVempTokens(userAddress2, 100, {from: userAddress1, gas: 8000000}), "Ownable: caller is not the owner.");
        })
    });

    describe('Conducting the battle', function () {
        describe('Positive testing', function() {
            it("Player 1 battle locked tokens", async function () {
                await this.game.battleLockTokens("100000000000000000000", 50, "507f1f77bcf86cd799439011", {from: userAddress1, gas: 8000000});
                expect(await this.xsVemp.balanceOf(this.game.address)).to.be.bignumber.equal(new BN("100000000000000000000"));
            })
    
            it("Player 2 battle locked tokens", async function () {
                await this.game.battleLockTokens("100000000000000000000", 50, "507f1f77bcf86cd799439011", {from: userAddress1, gas: 8000000});   
                await this.game.battleLockTokens("100000000000000000000", 50, "507f1f77bcf86cd799439011", {from: userAddress2, gas: 8000000});                
                expect(await this.xsVemp.balanceOf(this.game.address)).to.be.bignumber.equal(new BN("200000000000000000000"));
            })
        });

        describe('Negative testing', function () {
            it("Revert if Player 1 tries to lock battle tokens on used id", async function () {
                await this.game.battleLockTokens("100000000000000000000", 50, "507f1f77bcf86cd799439011", {from: userAddress1, gas: 8000000});
                await expectRevert(this.game.battleLockTokens("100000000000000000000", 50, "507f1f77bcf86cd799439011", {from: userAddress1, gas: 8000000}), "Room id already used");
            })
    
            it("Revert if Player 1 tries to lock 0 battle tokens", async function () {
                await expectRevert(this.game.battleLockTokens("0", 50, "507f1f77bcf86cd799439011", {from: userAddress1, gas: 8000000}), "Invalid data");
            })
    
            it("Revert if Player 2 tries to lock 0 battle tokens", async function () {
                await expectRevert(this.game.battleLockTokens("0", 50, "507f1f77bcf86cd799439011", {from: userAddress2, gas: 8000000}), "Invalid data");
            })
    
            it("Revert if Player 1 tries to lock 0 risk", async function () {
                await expectRevert(this.game.battleLockTokens("100000000000000000000", 0, "507f1f77bcf86cd799439011", {from: userAddress1, gas: 8000000}), "Invalid data");
            })
    
            it("Revert if Player 2 tries to lock 0 risk", async function () {
                await expectRevert(this.game.battleLockTokens("100000000000000000000", 0, "507f1f77bcf86cd799439011", {from: userAddress2, gas: 8000000}), "Invalid data");
            })
    
            it("Revert if Player 1 tries to lock 0 id", async function () {
                await expectRevert(this.game.battleLockTokens("100000000000000000000", 50, "", {from: userAddress1, gas: 8000000}), "Invalid data");
            })
    
            it("Revert if Player 2 tries to lock 0 id", async function () {
                await expectRevert(this.game.battleLockTokens("100000000000000000000", 50, "", {from: userAddress2, gas: 8000000}), "Invalid data");
            })
    
            it("Revert if Player 2 tries to lock battle tokens on different risk from Player 1", async function () {
                await this.game.battleLockTokens("100000000000000000000", 50, "507f1f77bcf86cd799439014", {from: userAddress1, gas: 8000000});      
                await expectRevert(this.game.battleLockTokens("100000000000000000000", 25, "507f1f77bcf86cd799439014", {from: userAddress2, gas: 8000000}), "Invalid risk and pool");
            })
    
            it("Revert if Player 2 tries to lock battle tokens on different amount from Player 1", async function () {
                await this.game.battleLockTokens("100000000000000000000", 50, "507f1f77bcf86cd799439014", {from: userAddress1, gas: 8000000});  
                await expectRevert(this.game.battleLockTokens("200000000000000000000", 50, "507f1f77bcf86cd799439014", {from: userAddress2, gas: 8000000}), "Invalid risk and pool");
            })
    
            it("Revert if Player 3 tries to lock battle tokens on same id where Player 1 and Player 2 are already there", async function () {
                await this.game.battleLockTokens("100000000000000000000", 50, "507f1f77bcf86cd799439014", {from: userAddress1, gas: 8000000});
                await this.game.battleLockTokens("100000000000000000000", 50, "507f1f77bcf86cd799439014", {from: userAddress2, gas: 8000000});      
                await expectRevert(this.game.battleLockTokens("100000000000000000000", 50, "507f1f77bcf86cd799439014", {from: userAddress3, gas: 8000000}), "Invalid room id data");
            })
        })
    });

    describe('Updating the winner', function () {
        beforeEach(async function () {
            await this.game.battleLockTokens("100000000000000000000", 50, "507f1f77bcf86cd799439014", {from: userAddress1, gas: 8000000});
            await this.game.battleLockTokens("100000000000000000000", 50, "507f1f77bcf86cd799439014", {from: userAddress2, gas: 8000000});
        })

        describe('Positive testing', function() {    
            it("Admin updating the winner address", async function () {
                await this.game.updateWinnerAddress([userAddress1], ["507f1f77bcf86cd799439014"], {from: ownerAddress, gas: 8000000});
                expect(await this.game.winners(0)).to.equal(userAddress1);
            })
        });

        describe('Negative testing', function() {    
            it("Revert if anyone is updating the winner address", async function () {
                await expectRevert(this.game.updateWinnerAddress([userAddress1], ["507f1f77bcf86cd799439014"], {from: userAddress3, gas: 8000000}), "Caller is not admin");
            })

            it("Revert if Admin updating the winner as 0x address", async function () {
                await expectRevert(this.game.updateWinnerAddress(["0x0000000000000000000000000000000000000000"], ["507f1f77bcf86cd799439014"], {from: ownerAddress, gas: 8000000}), "Invalid Winner Address.");
            })

            it("Revert if Admin updating the winner where there are no Player 1 and Player 2", async function () {
                await expectRevert(this.game.updateWinnerAddress([userAddress1], ["507f1f77bcf86cd799439019"], {from: ownerAddress, gas: 8000000}), "Invalid Winner Address.");
            })

            it("Revert if owner is updating the winner address twice", async function () {
                await this.game.updateWinnerAddress([userAddress1], ["507f1f77bcf86cd799439014"], {from: ownerAddress, gas: 8000000});
                await expectRevert(this.game.updateWinnerAddress([userAddress1], ["507f1f77bcf86cd799439014"], {from: ownerAddress, gas: 8000000}), "Winner already declared");
            })
        });
    });

    describe('Claim Reward Amount from winner', function () {
        beforeEach(async function () {
            await this.game.battleLockTokens("100000000000000000000", 50, "507f1f77bcf86cd799439014", {from: userAddress1, gas: 8000000});
            await this.game.battleLockTokens("100000000000000000000", 50, "507f1f77bcf86cd799439014", {from: userAddress2, gas: 8000000});
        })

        describe('Claim testing', function() {    
            it("Claim reward amount from winner address", async function () {
                await this.game.updateWinnerAddress([userAddress1], ["507f1f77bcf86cd799439014"], {from: ownerAddress, gas: 8000000});
                await this.game.claimBattleRewards("507f1f77bcf86cd799439014", {from: userAddress1, gas: 8000000});
                expect(await this.xsVemp.balanceOf(this.game.address)).to.be.bignumber.equal(new BN("40000000000000000000"));
                expect(await this.xsVemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN("1000060000000000000000000"));
            })

            it("Claim reward amount from winner address", async function () {
                await this.game.updateWinnerAddress([userAddress1], ["507f1f77bcf86cd799439014"], {from: ownerAddress, gas: 8000000});
                await this.game.claimBattleRewards("507f1f77bcf86cd799439014", {from: userAddress1, gas: 8000000});
                expect(await this.xsVemp.balanceOf(this.game.address)).to.be.bignumber.equal(new BN("40000000000000000000"));
                expect(await this.xsVemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN("1000060000000000000000000"));

                await expectRevert(this.game.claimBattleRewards("507f1f77bcf86cd799439014", {from: userAddress1, gas: 8000000}), "Already claimed");
            })

            it("Claim reward amount from non winner address", async function () {
                await this.game.updateWinnerAddress([userAddress1], ["507f1f77bcf86cd799439014"], {from: ownerAddress, gas: 8000000});
                await expectRevert(this.game.claimBattleRewards("507f1f77bcf86cd799439014", {from: userAddress2, gas: 8000000}), "Only winner can call this method.");
            })

            it("Ddao amount check", async function () {
                await this.game.updateWinnerAddress([userAddress1], ["507f1f77bcf86cd799439014"], {from: ownerAddress, gas: 8000000});
                await this.game.claimBattleRewards("507f1f77bcf86cd799439014", {from: userAddress1, gas: 8000000});
                expect(await this.xsVemp.balanceOf(this.game.address)).to.be.bignumber.equal(new BN("40000000000000000000"));
            })
        });
    });

    describe('Update ddao percent', function () {   
        it("If Owner update dao percent", async function () {
            await this.game.updateDDAOPercent(10, {from: ownerAddress, gas: 8000000});
            expect(await this.game.daoPercent()).to.be.bignumber.equal(new BN("10"));
        })    

        it("Revert if dao percent update by non owner", async function () {
            await expectRevert(this.game.updateDDAOPercent(10, {from: userAddress4, gas: 8000000}), "Ownable: caller is not the owner.");
        })

        it("If Owner update dao percent more than 100", async function () {
            await expectRevert(this.game.updateDDAOPercent(101, {from: ownerAddress, gas: 8000000}), "Invalid Dao Percent");
        })
    });

    describe('Update battle contract address', function () {   
        it("If Owner update battle contract address", async function () {
            await this.game.updateBattleAddress(userAddress3, {from: ownerAddress, gas: 8000000});
            expect(await this.game.battleAddress()).to.equal(userAddress3);
        })    

        it("Revert if battle address update by non owner", async function () {
            await expectRevert(this.game.updateBattleAddress(userAddress3, {from: userAddress4, gas: 8000000}), "Ownable: caller is not the owner.");
        })

        it("If Owner update battle address with 0 address", async function () {
            await expectRevert(this.game.updateBattleAddress("0x0000000000000000000000000000000000000000", {from: ownerAddress, gas: 8000000}), "Invalid _battleAddress address");
        })
    });

    describe('withdrawxsVempFeeTokens', function () {
        beforeEach(async function () {
            await this.game.battleLockTokens("100000000000000000000", 50, "507f1f77bcf86cd799439014", {from: userAddress1, gas: 8000000});
            await this.game.battleLockTokens("100000000000000000000", 50, "507f1f77bcf86cd799439014", {from: userAddress2, gas: 8000000});
        })

        describe('withdrawxsVempFeeTokens tests', function() {    
            it("withdraw by non owner", async function () {
                await this.game.updateWinnerAddress([userAddress1], ["507f1f77bcf86cd799439014"], {from: ownerAddress, gas: 8000000});
                await this.game.claimBattleRewards("507f1f77bcf86cd799439014", {from: userAddress1, gas: 8000000});
                await expectRevert(this.game.withdrawxsVempFeeTokens(userAddress6, "40000000000000000000", {from: userAddress4, gas: 8000000}), "Ownable: caller is not the owner.");
            })

            it("withdraw by owner", async function () {
                await this.game.updateWinnerAddress([userAddress1], ["507f1f77bcf86cd799439014"], {from: ownerAddress, gas: 8000000});
                await this.game.claimBattleRewards("507f1f77bcf86cd799439014", {from: userAddress1, gas: 8000000});
                await this.game.withdrawxsVempFeeTokens(userAddress6, "40000000000000000000", {from: ownerAddress, gas: 8000000});
                expect(await this.xsVemp.balanceOf(userAddress6)).to.be.bignumber.equal(new BN("40000000000000000000"));
                expect(await this.xsVemp.balanceOf(this.game.address)).to.be.bignumber.equal(new BN("0"));
                expect(await this.game.daoTokens()).to.be.bignumber.equal(new BN("0"));
            })

            it("withdraw by owner(more than fee amount)", async function () {
                await this.game.updateWinnerAddress([userAddress1], ["507f1f77bcf86cd799439014"], {from: ownerAddress, gas: 8000000});
                await this.game.claimBattleRewards("507f1f77bcf86cd799439014", {from: userAddress1, gas: 8000000});
                await expectRevert(this.game.withdrawxsVempFeeTokens(userAddress6, "40000000000000000001", {from: ownerAddress, gas: 8000000}), "Insufficiently amount");
            })

            it("withdraw by owner(less than fee amount)", async function () {
                await this.game.updateWinnerAddress([userAddress1], ["507f1f77bcf86cd799439014"], {from: ownerAddress, gas: 8000000});
                await this.game.claimBattleRewards("507f1f77bcf86cd799439014", {from: userAddress1, gas: 8000000});
                await this.game.withdrawxsVempFeeTokens(userAddress6, "2000000000000000000", {from: ownerAddress, gas: 8000000});
                expect(await this.xsVemp.balanceOf(userAddress6)).to.be.bignumber.equal(new BN("2000000000000000000"));
                expect(await this.game.daoTokens()).to.be.bignumber.equal(new BN("38000000000000000000"));
                expect(await this.xsVemp.balanceOf(this.game.address)).to.be.bignumber.equal(new BN("38000000000000000000"));
            })
        });
    });
})