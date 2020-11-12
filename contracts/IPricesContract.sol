pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

interface IPricesContract {
    function recordByVendor(address vendor, uint256 price) external returns(bool);
    
}