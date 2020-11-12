pragma solidity >=0.6.0 <0.7.0;

import "../openzeppelin-contracts/contracts/access/Ownable.sol";
import "../CurrencyETHOnly.sol";
import "../IPricesContract.sol";


contract CurrencyETHOnlyFactory is Ownable{
    
    CurrencyETHOnly[] public currencyETHOnlyAddresses;
    
    event CurrencyETHOnlyCreated(CurrencyETHOnly currencyETHOnly);

    function createCurrencyETHOnly
    (
        string memory name, 
        string memory symbol,
        IPricesContract pricesContractAddress
    ) 
        public 
    {
        CurrencyETHOnly currencyETHOnly = new CurrencyETHOnly(name, symbol, pricesContractAddress);
        currencyETHOnlyAddresses.push(currencyETHOnly);
        emit CurrencyETHOnlyCreated(currencyETHOnly);
        currencyETHOnly.transferOwnership(_msgSender());
    }
    
}
