# CurrencyContract
An Ethereum smart contract which issues and trades a more regulator-friendly currency token.
It is published in 2 versions: with external token(Currency) and using ETH as external funds(CurrencyETHOnly).

# Deploy
when deploy it is need to pass parameters in to constructor
name  | type | description
--|--|--
name|string|name currency token. see ERC20 interface
symbol|string|symbol currency token. see ERC20 interface
secondary_token|address|address for external token. used only in Currency.sol
pricesContractAddress|address|address for PricesContract.

# Overview
once installed will be use methods to exchange
Note that contract accept tokens, it should be approve before
## Settings
name|type|value|description
--|--|--|--
DECIMALS|uint256|1e18|Fraction part.
maxGasPrice|uint256|1*DECIMALS|maximum Gas Price(in wei) used for transaction. Transaction fail if reached limit
claimMorePerBlock|uint256|10*DECIMALS|how many tokens available to claim after each block after contract deployed
claimInitialMax|uint256|1000000*DECIMALS|initial amount that can be claimed by contract without transactions failing
tokensGrantOneTimeLimit|uint256|1000000*DECIMALS|amount that can be claimed one-time by contract without transactions failing
claimReserveMinPercent|uint256|20|Reserve min percent. Grant fails if we would have new token1outstanding * exchangeRate > token2balance * (100 - this number) / 100
claimTransactionMaxPercent|uint256|2| claim fails if token1beingSent * exchangeRate > token2balance * this number / 100
claimDeficitMax|uint256|1000000 * DECIMALS| Grant fails if claimDeficitMax exceeds (token1outstanding * exchangeRate - token2balance)
claimReserveExchangeRate|uint256|99e4| 99% mul 1e6
claimLockupPeriod|uint256|100| added limit in seconds for each claim
claimGradual|bool|true| if true then limit is gradually decreasing

## Methods
### for Currency.sol only
#### receiveERC20Token2
method received Token2.
Note that tokens need to approved before
#### receive
internal method triggered if contract getting ETH. **but is not supported and through an exception**

### for CurrencyETHOnly.sol only
#### donateETH
Method used for donate ETH without receiving token
#### receive
internal method triggered if contract getting ETH

### for boths (CurrencyETHOnly.sol and Currency.sol
#### setMaxGasPrice
Params:
name  | type | description
--|--|--
gasPrice|uint256|maximum Gas Price(in wei) used for transaction
#### claimingTokenAdd
Params:
name  | type | description
--|--|--
tokenForClaiming|address| added token for claiming
#### claimingTokensView
Returned list of claimng tokens

#### claimingTokensWithdraw
allow owner to withdraw all claimingTokens

#### claim
getting currency tokens instead claimed tokens

#### transfer
Params:
name  | type | description
--|--|--
recipient|address| recipient
amount|uint256| amount

Overrode {ERC20-transfer} method.
There are added some features:
1. added validation of restriction limit to transfer
2. if recipient is self contract than we will 
  get tokens, burn it and transfer eth to sender (if whitelisted)
  In all over cases its simple ERC20 Transfer

#### amountLockUp
Params:
name  | type | description
--|--|--
recipient|address| recipient

Calculate amount of tokens need to be left at recipient's account

#### whitelistAdd
Params:
name  | type | description
--|--|--
_addresses|address[]|array of addresses which need to be added to whitelist

#### whitelistRemove
Params:
name  | type | description
--|--|--
_addresses|address[]|array of addresses which need to be removed from whitelist

# Examples
contract can be used in two ways:
- if `Token2` is exernal ERC20 token (Currency.sol)(CUR)
- if `Token2` is ETH currency (CurrencyETHOnly.sol)(CUR_eth)

* want to exchange external Token to our Currency Token(CUR)
    * approve some external erc20 tokens to CUR contract (<external Token>.approve('<CUR.address>', '<amount>')
    * call method *receiveERC20Token2* of CUR contract (<CUR Token>.receiveERC20Token2('false'))
* want to exchange ETH to our Currency Token(CUR)
    * send directly to CUR_eth contract some ETH
* want to manage whitelist (owner option)
    * call method *whitelistAdd* to add some addresses
    * call method *whitelistRemove* to remove some addresses
* want to send CUR back to contract (whitelisted user option)
    * call method transfer of CUR token to CUR address (<CUR Token>.transfer('<CUR.address>', '<amount>'))
* want to send CUR to some user (whitelisted user option)
    * call method transfer of CUR token (<CUR Token>.transfer('<recipient address>', '<amount>'))
