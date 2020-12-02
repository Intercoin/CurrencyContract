const BN = require('bn.js'); // https://github.com/indutny/bn.js
const util = require('util');
const Currency = artifacts.require("Currency");
const CurrencyMock = artifacts.require("CurrencyMock");
const CommunityMock = artifacts.require("CommunityMock");
const ERC20MintableToken = artifacts.require("ERC20Mintable");
const ERC20MintableToken2 = artifacts.require("ERC20Mintable");
const PricesContractMock = artifacts.require("PricesContractMock");
const CurrencyFactory = artifacts.require("CurrencyFactory");
const truffleAssert = require('truffle-assertions');
const helper = require("../helpers/truffleTestHelper");
//0x0000000000000000000000000000000000000000
contract('Currency', (accounts) => {
    
    // Setup accounts.
    const accountOne = accounts[0];
    const accountTwo = accounts[1];  
    const accountThree = accounts[2];  
    const accountFour = accounts[3];  
    
    const membersRole= 'members';
    const membersRoleWrong = 'wrong-role';

    it('should deployed correctly with correctly owner', async () => {
        const pricesContractInstance = await PricesContractMock.new();
        const ERC20MintableToken2Instance = await ERC20MintableToken.new('t2','t2');
        const CommunityMockInstance = await CommunityMock.new();
        const currencyInstance = await Currency.new('t1','t1', ERC20MintableToken2Instance.address, pricesContractInstance.address, CommunityMockInstance.address, membersRole);
        
        const owner = (await currencyInstance.owner.call());
        assert.equal(owner, accountOne, 'owner is not accountOne');
        
    });

    it('should used transferOwnership by owner only', async () => {
        const pricesContractInstance = await PricesContractMock.new();
        const ERC20MintableToken2Instance = await ERC20MintableToken.new('t2','t2');
        const CommunityMockInstance = await CommunityMock.new();
        const currencyInstance = await Currency.new('t1','t1', ERC20MintableToken2Instance.address, pricesContractInstance.address, CommunityMockInstance.address, membersRole);
      
        await truffleAssert.reverts(
            currencyInstance.transferOwnership(accountTwo, { from: accountTwo }), 
            "Ownable: caller is not the owner."
        );
        
        await currencyInstance.transferOwnership(accountTwo, { from: accountOne });
    });

    it('should add address TokenForClaiming to list', async () => {
        const pricesContractInstance = await PricesContractMock.new();
        const ERC20MintableToken2Instance = await ERC20MintableToken.new('t2','t2');
        const CommunityMockInstance = await CommunityMock.new();
        const currencyInstance = await Currency.new('t1','t1', ERC20MintableToken2Instance.address, pricesContractInstance.address, CommunityMockInstance.address, membersRole);
        const ERC20MintableTokenInstance = await ERC20MintableToken.new('t2','t2');
        
        await truffleAssert.reverts(
            currencyInstance.claimingTokenAdd(ERC20MintableTokenInstance.address, { from: accountTwo }), 
            "Ownable: caller is not the owner."
        );
        
        await truffleAssert.reverts(
            currencyInstance.claimingTokenAdd(accountThree, { from: accountOne }), 
            "tokenForClaiming must be a contract address"
        );
        // add to claim list
        await currencyInstance.claimingTokenAdd(ERC20MintableTokenInstance.address, { from: accountOne });
        
        let list = (await currencyInstance.claimingTokensView({ from: accountOne }));
        
        assert.notEqual(
            list.indexOf(ERC20MintableTokenInstance.address),
            -1,
            "TokenForClaiming does not added in list as expected");
    });

    it('should revert claim if it wasn\'t approve tokens before', async () => {
        // setup
        const pricesContractInstance = await PricesContractMock.new();
        const ERC20MintableToken2Instance = await ERC20MintableToken.new('t2','t2');
        const CommunityMockInstance = await CommunityMock.new();
        const currencyInstance = await Currency.new('t1','t1', ERC20MintableToken2Instance.address, pricesContractInstance.address, CommunityMockInstance.address, membersRole);
        const ERC20MintableTokenInstance = await ERC20MintableToken.new('t2','t2');
        
        const grantAmount = (10*10**18).toString(16);
        
        // add to claim list
        await currencyInstance.claimingTokenAdd(ERC20MintableTokenInstance.address, { from: accountOne });
        
        // mint to ERC20MintableToken
        await ERC20MintableTokenInstance.mint(accountTwo, '0x'+grantAmount, { from: accountOne });
        
        //
        await truffleAssert.reverts(
            currencyInstance.claim({ from: accountTwo }), 
            "Amount exceeds allowed balance"
        );
    });

    it('should revert claim if it wasn\'t added TokenForClaiming before', async () => {
        // setup
        const pricesContractInstance = await PricesContractMock.new();
        const ERC20MintableToken2Instance = await ERC20MintableToken.new('t2','t2');
        const CommunityMockInstance = await CommunityMock.new();
        const currencyInstance = await Currency.new('t1','t1', ERC20MintableToken2Instance.address, pricesContractInstance.address, CommunityMockInstance.address, membersRole);
        const ERC20MintableTokenInstance = await ERC20MintableToken.new('t2','t2');
        
        const grantAmount = (10*10**18).toString(16);
        
        // mint to ERC20MintableToken
        await ERC20MintableTokenInstance.mint(accountTwo, '0x'+grantAmount, { from: accountOne });
        
        //make approve
        await ERC20MintableTokenInstance.approve(currencyInstance.address, '0x'+grantAmount, { from: accountTwo });
        
        //
        await truffleAssert.reverts(
            currencyInstance.claim({ from: accountTwo }), 
            "There are no allowed tokens for claiming"
        );
        
    });

    it('should claim to account', async () => {
      
        // setup
        const pricesContractInstance = await PricesContractMock.new();
        const ERC20MintableToken2Instance = await ERC20MintableToken.new('t2','t2');
        const CommunityMockInstance = await CommunityMock.new();
        const currencyInstance = await Currency.new('t1','t1', ERC20MintableToken2Instance.address, pricesContractInstance.address, CommunityMockInstance.address, membersRole);
        const ERC20MintableTokenInstance = await ERC20MintableToken.new('t2','t2');
        const currentBlockInfo = await web3.eth.getBlock("latest");
        const grantAmount = (10*10**18).toString(16);
     
         // Get initial balances of second account.
        const accountTwoStartingBalance = (await currencyInstance.balanceOf.call(accountTwo));
        
         // add to claim list
        await currencyInstance.claimingTokenAdd(ERC20MintableTokenInstance.address, { from: accountOne });
        
        // mint to ERC20MintableToken
        await ERC20MintableTokenInstance.mint(accountTwo, '0x'+grantAmount, { from: accountOne });
        
        //make approve
        await ERC20MintableTokenInstance.approve(currencyInstance.address, '0x'+grantAmount, { from: accountTwo });
        
        // claim()
        await currencyInstance.claim({ from: accountTwo });
        
        // Get balances of first and second account after the transactions.
        const accountTwoEndingBalance = (await currencyInstance.balanceOf.call(accountTwo));

        assert.equal(
            new BN(accountTwoEndingBalance,16).toString(16),
            (new BN(accountTwoStartingBalance,16)).add(new BN(grantAmount,16)).toString(16), 
            "Amount wasn't correctly sent to the receiver"
        );

    });    

    it('should prevent transfer if not in community `whitelist` role', async () => {
        const pricesContractInstance = await PricesContractMock.new();
        const ERC20MintableToken2Instance = await ERC20MintableToken.new('t2','t2');
        const CommunityMockInstance = await CommunityMock.new();
        const currencyInstance = await Currency.new('t1','t1',ERC20MintableToken2Instance.address, pricesContractInstance.address, CommunityMockInstance.address, membersRoleWrong);
        const amountT2SendToContract = (10*10**18).toString(16);; // 10 token2
        
        
        
        const instanceToken2StartingBalance = (await ERC20MintableToken2Instance.balanceOf.call(currencyInstance.address));
        const instanceToken1StartingBalance = (await currencyInstance.totalSupply());
        // Get initial token balances of second account.
        const accountTwoToken1StartingBalance = (await currencyInstance.balanceOf.call(accountTwo));
        const accountTwoToken2StartingBalance = (await ERC20MintableToken2Instance.balanceOf.call(accountTwo));
        
        
        await ERC20MintableToken2Instance.mint(accountTwo, '0x'+amountT2SendToContract, { from: accountOne });
        
        
        // send Token2 to Contract
        await ERC20MintableToken2Instance.approve(currencyInstance.address, '0x'+amountT2SendToContract, { from: accountTwo });
        await currencyInstance.receiveERC20Token2(false, { from: accountTwo });
        //---
        const instanceToken2EndingBalance = (await ERC20MintableToken2Instance.balanceOf.call(currencyInstance.address));
        const instanceToken1EndingBalance = (await currencyInstance.totalSupply());
        // Get initial token balances of second account.
        const accountTwoToken1EndingBalance = (await currencyInstance.balanceOf.call(accountTwo));
        const accountTwoToken2EndingBalance = (await ERC20MintableToken2Instance.balanceOf.call(accountTwo));
        
        assert.equal(
            (new BN(instanceToken2StartingBalance+'',16).add(new BN(amountT2SendToContract+'',16))).toString(16), 
            (new BN(instanceToken2EndingBalance, 16)).toString(16),
            'Сontract does not receive token2'
        );
        
        const sellExchangeRate = 99;
        const buyExchangeRate = 100;
        
        assert.equal(
            (new BN(amountT2SendToContract+'',16).mul(new BN(buyExchangeRate+'',16)).div(new BN(100+'',16))).toString(16), 
            (new BN(accountTwoToken1EndingBalance, 10)).toString(16),
            'Token\'s count are wrong'
        );

        await truffleAssert.reverts(
            currencyInstance.transfer(currencyInstance.address, '0x'+(new BN(accountTwoToken1EndingBalance+'',10)).toString(16), { from: accountTwo }), 
            "Sender is not in whitelist"
        );

    });   
    
    it('should exchange Token/Token2', async () => {
        const pricesContractInstance = await PricesContractMock.new();
        const ERC20MintableToken2Instance = await ERC20MintableToken.new('t2','t2');
        const CommunityMockInstance = await CommunityMock.new();
        const currencyInstance = await Currency.new('t1','t1',ERC20MintableToken2Instance.address, pricesContractInstance.address, CommunityMockInstance.address, membersRole);
        const amountT2SendToContract = (10*10**18).toString(16);; // 10 token2
        
        
        
        const instanceToken2StartingBalance = (await ERC20MintableToken2Instance.balanceOf.call(currencyInstance.address));
        const instanceToken1StartingBalance = (await currencyInstance.totalSupply());
        // Get initial token balances of second account.
        const accountTwoToken1StartingBalance = (await currencyInstance.balanceOf.call(accountTwo));
        const accountTwoToken2StartingBalance = (await ERC20MintableToken2Instance.balanceOf.call(accountTwo));
        
        
        await ERC20MintableToken2Instance.mint(accountTwo, '0x'+amountT2SendToContract, { from: accountOne });
        
        
        // send Token2 to Contract
        await ERC20MintableToken2Instance.approve(currencyInstance.address, '0x'+amountT2SendToContract, { from: accountTwo });
        await currencyInstance.receiveERC20Token2(false, { from: accountTwo });
        //---
        const instanceToken2EndingBalance = (await ERC20MintableToken2Instance.balanceOf.call(currencyInstance.address));
        const instanceToken1EndingBalance = (await currencyInstance.totalSupply());
        // Get initial token balances of second account.
        const accountTwoToken1EndingBalance = (await currencyInstance.balanceOf.call(accountTwo));
        const accountTwoToken2EndingBalance = (await ERC20MintableToken2Instance.balanceOf.call(accountTwo));
        
        assert.equal(
            (new BN(instanceToken2StartingBalance+'',16).add(new BN(amountT2SendToContract+'',16))).toString(16), 
            (new BN(instanceToken2EndingBalance, 16)).toString(16),
            'Сontract does not receive token2'
        );
        
        const sellExchangeRate = 99;
        const buyExchangeRate = 100;
        
        assert.equal(
            (new BN(amountT2SendToContract+'',16).mul(new BN(buyExchangeRate+'',16)).div(new BN(100+'',16))).toString(16), 
            (new BN(accountTwoToken1EndingBalance, 10)).toString(16),
            'Token\'s count are wrong'
        );

        // try again send token back to contract 
        await currencyInstance.transfer(currencyInstance.address, '0x'+(new BN(accountTwoToken1EndingBalance+'',10)).toString(16), { from: accountTwo });
        
        const instanceToken2EndingBalance2 = (await ERC20MintableToken2Instance.balanceOf.call(currencyInstance.address));
        const instanceToken1EndingBalance2 = (await currencyInstance.totalSupply());
        // Get initial token balances of second account.
        const accountTwoToken1EndingBalance2 = (await currencyInstance.balanceOf.call(accountTwo));
        const accountTwoToken2EndingBalance2 = (await ERC20MintableToken2Instance.balanceOf.call(accountTwo));
        
        assert.equal(
            new BN(accountTwoToken1EndingBalance2+'',16).toString(16), 
            new BN(0+'',10).toString(16), 
            'Tokens were not transfered to contract'
        );
        
        assert.equal(
            new BN(instanceToken1EndingBalance2+'',16).toString(16), 
            new BN(accountTwoToken1EndingBalance2+'',16).toString(16), 
            'Contract does not burn tokens'
        );

        assert.equal(
            (
                (
                    new BN(instanceToken2EndingBalance, 10)).sub(
                        new BN(accountTwoToken1EndingBalance+'',10).mul(new BN(sellExchangeRate+'',10)).div(new BN(100+'',10))
                    )
                ).toString(16), 
            (new BN(instanceToken2EndingBalance2, 10)).toString(16),
            'token2 left at contract is wrong'
        );
        
        
    });    
    
    // !!!! leave until will improved factory creation
    // it('should deployed correctly with correctly owner through factory', async () => {
    //     const pricesContractInstance = await PricesContractMock.new();
    //     const ERC20MintableToken2Instance = await ERC20MintableToken.new('t2','t2');
    //     const CommunityMockInstance = await CommunityMock.new();
    //     const currencyFactoryInstance = await CurrencyFactory.new({ from: accountThree });
    //     await currencyFactoryInstance.createCurrency('t1','t1', ERC20MintableToken2Instance.address, pricesContractInstance.address, CommunityMockInstance.address, membersRole, { from: accountOne });
        
    //     var currencyAddress; 
    //     await currencyFactoryInstance.getPastEvents('CurrencyCreated', {
    //         filter: {addr: accountOne}, // Using an array in param means OR: e.g. 20 or 23
    //         fromBlock: 0,
    //         toBlock: 'latest'
    //     }, function(error, events){  })
    //     .then(function(events){
            
    //         currencyAddress = events[0].returnValues['currency'];
    //     });

    //     let currencyInstance = await Currency.at(currencyAddress);
        
    //     const owner = (await currencyInstance.owner());
    //     assert.equal(owner, accountOne, 'owner is not accountOne');
        
    // });


    it('test prices hook', async () => {
        
        const pricesContractInstance = await PricesContractMock.new();
        const ERC20MintableToken2Instance = await ERC20MintableToken.new('t2','t2');
        const CommunityMockInstance = await CommunityMock.new();
        const currencyInstance = await Currency.new('t1','t1',ERC20MintableToken2Instance.address, pricesContractInstance.address, CommunityMockInstance.address, membersRole);
        
        
        const grantAmount2 = (2*10**18).toString(16);
        const grantAmount3 = (3*10**18).toString(16);
        const amountT2SendToContract = (10*10**18).toString(16);; // 10 token2
        
        await ERC20MintableToken2Instance.mint(accountTwo, '0x'+amountT2SendToContract, { from: accountOne });
        
        
        // send Token2 to Contract
        await ERC20MintableToken2Instance.approve(currencyInstance.address, '0x'+amountT2SendToContract, { from: accountTwo });
        await currencyInstance.receiveERC20Token2(false, { from: accountTwo });
        
            
        var ret;
        await currencyInstance.transfer(accountThree, '0x'+(grantAmount3).toString(16), { from: accountTwo });
        
        await currencyInstance.getPastEvents('StatAdded', {
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

        await currencyInstance.transfer(accountFour, '0x'+(grantAmount2).toString(16), { from: accountTwo });
        
        await currencyInstance.getPastEvents('StatAdded', {
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
