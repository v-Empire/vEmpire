const { accounts, contract, privateKeys } = require('@openzeppelin/test-environment');
const { BN, expectRevert, time, expectEvent, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { signTypedData } = require('eth-sig-util');

const {
    address,
    minerStart,
    minerStop,
    unlockedAccount,
    mineBlock
} = require('../Utils/Ethereum');
const EIP712 = require('../Utils/EIP712');

const xVEMP = contract.fromArtifact('xVEMPToken');

const decimal = new BN(18);
const mintToken = new BN(100000000).mul(new BN(10).pow(new BN(18)));
const oneether = (new BN(10)).pow(decimal);

describe('xVEMP Token', function () {
    const [ownerAddress, userAddress, userAddress1, userAddress2] = accounts;
    const [ownerPrivateKey, address1PrivateKey, address2PrivateKey, address3PrivateKey] = privateKeys;

    // Deploy xVEMP Token
    beforeEach(async function () {
        this.xVEMP = await xVEMP.new({
            from: ownerAddress
        });

        await this.xVEMP.mint(ownerAddress, mintToken, {
            from: ownerAddress
        });
    });

    // Check all initial values after xVEMP Token Deployement
    describe('Initalized values', function () {
        it('Token Name', async function () {
            const name = await this.xVEMP.name();
            expect(name).to.be.equal("xVEMP");
        });

        it('Token Symbol', async function () {
            const sym = await this.xVEMP.symbol();
            expect(sym).to.be.equal("xVEMP");
        });

        it('Decimal', async function () {
            const dec = await this.xVEMP.decimals();
            expect(dec).to.be.bignumber.equal(new BN(18));
        });

        it('Initial Token Supply', async function () {
            const supply = await this.xVEMP.totalSupply();
            expect(supply).to.be.bignumber.equal(mintToken);
        });

        it('Initial Minter Role', async function () {
            const isminter = await this.xVEMP.isMinter(ownerAddress);
            expect(isminter).to.be.equal(true);
        });
    });

    // Check Transfer Functionality of xVEMP token
    describe('transfer token', function () {
        it('transferFrom A to B', async function () {
            await expectRevert(this.xVEMP.transfer(userAddress2, 1000, {
                from: userAddress
            }), "ERC20: transfer amount exceeds balance");
        });

        it('transfer A to B', async function () {
            await this.xVEMP.transfer(userAddress, 1000, {
                from: ownerAddress
            });

            const bal = await this.xVEMP.balanceOf(userAddress);
            expect(bal).to.be.bignumber.equal(new BN(1000));
        });
    });

    // Check TransferFrom Functionality of xVEMP token
    describe('transferFrom token', function () {
        it('transferFrom A to B without approve', async function () {
            await expectRevert(this.xVEMP.transferFrom(ownerAddress, userAddress, 1000, {
                from: userAddress
            }), "ERC20: transfer amount exceeds allowance");
        });

        it('transferFrom A to B with approve', async function () {
            await this.xVEMP.approve(userAddress, 10000, {
                from: ownerAddress
            });
            await this.xVEMP.transferFrom(ownerAddress, userAddress, 10000, {
                from: userAddress
            });

            const bal = await this.xVEMP.balanceOf(userAddress);
            expect(bal).to.be.bignumber.equal(new BN(10000));
        });

        it('transferFrom A to B with approve with large balance', async function () {
            await this.xVEMP.approve(userAddress1, 10000, {
                from: userAddress
            });
            await expectRevert(this.xVEMP.transferFrom(userAddress, userAddress1, 100000, {
                from: userAddress
            }), "ERC20: transfer amount exceeds balance");
        });
    });

    // Check Approve Functionality of xVEMP token
    describe('Approve', function () {
        it('Initial Allowance value', async function () {
            expect(await this.xVEMP.allowance(ownerAddress, userAddress)).to.be.bignumber.equal(new BN(0));
        });

        it('increase allowance', async function () {
            await this.xVEMP.approve(userAddress, 10000, {
                from: ownerAddress
            });
            expect(await this.xVEMP.allowance(ownerAddress, userAddress)).to.be.bignumber.equal(new BN(10000));
        });
    });

    describe("Minting", function () {
        it("Without Minter", async function () {
            await expectRevert(this.xVEMP.mint(userAddress2, 100000000000), "MinterRole: caller does not have the Minter role");
        });

        it("Set minter with owner", async function () {
            await this.xVEMP.addMinter([userAddress2], {from:ownerAddress});
            expect(await this.xVEMP.isMinter(userAddress2)).to.be.equal(true);
        });

        it("Mint new token from minter", async function () {
            await this.xVEMP.addMinter([userAddress2], {from:ownerAddress});
            await this.xVEMP.mint(userAddress2, 1000000, {from:userAddress2});

            expect(await this.xVEMP.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(1000000));
        });
    })

    describe("Burn", function () {
        it("Burn with insufficient amount", async function () {
            await expectRevert(this.xVEMP.burn(1000000000, {from:userAddress2}), "ERC20: burn amount exceeds balance");
        });

        it("Burn success", async function () {
            await this.xVEMP.transfer(userAddress2, 500, { from: ownerAddress })

            await this.xVEMP.burn(100, {from:userAddress2});
            expect(await this.xVEMP.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(400));
        });
    })

    describe("xVEMP delegate user", function () {
        it("Delegate the users with votes", async function () {
            await this.xVEMP.delegate(userAddress1, { from: ownerAddress });
            expect(await this.xVEMP.getCurrentVotes(userAddress1)).to.be.bignumber.equal(mintToken);
        });
    });

    describe('delegateBySig', function () {
        const name = 'xVEMP';
        let chainId = 1;
        const Domain = ({ name, chainId, verifyingContract: this.xVEMP });
        const Types = {
            Delegation: [
                { name: 'delegatee', type: 'address' },
                { name: 'nonce', type: 'uint256' },
                { name: 'expiry', type: 'uint256' }
            ]
        };

        it('reverts if the signatory is invalid', async function () {
            const delegatee = userAddress1, nonce = 0, expiry = 0;
            await expectRevert(this.xVEMP.delegateBySig(delegatee, nonce, expiry, 0, '0xbad', '0xbad', { from: ownerAddress }), "xVemp::delegateBySig: invalid signature");
        });

        it('reverts if the nonce is bad ', async function () {
            const delegatee = ownerAddress, nonce = 1, expiry = 0;
            const { v, r, s } = EIP712.sign(Domain, 'Delegation', { delegatee, nonce, expiry }, Types, address1PrivateKey);
            await expectRevert(this.xVEMP.delegateBySig(delegatee, nonce, expiry, v, r, s, { from: ownerAddress }), "xVemp::delegateBySig: invalid nonce");
        });

        it('reverts if the signature has expired', async function () {
            const delegatee = ownerAddress, nonce = 0, expiry = 0;
            const { v, r, s } = EIP712.sign(Domain, 'Delegation', { delegatee, nonce, expiry }, Types, address1PrivateKey);
            await expectRevert(this.xVEMP.delegateBySig(delegatee, nonce, expiry, v, r, s, { from: ownerAddress }), "xVemp::delegateBySig: signature expired");
        });

        it('delegates on behalf of the signatory', async function () {
            const delegatee = ownerAddress, nonce = 0, expiry = 10e9;
            const { v, r, s } = EIP712.sign(Domain, 'Delegation', { delegatee, nonce, expiry }, Types, address1PrivateKey);
            expect(await this.xVEMP.delegates(userAddress1)).to.be.equal(address(0));
            const tx = await this.xVEMP.delegateBySig(delegatee, nonce, expiry, v, r, s, { from: ownerAddress });

            expect(tx.gasUsed < 80000);
            console.log(" Address 1 ",userAddress1);
            console.log("Owner address ",ownerAddress);
            let user1delegate = await this.xVEMP.delegates(userAddress1,{ from: ownerAddress });
            let ownerdelegate = await this.xVEMP.delegates(ownerAddress,{ from: userAddress1 });
            console.log("Delegate Address 1 ",user1delegate);
            console.log("Delegate Owner address ",ownerdelegate);
            expect(await this.xVEMP.delegates(userAddress1,{ from: ownerAddress })).to.be.equal(ownerAddress);
        });
    });

    describe('getPriorVotes', function () {
        it('reverts if block number >= current block', async function () {
            await expectRevert(this.xVEMP.getPriorVotes(userAddress2, 5e10, { from: ownerAddress }), "xVemp::getPriorVotes: not yet determined");
        });

        it('returns 0 if there are no checkpoints', async function () {
            expect(await this.xVEMP.getPriorVotes(userAddress2, 0)).to.be.bignumber.equal(new BN(0));
        });

        it('returns the latest block if >= last checkpoint block', async function () {
            const latestBlock = await time.latestBlock();
            const t1 = await this.xVEMP.delegate(userAddress2, { from: ownerAddress });
            await time.advanceBlock();
            await time.advanceBlock();

            expect(await this.xVEMP.getPriorVotes(userAddress2, parseInt(latestBlock) + 1)).to.be.bignumber.equal(mintToken);
            expect(await this.xVEMP.getPriorVotes(userAddress2, parseInt(latestBlock) + 1)).to.be.bignumber.equal(mintToken);
        });

        it('returns zero if < first checkpoint block', async function () {
            const latestBlock = await time.latestBlock();
            const t1 = await this.xVEMP.delegate(userAddress2, { from: ownerAddress });
            await time.advanceBlock();
            await time.advanceBlock();

            expect(await this.xVEMP.getPriorVotes(userAddress2, parseInt(latestBlock))).to.be.bignumber.equal(new BN(0));
            expect(await this.xVEMP.getPriorVotes(userAddress2, parseInt(latestBlock) + 1)).to.be.bignumber.equal(mintToken);
        });

        it('generally returns the voting balance at the appropriate checkpoint', async function () {
            const latestBlock = await time.latestBlock();
            const t1 = await this.xVEMP.delegate(userAddress2, { from: ownerAddress });
            await time.advanceBlock();
            await time.advanceBlock();
            const t2 = await this.xVEMP.transfer(userAddress2, (new BN(20000)).mul(oneether), { from: ownerAddress });
            await time.advanceBlock();
            await time.advanceBlock();
            const t3 = await this.xVEMP.transfer(userAddress2, (new BN(20000)).mul(oneether), { from: ownerAddress });
            await time.advanceBlock();
            await time.advanceBlock();
            const t4 = await this.xVEMP.transfer(ownerAddress, (new BN(40000)).mul(oneether), { from: userAddress2 });
            await time.advanceBlock();
            await time.advanceBlock();

            expect(await this.xVEMP.getPriorVotes(userAddress2, parseInt(latestBlock))).to.be.bignumber.equal(new BN(0));
            expect(await this.xVEMP.getPriorVotes(userAddress2, parseInt(latestBlock) + 1)).to.be.bignumber.equal((new BN(100000000)).mul(oneether));
            expect(await this.xVEMP.getPriorVotes(userAddress2, parseInt(latestBlock) + 2)).to.be.bignumber.equal((new BN(100000000)).mul(oneether));
            expect(await this.xVEMP.getPriorVotes(userAddress2, parseInt(latestBlock) + 4)).to.be.bignumber.equal((new BN(99980000)).mul(oneether));;
            expect(await this.xVEMP.getPriorVotes(userAddress2, parseInt(latestBlock) + 5)).to.be.bignumber.equal((new BN(99980000)).mul(oneether));;
            expect(await this.xVEMP.getPriorVotes(userAddress2, parseInt(latestBlock) + 7)).to.be.bignumber.equal((new BN(99960000)).mul(oneether));;
            expect(await this.xVEMP.getPriorVotes(userAddress2, parseInt(latestBlock) + 8)).to.be.bignumber.equal((new BN(99960000)).mul(oneether));;
            await expectRevert(this.xVEMP.getPriorVotes(userAddress2, parseInt(latestBlock) + 12), "xVemp::getPriorVotes: not yet determined");
        });
    });
});