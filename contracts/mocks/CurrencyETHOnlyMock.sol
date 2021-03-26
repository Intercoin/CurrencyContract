// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "../CurrencyETHOnly.sol";
import "../interfaces/IPricesContract.sol";

contract CurrencyETHOnlyMock is CurrencyETHOnly {
   
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
        return block.timestamp;
    }
}


