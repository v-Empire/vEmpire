const { expect } = require("chai");
const { upgrades } = require("hardhat");
const { time } = require("./utils/index");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

const MINTER_ROLE =
  "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";

describe("Sale contract", function () {
  let Token;
  let nftToken;
  let saleContract;
  let sale;
  let owner;
  let addr1;
  let addr2;
  let addrs;
  let currentTime;
  let PhaseDuration;
  let PhaseTwoStartTime;
  let PhaseThreeStartTime;

  let addresses;
  let leafnodes;
  let leaf;
  let tree;
  let root;
  let proof;
  let tempProof;

  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    Token = await ethers.getContractFactory("NFT");
    saleContract = await ethers.getContractFactory("Sale");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // (IVempire _vempireNFT, uint256 _phaseOneStartTime, uint256 _phaseOneDuration, uint256 _phaseTwoStartTime, uint256 _phaseTwoDuration, uint256 _phaseThreeStartTime)

    nftToken = await upgrades.deployProxy(Token, ["Name", "Symbol", 4980]);
    await nftToken.deployed();

    currentTime = parseInt(await time.latest());
    PhaseDuration = 20;
    PhaseTwoStartTime = currentTime + PhaseDuration + 1;
    PhaseThreeStartTime = PhaseTwoStartTime + PhaseDuration + 1;

    sale = await upgrades.deployProxy(saleContract, [
      nftToken.address,
      currentTime,
      PhaseDuration,
      PhaseTwoStartTime,
      PhaseDuration,
      PhaseThreeStartTime,
    ]);
    await sale.deployed();

    await nftToken.grantRole(MINTER_ROLE, sale.address);
  });
  describe("Initial configuration", function () {
    it("Should set the right owner NFT", async function () {
      expect(await nftToken.owner()).to.equal(owner.address);
    });
    it("Should set the right owner of sale", async function () {
      expect(await sale.owner()).to.equal(owner.address);
    });
    it("Total supply of NFT should be 0", async function () {
      expect(await nftToken.totalSupply()).to.equal(0);
    });
  });

  describe("Check owner condition", function () {
    beforeEach("", async function () {
      addresses = [owner.address];
      leafnodes = addresses.map((addr) => keccak256(addr));
      tree = new MerkleTree(leafnodes, keccak256);
      leaf = keccak256(owner.address);
      root = tree.getHexRoot();
    });
    it("Should non owner tries to call setMaxSupply", async function () {
      await expect(sale.connect(addr1).setMaxSupply(10)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("Should non owner tries to call setMaxSupplyPhaseOne", async function () {
      await expect(
        sale.connect(addr1).setMaxSupplyPhaseOne(10)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Should non owner tries to call setLimit", async function () {
      await expect(sale.connect(addr1).setLimit(10)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("Should non owner tries to call setPricePhaseOne", async function () {
      await expect(sale.connect(addr1).setPricePhaseOne(10)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("Should non owner tries to call setPricePhaseTwo", async function () {
      await expect(sale.connect(addr1).setPricePhaseTwo(10)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("Should non owner tries to call setPricePhaseThree", async function () {
      await expect(
        sale.connect(addr1).setPricePhaseThree(10)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Should non owner tries to call setPhaseOneStartTime", async function () {
      await expect(
        sale.connect(addr1).setPhaseOneStartTime(10)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Should non owner tries to call setPhaseOneDuration", async function () {
      await expect(
        sale.connect(addr1).setPhaseOneDuration(10)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Should non owner tries to call setPhaseTwoStartTime", async function () {
      await expect(
        sale.connect(addr1).setPhaseTwoStartTime(10)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Should non owner tries to call setPhaseTwoDuration", async function () {
      await expect(
        sale.connect(addr1).setPhaseTwoDuration(10)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Should non owner tries to call setPhaseThreeStartTime", async function () {
      await expect(
        sale.connect(addr1).setPhaseThreeStartTime(10)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Should non owner tries to call setMerkleRootPhaseOne", async function () {
      await expect(
        sale.connect(addr1).setMerkleRootPhaseOne(root)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Should non owner tries to call setMerkleRootPhaseTwo", async function () {
      await expect(
        sale.connect(addr1).setMerkleRootPhaseTwo(root)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Phase one minting", function () {
    beforeEach("", async function () {
      addresses = [owner.address];
      leafnodes = addresses.map((addr) => keccak256(addr));
      tree = new MerkleTree(leafnodes, keccak256);
      leaf = keccak256(owner.address);
      root = tree.getHexRoot();
      proof = tree.getProof(leaf);
      await sale.setMerkleRootPhaseOne(root);
    });
    it("Buy single NFT", async function () {
      await sale.connect(owner).buy(1, 1, proof, {
        value: ethers.utils.parseUnits("0.5", "ether").toHexString(),
      });
      expect(await sale.addressToTicketsPermissioned(owner.address)).to.equal(
        1
      );
    });
    it("Buy Multiple NFTs", async function () {
      await sale.connect(owner).buy(5, 1, proof, {
        value: ethers.utils.parseUnits("2.5", "ether").toHexString(),
      });
      expect(await sale.addressToTicketsPermissioned(owner.address)).to.equal(
        5
      );
    });
    it("Claim with single NFTs", async function () {
      await sale.connect(owner).buy(1, 1, proof, {
        value: ethers.utils.parseUnits("0.5", "ether").toHexString(),
      });
      await sale.connect(owner).redeem();
      expect(await nftToken.balanceOf(owner.address)).to.equal(1);
    });
    it("Claim with multiple NFTs", async function () {
      await sale.connect(owner).buy(5, 1, proof, {
        value: ethers.utils.parseUnits("2.5", "ether").toHexString(),
      });
      await sale.connect(owner).redeem();
      expect(await nftToken.balanceOf(owner.address)).to.equal(5);
    });
    it("Set new purchase amount", async function () {
      await sale.setPricePhaseOne(
        ethers.utils.parseUnits("1", "ether").toHexString()
      );
      await expect(
        sale.connect(addr1).buy(1, 1, proof, {
          value: ethers.utils.parseUnits("0.5", "ether").toHexString(),
        })
      ).to.be.revertedWith("ETHER SENT NOT CORRECT");
      await sale.connect(owner).buy(1, 1, proof, {
        value: ethers.utils.parseUnits("1", "ether").toHexString(),
      });
      expect(await sale.addressToTicketsPermissioned(owner.address)).to.equal(
        1
      );
    });
    it("Should revert if user tries to claim more than alloted", async function () {
      await sale.connect(owner).buy(1, 1, proof, {
        value: ethers.utils.parseUnits("0.5", "ether").toHexString(),
      });
      await sale.connect(owner).redeem();
      expect(await nftToken.balanceOf(owner.address)).to.equal(1);
      await expect(sale.connect(owner).redeem()).to.be.revertedWith(
        "NO MINTABLE TICKETS"
      );
    });
    it("Should revert if user tries to buy more than alloted", async function () {
      await sale.connect(owner).buy(5, 1, proof, {
        value: ethers.utils.parseUnits("2.5", "ether").toHexString(),
      });
      await sale.connect(owner).redeem();
      expect(await nftToken.balanceOf(owner.address)).to.equal(5);
      await expect(
        sale.connect(owner).buy(1, 1, proof, {
          value: ethers.utils.parseUnits("0.5", "ether").toHexString(),
        })
      ).to.be.revertedWith("BUY AMOUNT EXCEEDS MAX FOR USER");
    });
    it("Should revert if user tries to buy 0 tokens", async function () {
      await expect(
        sale.connect(owner).buy(0, 1, proof, {
          value: ethers.utils.parseUnits("0.5", "ether").toHexString(),
        })
      ).to.be.revertedWith("HAVE TO BUY AT LEAST 1");
    });
    it("Should revert if user tries to buy after sale time", async function () {
      await time.advanceTime(20);
      await expect(
        sale.connect(owner).buy(1, 1, proof, {
          value: ethers.utils.parseUnits("0.5", "ether").toHexString(),
        })
      ).to.be.revertedWith("PHASE ONE SALE IS CLOSED");
    });
    it("Should revert if user tries to buy before sale time", async function () {
      const latestTime = parseInt(await time.latest());
      await sale.setPhaseOneStartTime(latestTime + 20);
      await expect(
        sale.connect(owner).buy(1, 1, proof, {
          value: ethers.utils.parseUnits("0.5", "ether").toHexString(),
        })
      ).to.be.revertedWith("PHASE ONE SALE HASN'T STARTED YET");
    });
    it("Should revert if user tries to buy after Phase max supply reached", async function () {
      await sale.connect(owner).buy(5, 1, proof, {
        value: ethers.utils.parseUnits("2.5", "ether").toHexString(),
      });
      await sale.setMaxSupplyPhaseOne(5);
      await expect(
        sale.connect(owner).buy(1, 1, proof, {
          value: ethers.utils.parseUnits("0.5", "ether").toHexString(),
        })
      ).to.be.revertedWith("BUY AMOUNT GOES OVER MAX SUPPLY FOR PHASE");
    });
    it("Should revert if another user tries to buy", async function () {
      await expect(
        sale.connect(addr1).buy(1, 1, proof, {
          value: ethers.utils.parseUnits("0.5", "ether").toHexString(),
        })
      ).to.be.revertedWith("INVALID PROOF");
    });
    it("Should revert if user tries to buy with less amount", async function () {
      await expect(
        sale.connect(addr1).buy(1, 1, proof, {
          value: ethers.utils.parseUnits("0.3", "ether").toHexString(),
        })
      ).to.be.revertedWith("ETHER SENT NOT CORRECT");
    });
    it("Should revert if user tries to buy multiple tokens with less amount", async function () {
      await expect(
        sale.connect(addr1).buy(3, 1, proof, {
          value: ethers.utils.parseUnits("1", "ether").toHexString(),
        })
      ).to.be.revertedWith("ETHER SENT NOT CORRECT");
    });
  });
  describe("Phase Two minting", function () {
    beforeEach("", async function () {
      addresses = [owner.address];
      leafnodes = addresses.map((addr) => keccak256(addr));
      tree = new MerkleTree(leafnodes, keccak256);
      leaf = keccak256(owner.address);
      root = tree.getHexRoot();
      proof = tree.getProof(leaf);
      await sale.setMerkleRootPhaseTwo(root);
      await time.advanceTime(20);
    });
    it("Buy single NFT", async function () {
      await sale.connect(owner).buy(1, 2, proof, {
        value: ethers.utils.parseUnits("0.75", "ether").toHexString(),
      });
      expect(await sale.addressToTicketsPermissioned(owner.address)).to.equal(
        1
      );
    });
    it("Buy Multiple NFTs", async function () {
      await sale.connect(owner).buy(5, 2, proof, {
        value: ethers.utils.parseUnits("3.75", "ether").toHexString(),
      });
      expect(await sale.addressToTicketsPermissioned(owner.address)).to.equal(
        5
      );
    });
    it("Claim with single NFTs", async function () {
      await sale.connect(owner).buy(1, 2, proof, {
        value: ethers.utils.parseUnits("0.75", "ether").toHexString(),
      });
      await sale.connect(owner).redeem();
      expect(await nftToken.balanceOf(owner.address)).to.equal(1);
    });
    it("Claim with multiple NFTs", async function () {
      await sale.connect(owner).buy(5, 2, proof, {
        value: ethers.utils.parseUnits("3.75", "ether").toHexString(),
      });
      await sale.connect(owner).redeem();
      expect(await nftToken.balanceOf(owner.address)).to.equal(5);
    });
    it("Set new purchase amount", async function () {
      await sale.setPricePhaseTwo(
        ethers.utils.parseUnits("1", "ether").toHexString()
      );
      await expect(
        sale.connect(addr1).buy(1, 2, proof, {
          value: ethers.utils.parseUnits("0.75", "ether").toHexString(),
        })
      ).to.be.revertedWith("ETHER SENT NOT CORRECT");
      await sale.connect(owner).buy(1, 2, proof, {
        value: ethers.utils.parseUnits("1", "ether").toHexString(),
      });
      expect(await sale.addressToTicketsPermissioned(owner.address)).to.equal(
        1
      );
    });
    it("Should revert if user tries to claim more than alloted", async function () {
      await sale.connect(owner).buy(1, 2, proof, {
        value: ethers.utils.parseUnits("0.75", "ether").toHexString(),
      });
      await sale.connect(owner).redeem();
      expect(await nftToken.balanceOf(owner.address)).to.equal(1);
      await expect(sale.connect(owner).redeem()).to.be.revertedWith(
        "NO MINTABLE TICKETS"
      );
    });
    it("Should revert if user tries to buy 0 tokens", async function () {
      await expect(
        sale.connect(owner).buy(0, 2, proof, {
          value: ethers.utils.parseUnits("0.75", "ether").toHexString(),
        })
      ).to.be.revertedWith("HAVE TO BUY AT LEAST 1");
    });
    it("Should revert if user tries to buy after sale time", async function () {
      await time.advanceTime(20);
      await expect(
        sale.connect(owner).buy(1, 2, proof, {
          value: ethers.utils.parseUnits("0.75", "ether").toHexString(),
        })
      ).to.be.revertedWith("PHASE TWO SALE IS CLOSED");
    });
    it("Should revert if user tries to buy before sale time", async function () {
      const latestTime = parseInt(await time.latest());
      await sale.setPhaseTwoStartTime(latestTime + 22);
      await expect(
        sale.connect(owner).buy(1, 2, proof, {
          value: ethers.utils.parseUnits("0.75", "ether").toHexString(),
        })
      ).to.be.revertedWith("PHASE TWO SALE HASN'T STARTED YET");
    });
    it("Should revert if another user tries to buy", async function () {
      await expect(
        sale.connect(addr1).buy(1, 2, proof, {
          value: ethers.utils.parseUnits("0.75", "ether").toHexString(),
        })
      ).to.be.revertedWith("INVALID PROOF");
    });
    it("Should revert if user tries to buy with less amount", async function () {
      await expect(
        sale.connect(addr1).buy(1, 2, proof, {
          value: ethers.utils.parseUnits("0.3", "ether").toHexString(),
        })
      ).to.be.revertedWith("ETHER SENT NOT CORRECT");
    });
    it("Should revert if user tries to buy multiple tokens with less amount", async function () {
      await expect(
        sale.connect(addr1).buy(3, 2, proof, {
          value: ethers.utils.parseUnits("1", "ether").toHexString(),
        })
      ).to.be.revertedWith("ETHER SENT NOT CORRECT");
    });
  });
  describe("Phase Three minting", function () {
    beforeEach("", async function () {
      await time.advanceTime(45);
    });
    it("Buy single NFT", async function () {
      await sale.connect(owner).buy(1, 3, proof, {
        value: ethers.utils.parseUnits("1", "ether").toHexString(),
      });
      expect(await sale.addressToTicketsPermissioned(owner.address)).to.equal(
        1
      );
    });
    it("Buy Multiple NFTs", async function () {
      await sale.connect(owner).buy(5, 3, proof, {
        value: ethers.utils.parseUnits("5", "ether").toHexString(),
      });
      expect(await sale.addressToTicketsPermissioned(owner.address)).to.equal(
        5
      );
    });
    it("Claim with single NFTs", async function () {
      await sale.connect(owner).buy(1, 3, proof, {
        value: ethers.utils.parseUnits("1", "ether").toHexString(),
      });
      await sale.connect(owner).redeem();
      expect(await nftToken.balanceOf(owner.address)).to.equal(1);
    });
    it("Claim with multiple NFTs", async function () {
      await sale.connect(owner).buy(5, 3, proof, {
        value: ethers.utils.parseUnits("5", "ether").toHexString(),
      });
      await sale.connect(owner).redeem();
      expect(await nftToken.balanceOf(owner.address)).to.equal(5);
    });
    it("Set new purchase amount", async function () {
      await sale.setPricePhaseThree(
        ethers.utils.parseUnits("1.5", "ether").toHexString()
      );
      await expect(
        sale.connect(addr1).buy(1, 3, proof, {
          value: ethers.utils.parseUnits("1", "ether").toHexString(),
        })
      ).to.be.revertedWith("ETHER SENT NOT CORRECT");
      await sale.connect(owner).buy(1, 3, proof, {
        value: ethers.utils.parseUnits("1.5", "ether").toHexString(),
      });
      expect(await sale.addressToTicketsPermissioned(owner.address)).to.equal(
        1
      );
    });
    it("Should revert if user tries to claim more than alloted", async function () {
      await sale.connect(owner).buy(1, 3, proof, {
        value: ethers.utils.parseUnits("1", "ether").toHexString(),
      });
      await sale.connect(owner).redeem();
      expect(await nftToken.balanceOf(owner.address)).to.equal(1);
      await expect(sale.connect(owner).redeem()).to.be.revertedWith(
        "NO MINTABLE TICKETS"
      );
    });
    it("Should revert if user tries to buy 0 tokens", async function () {
      await expect(
        sale.connect(owner).buy(0, 3, proof, {
          value: ethers.utils.parseUnits("1", "ether").toHexString(),
        })
      ).to.be.revertedWith("HAVE TO BUY AT LEAST 1");
    });
    it("Should revert if user tries to buy before sale time", async function () {
      const latestTime = parseInt(await time.latest());
      await sale.setPhaseThreeStartTime(latestTime + 50);
      await expect(
        sale.connect(owner).buy(1, 3, proof, {
          value: ethers.utils.parseUnits("1", "ether").toHexString(),
        })
      ).to.be.revertedWith("PHASE THREE SALE HASN'T STARTED YET");
    });
    it("Should revert if user tries to buy after Phase max supply reached", async function () {
      await sale.connect(owner).buy(5, 3, proof, {
        value: ethers.utils.parseUnits("5", "ether").toHexString(),
      });
      await sale.setMaxSupply(5);
      await expect(
        sale.connect(owner).buy(1, 3, proof, {
          value: ethers.utils.parseUnits("1", "ether").toHexString(),
        })
      ).to.be.revertedWith("BUY AMOUNT GOES OVER MAX SUPPLY");
    });
    it("Should revert if another user tries to buy", async function () {
      await sale.connect(addr1).buy(1, 3, proof, {
        value: ethers.utils.parseUnits("1", "ether").toHexString(),
      });
      expect(await sale.addressToTicketsPermissioned(addr1.address)).to.equal(
        1
      );
    });
    it("Should revert if user tries to buy with less amount", async function () {
      await expect(
        sale.connect(addr1).buy(1, 3, proof, {
          value: ethers.utils.parseUnits("0.3", "ether").toHexString(),
        })
      ).to.be.revertedWith("ETHER SENT NOT CORRECT");
    });
    it("Should revert if user tries to buy multiple tokens with less amount", async function () {
      await expect(
        sale.connect(addr1).buy(3, 3, proof, {
          value: ethers.utils.parseUnits("1", "ether").toHexString(),
        })
      ).to.be.revertedWith("ETHER SENT NOT CORRECT");
    });
  });
});
