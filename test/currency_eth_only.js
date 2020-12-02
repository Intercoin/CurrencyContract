const BN = require('bn.js'); // https://github.com/indutny/bn.js
const util = require('util');
const CurrencyETHOnly = artifacts.require("CurrencyETHOnly");
const CurrencyETHOnlyMock = artifacts.require("CurrencyETHOnlyMock");
const PricesContractMock = artifacts.require("PricesContractMock");
const CommunityMock = artifacts.require("CommunityMock");
const ERC20MintableToken = artifacts.require("ERC20Mintable");
const CurrencyETHOnlyFactory = artifacts.require("CurrencyETHOnlyFactory");
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
    
    
    it('should deployed correctly with correctly owner', async () => {
        const pricesContractInstance = await PricesContractMock.new();
        const CommunityMockInstance = await CommunityMock.new();
        const currencyETHOnlyInstance = await CurrencyETHOnly.new('t1','t1', pricesContractInstance.address, CommunityMockInstance.address, membersRole);
        
        const owner = (await currencyETHOnlyInstance.owner.call());
        assert.equal(owner, accountOne, 'owner is not accountOne');
        
    });
    
    it('should used transferOwnership by owner only', async () => {
        const pricesContractInstance = await PricesContractMock.new();
        const CommunityMockInstance = await CommunityMock.new();
        const currencyETHOnlyInstance = await CurrencyETHOnly.new('t1','t1', pricesContractInstance.address, CommunityMockInstance.address, membersRole);
      
        await truffleAssert.reverts(
            currencyETHOnlyInstance.transferOwnership(accountTwo, { from: accountTwo }), 
            "Ownable: caller is not the owner."
        );
        
        await currencyETHOnlyInstance.transferOwnership(accountTwo, { from: accountOne });
    });

    it('should add address TokenForClaiming to list', async () => {
        const pricesContractInstance = await PricesContractMock.new();
        const CommunityMockInstance = await CommunityMock.new();
        const currencyETHOnlyInstance = await CurrencyETHOnly.new('t1','t1', pricesContractInstance.address, CommunityMockInstance.address, membersRole);
        const ERC20MintableTokenInstance = await ERC20MintableToken.new('t2','t2');
        
        await truffleAssert.reverts(
            currencyETHOnlyInstance.claimingTokenAdd(ERC20MintableTokenInstance.address, { from: accountTwo }), 
            "Ownable: caller is not the owner."
        );
        
        await truffleAssert.reverts(
            currencyETHOnlyInstance.claimingTokenAdd(accountThree, { from: accountOne }), 
            "tokenForClaiming must be a contract address"
        );
        // add to claim list
        await currencyETHOnlyInstance.claimingTokenAdd(ERC20MintableTokenInstance.address, { from: accountOne });
        
        let list = (await currencyETHOnlyInstance.claimingTokensView({ from: accountOne }));
        
        assert.notEqual(
            list.indexOf(ERC20MintableTokenInstance.address),
            -1,
            "TokenForClaiming does not added in list as expected");
    });

    it('should revert claim if it wasn\'t approve tokens before', async () => {
        // setup
        const pricesContractInstance = await PricesContractMock.new();
        const CommunityMockInstance = await CommunityMock.new();
        const currencyETHOnlyInstance = await CurrencyETHOnly.new('t1','t1', pricesContractInstance.address, CommunityMockInstance.address, membersRole);
        const ERC20MintableTokenInstance = await ERC20MintableToken.new('t2','t2');
        
        const grantAmount = (10*10**18).toString(16);
        
        // add to claim list
        await currencyETHOnlyInstance.claimingTokenAdd(ERC20MintableTokenInstance.address, { from: accountOne });
        
        // mint to ERC20MintableToken
        await ERC20MintableTokenInstance.mint(accountTwo, '0x'+grantAmount, { from: accountOne });
        
        //
        await truffleAssert.reverts(
            currencyETHOnlyInstance.claim({ from: accountTwo }), 
            "Amount exceeds allowed balance"
        );
    });
    
    it('should revert claim if it wasn\'t added TokenForClaiming before', async () => {
        // setup
        const pricesContractInstance = await PricesContractMock.new();
        const CommunityMockInstance = await CommunityMock.new();
        const currencyETHOnlyInstance = await CurrencyETHOnly.new('t1','t1', pricesContractInstance.address, CommunityMockInstance.address, membersRole);
        const ERC20MintableTokenInstance = await ERC20MintableToken.new('t2','t2');
        
        const grantAmount = (10*10**18).toString(16);
        
        // mint to ERC20MintableToken
        await ERC20MintableTokenInstance.mint(accountTwo, '0x'+grantAmount, { from: accountOne });
        
        //make approve
        await ERC20MintableTokenInstance.approve(currencyETHOnlyInstance.address, '0x'+grantAmount, { from: accountTwo });
        
        //
        await truffleAssert.reverts(
            currencyETHOnlyInstance.claim({ from: accountTwo }), 
            "There are no allowed tokens for claiming"
        );
        
    });

    it('should claim to account', async () => {
      
        // setup
        const pricesContractInstance = await PricesContractMock.new();
        const CommunityMockInstance = await CommunityMock.new();
        const currencyETHOnlyInstance = await CurrencyETHOnly.new('t1','t1', pricesContractInstance.address, CommunityMockInstance.address, membersRole);
        const ERC20MintableTokenInstance = await ERC20MintableToken.new('t2','t2');
        const currentBlockInfo = await web3.eth.getBlock("latest");
        const grantAmount = (10*10**18).toString(16);
     
         // Get initial balances of second account.
        const accountTwoStartingBalance = (await currencyETHOnlyInstance.balanceOf.call(accountTwo));
        
         // add to claim list
        await currencyETHOnlyInstance.claimingTokenAdd(ERC20MintableTokenInstance.address, { from: accountOne });
        
        // mint to ERC20MintableToken
        await ERC20MintableTokenInstance.mint(accountTwo, '0x'+grantAmount, { from: accountOne });
        
        //make approve
        await ERC20MintableTokenInstance.approve(currencyETHOnlyInstance.address, '0x'+grantAmount, { from: accountTwo });
        
        // claim()
        await currencyETHOnlyInstance.claim({ from: accountTwo });
        
        // Get balances of first and second account after the transactions.
        const accountTwoEndingBalance = (await currencyETHOnlyInstance.balanceOf.call(accountTwo));

        assert.equal(
            new BN(accountTwoEndingBalance,16).toString(16),
            (new BN(accountTwoStartingBalance,16)).add(new BN(grantAmount,16)).toString(16), 
            "Amount wasn't correctly sent to the receiver"
        );

    });
 
 
   
    it('should prevent transfer if not in community `whitelist` role', async () => {
        const pricesContractInstance = await PricesContractMock.new();
        const CommunityMockInstance = await CommunityMock.new();
        const currencyETHOnlyInstance = await CurrencyETHOnly.new('t1','t1', pricesContractInstance.address, CommunityMockInstance.address, membersRoleWrong);
        const amountETHSendToContract = 10*10**18; // 10ETH
        
        
        const instanceETHStartingBalance = (await web3.eth.getBalance(currencyETHOnlyInstance.address));
        const instanceETHStartingTotalSupply = (await currencyETHOnlyInstance.totalSupply());
         // Get initial token balances of second account.
        const accountTwoTokenStartingBalance = (await currencyETHOnlyInstance.balanceOf.call(accountTwo));
        const accountTwoETHStartingBalance = (await web3.eth.getBalance(accountTwo));
        
        // send ETH to Contract
        await web3.eth.sendTransaction({
            from:accountTwo,
            to: currencyETHOnlyInstance.address, 
            value: amountETHSendToContract
            
        });
        
        const instanceETHEndingBalance = (await web3.eth.getBalance(currencyETHOnlyInstance.address));
        const instanceETHEndingTotalSupply = (await currencyETHOnlyInstance.totalSupply());
         // Get initial token balances of second account.
        const accountTwoTokenEndingBalance = (await currencyETHOnlyInstance.balanceOf.call(accountTwo));
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
            currencyETHOnlyInstance.transfer(currencyETHOnlyInstance.address, '0x'+(new BN(accountTwoTokenEndingBalance+'',10)).toString(16), { from: accountTwo }), 
            "Sender is not in whitelist"
        );
    });   
    
    it('should exchange Token/ETH', async () => {
        const pricesContractInstance = await PricesContractMock.new();
        const CommunityMockInstance = await CommunityMock.new();
        const currencyETHOnlyInstance = await CurrencyETHOnly.new('t1','t1', pricesContractInstance.address, CommunityMockInstance.address, membersRole);
        const amountETHSendToContract = 10*10**18; // 10ETH
        
        
        const instanceETHStartingBalance = (await web3.eth.getBalance(currencyETHOnlyInstance.address));
        const instanceETHStartingTotalSupply = (await currencyETHOnlyInstance.totalSupply());
         // Get initial token balances of second account.
        const accountTwoTokenStartingBalance = (await currencyETHOnlyInstance.balanceOf.call(accountTwo));
        const accountTwoETHStartingBalance = (await web3.eth.getBalance(accountTwo));
        
        // send ETH to Contract
        await web3.eth.sendTransaction({
            from:accountTwo,
            to: currencyETHOnlyInstance.address, 
            value: amountETHSendToContract
            
        });
        
        const instanceETHEndingBalance = (await web3.eth.getBalance(currencyETHOnlyInstance.address));
        const instanceETHEndingTotalSupply = (await currencyETHOnlyInstance.totalSupply());
         // Get initial token balances of second account.
        const accountTwoTokenEndingBalance = (await currencyETHOnlyInstance.balanceOf.call(accountTwo));
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
        await currencyETHOnlyInstance.transfer(currencyETHOnlyInstance.address, '0x'+(new BN(accountTwoTokenEndingBalance+'',10)).toString(16), { from: accountTwo });
        
        const instanceETHEndingBalance2 = (await web3.eth.getBalance(currencyETHOnlyInstance.address));
        const instanceETHEndingTotalSupply2 = (await currencyETHOnlyInstance.totalSupply());
         // Get initial token balances of second account.
        const accountTwoTokenEndingBalance2 = (await currencyETHOnlyInstance.balanceOf.call(accountTwo));
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

    // !!!! leave until will improved factory creation
    // it('should deployed correctly with correctly owner through factory', async () => {
    //     const pricesContractInstance = await PricesContractMock.new();
    //     const CommunityMockInstance = await CommunityMock.new();
    //     const currencyETHOnlyFactoryInstance = await CurrencyETHOnlyFactory.new({ from: accountThree });
    //     await currencyETHOnlyFactoryInstance.createCurrencyETHOnly('t1','t1', pricesContractInstance.address, CommunityMockInstance.address, membersRole, { from: accountOne });
        
    //     var currencyETHOnlyAddress; 
    //     await currencyETHOnlyFactoryInstance.getPastEvents('CurrencyETHOnlyCreated', {
    //         filter: {addr: accountOne}, // Using an array in param means OR: e.g. 20 or 23
    //         fromBlock: 0,
    //         toBlock: 'latest'
    //     }, function(error, events){ })
    //     .then(function(events){
            
    //         currencyETHOnlyAddress = events[0].returnValues['currencyETHOnly'];
    //     });
    //     console.log(currencyETHOnlyAddress);
        
    //     let currencyETHOnlyInstance = await CurrencyETHOnly.at(currencyETHOnlyAddress);
        
        
        
    //     const owner = (await currencyETHOnlyInstance.owner());
    //     assert.equal(owner, accountOne, 'owner is not accountOne');
        
    // });

    it('test prices hook', async () => {
        const pricesContractInstance = await PricesContractMock.new();
        const CommunityMockInstance = await CommunityMock.new();
        const currencyETHOnlyInstance = await CurrencyETHOnly.new('t1','t1', pricesContractInstance.address, CommunityMockInstance.address, membersRole);
        const grantAmount2 = (2*10**18).toString(16);
        const grantAmount3 = (3*10**18).toString(16);
        const amountETHSendToContract = 10*10**18; // 10ETH
        
        // send ETH to Contract
        await web3.eth.sendTransaction({
            from:accountTwo,
            to: currencyETHOnlyInstance.address, 
            value: amountETHSendToContract
            
        });
            
        var ret;
        await currencyETHOnlyInstance.transfer(accountThree, '0x'+(grantAmount3).toString(16), { from: accountTwo });
        
        await currencyETHOnlyInstance.getPastEvents('StatAdded', {
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

        await currencyETHOnlyInstance.transfer(accountFour, '0x'+(grantAmount2).toString(16), { from: accountTwo });
        
        await currencyETHOnlyInstance.getPastEvents('StatAdded', {
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
  
});
