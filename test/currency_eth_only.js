const BN = require('bn.js'); // https://github.com/indutny/bn.js
const BigNumber = require('bignumber.js');
const util = require('util');
const CurrencyETHOnly = artifacts.require("CurrencyETHOnly");
const CurrencyETHOnlyMock = artifacts.require("CurrencyETHOnlyMock");
const PricesContractMock = artifacts.require("PricesContractMock");
const CommunityMock = artifacts.require("CommunityMock");
const ERC20MintableToken = artifacts.require("ERC20Mintable");
const truffleAssert = require('truffle-assertions');
const helper = require("../helpers/truffleTestHelper");

contract('CurrencyETHOnly', (accounts) => {
    
    // Setup accounts.
    const accountOne = accounts[0];
    const accountTwo = accounts[1];  
    const accountThree = accounts[2];
    const accountFour = accounts[3];  
    
    const membersRole = 'members';
    const membersRoleWrong = 'wrong-role';
    
    const inviterCommission = 30000; // 3% mul 1e6
 
    var utilityTokenETHOnlyInstance;
    var ERC20MintableTokenInstance;
	var CommunityMockInstance;
	var pricesContractInstance;
	
    beforeEach(async() =>{
        this.CommunityMockInstance = await CommunityMock.new();
        this.pricesContractInstance = await PricesContractMock.new();
        this.ERC20MintableTokenInstance = await ERC20MintableToken.new('t2','t2');
//        this.ERC20MintableToken2Instance = await ERC20MintableToken.new('t2','t2');
        this.currencyETHOnlyInstance = await CurrencyETHOnly.new();
        await this.currencyETHOnlyInstance.init('t1','t1', this.pricesContractInstance.address, this.CommunityMockInstance.address, inviterCommission, membersRole);
        
    });
   

    it('should deployed correctly with correctly owner', async () => {
        
        const owner = (await this.currencyETHOnlyInstance.owner.call());
        assert.equal(owner, accountOne, 'owner is not accountOne');
        
    });
    
    it('should used transferOwnership by owner only', async () => {
        
        await truffleAssert.reverts(
            this.currencyETHOnlyInstance.transferOwnership(accountTwo, { from: accountTwo }), 
            "Ownable: caller is not the owner."
        );
        
        await this.currencyETHOnlyInstance.transferOwnership(accountTwo, { from: accountOne });
    });

    it('should add address TokenForClaiming to list', async () => {

        await truffleAssert.reverts(
            this.currencyETHOnlyInstance.claimingTokenAdd(this.ERC20MintableTokenInstance.address, { from: accountTwo }), 
            "Ownable: caller is not the owner."
        );
        
        await truffleAssert.reverts(
            this.currencyETHOnlyInstance.claimingTokenAdd(accountThree, { from: accountOne }), 
            "tokenForClaiming must be a contract address"
        );
        // add to claim list
        await this.currencyETHOnlyInstance.claimingTokenAdd(this.ERC20MintableTokenInstance.address, { from: accountOne });
        
        let list = (await this.currencyETHOnlyInstance.claimingTokensView({ from: accountOne }));
        
        assert.notEqual(
            list.indexOf(this.ERC20MintableTokenInstance.address),
            -1,
            "TokenForClaiming does not added in list as expected");
    });

    it('should revert claim if it wasn\'t approve tokens before', async () => {
        
        const grantAmount = (10*10**18).toString(16);
        
        // add to claim list
        await this.currencyETHOnlyInstance.claimingTokenAdd(this.ERC20MintableTokenInstance.address, { from: accountOne });
        
        // mint to ERC20MintableToken
        await this.ERC20MintableTokenInstance.mint(accountTwo, '0x'+grantAmount, { from: accountOne });
        
        //
        await truffleAssert.reverts(
            this.currencyETHOnlyInstance.claim({ from: accountTwo }), 
            "Amount exceeds allowed balance"
        );
    });
    
    it('should revert claim if it wasn\'t added TokenForClaiming before', async () => {
        
        const grantAmount = (10*10**18).toString(16);
        
        // mint to ERC20MintableToken
        await this.ERC20MintableTokenInstance.mint(accountTwo, '0x'+grantAmount, { from: accountOne });
        
        //make approve
        await this.ERC20MintableTokenInstance.approve(this.currencyETHOnlyInstance.address, '0x'+grantAmount, { from: accountTwo });
        
        //
        await truffleAssert.reverts(
            this.currencyETHOnlyInstance.claim({ from: accountTwo }), 
            "There are no allowed tokens for claiming"
        );
        
    });

    it('should claim to account', async () => {
      
        const grantAmount = (10*10**18).toString(16);
     
         // Get initial balances of second account.
        const accountTwoStartingBalance = (await this.currencyETHOnlyInstance.balanceOf.call(accountTwo));
        
         // add to claim list
        await this.currencyETHOnlyInstance.claimingTokenAdd(this.ERC20MintableTokenInstance.address, { from: accountOne });
        
        // mint to ERC20MintableToken
        await this.ERC20MintableTokenInstance.mint(accountTwo, '0x'+grantAmount, { from: accountOne });
        
        //make approve
        await this.ERC20MintableTokenInstance.approve(this.currencyETHOnlyInstance.address, '0x'+grantAmount, { from: accountTwo });
        
        // claim()
        await this.currencyETHOnlyInstance.claim({ from: accountTwo });
        
        // Get balances of first and second account after the transactions.
        const accountTwoEndingBalance = (await this.currencyETHOnlyInstance.balanceOf.call(accountTwo));

        assert.equal(
            new BN(accountTwoEndingBalance,16).toString(16),
            (new BN(accountTwoStartingBalance,16)).add(new BN(grantAmount,16)).toString(16), 
            "Amount wasn't correctly sent to the receiver"
        );

    });
 
    it('should prevent transfer if not in community `whitelist` role', async () => {
        
        
        this.currencyETHOnlyInstance = await CurrencyETHOnly.new();
        await this.currencyETHOnlyInstance.init('t1','t1', this.pricesContractInstance.address, this.CommunityMockInstance.address, inviterCommission, membersRoleWrong);

        
        const amountETHSendToContract = 10*10**18; // 10ETH
        
        
        const instanceETHStartingBalance = (await web3.eth.getBalance(this.currencyETHOnlyInstance.address));
        const instanceETHStartingTotalSupply = (await this.currencyETHOnlyInstance.totalSupply());
         // Get initial token balances of second account.
        const accountTwoTokenStartingBalance = (await this.currencyETHOnlyInstance.balanceOf.call(accountTwo));
        const accountTwoETHStartingBalance = (await web3.eth.getBalance(accountTwo));
        
        // send ETH to Contract
        await web3.eth.sendTransaction({
            from:accountTwo,
            to: this.currencyETHOnlyInstance.address, 
            value: amountETHSendToContract
            
        });
        
        const instanceETHEndingBalance = (await web3.eth.getBalance(this.currencyETHOnlyInstance.address));
        const instanceETHEndingTotalSupply = (await this.currencyETHOnlyInstance.totalSupply());
         // Get initial token balances of second account.
        const accountTwoTokenEndingBalance = (await this.currencyETHOnlyInstance.balanceOf.call(accountTwo));
        const accountTwoETHEndingBalance = (await web3.eth.getBalance(accountTwo));
        
        assert.equal(
            (new BN(instanceETHStartingBalance+'',10).add(new BN(amountETHSendToContract+'',10))).toString(16), 
            (new BN(instanceETHEndingBalance, 10)).toString(16),
            'Сontract does not receive eth'
        );
        const sellExchangeRate = 99;
        const buyExchangeRate = 100;
        
        assert.equal(
            (new BN(amountETHSendToContract+'',10).mul(new BN(buyExchangeRate+'',10)).div(new BN(100+'',10))).toString(16), 
            (new BN(accountTwoTokenEndingBalance, 10)).toString(16),
            'Token\'s count are wrong'
        );
        
        await truffleAssert.reverts(
            this.currencyETHOnlyInstance.transfer(this.currencyETHOnlyInstance.address, '0x'+(new BN(accountTwoTokenEndingBalance+'',10)).toString(16), { from: accountTwo }), 
            "Sender is not in whitelist"
        );
    });   
    
    it('should exchange Token/ETH', async () => {
        
        const amountETHSendToContract = 10*10**18; // 10ETH
        
        
        const instanceETHStartingBalance = (await web3.eth.getBalance(this.currencyETHOnlyInstance.address));
        const instanceETHStartingTotalSupply = (await this.currencyETHOnlyInstance.totalSupply());
         // Get initial token balances of second account.
        const accountTwoTokenStartingBalance = (await this.currencyETHOnlyInstance.balanceOf.call(accountTwo));
        const accountTwoETHStartingBalance = (await web3.eth.getBalance(accountTwo));
        
        // send ETH to Contract
        await web3.eth.sendTransaction({
            from:accountTwo,
            to: this.currencyETHOnlyInstance.address, 
            value: amountETHSendToContract
            
        });
        
        const instanceETHEndingBalance = (await web3.eth.getBalance(this.currencyETHOnlyInstance.address));
        const instanceETHEndingTotalSupply = (await this.currencyETHOnlyInstance.totalSupply());
         // Get initial token balances of second account.
        const accountTwoTokenEndingBalance = (await this.currencyETHOnlyInstance.balanceOf.call(accountTwo));
        const accountTwoETHEndingBalance = (await web3.eth.getBalance(accountTwo));
        
        assert.equal(
            (new BN(instanceETHStartingBalance+'',10).add(new BN(amountETHSendToContract+'',10))).toString(16), 
            (new BN(instanceETHEndingBalance, 10)).toString(16),
            'Сontract does not receive eth'
        );
        const sellExchangeRate = 99;
        const buyExchangeRate = 100;
        
        assert.equal(
            (new BN(amountETHSendToContract+'',10).mul(new BN(buyExchangeRate+'',10)).div(new BN(100+'',10))).toString(16), 
            (new BN(accountTwoTokenEndingBalance, 10)).toString(16),
            'Token\'s count are wrong'
        );
        
        // try again send token back to contract 
        await this.currencyETHOnlyInstance.transfer(this.currencyETHOnlyInstance.address, '0x'+(new BN(accountTwoTokenEndingBalance+'',10)).toString(16), { from: accountTwo });
        
        const instanceETHEndingBalance2 = (await web3.eth.getBalance(this.currencyETHOnlyInstance.address));
        const instanceETHEndingTotalSupply2 = (await this.currencyETHOnlyInstance.totalSupply());
         // Get initial token balances of second account.
        const accountTwoTokenEndingBalance2 = (await this.currencyETHOnlyInstance.balanceOf.call(accountTwo));
        const accountTwoETHEndingBalance2 = (await web3.eth.getBalance(accountTwo));
        
        assert.equal(
            new BN(accountTwoTokenEndingBalance2+'',10).toString(16), 
            new BN(0+'',10).toString(16), 
            'Tokens were not transfered to contract'
        );
        
        assert.equal(
            new BN(instanceETHEndingTotalSupply2+'',10).toString(16), 
            new BN(instanceETHStartingTotalSupply+'',10).toString(16), 
            'Contract does not burn tokens'
        );
        
         assert.equal(
            (
                (
                    new BN(instanceETHEndingBalance, 10)).sub(
                        new BN(accountTwoTokenEndingBalance+'',10).mul(new BN(sellExchangeRate+'',10)).div(new BN(100+'',10))
                    )
                ).toString(16), 
            (new BN(instanceETHEndingBalance2, 10)).toString(16),
            'eth left at contract is wrong'
        );
        
    });    

    it('test prices hook', async () => {
        
        const grantAmount2 = (2*10**18).toString(16);
        const grantAmount3 = (3*10**18).toString(16);
        const amountETHSendToContract = 10*10**18; // 10ETH
        
        // send ETH to Contract
        await web3.eth.sendTransaction({
            from:accountTwo,
            to: this.currencyETHOnlyInstance.address, 
            value: amountETHSendToContract
            
        });
            
        var ret;
        await this.currencyETHOnlyInstance.transfer(accountThree, '0x'+(grantAmount3).toString(16), { from: accountTwo });
        
        await this.currencyETHOnlyInstance.getPastEvents('StatAdded', {
            filter: {addr: accountThree}, 
            fromBlock: 0,
            toBlock: 'latest'
        }, function(error, events){ })
        .then(function(events){

            if (events[0]) {
                // array exists and is not empty
                ret = true;
            } else {
                ret = false;
            }
        });
        
        assert.isFalse(ret);

        await this.currencyETHOnlyInstance.transfer(accountFour, '0x'+(grantAmount2).toString(16), { from: accountTwo });
        
        await this.currencyETHOnlyInstance.getPastEvents('StatAdded', {
            filter: {addr: accountFour}, 
            fromBlock: 0,
            toBlock: 'latest'
        }, function(error, events){ })
        .then(function(events){

            if (events[0]) {
                // array exists and is not empty
                ret = true;
            } else {
                ret = false;
            }
            
        });
        assert.isTrue(ret);
    });

    
    it('check reward ', async () => {
        let amountETHSendToContract = 10*10**18; // 10ETH
        
        const instanceETHStartingBalance = (await web3.eth.getBalance(this.currencyETHOnlyInstance.address));
        const instanceETHStartingTotalSupply = (await this.currencyETHOnlyInstance.totalSupply());
         // Get initial token balances of second account.
        const accountTwoTokenStartingBalance = (await this.currencyETHOnlyInstance.balanceOf.call(accountTwo));
        const accountTwoETHStartingBalance = (await web3.eth.getBalance(accountTwo));
        // imitate situation as accountTwo have been invited by accountThree
        await this.CommunityMockInstance.setSender(accountThree);
        const accountThreeTokenStartingBalance = (await this.currencyETHOnlyInstance.balanceOf.call(accountThree));
        const accountThreeETHStartingBalance = (await web3.eth.getBalance(accountThree));
        
        // send ETH to Contract
        await web3.eth.sendTransaction({
            from:accountTwo,
            to: this.currencyETHOnlyInstance.address, 
            value: amountETHSendToContract
            
        });
        
        
        const accountThreeTokenEndingBalance = (await this.currencyETHOnlyInstance.balanceOf.call(accountThree));
        const accountThreeETHEndingBalance = (await web3.eth.getBalance(accountThree));
        
        assert.equal(
            
            (
                BigNumber(parseInt(accountThreeETHEndingBalance))
            ).toString(), 
            (
                BigNumber(parseInt(accountThreeETHStartingBalance)).plus(BigNumber(amountETHSendToContract).times(BigNumber(inviterCommission)).div(BigNumber(1e6)))
            ).toString(), 
            
            'reward to inviter was wrong'
        );
        
        
        
        
    });
});
