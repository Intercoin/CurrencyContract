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
community|address|address for <a href="https://github.com/Intercoin/CommunityContract">CommunityContract</a>.
inviterCommission|uint256|commission (mul by 1e6) to the inviting user, if the user who was invited by the inviter sent a secondary_token(or eth for CurrencyETHOnly). can be zero then reward mechanism will not work
roleName|string|role name for whitelisted users.

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


# Overview
once installed will be use methods to exchange
Note that contract accept tokens, it should be approve before


<table>
<thead>
	<tr>
		<th>method name</th>
		<th>called by</th>
        <th>contract</th>
		<th>description</th>
	</tr>
</thead>
<tbody>
  <tr>
		<td><a href="#receiveerc20token2">receiveERC20Token2</a></td>
		<td>anyone</td>
    <td>Currency.sol</td>
		<td>method received Token2.</td>
	</tr>
	<tr>
		<td><a href="#receive">receive</a></td>
		<td>anyone</td>
    <td>Currency.sol</td>
		<td>internal method triggered if contract getting ETH.<br><b>but is not supported and through an exception</b></td>
	</tr>
  <tr>
		<td><a href="#donateeth">donateETH</a></td>
		<td>anyone</td>
    <td>CurrencyETHOnly.sol</td>
		<td>Method used for donate ETH without receiving token</td>
	</tr>
	<tr>
		<td><a href="#receive-1">receive</a></td>
		<td>anyone</td>
    <td>CurrencyETHOnly.sol</td>
		<td>internal method triggered if contract getting ETH</td>
	</tr>
	<tr>
		<td><a href="#setmaxgasprice">setMaxGasPrice</a></td>
		<td>owner</td>
    <td>boths</td>
		<td>setting Gas Price(in wei) used for transactions</td>
	</tr>
	<tr>
		<td><a href="#claimingtokenadd">claimingTokenAdd</a></td>
		<td>owner</td>
    <td>boths</td>
		<td>method add token for claiming</td>
	</tr>
	<tr>
		<td><a href="#claimingtokensview">claimingTokensView</a></td>
		<td>anyone</td>
    <td>boths</td>
		<td>returned list of claiming tokens</td>
	</tr>
	<tr>
		<td><a href="#claimingtokenswithdraw">claimingTokensWithdraw</a></td>
		<td>owner</td>
    <td>boths</td>
		<td>method to withdraw all claiming tokens</td>
	</tr>
  <tr>
		<td><a href="#claim">claim</a></td>
		<td>anyone</td>
    <td>boths</td>
		<td>getting own tokens instead claimed tokens</td>
	</tr>
  <tr>
		<td><a href="#transfer">transfer</a></td>
		<td>anyone</td>
    <td>boths</td>
    <td>Overrode {ERC20-transfer} method. with <a href="#transfer">rectrictions</a></td>
	</tr>
  <tr>
		<td><a href="#amountlockup">amountLockUp</a></td>
		<td>anyone</td>
    <td>boths</td>
    <td>Calculate amount of tokens need to be left at recipient's account</td>
	</tr>
</tbody>
</table>

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

# Examples
contract can be used in two ways:
- if `Token2` is exernal ERC20 token (Currency.sol)(CUR)
- if `Token2` is ETH currency (CurrencyETHOnly.sol)(CUR_eth)

* want to exchange external Token to our Currency Token(CUR)
    * approve some external erc20 tokens to CUR contract (<external Token>.approve('<CUR.address>', '<amount>')
    * call method *receiveERC20Token2* of CUR contract (<CUR Token>.receiveERC20Token2('false'))
* want to exchange ETH to our Currency Token(CUR)
    * send directly to CUR_eth contract some ETH
* want to send CUR back to contract (whitelisted user option)
    * call method transfer of CUR token to CUR address (<CUR Token>.transfer('<CUR.address>', '<amount>'))
* want to send CUR to some user (whitelisted user option)
    * call method transfer of CUR token (<CUR Token>.transfer('<recipient address>', '<amount>'))
