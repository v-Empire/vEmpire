const { expect } = require('chai')
const { upgrades } = require('hardhat')
const { expectRevert } = require('@openzeppelin/test-helpers')

describe('Staking contract', function () {
  let Token
  let stakeToken
  let erc20Contract
  let erc20Token
  let nftToken
  let stakeContract
  let owner
  let addr1
  let addr2
  let addrs

  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    Token = await ethers.getContractFactory('NFT')
    stakeToken = await ethers.getContractFactory('NFTStake')
    erc20Contract = await ethers.getContractFactory('SampleToken')
    ;[owner, addr1, addr2, ...addrs] = await ethers.getSigners()

    nftToken = await upgrades.deployProxy(Token, [])
    await nftToken.deployed()

    erc20Token = await upgrades.deployProxy(erc20Contract, [])
    await erc20Token.deployed()

    stakeContract = await upgrades.deployProxy(stakeToken, [
      erc20Token.address,
      nftToken.address,
    ])
    await stakeContract.deployed()

    await nftToken.mint(owner.address, 0, 1, '0x')
    await nftToken.mint(owner.address, 1, 1, '0x')
    await nftToken.mint(owner.address, 2, 1, '0x')

    await stakeContract.whiteListNFT([0, 1, 2], true)
  })

  describe('Initial configuration', function () {
    it('Should set the right owner NFT token', async function () {
      expect(await nftToken.owner()).to.equal(owner.address)
    })

    it('Should set the right owner of stake contract', async function () {
      expect(await stakeContract.owner()).to.equal(owner.address)
    })
  })

  describe('whiteListNFT', function () {
    it('Not allow non-admin to whiteList tokenIds', async function () {
      await expectRevert(
        stakeContract
          .connect(addr1)
          .whiteListNFT([4], true, { from: addr1.address }),
        'Ownable: caller is not the owner',
      )
    })

    it('Revert if token already listed', async function () {
      await expectRevert(
        stakeContract.whiteListNFT([1], true),
        'Already in same status',
      )
    })

    it('Whitelist by admin and update status', async function () {
      await stakeContract.whiteListNFT([4], true)
      expect(await stakeContract.whiteListNFTs(4)).to.equal(true)
    })

    it('Default status false', async function () {
      expect(await stakeContract.whiteListNFTs(4)).to.equal(false)
    })
  })

  describe('Not allow un-whitelisted nft tokens', function () {
    it('Should not stake the token if token id not whitelisted', async function () {
      await nftToken.mint(owner.address, 3, 1, '0x')
      await nftToken.setApprovalForAll(stakeContract.address, true)
      await expectRevert(stakeContract.deposit([3], [1]), 'Invalid token NFT')
    })
  })

  describe('Stake token', function () {
    it('Should stake the token in staking contract', async function () {
      await nftToken.setApprovalForAll(stakeContract.address, true)
      await stakeContract.deposit([0], [1])
      expect(await nftToken.balanceOf(stakeContract.address, 0)).to.equal(1)
    })

    it('Should stake the multiple token in staking contract', async function () {
      await nftToken.setApprovalForAll(stakeContract.address, true)
      await stakeContract.deposit([0, 1], [1, 1])
      expect(await nftToken.balanceOf(stakeContract.address, 0)).to.equal(1)
      expect(await nftToken.balanceOf(stakeContract.address, 1)).to.equal(1)
    })
  })

  describe('emergencyWithdrawRewardTokens', function () {
    it('Not allow non-admin to withdraw tokens', async function () {
      await expectRevert(
        stakeContract
          .connect(addr1)
          .emergencyWithdrawRewardTokens(10, { from: addr1.address }),
        'Ownable: caller is not the owner',
      )
    })

    it('only admin can withdraw tokens', async function () {
      await erc20Token.transfer(stakeContract.address, 100)
      await stakeContract.emergencyWithdrawRewardTokens(10)

      expect(await erc20Token.balanceOf(stakeContract.address)).to.equal(90)
    })

    it('If admin try to withdraw large tokens', async function () {
      await erc20Token.transfer(stakeContract.address, 100)
      await stakeContract.emergencyWithdrawRewardTokens(1000)

      expect(await erc20Token.balanceOf(stakeContract.address)).to.equal(0)
    })
  })

  describe('Rewards', function () {
    it('Reward should be divided among multiple staker', async function () {
      await nftToken.setApprovalForAll(stakeContract.address, true)
      await nftToken.safeTransferFrom(owner.address, addr1.address, 1, 1, '0x')
      await nftToken
        .connect(addr1)
        .setApprovalForAll(stakeContract.address, true)

      await stakeContract.deposit([0], [1])
      await stakeContract.connect(addr1).deposit([1], [1])

      await erc20Token.transfer(stakeContract.address, 100)
      expect(await stakeContract.claimableRewards(owner.address)).to.equal(50)
      expect(await stakeContract.claimableRewards(addr1.address)).to.equal(50)
    })

    it('Reward should not not get the tokens from previous rewards', async function () {
      await nftToken.setApprovalForAll(stakeContract.address, true)
      await nftToken.safeTransferFrom(owner.address, addr1.address, 1, 1, '0x')
      await nftToken
        .connect(addr1)
        .setApprovalForAll(stakeContract.address, true)

      await stakeContract.deposit([0], [1])
      await erc20Token.transfer(stakeContract.address, 100)

      await stakeContract.connect(addr1).deposit([1], [1])
      expect(await stakeContract.claimableRewards(owner.address)).to.equal(100)
      expect(await stakeContract.claimableRewards(addr1.address)).to.equal(0)
    })

    it('User should get the correct tokens on claim', async function () {
      await nftToken.setApprovalForAll(stakeContract.address, true)
      await nftToken.safeTransferFrom(owner.address, addr1.address, 1, 1, '0x')
      await nftToken
        .connect(addr1)
        .setApprovalForAll(stakeContract.address, true)

      await stakeContract.connect(addr1).deposit([1], [1])
      await erc20Token.transfer(stakeContract.address, 100)
      expect(await stakeContract.claimableRewards(addr1.address)).to.equal(100)
      await stakeContract.connect(addr1).claimRewards()
      expect(await stakeContract.claimableRewards(addr1.address)).to.equal(0)
      expect(await erc20Token.balanceOf(addr1.address)).to.equal(100)
    })

    it('User should get the correct tokens on claim when multiple users stake', async function () {
      await nftToken.safeTransferFrom(owner.address, addr1.address, 1, 1, '0x')
      await nftToken.safeTransferFrom(owner.address, addr2.address, 0, 1, '0x')
      await nftToken
        .connect(addr1)
        .setApprovalForAll(stakeContract.address, true)
      await nftToken
        .connect(addr2)
        .setApprovalForAll(stakeContract.address, true)

      await stakeContract.connect(addr1).deposit([1], [1])
      await stakeContract.connect(addr2).deposit([0], [1])
      await erc20Token.transfer(stakeContract.address, 100)
      expect(await stakeContract.claimableRewards(addr1.address)).to.equal(50)
      expect(await stakeContract.claimableRewards(addr2.address)).to.equal(50)
      await stakeContract.connect(addr1).claimRewards()
      await stakeContract.connect(addr2).claimRewards()
      expect(await stakeContract.claimableRewards(addr1.address)).to.equal(0)
      expect(await erc20Token.balanceOf(addr1.address)).to.equal(50)
      expect(await stakeContract.claimableRewards(addr2.address)).to.equal(0)
      expect(await erc20Token.balanceOf(addr2.address)).to.equal(50)
    })
  })

  describe('Claim rewards after multiple stake/claim', function () {
    beforeEach(async function () {
      await nftToken.safeTransferFrom(owner.address, addr1.address, 0, 1, '0x')
      await nftToken.safeTransferFrom(owner.address, addr2.address, 1, 1, '0x')
      await nftToken
        .connect(addr1)
        .setApprovalForAll(stakeContract.address, true)
      await nftToken
        .connect(addr2)
        .setApprovalForAll(stakeContract.address, true)

      await stakeContract.connect(addr1).deposit([0], [1])
      await stakeContract.connect(addr2).deposit([1], [1])
      await erc20Token.transfer(stakeContract.address, 100)
      await stakeContract.connect(addr1).claimRewards()
    })

    it('User should get the correct tokens on deposit again', async function () {
      await nftToken.setApprovalForAll(stakeContract.address, true)
      await nftToken.safeTransferFrom(owner.address, addrs[0].address, 2, 1, '0x')
      await nftToken
        .connect(addrs[0])
        .setApprovalForAll(stakeContract.address, true)

      await stakeContract.connect(addrs[0]).deposit([2], [1])
      expect(await stakeContract.claimableRewards(addrs[0].address)).to.equal(0)
      await erc20Token.transfer(stakeContract.address, 100)
      expect(await stakeContract.claimableRewards(addrs[0].address)).to.equal(
        33,
      )
      expect(await stakeContract.claimableRewards(addr2.address)).to.equal(83)
      expect(await stakeContract.claimableRewards(addr1.address)).to.equal(33)
      await stakeContract.connect(addrs[0]).claimRewards()
      await stakeContract.connect(addr1).claimRewards()
      await stakeContract.connect(addr2).claimRewards()
      expect(await stakeContract.claimableRewards(addrs[0].address)).to.equal(0)
      expect(await erc20Token.balanceOf(addrs[0].address)).to.equal(33)
      expect(await stakeContract.claimableRewards(addr1.address)).to.equal(0)
      expect(await erc20Token.balanceOf(addr2.address)).to.equal(83)
      expect(await stakeContract.claimableRewards(addr2.address)).to.equal(0)
      expect(await erc20Token.balanceOf(addr1.address)).to.equal(83)
    })

    it('User should get the correct tokens on multiple deposit/withdraw too', async function () {
      await nftToken.setApprovalForAll(stakeContract.address, true)
      await nftToken.safeTransferFrom(owner.address, addrs[0].address, 2, 1, '0x')
      await nftToken
        .connect(addrs[0])
        .setApprovalForAll(stakeContract.address, true)

      await stakeContract.connect(addr1).withdraw([0], [1])

      await stakeContract.connect(addrs[0]).deposit([2], [1])
      expect(await stakeContract.claimableRewards(addrs[0].address)).to.equal(0)
      await erc20Token.transfer(stakeContract.address, 100)
      expect(await stakeContract.claimableRewards(addrs[0].address)).to.equal(
        50,
      )
      expect(await stakeContract.claimableRewards(addr2.address)).to.equal(100)
      expect(await stakeContract.claimableRewards(addr1.address)).to.equal(0)
      await stakeContract.connect(addrs[0]).claimRewards()
      await stakeContract.connect(addr1).claimRewards()
      await stakeContract.connect(addr2).claimRewards()
      expect(await stakeContract.claimableRewards(addrs[0].address)).to.equal(0)
      expect(await erc20Token.balanceOf(addrs[0].address)).to.equal(50)
      expect(await stakeContract.claimableRewards(addr1.address)).to.equal(0)
      expect(await erc20Token.balanceOf(addr2.address)).to.equal(100)
      expect(await stakeContract.claimableRewards(addr2.address)).to.equal(0)
      expect(await erc20Token.balanceOf(addr1.address)).to.equal(50)

      await erc20Token.transfer(stakeContract.address, 100)
      await stakeContract.connect(addr1).deposit([0], [1])
      await erc20Token.transfer(stakeContract.address, 100)
      expect(await stakeContract.claimableRewards(addrs[0].address)).to.equal(
        83,
      )
      expect(await stakeContract.claimableRewards(addr2.address)).to.equal(83)
      expect(await stakeContract.claimableRewards(addr1.address)).to.equal(33)

      await stakeContract.connect(addrs[0]).claimRewards()
      await stakeContract.connect(addr1).claimRewards()
      await stakeContract.connect(addr2).claimRewards()

      expect(await stakeContract.claimableRewards(addrs[0].address)).to.equal(0)
      expect(await erc20Token.balanceOf(addrs[0].address)).to.equal(133)
      expect(await stakeContract.claimableRewards(addr1.address)).to.equal(0)
      expect(await erc20Token.balanceOf(addr2.address)).to.equal(183)
      expect(await stakeContract.claimableRewards(addr2.address)).to.equal(0)
      expect(await erc20Token.balanceOf(addr1.address)).to.equal(83)
    })
  })
})
