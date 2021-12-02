pragma solidity =0.6.12;
pragma experimental ABIEncoderV2;

import "./BEP20/BEP20Mintable.sol";
import "./BEP20/BEP20Burnable.sol";
import "./BEP20/BEP20.sol";

contract xVEMPBEP20Token is BEP20, BEP20Mintable, BEP20Burnable {
    constructor(string memory name, string memory symbol)
    BEP20(name, symbol)
    public
    { }

    function updatePauseStatus() public onlyOwner {
        _updatePauseStatus();
    }
}
