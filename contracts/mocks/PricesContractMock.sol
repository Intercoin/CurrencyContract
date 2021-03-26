// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IPricesContract.sol";

contract PricesContractMock is IPricesContract {
    /**
     * @param vendor vendor's address
     * @param price price
     * @return ret bool if true then accept price
     * if false - or vendor does not exist but transaction should not to be reverted
     */
    function recordByVendor(address vendor, uint256 price) external override returns(bool ret) {
        // make variations for example if price equal 2 ether odd the return true else false
       
        if (price  == 2 ether) {
            ret = true;
        } else {
            ret = false;
        }
    }
    
  
}

