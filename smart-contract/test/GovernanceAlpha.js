const { accounts, contract, privateKeys } = require('@openzeppelin/test-environment');
const { BN, expectRevert, time, expectEvent, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { signTypedData } = require('eth-sig-util');

const {
  address,
  etherMantissa,
  encodeParameters,
  mineBlock
} = require('../Utils/Ethereum');

const GovernorAlpha = contract.fromArtifact('GovernorAlpha');
const xVEMPToken = contract.fromArtifact('xVEMPToken');
const Timelock = contract.fromArtifact('Timelock');

describe('GovernorAlpha_Propose', function() {
  let trivialProposal, targets, values, signatures, callDatas, delay;
  let proposalBlock;
  const [ ownerAddress, userAddress1, userAddress2] = accounts;
  beforeEach(async function () {
    delay = new BN((2 * 24 * 60 * 60 )* 2)

    this.xVEMP = await xVEMPToken.new({from: ownerAddress, gas: 8000000});
    this.timelock = await Timelock.new(ownerAddress, delay, {from: ownerAddress, gas: 8000000});
    this.gov = await GovernorAlpha.new(this.timelock.address, this.xVEMP.address, ownerAddress, {from: ownerAddress, gas: 8000000});
    await this.xVEMP.mint(ownerAddress, "1000000000000000000000000", {from: ownerAddress, gas: 8000000})
    await this.timelock.setPendingAdmin(this.gov.address, {from: ownerAddress, gas: 8000000});
    await this.gov.__acceptAdmin({from: ownerAddress, gas: 8000000});

    targets = [ownerAddress];
    values = ["0"];
    signatures = ["getBalanceOf(address)"];
    callDatas = [encodeParameters(['address'], [userAddress1])];
    await this.gov.propose(targets, values, signatures, callDatas, "do nothing", {from: ownerAddress, gas: 8000000});
    proposalBlock = await time.latestBlock();
    proposalId = await this.gov.latestProposalIds(ownerAddress);
    trivialProposal = await this.gov.proposals(proposalId);
  });

  describe("simple initialization", function () {
    it("ID is set to a globally unique identifier", async function () {
      expect(trivialProposal.id).to.be.bignumber.equal(new BN(proposalId));
    });

    it("Proposer is set to the sender", async function () {
      expect(trivialProposal.proposer).to.equal(ownerAddress);
    });

    it("ForVotes and AgainstVotes are initialized to zero", async function () {
      expect(trivialProposal.forVotes).to.be.bignumber.equal(new BN(0));
      expect(trivialProposal.againstVotes).to.be.bignumber.equal(new BN(0));
    });

    it("Executed and Canceled flags are initialized to false", async function () {
      expect(trivialProposal.canceled).to.equal(false);
      expect(trivialProposal.executed).to.equal(false);
    });

    it("ETA is initialized to zero", async function () {
      expect(trivialProposal.eta).to.be.bignumber.equal(new BN(0));
    });

    it("Targets, Values, Signatures, Calldatas are set according to parameters", async function () {
      let dynamicFields = await this.gov.getActions(trivialProposal.id);

      expect(dynamicFields[0][0]).to.equal(targets[0]);
      expect(dynamicFields[1][0]).to.be.bignumber.equal(new BN(values[0]));
      expect(dynamicFields[2][0]).to.equal(signatures[0]);
      expect(dynamicFields[3][0]).to.equal(callDatas[0]);
    });

    describe("This function must revert if", function () {
      it("the length of the values, signatures or calldatas arrays are not the same length,", async function () {
        await expectRevert(
          this.gov.propose(targets.concat(ownerAddress), values, signatures, callDatas, "do nothing", {from: ownerAddress, gas: 8000000}), "GovernorAlpha::propose: proposal function information arity mismatch");
        
        await expectRevert(
          this.gov.propose(targets.concat(ownerAddress), values, signatures, callDatas, "do nothing", {from: userAddress1, gas: 8000000}), "GovernorAlpha::propose: must have proper xVEMP token to create proposal");
  
        await expectRevert(
          this.gov.propose(targets, values.concat(values), signatures, callDatas, "do nothing", {from: ownerAddress, gas: 8000000}), "GovernorAlpha::propose: proposal function information arity mismatch");

        await expectRevert(
          this.gov.propose(targets, values, signatures.concat(signatures), callDatas, "do nothing", {from: ownerAddress, gas: 8000000}), "GovernorAlpha::propose: proposal function information arity mismatch");

        await expectRevert(
          this.gov.propose(targets, values, signatures, callDatas.concat(callDatas), "do nothing", {from: ownerAddress, gas: 8000000}), "revert GovernorAlpha::propose: proposal function information arity mismatch");
      });

      it("or if that length is zero or greater than Max Operations.", async function () {
        await expectRevert(
          this.gov.propose([], [], [], [], "do nothing", {from: ownerAddress, gas: 8000000}), "revert GovernorAlpha::propose: must provide actions");
      });

      describe("Additionally, if there exists a pending or active proposal from the same proposer, we must revert.", function () {
        it("reverts with pending", async function () {
          await expectRevert(
            this.gov.propose(targets, values, signatures, callDatas, "do nothing", {from: ownerAddress, gas: 8000000}), "GovernorAlpha::propose: one live proposal per proposer, found an already pending proposal");
        });
      });
    });
  });

  describe("GovernorAlpha#state/1", function () {
    it("Invalid for proposal not found", async function () {
      await expectRevert(
        this.gov.state(5), "GovernorAlpha::state: invalid proposal id");
    });

    it("Pending", async function () {
      expect(
        await this.gov.state(trivialProposal.id)).to.be.bignumber.equal(new BN(0));
    });

    it("Active", async function () {
      await time.advanceBlock();
      await time.advanceBlock();
      expect(
        await this.gov.state(trivialProposal.id)).to.be.bignumber.equal(new BN(1));
    });

    it("Canceled", async function () {
      await time.advanceBlock();
      await this.gov.cancel(trivialProposal.id, {from: ownerAddress, gas: 8000000});
      expect(
        await this.gov.state(trivialProposal.id)).to.be.bignumber.equal(new BN(2));
    });
  });

  describe("Caste Vote", function () {
    it("Caste Vote(True)", async function () {
      this.xVEMP = await xVEMPToken.new({from: ownerAddress, gas: 8000000});
      this.timelock = await Timelock.new(ownerAddress, delay, {from: ownerAddress, gas: 8000000});
      this.gov = await GovernorAlpha.new(this.timelock.address, this.xVEMP.address, ownerAddress, {from: ownerAddress, gas: 8000000});
      await this.xVEMP.mint(ownerAddress, "1000000000000000000000000", {from: ownerAddress, gas: 8000000})
      await this.xVEMP.mint(userAddress1, "1000000000000000000000000", {from: ownerAddress, gas: 8000000})
      await this.timelock.setPendingAdmin(this.gov.address, {from: ownerAddress, gas: 8000000});
      await this.gov.__acceptAdmin({from: ownerAddress, gas: 8000000});

      await time.advanceBlock();

      const targets = [this.xVEMP.address,this.xVEMP.address];
      const values = ["0","0"];
      const signatures = ["balanceOf(address)","balanceOf(address)"];
      const calldatas = [encodeParameters(['address'], [ownerAddress]), encodeParameters(['address'], [ownerAddress])];
      await this.gov.propose(targets, values, signatures, calldatas, "do nothing", {from: ownerAddress});
      await time.advanceBlock();
      const id = await this.gov.latestProposalIds(ownerAddress);
      await this.gov.castVote(id, true, {from: ownerAddress});
      await this.gov.castVote(id, true, {from: userAddress1});
      const prop = await this.gov.proposals(id);
      expect(prop.forVotes).to.be.bignumber.equal(new BN(2));
    });

    it("Caste Vote(False)", async function () {
      this.xVEMP = await xVEMPToken.new({from: ownerAddress, gas: 8000000});
      this.timelock = await Timelock.new(ownerAddress, delay, {from: ownerAddress, gas: 8000000});
      this.gov = await GovernorAlpha.new(this.timelock.address, this.xVEMP.address, ownerAddress, {from: ownerAddress, gas: 8000000});
      await this.xVEMP.mint(ownerAddress, "1000000000000000000000000", {from: ownerAddress, gas: 8000000})
      await this.xVEMP.mint(userAddress1, "1000000000000000000000000", {from: ownerAddress, gas: 8000000})
      await this.timelock.setPendingAdmin(this.gov.address, {from: ownerAddress, gas: 8000000});
      await this.gov.__acceptAdmin({from: ownerAddress, gas: 8000000});

      await time.advanceBlock();

      const targets = [this.xVEMP.address,this.xVEMP.address];
      const values = ["0","0"];
      const signatures = ["balanceOf(address)","balanceOf(address)"];
      const calldatas = [encodeParameters(['address'], [ownerAddress]), encodeParameters(['address'], [ownerAddress])];
      await this.gov.propose(targets, values, signatures, calldatas, "do nothing", {from: ownerAddress});
      await time.advanceBlock();
      const id = await this.gov.latestProposalIds(ownerAddress);
      await this.gov.castVote(id, true, {from: ownerAddress});
      await this.gov.castVote(id, false, {from: userAddress1});
      const prop = await this.gov.proposals(id);
      expect(prop.againstVotes).to.be.bignumber.equal(new BN(1));
    });

    it("Caste Vote(Not able to caste vote if not enough xVEMP tokens)", async function () {
      this.xVEMP = await xVEMPToken.new({from: ownerAddress, gas: 8000000});
      this.timelock = await Timelock.new(ownerAddress, delay, {from: ownerAddress, gas: 8000000});
      this.gov = await GovernorAlpha.new(this.timelock.address, this.xVEMP.address, ownerAddress, {from: ownerAddress, gas: 8000000});
      await this.xVEMP.mint(ownerAddress, "1000000000000000000000000", {from: ownerAddress, gas: 8000000})
      await this.xVEMP.mint(userAddress1, "1000000000000000000000000", {from: ownerAddress, gas: 8000000})
      await this.timelock.setPendingAdmin(this.gov.address, {from: ownerAddress, gas: 8000000});
      await this.gov.__acceptAdmin({from: ownerAddress, gas: 8000000});

      await time.advanceBlock();

      const targets = [this.xVEMP.address,this.xVEMP.address];
      const values = ["0","0"];
      const signatures = ["balanceOf(address)","balanceOf(address)"];
      const calldatas = [encodeParameters(['address'], [ownerAddress]), encodeParameters(['address'], [ownerAddress])];
      await this.gov.propose(targets, values, signatures, calldatas, "do nothing", {from: ownerAddress});
      await time.advanceBlock();
      const id = await this.gov.latestProposalIds(ownerAddress);
      await this.gov.castVote(id, true, {from: ownerAddress});
      await this.gov.castVote(id, false, {from: userAddress1});

      await expectRevert(this.gov.castVote(id, false, {from: userAddress2}), "GovernorAlpha::propose: must have proper xVEMP token to cast vote");
    });
  });

  describe("Update minTokensForProposal", function () {
    it("Revert if not guardian", async function () {
      this.xVEMP = await xVEMPToken.new({from: ownerAddress, gas: 8000000});
      this.timelock = await Timelock.new(ownerAddress, delay, {from: ownerAddress, gas: 8000000});
      this.gov = await GovernorAlpha.new(this.timelock.address, this.xVEMP.address, ownerAddress, {from: ownerAddress, gas: 8000000});

      await expectRevert(this.gov.setMinProposalValue(1000, {from: userAddress2}), "GovernorAlpha::__acceptAdmin: sender must be gov guardian");
    });

    it("If guardian", async function () {
      this.xVEMP = await xVEMPToken.new({from: ownerAddress, gas: 8000000});
      this.timelock = await Timelock.new(ownerAddress, delay, {from: ownerAddress, gas: 8000000});
      this.gov = await GovernorAlpha.new(this.timelock.address, this.xVEMP.address, ownerAddress, {from: ownerAddress, gas: 8000000});
      await this.gov.setMinProposalValue(1000, {from: ownerAddress});
      
      expect(await this.gov.minxVempForProposal()).to.be.bignumber.equal(new BN(1000));
    });
  });

  describe("Update minTokensForVote", function () {
    it("Revert if not guardian", async function () {
      this.xVEMP = await xVEMPToken.new({from: ownerAddress, gas: 8000000});
      this.timelock = await Timelock.new(ownerAddress, delay, {from: ownerAddress, gas: 8000000});
      this.gov = await GovernorAlpha.new(this.timelock.address, this.xVEMP.address, ownerAddress, {from: ownerAddress, gas: 8000000});

      await expectRevert(this.gov.setMinVoteValue(1000, {from: userAddress2}), "GovernorAlpha::__acceptAdmin: sender must be gov guardian");
    });

    it("If guardian", async function () {
      this.xVEMP = await xVEMPToken.new({from: ownerAddress, gas: 8000000});
      this.timelock = await Timelock.new(ownerAddress, delay, {from: ownerAddress, gas: 8000000});
      this.gov = await GovernorAlpha.new(this.timelock.address, this.xVEMP.address, ownerAddress, {from: ownerAddress, gas: 8000000});
      await this.gov.setMinVoteValue(1000, {from: ownerAddress});
      
      expect(await this.gov.minxVempForVote()).to.be.bignumber.equal(new BN(1000));
    });
  });
});
