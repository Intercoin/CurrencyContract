// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import "../Currency.sol";
import "../IPricesContract.sol";

contract CurrencyMock is Currency {
    
    function setClaimGradual(bool value) public {
        claimGradual = value;
    }
    
    function setClaimLockupPeriod(uint256 value) public {
        claimLockupPeriod = value;
    }
    
    function getIndexClaimed(uint256 i) public view returns( uint256, uint256, uint256, bool) {
        return (_claimed[msg.sender][i].amount, _claimed[msg.sender][i].startTime, _claimed[msg.sender][i].endTime, _claimed[msg.sender][i].gradual);
    }
 
    function getNow() public view returns( uint256) {
        return now;
    }
    
}


