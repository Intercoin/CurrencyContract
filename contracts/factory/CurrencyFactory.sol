pragma solidity >=0.6.0 <0.7.0;

import "../openzeppelin-contracts/contracts/access/Ownable.sol";
import "../Currency.sol";
import "../IPricesContract.sol";

contract CurrencyFactory is Ownable{
    
    Currency[] public currencyAddresses;
    
    event CurrencyCreated(Currency currency);

    function createCurrency
    (
        string memory name, 
        string memory symbol,
        address secondary_token,
        IPricesContract pricesContractAddress
    ) 
        public 
    {
        Currency currency = new Currency(name, symbol, secondary_token, pricesContractAddress);
        currencyAddresses.push(currency);
        emit CurrencyCreated(currency);
        currency.transferOwnership(_msgSender());
    }
    
}
