const { parse } = require("@ethersproject/transactions");
const { contract, privateKeys } = require("@openzeppelin/test-environment");
const {
    BN,
    expectRevert,
    expectEvent,
    constants,
} = require("@openzeppelin/test-helpers");
const { expect, use } = require("chai");

const {
    mineBlock,
} = require("../Utils/Ethereum");

let ownerAddress;
let userAddress1;
let userAddress2;
const VEMPToken = artifacts.require("MockToken");
const MockV3Utility = artifacts.require("MockV3Utility");
const MockERC721 = artifacts.require("MockERC721");
const MasterChef = artifacts.require("MasterChefV3");
const decimal = new BN(18);
const oneether = new BN(10).pow(decimal);
const totalSupply = new BN(1000000000);
const maxSupply = new BN(10000000000).mul(oneether);

describe("Master Chef tokens", function () {
    beforeEach(async function () {
        accounts = await web3.eth.getAccounts();
        [ownerAddress, userAddress1, userAddress2, userAddress3, treasuryAdress, v3PairAddress] = accounts;

        this.vemp = await VEMPToken.new("TVEMP", "TVEMP", { from: ownerAddress, gas: 8000000 });
        this.utility = await MockV3Utility.new({ from: ownerAddress, gas: 8000000 });
        this.erc721 = await MockERC721.new({ from: ownerAddress, gas: 8000000 });

        this.chef = await MasterChef.new({ from: ownerAddress, gas: 8000000 });
        await this.chef.initialize(this.vemp.address, "1000000000000", "0", { from: ownerAddress, gas: 8000000 });

        await this.chef.setUtilityContractAddress(this.utility.address, {
            from: ownerAddress
        });

        await this.erc721.safeMint(ownerAddress, {
            from: ownerAddress
        });

        await this.erc721.safeMint(ownerAddress, {
            from: ownerAddress
        });

        await this.erc721.safeMint(ownerAddress, {
            from: ownerAddress
        });

        await this.erc721.approve(this.chef.address, 0, {
            from: ownerAddress
        });
        await this.erc721.approve(this.chef.address, 1, {
            from: ownerAddress
        });
        await this.erc721.approve(this.chef.address, 2, {
            from: ownerAddress
        });
    });

    describe("Set lp token in contract", function () {
        beforeEach(async function () { });

        it("If non owner", async function () {
            await expectRevert(
                this.chef.setERC721ContractAddress(this.erc721.address, {
                    from: userAddress2,
                }),
                "Ownable: caller is not the owner"
            );
        });

        it("If Only owner", async function () {
            await this.chef.setERC721ContractAddress(this.erc721.address, {
                from: ownerAddress
            });

            let pool = await this.chef.erc721Token();
            expect(pool).to.equal(this.erc721.address);
        });
    });

    describe("Deposit lp in pool", function () {
        beforeEach(async function () {
            await this.chef.setERC721ContractAddress(this.erc721.address, {
                from: ownerAddress
            });
        });

        it("If not hold tokens", async function () {
            await expectRevert(
                this.chef.deposit(0, [0], {
                    from: userAddress2,
                }),
                "ERC721: transfer from incorrect owner"
            );
        });

        it("If hold tokens but not approve", async function () {
            await this.erc721.safeTransferFrom(ownerAddress, userAddress1, 0);
            await expectRevert(
                this.chef.deposit(0, [0], {
                    from: userAddress1,
                }),
                "ERC721: caller is not token owner or approved"
            );
        });

        it("If hold tokens and approve", async function () {
            await this.chef.deposit(0, [0], {
                from: ownerAddress,
            });

            await mineBlock(10);
            expect(await this.chef.pendingVEMP(0, ownerAddress)).to.be.bignumber.equal(new BN(1000000000000));

            await mineBlock(10);
            expect(await this.chef.pendingVEMP(0, ownerAddress)).to.be.bignumber.equal(new BN(2000000000000));
        });

        it("If hold tokens and approve(Multiple users)", async function () {
            await this.chef.deposit(0, [0], {
                from: ownerAddress,
            });

            await this.erc721.safeTransferFrom(ownerAddress, userAddress1, 1);
            await this.erc721.approve(this.chef.address, 1, {
                from: userAddress1
            });

            await this.chef.deposit(0, [1], {
                from: userAddress1,
            });

            await mineBlock(10);
            expect(await this.chef.pendingVEMP(0, ownerAddress)).to.be.bignumber.equal(new BN(3500000000000));
            expect(await this.chef.pendingVEMP(0, userAddress1)).to.be.bignumber.equal(new BN(500000000000));

            await mineBlock(10);
            expect(await this.chef.pendingVEMP(0, ownerAddress)).to.be.bignumber.equal(new BN(4000000000000));
            expect(await this.chef.pendingVEMP(0, userAddress1)).to.be.bignumber.equal(new BN(1000000000000));
        });
    });

    describe("Claim Reward tokens", function () {
        beforeEach(async function () {
            await this.chef.setERC721ContractAddress(this.erc721.address, {
                from: ownerAddress
            });
        });

        it("Show 0 if not invested", async function () {
            expect(await this.chef.pendingVEMP(0, userAddress1)).to.be.bignumber.equal(new BN(0));
        });

        it("If hold tokens and approve and try to claim", async function () {
            await this.erc721.safeTransferFrom(ownerAddress, userAddress1, 1);
            await this.erc721.approve(this.chef.address, 1, {
                from: userAddress1
            });
            await this.vemp.transfer(this.chef.address, 100000);

            await this.chef.deposit(0, [1], {
                from: userAddress1,
            });

            await mineBlock(10);
            expect(await this.chef.pendingVEMP(0, userAddress1)).to.be.bignumber.equal(new BN(1000000000000));

            await mineBlock(10);
            expect(await this.chef.pendingVEMP(0, userAddress1)).to.be.bignumber.equal(new BN(2000000000000));

            await this.chef.deposit(0, [], {
                from: userAddress1,
            });

            expect(await this.chef.pendingVEMP(0, userAddress1)).to.be.bignumber.equal(new BN(0));
            expect(await this.vemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(100000));
        });

        it("If hold tokens and approve(Multiple users) and claim", async function () {
            await this.vemp.transfer(this.chef.address, 100000);

            await this.erc721.safeTransferFrom(ownerAddress, userAddress1, 1);
            await this.erc721.approve(this.chef.address, 1, {
                from: userAddress1
            });

            await this.chef.deposit(0, [1], {
                from: userAddress1,
            });

            await this.chef.deposit(0, [0], {
                from: ownerAddress,
            });

            await mineBlock(10);
            expect(await this.chef.pendingVEMP(0, ownerAddress)).to.be.bignumber.equal(new BN(500000000000));
            expect(await this.chef.pendingVEMP(0, userAddress1)).to.be.bignumber.equal(new BN(1500000000000));

            await this.chef.deposit(0, [2], {
                from: ownerAddress,
            });

            expect(await this.chef.pendingVEMP(0, ownerAddress)).to.be.bignumber.equal(new BN(0));
            expect(await this.vemp.balanceOf(ownerAddress)).to.be.bignumber.equal(new BN("100000000000000000000000000"));

            await mineBlock(10);
            expect(await this.chef.pendingVEMP(0, ownerAddress)).to.be.bignumber.equal(new BN(666660000000));
            expect(await this.chef.pendingVEMP(0, userAddress1)).to.be.bignumber.equal(new BN(2333330000000));
        });
    });

    describe("Withdraw deposit tokens", function () {
        beforeEach(async function () {
            await this.chef.setERC721ContractAddress(this.erc721.address, {
                from: ownerAddress
            });
        });

        it("Failed if not deposit", async function () {
            await this.vemp.transfer(userAddress1, 10000);
            await expectRevert(this.chef.withdraw(0, {
                from: userAddress1
            }), "withdraw: not good");
        });

        it("If hold tokens and approve and try to withdraw", async function () {
            await this.vemp.transfer(this.chef.address, 100000);
            await this.erc721.safeTransferFrom(ownerAddress, userAddress1, 1);
            await this.erc721.approve(this.chef.address, 1, {
                from: userAddress1
            });

            await this.chef.deposit(0, [1], {
                from: userAddress1,
            });

            await mineBlock(10);
            expect(await this.chef.pendingVEMP(0, userAddress1)).to.be.bignumber.equal(new BN(1000000000000));

            await mineBlock(10);
            expect(await this.chef.pendingVEMP(0, userAddress1)).to.be.bignumber.equal(new BN(2000000000000));

            await this.chef.withdraw(0, {
                from: userAddress1,
            });

            expect(await this.chef.pendingVEMP(0, userAddress1)).to.be.bignumber.equal(new BN(0));
            expect(await this.vemp.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(100000));
        });
    });
});