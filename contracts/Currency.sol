// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "./CurrencyBase.sol";
import "./interfaces/IPricesContract.sol";

contract Currency is CurrencyBase {
    using SafeMathUpgradeable for uint256;
    using AddressUpgradeable for address;
    
    address private token2;
    
    /**
     * @param name Token name
     * @param symbol Token symbol
     * @param pricesContractAddress address of PricesContract
     * @param community address of CommunityContract
     * @param roleName whitelist role name
     */
    function init(
        string memory name, 
        string memory symbol,
        address secondary_token,
        IPricesContract pricesContractAddress,
        ICommunity community,
        uint256 inviterCommission,
        string memory roleName
    ) 
        public 
        initializer 
    {
        __CurrencyBase__init(
            name, 
            symbol,
            pricesContractAddress,
            community,
            inviterCommission,
            roleName
        );
        
        require(secondary_token.isContract(), 'secondary_token must be a contract address');
        token2 = secondary_token;
    }
    
    // 
    /**
     * Recieved ether 
     */
    receive() external payable override validGasPrice {
        require (true == true, "This method is not supported"); 
    }

    /**
     * @dev getting token2 and mint instead own tokens
     * proceeded if user set allowance in secondary_token contract
     * @param isDonate if set true, contract will not send tokens
     */
    function receiveERC20Token2(bool isDonate) validGasPrice public nonReentrant() {
        uint256 _allowedAmount = IERC20Upgradeable(token2).allowance(_msgSender(), address(this));
        
        require(_allowedAmount > 0, 'Amount exceeds allowed balance');
        
        // try to get
        bool success = IERC20Upgradeable(token2).transferFrom(_msgSender(), address(this), _allowedAmount);
        require(success == true, 'Transfer tokens were failed'); 
        if (!isDonate) {
            _receivedToken2(_allowedAmount);
        }
    }
    /**
     * @dev internal overrided method. token2 will be transfer to sender
     * @param amount2send amount of tokens
     */
    function _receivedTokenAfter(address to, uint256 amount2send) internal virtual override {
        bool success = IERC20Upgradeable(token2).transfer(to,amount2send);
        require(success == true, 'Transfer tokens were failed');    
    }
    
    /**
     * @dev overall tokens(token2) balance of this contract
     */
    function _overallBalance2() internal virtual override returns(uint256) {
        return IERC20Upgradeable(token2).balanceOf(address(this));
    }
    
    /**
     * @dev overall tokens(token2) balance of this contract
     */
    function _receivedToken2(uint256 token2Amount) private {
        uint256 token2AmountLeft = invitersRewardProceed(
            _msgSender(),
            token2Amount
        );
        
        
        uint256 nativeTokensAmount = token2AmountLeft.mul(buyExchangeRate()).div(1e6);
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

