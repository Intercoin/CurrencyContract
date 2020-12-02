// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "../CurrencyETHOnly.sol";
import "../IPricesContract.sol";


contract CurrencyETHOnlyFactory is OwnableUpgradeSafe{
    
    CurrencyETHOnly[] public currencyETHOnlyAddresses;
    
    event CurrencyETHOnlyCreated(CurrencyETHOnly currencyETHOnly);

    function createCurrencyETHOnly
    (
        string memory name, 
        string memory symbol,
        IPricesContract pricesContractAddress,
        ICommunity community,
        string memory roleName
    ) 
        public 
    {
        CurrencyETHOnly currencyETHOnly = new CurrencyETHOnly();
        currencyETHOnly.init(name, symbol, pricesContractAddress, community, roleName);
        currencyETHOnlyAddresses.push(currencyETHOnly);
        emit CurrencyETHOnlyCreated(currencyETHOnly);
        currencyETHOnly.transferOwnership(_msgSender());
    }
    
}
