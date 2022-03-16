const { expect } = require("chai");
const { upgrades } = require("hardhat");
const { time } = require("./utils/index");

const MINTER_ROLE =
  "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";

describe("Staking contract", function () {
  let Token;
  let stakeToken;
  let erc20Contract;
  let erc20Token;
  let nftToken;
  let stakeContract;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    Token = await ethers.getContractFactory("NFT");
    stakeToken = await ethers.getContractFactory("StakeNFT");
    erc20Contract = await ethers.getContractFactory("SampleToken");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    nftToken = await upgrades.deployProxy(Token, ["Name", "Symbol", 4980]);
    await nftToken.deployed();

    erc20Token = await upgrades.deployProxy(erc20Contract, []);
    await erc20Token.deployed();

    stakeContract = await upgrades.deployProxy(stakeToken, [
      erc20Token.address,
      nftToken.address,
    ]);
    await stakeContract.deployed();

    await nftToken.grantRole(MINTER_ROLE, owner.address);
    await nftToken.mintTokens(1, owner.address);
    await nftToken.mintTokens(1, owner.address);
    await nftToken.mintTokens(1, owner.address);
  });
  describe("Initial configuration", function () {
    it("Should set the right owner NFT token", async function () {
      expect(await nftToken.owner()).to.equal(owner.address);
    });
    it("Should set the right owner of stake contract", async function () {
      expect(await stakeContract.owner()).to.equal(owner.address);
    });
    it("Should check the total supply of NFT", async function () {
      expect(await nftToken.totalSupply()).to.equal(3);
    });
  });

  describe("Stake token", function () {
    it("Should stake the token in staking contract", async function () {
      await nftToken.setApprovalForAll(stakeContract.address, true);
      await stakeContract.deposit([0]);
      expect(await nftToken.balanceOf(stakeContract.address)).to.equal(1);
    });
    it("Should stake the multiple token in staking contract", async function () {
      await nftToken.setApprovalForAll(stakeContract.address, true);
      await stakeContract.deposit([0, 1]);
      expect(await nftToken.balanceOf(stakeContract.address)).to.equal(2);
    });
  });
  describe("Rewards", function () {
    it("Reward should be divided among multiple staker", async function () {
      await nftToken.setApprovalForAll(stakeContract.address, true);
      await nftToken.transferFrom(owner.address, addr1.address, 1);
      await nftToken
        .connect(addr1)
        .setApprovalForAll(stakeContract.address, true);

      await stakeContract.deposit([0]);
      await stakeContract.connect(addr1).deposit([1]);

      await erc20Token.transfer(stakeContract.address, 100);
      expect(await stakeContract.claimableRewards(owner.address)).to.equal(50);
      expect(await stakeContract.claimableRewards(addr1.address)).to.equal(50);
    });

    it("Reward should not not get the tokens from previous rewards", async function () {
      await nftToken.setApprovalForAll(stakeContract.address, true);
      await nftToken.transferFrom(owner.address, addr1.address, 1);
      await nftToken
        .connect(addr1)
        .setApprovalForAll(stakeContract.address, true);

      await stakeContract.deposit([0]);
      await erc20Token.transfer(stakeContract.address, 100);

      await stakeContract.connect(addr1).deposit([1]);
      expect(await stakeContract.claimableRewards(owner.address)).to.equal(100);
      expect(await stakeContract.claimableRewards(addr1.address)).to.equal(0);
    });

    it("User should get the correct tokens on claim", async function () {
      await nftToken.setApprovalForAll(stakeContract.address, true);
      await nftToken.transferFrom(owner.address, addr1.address, 1);
      await nftToken
        .connect(addr1)
        .setApprovalForAll(stakeContract.address, true);

      await stakeContract.connect(addr1).deposit([1]);
      await erc20Token.transfer(stakeContract.address, 100);
      expect(await stakeContract.claimableRewards(addr1.address)).to.equal(100);
      await stakeContract.connect(addr1).claimRewards();
      expect(await stakeContract.claimableRewards(addr1.address)).to.equal(0);
      expect(await erc20Token.balanceOf(addr1.address)).to.equal(100);
    });
    it("User should get the correct tokens on claim when multiple users stake", async function () {
      await nftToken.transferFrom(owner.address, addr1.address, 1);
      await nftToken.transferFrom(owner.address, addr2.address, 0);
      await nftToken
        .connect(addr1)
        .setApprovalForAll(stakeContract.address, true);
      await nftToken
        .connect(addr2)
        .setApprovalForAll(stakeContract.address, true);

      await stakeContract.connect(addr1).deposit([1]);
      await stakeContract.connect(addr2).deposit([0]);
      await erc20Token.transfer(stakeContract.address, 100);
      expect(await stakeContract.claimableRewards(addr1.address)).to.equal(50);
      expect(await stakeContract.claimableRewards(addr2.address)).to.equal(50);
      await stakeContract.connect(addr1).claimRewards();
      await stakeContract.connect(addr2).claimRewards();
      expect(await stakeContract.claimableRewards(addr1.address)).to.equal(0);
      expect(await erc20Token.balanceOf(addr1.address)).to.equal(50);
      expect(await stakeContract.claimableRewards(addr2.address)).to.equal(0);
      expect(await erc20Token.balanceOf(addr2.address)).to.equal(50);
    });
  });
  describe("Claim rewards after multiple stake/claim", function () {
    beforeEach(async function () {
      await nftToken.transferFrom(owner.address, addr1.address, 0);
      await nftToken.transferFrom(owner.address, addr2.address, 1);
      await nftToken
        .connect(addr1)
        .setApprovalForAll(stakeContract.address, true);
      await nftToken
        .connect(addr2)
        .setApprovalForAll(stakeContract.address, true);

      await stakeContract.connect(addr1).deposit([0]);
      await stakeContract.connect(addr2).deposit([1]);
      await erc20Token.transfer(stakeContract.address, 100);
      await stakeContract.connect(addr1).claimRewards();
    });

    it("User should get the correct tokens on deposit again", async function () {
      await nftToken.setApprovalForAll(stakeContract.address, true);
      await nftToken.transferFrom(owner.address, addrs[0].address, 2);
      await nftToken
        .connect(addrs[0])
        .setApprovalForAll(stakeContract.address, true);

      await stakeContract.connect(addrs[0]).deposit([2]);
      expect(await stakeContract.claimableRewards(addrs[0].address)).to.equal(
        0
      );
      await erc20Token.transfer(stakeContract.address, 100);
      expect(await stakeContract.claimableRewards(addrs[0].address)).to.equal(
        33
      );
      expect(await stakeContract.claimableRewards(addr2.address)).to.equal(83);
      expect(await stakeContract.claimableRewards(addr1.address)).to.equal(33);
      await stakeContract.connect(addrs[0]).claimRewards();
      await stakeContract.connect(addr1).claimRewards();
      await stakeContract.connect(addr2).claimRewards();
      expect(await stakeContract.claimableRewards(addrs[0].address)).to.equal(
        0
      );
      expect(await erc20Token.balanceOf(addrs[0].address)).to.equal(33);
      expect(await stakeContract.claimableRewards(addr1.address)).to.equal(0);
      expect(await erc20Token.balanceOf(addr2.address)).to.equal(83);
      expect(await stakeContract.claimableRewards(addr2.address)).to.equal(0);
      expect(await erc20Token.balanceOf(addr1.address)).to.equal(83);
    });
    it("User should get the correct tokens on multiple deposit/withdraw too", async function () {
      await nftToken.setApprovalForAll(stakeContract.address, true);
      await nftToken.transferFrom(owner.address, addrs[0].address, 2);
      await nftToken
        .connect(addrs[0])
        .setApprovalForAll(stakeContract.address, true);

      await stakeContract.connect(addr1).withdraw([0]);

      await stakeContract.connect(addrs[0]).deposit([2]);
      expect(await stakeContract.claimableRewards(addrs[0].address)).to.equal(
        0
      );
      await erc20Token.transfer(stakeContract.address, 100);
      expect(await stakeContract.claimableRewards(addrs[0].address)).to.equal(
        50
      );
      expect(await stakeContract.claimableRewards(addr2.address)).to.equal(100);
      expect(await stakeContract.claimableRewards(addr1.address)).to.equal(0);
      await stakeContract.connect(addrs[0]).claimRewards();
      await stakeContract.connect(addr1).claimRewards();
      await stakeContract.connect(addr2).claimRewards();
      expect(await stakeContract.claimableRewards(addrs[0].address)).to.equal(
        0
      );
      expect(await erc20Token.balanceOf(addrs[0].address)).to.equal(50);
      expect(await stakeContract.claimableRewards(addr1.address)).to.equal(0);
      expect(await erc20Token.balanceOf(addr2.address)).to.equal(100);
      expect(await stakeContract.claimableRewards(addr2.address)).to.equal(0);
      expect(await erc20Token.balanceOf(addr1.address)).to.equal(50);

      await erc20Token.transfer(stakeContract.address, 100);
      await stakeContract.connect(addr1).deposit([0]);
      await erc20Token.transfer(stakeContract.address, 100);
      expect(await stakeContract.claimableRewards(addrs[0].address)).to.equal(
        83
      );
      expect(await stakeContract.claimableRewards(addr2.address)).to.equal(83);
      expect(await stakeContract.claimableRewards(addr1.address)).to.equal(33);

      await stakeContract.connect(addrs[0]).claimRewards();
      await stakeContract.connect(addr1).claimRewards();
      await stakeContract.connect(addr2).claimRewards();

      expect(await stakeContract.claimableRewards(addrs[0].address)).to.equal(
        0
      );
      expect(await erc20Token.balanceOf(addrs[0].address)).to.equal(133);
      expect(await stakeContract.claimableRewards(addr1.address)).to.equal(0);
      expect(await erc20Token.balanceOf(addr2.address)).to.equal(183);
      expect(await stakeContract.claimableRewards(addr2.address)).to.equal(0);
      expect(await erc20Token.balanceOf(addr1.address)).to.equal(83);

    });
  });
});
