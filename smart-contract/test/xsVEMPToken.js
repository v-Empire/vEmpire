const { accounts, contract, privateKeys } = require('@openzeppelin/test-environment');
const { BN, expectRevert, time, expectEvent, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const xsVEMP = contract.fromArtifact('xsVEMPToken');

const mintToken = new BN(100000000).mul(new BN(10).pow(new BN(18)));

describe('xsVEMP Token', function () {
    const [ownerAddress, userAddress, userAddress1, userAddress2] = accounts;
    const [_, userPrivateKey] = privateKeys;

    // Deploy xsVEMP Token
    beforeEach(async function () {
        this.xsVEMP = await xsVEMP.new({
            from: ownerAddress
        });
    });

    // Check all initial values after xsVEMP Token Deployement
    describe('Initalized values', function () {
        it('Token Name', async function () {
            const name = await this.xsVEMP.name();
            expect(name).to.be.equal("xsVEMP");
        });

        it('Token Symbol', async function () {
            const sym = await this.xsVEMP.symbol();
            expect(sym).to.be.equal("xsVEMP");
        });

        it('Decimal', async function () {
            const dec = await this.xsVEMP.decimals();
            expect(dec).to.be.bignumber.equal(new BN(18));
        });

        it('Initial Token Supply', async function () {
            const supply = await this.xsVEMP.totalSupply();
            expect(supply).to.be.bignumber.equal(new BN(0));
        });

        it('Initial Minter Role', async function () {
            const isminter = await this.xsVEMP.isMinter(ownerAddress);
            expect(isminter).to.be.equal(true);
        });
    });

    // Check Transfer Functionality of xsVEMP token
    describe('transfer token', function () {
        beforeEach(async function () {
            await this.xsVEMP.mint(ownerAddress, mintToken, {
                from: ownerAddress
            });
        });

        it('transferFrom A to B', async function () {
            await expectRevert(this.xsVEMP.transfer(userAddress2, 1000, {
                from: userAddress
            }), "ERC20: transfer amount exceeds balance");
        });

        it('transfer A to B', async function () {
            await this.xsVEMP.transfer(userAddress, 1000, {
                from: ownerAddress
            });

            const bal = await this.xsVEMP.balanceOf(userAddress);
            expect(bal).to.be.bignumber.equal(new BN(1000));
        });
    });

    // Check TransferFrom Functionality of xsVEMP token
    describe('transferFrom token', function () {
        beforeEach(async function () {
            await this.xsVEMP.mint(ownerAddress, mintToken, {
                from: ownerAddress
            });
        });

        it('transferFrom A to B without approve', async function () {
            await expectRevert(this.xsVEMP.transferFrom(ownerAddress, userAddress, 1000, {
                from: userAddress
            }), "ERC20: transfer amount exceeds allowance");
        });

        it('transferFrom A to B with approve', async function () {
            await this.xsVEMP.approve(userAddress, 10000, {
                from: ownerAddress
            });
            await this.xsVEMP.transferFrom(ownerAddress, userAddress, 10000, {
                from: userAddress
            });

            const bal = await this.xsVEMP.balanceOf(userAddress);
            expect(bal).to.be.bignumber.equal(new BN(10000));
        });

        it('transferFrom A to B with approve with large balance', async function () {
            await this.xsVEMP.approve(userAddress1, 10000, {
                from: userAddress
            });
            await expectRevert(this.xsVEMP.transferFrom(userAddress, userAddress1, 100000, {
                from: userAddress
            }), "ERC20: transfer amount exceeds balance");
        });
    });

    // Check Approve Functionality of xsVEMP token
    describe('Approve', function () {
        it('Initial Allowance value', async function () {
            expect(await this.xsVEMP.allowance(ownerAddress, userAddress)).to.be.bignumber.equal(new BN(0));
        });

        it('increase allowance', async function () {
            await this.xsVEMP.approve(userAddress, 10000, {
                from: ownerAddress
            });
            expect(await this.xsVEMP.allowance(ownerAddress, userAddress)).to.be.bignumber.equal(new BN(10000));
        });
    });

    describe("Minting", function () {
        it("Without Minter", async function () {
            await expectRevert(this.xsVEMP.mint(userAddress2, 100000000000), "MinterRole: caller does not have the Minter role");
        });

        it("Set minter with owner", async function () {
            await this.xsVEMP.addMinter([userAddress2], {from:ownerAddress});
            expect(await this.xsVEMP.isMinter(userAddress2)).to.be.equal(true);
        });

        it("Mint new token from minter", async function () {
            await this.xsVEMP.addMinter([userAddress2], {from:ownerAddress});
            await this.xsVEMP.mint(userAddress2, 1000000, {from:userAddress2});

            expect(await this.xsVEMP.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(1000000));
        });
    })

    describe("Burn", function () {
        beforeEach(async function () {
            await this.xsVEMP.mint(ownerAddress, mintToken, {
                from: ownerAddress
            });
        });

        it("Burn with insufficient amount", async function () {
            await expectRevert(this.xsVEMP.burn(1000000000, {from:userAddress2}), "ERC20: burn amount exceeds balance");
        });

        it("Burn success", async function () {
            await this.xsVEMP.transfer(userAddress2, 500, { from: ownerAddress })

            await this.xsVEMP.burn(100, {from:userAddress2});
            expect(await this.xsVEMP.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(400));
        });
    })
});