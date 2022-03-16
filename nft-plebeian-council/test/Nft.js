const {
  shouldBehaveLikeERC721,
  shouldBehaveLikeERC721Metadata,
} = require("./ERC721.mint.behavior");

const EtherPoopNft = artifacts.require("NFT");

contract("ERC721", function (accounts) {
  const name = "Vempire NFT";
  const symbol = "NFT";

  beforeEach(async function () {
    this.token = await EtherPoopNft.new();
    await this.token.initialize(name, symbol, 4980);
  });

  shouldBehaveLikeERC721("ERC721", ...accounts);
});
