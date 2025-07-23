import { ABIFunction, HexUInt, Transaction, Clause, ABIContract } from '@vechain/sdk-core';

export const deployFlipCoin = async (thorClient, provider, walletInfo, abi, bytecode, tokenAddress) => {
  try {
    const signer = await provider.getSigner(walletInfo.address);
    const factory = thorClient.contracts.createContractFactory(abi, bytecode, signer);

    // Build the deployment clause with constructor argument
    const contractBytecode = HexUInt.of(bytecode);
    const deployClause = Clause.deployContract(contractBytecode, abi, [tokenAddress]);

    // Simulate the deployment to estimate gas
    const gasResult = await thorClient.gas.estimateGas(
      [deployClause],
      walletInfo.address,
      { gasPadding: 0.5 } // 50% buffer for safety
    );
    console.log('Gas Estimation:', gasResult);

    // Start deployment with the estimated gas
    await factory.startDeployment([tokenAddress], { gas: gasResult.totalGas });
    const contract = await factory.waitForDeployment();

    const receipt = contract.deployTransactionReceipt;
    console.log('Receipt:', receipt);

    if (!receipt || !receipt.outputs[0]?.contractAddress) {
      if (receipt?.reverted) {
        const revertReason = receipt.revertReason || 'Unknown revert reason';
        try {
          const decodedReason = await thorClient.contracts.decodeRevertReason(receipt, abi);
          throw new Error(`Contract deployment reverted: ${decodedReason || revertReason}`);
        } catch (decodeErr) {
          throw new Error(`Contract deployment reverted: ${revertReason}`);
        }
      }
      throw new Error('Contract deployment failed: No contract address in receipt');
    }

    return receipt.outputs[0].contractAddress;
  } catch (err) {
    console.error('Deployment error:', err);
    throw new Error(`Failed to deploy flip coin: ${err.message}`);
  }
};

export const getFlipStatus = async (thorClient, flipAddress, flipABI, tokenAddress, tokenABI, decimals) => {
  try {
    const flipContract = thorClient.contracts.load(flipAddress, flipABI);
    const tokenContract = thorClient.contracts.load(tokenAddress, tokenABI);

    const [houseBalance, tokenBalance] = await Promise.all([
      flipContract.read.houseBalance(),
      tokenContract.read.balanceOf(flipAddress)
    ]);

    const formattedHouseBalance = Math.floor(Number(houseBalance) / 10 ** decimals);
    const formattedTokenBalance = Math.floor(Number(tokenBalance) / 10 ** decimals);

    return {
      houseBalance: formattedHouseBalance.toString(),
      tokenBalance: formattedTokenBalance.toString()
    };
  } catch (err) {
    throw new Error(`Failed to fetch flip balance: ${err.message}`);
  }
};


export const playFlip = async (
  thorClient,
  provider,
  walletInfo,
  flipAddress,
  tokenAddress,
  tokenABI,
  flipABI,
  choice,
  playAMT
) => {
  try {
    console.log(choice)
    // Check contract token balance
    const { tokenBalance } = await getFlipStatus(thorClient, flipAddress, flipABI, tokenAddress, tokenABI, 18);
    const wagerInWei = BigInt(playAMT); // playAMT is already in wei from the component
    const tokenBalanceInWei = BigInt(Math.floor(tokenBalance * 10 ** 18)).toString();
    console.log(tokenBalanceInWei, wagerInWei);
    if (Number(tokenBalanceInWei) < Number(wagerInWei) * 2) {
      throw new Error('Contract has insufficient token balance for payout');
    }

    // Check allowance
    const tokenContract = thorClient.contracts.load(tokenAddress, tokenABI);
    const allowance = await tokenContract.read.allowance(walletInfo.address, flipAddress);
    if (Number(allowance) < Number(wagerInWei)) {
      throw new Error('Insufficient allowance. Please approve tokens first.');
    }

    // Define the play function ABI
    const playFunction = new ABIFunction({
      name: 'play',
      inputs: [
        { name: '_choice', type: 'bool' },
        { name: '_wager', type: 'uint256' },
      ],
      outputs: [],
      constant: false,
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function',
    });

    // Build the clause for the play function
    const clause = Clause.callFunction(flipAddress, playFunction, [choice, wagerInWei]);

    // Simulate the transaction
    const simulation = await thorClient.transactions.simulateTransaction([clause], {
      caller: walletInfo.address,
    });
    console.log('Simulation:', simulation);
    if (simulation[0].reverted) {
      let revertReason = 'Unknown reason';
      try {
        revertReason = thorClient.transactions.decodeRevertReason(simulation[0].data);
      } catch (err) {
        console.error('Decode revert error:', err);
      }
      throw new Error(`Simulation: Transaction would revert: ${revertReason}`);
    }

    // Estimate gas
    const gasResult = await thorClient.transactions.estimateGas([clause], walletInfo.address);
    console.log('Gas Estimation:', gasResult.totalGas);

    // Build and sign transaction
    const txBody = await thorClient.transactions.buildTransactionBody([clause], gasResult.totalGas);
    const signer = await provider.getSigner(walletInfo.address);
    const rawSignedTx = await signer.signTransaction({
      ...txBody,
      origin: walletInfo.address,
    });

    // Decode and send transaction
    const signedTx = Transaction.decode(HexUInt.of(rawSignedTx.slice(2)).bytes, true);
    const sendTransactionResult = await thorClient.transactions.sendTransaction(signedTx);

    // Wait for transaction receipt
    const receipt = await thorClient.transactions.waitForTransaction(sendTransactionResult.id);
    if (receipt.reverted) {
      throw new Error(`Transaction reverted: ${receipt.revertReason || 'Unknown reason'}`);
    }

    // Decode the Played event from the receipt
    let result = false; // Default to loss
    let payout = BigInt(0);
    if (receipt.outputs && receipt.outputs[0].events && receipt.outputs[0].events.length > 0) {
      const abiContract = new ABIContract(flipABI);
      const eventLogs = receipt.outputs[0].events;

      for (const log of eventLogs) {
        try {
          const decoded = abiContract.parseLog(log.data, log.topics);
          console.log(decoded, decoded.args.result, decoded.args.payout)
          if (
            decoded &&
            decoded.eventName === 'Played' 
          ) {
            result = decoded.args.result; // true = win, false = loss
            payout = BigInt(decoded.args.payout);
            break;
          }
        } catch (err) {
          console.error('Error decoding event:', err);
        }
      }
    } else {
      console.warn('No events found in transaction receipt');
    }
    let outcome = false
    // Fallback: Infer result from payout if event decoding fails
    if (choice === result ) {
      outcome = true; // If payout > 0, assume win
    }

    return {
      txID: sendTransactionResult.id,
      result: outcome,
      payout: payout.toString(),
    };
  } catch (err) {
    console.error('PlayFlip error:', err);
    throw new Error(`Failed to flip: ${err.message}`);
  }
};

export const depositFunds = async (
  thorClient,
  provider,
  walletInfo,
  tokenAddress,
  flipAddress,
  tokenABI,
  flipABI,
  amount
) => {
  try {
    console.log('Deposit amount:', amount);
    console.log('flipABI:', flipABI);
    console.log('tokenABI:', tokenABI);

    const tokenContract = thorClient.contracts.load(tokenAddress, tokenABI);
    const flipContract = thorClient.contracts.load(flipAddress, flipABI);

    // const owner = await flipContract.read.owner();
    // console.log('Contract owner:', owner);
    // if (owner.toLowerCase() !== walletInfo.address.toLowerCase()) {
    //   throw new Error('Caller is not the contract owner');
    // }

    const callerBalance = await tokenContract.read.balanceOf(walletInfo.address);
    console.log('Caller balance:', callerBalance.toString());
    if (Number(callerBalance) < Number(amount)) {
      throw new Error(`Insufficient token balance: ${callerBalance} < ${amount}`);
    }

    const allowance = await tokenContract.read.allowance(walletInfo.address, flipAddress);
    console.log('Allowance:', allowance.toString());
    if (Number(allowance) < Number(amount)) {
      throw new Error(`Insufficient allowance: ${allowance} < ${amount}. Please approve tokens first.`);
    }

    const clause = Clause.callFunction(
      flipAddress,
      new ABIFunction({
        name: 'depositHouseFunds',
        inputs: [{ name: 'amount', type: 'uint256' }],
        outputs: [],
        constant: false,
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
      }),
      [amount]
    );

    const simulation = await thorClient.transactions.simulateTransaction([clause], {
      caller: walletInfo.address,
    });
    console.log('Simulation:', simulation);
    if (simulation[0].reverted) {
      let revertReason = 'Unknown reason';
      try {
        revertReason = thorClient.transactions.decodeRevertReason(simulation[0].data);
      } catch (err) {
        console.error('Decode revert error:', err);
      }
      throw new Error(`Simulation: Transaction would revert: ${revertReason}`);
    }

    const gasResult = await thorClient.transactions.estimateGas([clause], walletInfo.address);
    console.log('Gas Estimation:', gasResult.totalGas);

    const txBody = await thorClient.transactions.buildTransactionBody([clause], gasResult.totalGas);

    const signer = await provider.getSigner(walletInfo.address);
    const rawSignedTx = await signer.signTransaction({
      ...txBody,
      origin: walletInfo.address,
    });

    const signedTx = Transaction.decode(HexUInt.of(rawSignedTx.slice(2)).bytes, true);

    const sendTransactionResult = await thorClient.transactions.sendTransaction(signedTx);

    const receipt = await thorClient.transactions.waitForTransaction(sendTransactionResult.id);

    if (receipt.reverted) {
      throw new Error(`Transaction reverted: ${receipt.revertReason || 'Unknown reason'}`);
    }

    return sendTransactionResult.id;
  } catch (err) {
    console.error('DepositFunds error:', err);
    throw new Error(`Failed to deposit funds: ${err.message}`);
  }
};

export const withdrawFunds = async (
  thorClient,
  provider,
  walletInfo,
  tokenAddress,
  flipAddress,
) => {
  try {

    const clause = Clause.callFunction(
      flipAddress,
      new ABIFunction({
        name: 'withdrawHouseBalance',
        inputs: [],
        outputs: [],
        constant: false,
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
      }),
    );

    const simulation = await thorClient.transactions.simulateTransaction([clause], {
      caller: walletInfo.address,
    });
    console.log('Simulation:', simulation);
    if (simulation[0].reverted) {
      let revertReason = 'Unknown reason';
      try {
        revertReason = thorClient.transactions.decodeRevertReason(simulation[0].data);
      } catch (err) {
        console.error('Decode revert error:', err);
      }
      throw new Error(`Simulation: Transaction would revert: ${revertReason}`);
    }

    const gasResult = await thorClient.transactions.estimateGas([clause], walletInfo.address);
    console.log('Gas Estimation:', gasResult.totalGas);

    const txBody = await thorClient.transactions.buildTransactionBody([clause], gasResult.totalGas);

    const signer = await provider.getSigner(walletInfo.address);
    const rawSignedTx = await signer.signTransaction({
      ...txBody,
      origin: walletInfo.address,
    });

    const signedTx = Transaction.decode(HexUInt.of(rawSignedTx.slice(2)).bytes, true);

    const sendTransactionResult = await thorClient.transactions.sendTransaction(signedTx);

    const receipt = await thorClient.transactions.waitForTransaction(sendTransactionResult.id);

    if (receipt.reverted) {
      throw new Error(`Transaction reverted: ${receipt.revertReason || 'Unknown reason'}`);
    }

    return sendTransactionResult.id;
  } catch (err) {
    console.error('Withdraw Funds error:', err);
    throw new Error(`Failed to withdraw funds: ${err.message}`);
  }
};

export const approveToken = async (
  thorClient,
  provider,
  walletInfo,
  tokenAddress,
  flipAddress,
  amount
) => {
  try {
    const clause = Clause.callFunction(
      tokenAddress,
      new ABIFunction({
        name: 'approve',
        inputs: [
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' }
        ],
        outputs: [{ name: '', type: 'bool' }],
        constant: false,
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
      }),
      [flipAddress, amount]
    );

    const gasResult = await thorClient.transactions.estimateGas([clause], walletInfo.address);

    const txBody = await thorClient.transactions.buildTransactionBody([clause], gasResult.totalGas);

    const signer = await provider.getSigner(walletInfo.address);
    const rawSignedTx = await signer.signTransaction({
      ...txBody,
      origin: walletInfo.address,
    });

    const signedTx = Transaction.decode(HexUInt.of(rawSignedTx.slice(2)).bytes, true);

    const sendTransactionResult = await thorClient.transactions.sendTransaction(signedTx);

    const receipt = await thorClient.transactions.waitForTransaction(sendTransactionResult.id);

    if (receipt.reverted) {
      throw new Error(`Approval reverted: ${receipt.revertReason || 'Unknown reason'}`);
    }

    return sendTransactionResult.id;
  } catch (err) {
    throw new Error(`Failed to approve tokens: ${err.message}`);
  }
};
