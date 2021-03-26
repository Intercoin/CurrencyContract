// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

interface IPricesContract {
    function recordByVendor(address vendor, uint256 price) external returns(bool);
    
}