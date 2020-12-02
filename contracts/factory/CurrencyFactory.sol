// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "../Currency.sol";
import "../IPricesContract.sol";

contract CurrencyFactory is OwnableUpgradeSafe{
    
    Currency[] public currencyAddresses;
    
    event CurrencyCreated(Currency currency);

    function createCurrency
    (
        string memory name, 
        string memory symbol,
        address secondary_token,
        IPricesContract pricesContractAddress,
        ICommunity community,
        string memory roleName
    ) 
        public 
    {
        Currency currency = new Currency();
        currency.init(name, symbol, secondary_token, pricesContractAddress, community, roleName);
        currencyAddresses.push(currency);
        emit CurrencyCreated(currency);
        currency.transferOwnership(_msgSender());
    }
    
}
