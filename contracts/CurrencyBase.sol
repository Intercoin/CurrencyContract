// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";


import "./Claimed.sol";
import "./IPricesContract.sol";
import "./ICommunity.sol";

contract CurrencyBase is ERC20UpgradeSafe, OwnableUpgradeSafe, Claimed, ReentrancyGuardUpgradeSafe {
    using SafeMath for uint256;
    using Address for address;
    
    // Fraction part. means 1e18
    uint256 constant internal DECIMALS = 10**18;
    
    uint256 internal _sellExchangeRate;
    uint256 internal _buyExchangeRate;
    
    uint256 public maxGasPrice;
    
    uint256 startTime;
    
    uint256 internal claimMorePerSeconds = 10 * DECIMALS;

    // initial amount that can be claimed by contract without transactions failing
    uint256 internal claimInitialMax = 1000000 * DECIMALS;
    
    // amount that can be claimed one-time by contract without transactions failing
    uint256 internal tokensClaimOneTimeLimit = 1000000 * DECIMALS;
    
    // consider total token2 balance held at start of block when sending, 
    // claim fails if we would have new token1outstanding * exchangeRate > token2balance * (100 - this number) / 100
    uint256 internal claimReserveMinPercent = 20;
    
    // consider total token2 balance held at start of block when sending, 
    // claim fails if token1beingSent * exchangeRate > token2balance * this number / 100
    uint256 internal claimTransactionMaxPercent = 2;
    
    // deficit = token1outstanding * exchangeRate - token2balance . 
    // claim fails if claimDeficitMax exceeds this number.
    uint256 internal claimDeficitMax = 1000000 * DECIMALS;
    
    // claim discount
    uint256 internal claimReserveExchangeRate = 99e4;
    
    // total claimed
    uint256 claimTotal;
    
    // default variable for claim permissions
    uint256 internal claimLockupPeriod = 100; // seconds
    bool internal claimGradual = true;
    
    uint256 private tokensForClaimingCount;
    address[] private tokensForClaiming;
    mapping (address => bool) private tokensForClaimingMap;
    
    IPricesContract pricesAddress;
    
    
    ICommunity private communityAddress;
    string private communityRole;
    
    
    event StatAdded(address indexed recipient, uint256 amount);
    
    modifier onlyPassTransferLimit(uint256 amount) {
        
         require(
            getAmountLockUp(_msgSender()).add(amount) <= balanceOf(_msgSender()), 
            'TransferLimit: There are no allowance tokens to transfer'
        );
        _;
    }


    modifier canReceiveTokens() {
        bool s = false;
        string[] memory roles = ICommunity(communityAddress).getRoles(msg.sender);
        for (uint256 i=0; i< roles.length; i++) {
            
            if (keccak256(abi.encodePacked(communityRole)) == keccak256(abi.encodePacked(roles[i]))) {
                s = true;
            }
        }
        
        require(s == true, "Sender is not in whitelist");
        
        _;
    }
    
    event claimingTokenAdded(address token);
    
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
        IPricesContract pricesContractAddress,
        ICommunity community,
        string memory roleName
    ) 
        public 
        initializer 
    {
        
        __Ownable_init();
        __ReentrancyGuard_init();
        __ERC20_init(name, symbol);
		
		
        startTime = now;
        pricesAddress = pricesContractAddress;
        
        communityAddress = community;
        communityRole = roleName;
    
        claimTotal = 0;
        maxGasPrice = 1 * DECIMALS;
        tokensForClaimingCount = 0;
        
        _sellExchangeRate = 99e4; // 99% * 1e6
        _buyExchangeRate = 100e4; // 100% *1e6
        
        claimMorePerSeconds = 10 * DECIMALS;
        claimInitialMax = 1000000 * DECIMALS;
        tokensClaimOneTimeLimit = 1000000 * DECIMALS;
        claimReserveMinPercent = 20;
        claimTransactionMaxPercent = 2;
        claimDeficitMax = 1000000 * DECIMALS;
        claimReserveExchangeRate = 99e4;
        claimLockupPeriod = 100;
        claimGradual = true;
    
        
    }
    
    modifier validGasPrice() {
        require(tx.gasprice <= maxGasPrice, "Transaction gas price cannot exceed maximum gas price.");
        _;
    } 
    
    // 
    /**
     * Recieved ether and transfer token to sender
     */
    receive() external payable virtual validGasPrice {
        _receivedETH(msg.value);
    }
    
    /**
     * Setting maximum Gas Price
     * @param gasPrice maximum Gas Price(in wei) used for transaction
     */
    function setMaxGasPrice(uint256 gasPrice) public onlyOwner {
        maxGasPrice = gasPrice;
    }
    
    function claimingTokenAdd(address tokenForClaiming) public onlyOwner {
        require(tokenForClaiming.isContract(), 'tokenForClaiming must be a contract address');
        if (tokensForClaimingMap[tokenForClaiming]) {
            // already exist
        } else {
            tokensForClaiming.push(tokenForClaiming);
            tokensForClaimingCount = tokensForClaimingCount.add(1);
            tokensForClaimingMap[tokenForClaiming] = true;
            emit claimingTokenAdded(tokenForClaiming);
        }
    }
    
    /**
     * @return list list of tokens added for claiming
     */
    function claimingTokensView() public view returns (address[] memory list) {
        list = tokensForClaiming;
    }
    
    
    function claimingTokensWithdraw() public onlyOwner nonReentrant() {
        
        for (uint256 i = 0; i < tokensForClaimingCount; i++) {
            uint256 amount = IERC20(tokensForClaiming[i]).balanceOf(address(this));
            if (amount > 0) {
                // try to get
                bool success = IERC20(tokensForClaiming[i]).transferFrom(address(this), owner(), amount);
                require(success == true, 'Transfer tokens were failed'); 
            }
        }

    }
    
    /**
     * @dev getting own tokens instead claimed tokens
     */
    function claim() validGasPrice public nonReentrant() {
        
        require(tokensForClaimingCount > 0, 'There are no allowed tokens for claiming');
        
        bool hasAllowedAmount = false;
        
        for (uint256 i = 0; i < tokensForClaimingCount; i++) {
        
            uint256 allowedAmount = IERC20(tokensForClaiming[i]).allowance(_msgSender(), address(this));
            
            if (allowedAmount > 0) {
            
                hasAllowedAmount = true;
                
                // own token with rate 1to1
                uint256 amount = allowedAmount;
                
                claimTotal = claimTotal.add(amount);
                
                if (claimTotal <= claimInitialMax) {
                    //allow claim without check any restrictions;
                } else {
                    require(
                        (claimTotal < claimInitialMax.add(((now).sub(startTime)).mul(claimMorePerSeconds))), 
                        'This many tokens are not available to be claimed yet' 
                    );
                    require(
                        claimTotal.mul(claimReserveExchangeRate).div(1e6) <= _overallBalance2().mul(100-claimReserveMinPercent).div(100), 
                        'Amount exceeds available reserve limit' 
                    );
                    require(
                        amount.mul(claimReserveExchangeRate).div(1e6) <= _overallBalance2().mul(claimTransactionMaxPercent).div(100),
                        'Amount exceeds transaction max percent' 
                    );
                    
                    require(
                        ((claimTotal).mul(claimReserveExchangeRate).div(1e6)).sub(_overallBalance2()) <= claimDeficitMax,
                        'Amount exceeds deficit max'
                    );
            
                }
               
                require(tokensClaimOneTimeLimit >= amount, 'Too many tokens to claim in one transaction');
                
                
                // try to get
                bool success = IERC20(tokensForClaiming[i]).transferFrom(_msgSender(), address(this), allowedAmount);
                require(success == true, 'Transfer tokens were failed'); 
                
                // claim own tokens
                _mint(_msgSender(), amount);
                
                //
                addClaimLimit(_msgSender(), amount, now.add(claimLockupPeriod), claimGradual);
            }
        }
        require(hasAllowedAmount == true, 'Amount exceeds allowed balance');
    }
    
    /**
     * Overrode {ERC20-transfer} method.
     * There are added some features:
     * 1. added validation of restriction limit to transfer
     * 2. if recipient is self contract than we will 
     *      get tokens, burn it and transfer eth to sender (if whitelisted)
     *      In all over cases its simple ERC20 Transfer
     * 3. in any cases we will try to send stat to pricesContract. if true stats was accepted
     * @param recipient recipient
     * @param amount amount
     * @return success
     */
    function transfer(address recipient, uint256 amount) public onlyPassTransferLimit(amount) nonReentrant() virtual override returns (bool) {
      
        _transfer(_msgSender(), recipient, amount);
        
        if (recipient == address(this)) {
            _receivedToken(amount);
            _burn(address(this), amount);
        }
        
        // try to send stats to pricesContract
        bool ret = IPricesContract(pricesAddress).recordByVendor(recipient, amount);
        if (ret == true) {
            emit StatAdded(recipient, amount);
        }
        
        
        return true;
    }
    
    function _overallBalance2() internal virtual returns(uint256) {
        // need to be implement in child
        return 0;
    }
    
    /**
     * @dev private method. getting Tokens and send back eth(token2)
     * Available only to recipient in whitelist
     * @param tokensAmount tokens amount
     */
    function _receivedToken(uint256 tokensAmount) internal canReceiveTokens {
        
        uint256 balanceToken2 = _overallBalance2();
        uint256 amount2send = tokensAmount.mul(sellExchangeRate()).div(1e6); // "sell exchange" interpretation with rate discount
        require ((amount2send <= balanceToken2 && balanceToken2>0), 'Amount exceeds available balance.');
        
        _receivedTokenAfter(amount2send);
        
    }
    
    function _receivedTokenAfter(uint256 amount2send) internal virtual {
        // need to be implement in child
    }  
    
    
    /**
     * @dev private method. getting ETH and send back minted tokens
     * @param ethAmount ether amount
     */
    function _receivedETH(uint256 ethAmount) internal virtual {
        // need to be implement in child
    }  
    
    function sellExchangeRate() internal virtual returns(uint256) {
        // need to be implement in child
        return uint256(1e6);
    }
    function buyExchangeRate() internal virtual returns(uint256) {
        // need to be implement in child
        return uint256(1e6);
    }  
    function _mintedOwnTokens(uint256 amount) internal {
        uint256 amount2mint = amount.mul(buyExchangeRate()).div(1e6); // "buy exchange" interpretation with rate 100%
        _mint(_msgSender(), amount2mint);
    } 
    
}



