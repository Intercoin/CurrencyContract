// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import "./CurrencyBase.sol";
import "./IPricesContract.sol";

contract CurrencyETHOnly is CurrencyBase {
    
    /**
     * Used for donate ETH without receiving token
     */
    function donateETH() public payable validGasPrice nonReentrant() {
    }

    /**
     * @dev overall balance (in this case - eth)
     */
    function _overallBalance2() internal virtual override returns(uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev internal overrided method. eth will be transfer to sender
     * @param amount2send amount of eth
     */
    function _receivedTokenAfter(address to, uint256 amount2send) internal virtual override {
        address payable addr1 = payable(to); // correct since Solidity >= 0.6.0
        bool success = addr1.send(amount2send);
        require(success == true, 'Transfer ether was failed'); 
    }
    
    /**
     * @dev getting ETH and send back tokens
     * @param ethAmount ether amount
     */
    function _receivedETH(uint256 ethAmount) internal virtual override {
        //uint256 amount2send = ethAmount.mul(buyExchangeRate()).div(1e6); // "buy exchange" interpretation with rate 100%
        //_mint(_msgSender(), amount2send);
        
        uint256 ethAmountLeft = invitersRewardProceed(
            _msgSender(),
            ethAmount
        );
        uint256 nativeTokensAmount = ethAmountLeft.mul(buyExchangeRate()).div(1e6); // "buy exchange" interpretation with rate 100%

        _mintedOwnTokens(nativeTokensAmount);
    }  
    
    /**
     * @dev sell exchange rate
     * @return rate multiplied at 1e6
     */
    function sellExchangeRate() internal virtual override returns(uint256) {
        return _sellExchangeRate;
    }
    
    /**
     * @dev buy exchange rate
     * @return rate multiplied at 1e6
     */
    function buyExchangeRate() internal virtual  override returns(uint256) {
        return _buyExchangeRate;
    }
    
}


