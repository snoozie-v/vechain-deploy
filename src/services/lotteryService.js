import { ABIFunction } from '@vechain/sdk-core';
import { HexUInt, Transaction, Clause  } from '@vechain/sdk-core';


export const deployLottery = async (thorClient, provider, walletInfo, abi, bytecode) => {
  try {
    const signer = await provider.getSigner(walletInfo.address);
    const factory = thorClient.contracts.createContractFactory(abi, bytecode, signer);

    // 1. Build the deployment clause using the bytecode
    const contractBytecode = HexUInt.of(bytecode);
    const deployClause = Clause.deployContract(contractBytecode);

    // 2. Simulate the deployment to estimate gas
    const gasResult = await thorClient.gas.estimateGas(
      [deployClause],
      walletInfo.address,
      { gasPadding: 0.2 } // 20% buffer, optional
    );
    console.log(gasResult)
    // 3. Start deployment with the estimated gas
    await factory.startDeployment(
      undefined, // deployParams if any
      { gas: gasResult.totalGas }
    );
    const contract = await factory.waitForDeployment();

    const receipt = contract.deployTransactionReceipt;

    if (!receipt || !receipt.outputs[0]?.contractAddress) {
      if (receipt?.reverted) {
        const revertReason = receipt.revertReason || 'Unknown revert reason';
        throw new Error(`Contract deployment reverted: ${revertReason}`);
      }
      throw new Error('Contract deployment failed: No contract address in receipt');
    }

    return receipt.outputs[0].contractAddress;
  } catch (err) {
    console.error('Deployment error:', err);
    throw new Error(`Failed to deploy lottery: ${err.message}`);
  }
};

// export const deployLottery = async (thorClient, provider, walletInfo, abi, bytecode) => {
//   try {
//     const signer = await provider.getSigner(walletInfo.address);
//     const factory = thorClient.contracts.createContractFactory(abi, bytecode, signer);
//     console.log('factory', factory)
//     // Start deployment and capture transaction result
//     await factory.startDeployment();
//     const contract = await factory.waitForDeployment();


//     const receipt = contract.deployTransactionReceipt;


//     if (!receipt || !receipt.outputs[0]?.contractAddress) {
//       // Check if transaction reverted
//       if (receipt?.reverted) {
//         const revertReason = receipt.revertReason || 'Unknown revert reason';
//         throw new Error(`Contract deployment reverted: ${revertReason}`);
//       }
//       throw new Error('Contract deployment failed: No contract address in receipt');
//     }

//     return receipt.outputs[0].contractAddress;
//   } catch (err) {
//     console.error('Deployment error:', err);
//     throw new Error(`Failed to deploy lottery: ${err.message}`);
//   }
// };
// Initialize the lottery 2
export const initializeLottery = async (
  thorClient,
  provider,
  walletInfo,
  lotteryAddress,
  lotteryABI,
  feeWallet
) => {
  try {
    // 1. Build the clause for the initialize function
    const clause = Clause.callFunction(
      lotteryAddress,
      new ABIFunction({
        name: 'initialize',
        inputs: [{ name: '_feeWallet', type: 'address' }],
        outputs: [],
        constant: false,
        payable: false,
        type: 'function',
      }),
      [feeWallet]
    );

    // 2. Estimate gas
    const gasResult = await thorClient.transactions.estimateGas([clause], walletInfo.address);

    // 3. Build the transaction body
    const txBody = await thorClient.transactions.buildTransactionBody(
      [clause],
      gasResult.totalGas
    );

    // 4. Get signer and sign the transaction
    const signer = await provider.getSigner(walletInfo.address);
    const rawSignedTx = await signer.signTransaction(
      {
        ...txBody,
        origin: walletInfo.address,
      }
    );

    // 5. Decode the signed transaction
    const signedTx = Transaction.decode(
      HexUInt.of(rawSignedTx.slice(2)).bytes,
      true
    );

    // 6. Send the transaction
    const sendTransactionResult = await thorClient.transactions.sendTransaction(signedTx);

    // 7. Wait for transaction receipt
    const receipt = await thorClient.transactions.waitForTransaction(sendTransactionResult.id);

    if (receipt.reverted) {
      throw new Error(`Initialization reverted: ${receipt.revertReason || 'Unknown reason'}`);
    }
    return sendTransactionResult.id;
  } catch (err) {
    throw new Error(`Failed to initialize lottery: ${err.message}`);
  }
};


// Approve the lottery contract to spend tokens
export const approveToken = async (
  thorClient,
  provider,
  walletInfo,
  tokenAddress,
  lotteryAddress,
  amount
) => {
  try {
    // 1. Build the clause for the approve function
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
      [lotteryAddress, amount]
    );

    // 2. Estimate gas
    const gasResult = await thorClient.transactions.estimateGas([clause], walletInfo.address);

    // 3. Build the transaction body
    const txBody = await thorClient.transactions.buildTransactionBody(
      [clause],
      gasResult.totalGas
    );

    // 4. Get signer and sign the transaction
    const signer = await provider.getSigner(walletInfo.address);
    const rawSignedTx = await signer.signTransaction({
      ...txBody,
      origin: walletInfo.address
    });

    // 5. Decode the signed transaction
    const signedTx = Transaction.decode(
      HexUInt.of(rawSignedTx.slice(2)).bytes,
      true
    );

    // 6. Send the transaction
    const sendTransactionResult = await thorClient.transactions.sendTransaction(signedTx);

    // 7. Wait for transaction receipt
    const receipt = await thorClient.transactions.waitForTransaction(sendTransactionResult.id);

    if (receipt.reverted) {
      throw new Error(`Approval reverted: ${receipt.revertReason || 'Unknown reason'}`);
    }
    return sendTransactionResult.id;
  } catch (err) {
    throw new Error(`Failed to approve tokens: ${err.message}`);
  }
};

export const enterLottery = async (
  thorClient,
  provider,
  walletInfo,
  lotteryAddress,
) => {
  try {
    // 1. Build the clause for the enter function
    const clause = Clause.callFunction(
      lotteryAddress,
      new ABIFunction({
        name: 'enter',
        inputs: [],
        outputs: [],
        constant: false,
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
      }),
      []
    );

    // --- SIMULATE THE TRANSACTION FIRST ---
    const simulation = await thorClient.transactions.simulateTransaction(
      [clause],
      { caller: walletInfo.address }
    );
    console.log(simulation)
    if (simulation[0].reverted) {
      // Try to decode the revert reason if available
      let revertReason = '';
      try {
        revertReason = thorClient.transactions.decodeRevertReason(simulation[0].data);
      } catch (err) {
        console.log(err)
        revertReason = 'Unknown reason';
      }
      throw new Error(`Simulation: Enter would revert: ${revertReason}`);
    }

    // 2. Estimate gas
    const gasResult = await thorClient.transactions.estimateGas([clause], walletInfo.address);

    // 3. Build the transaction body
    const txBody = await thorClient.transactions.buildTransactionBody(
      [clause],
      gasResult.totalGas
    );

    // 4. Get signer and sign the transaction
    const signer = await provider.getSigner(walletInfo.address);
    const rawSignedTx = await signer.signTransaction({
      ...txBody,
      origin: walletInfo.address
    });

    // 5. Decode the signed transaction
    const signedTx = Transaction.decode(
      HexUInt.of(rawSignedTx.slice(2)).bytes,
      true
    );

    // 6. Send the transaction
    const sendTransactionResult = await thorClient.transactions.sendTransaction(signedTx);

    // 7. Wait for transaction receipt
    const receipt = await thorClient.transactions.waitForTransaction(sendTransactionResult.id);

    if (receipt.reverted) {
      throw new Error(`Enter reverted: ${receipt.revertReason || 'Unknown reason'}`);
    }
    return sendTransactionResult.id;
  } catch (err) {
    throw new Error(`Failed to enter lottery: ${err.message}`);
  }
};

// // Enter the lottery
// export const enterLottery = async (
//   thorClient,
//   provider,
//   walletInfo,
//   lotteryAddress,
//   // lotteryABI
// ) => {
//   try {
//     // 1. Build the clause for the enter function
//     const clause = Clause.callFunction(
//       lotteryAddress,
//       new ABIFunction({
//         name: 'enter',
//         inputs: [],
//         outputs: [],
//         constant: false,
//         payable: false,
//         stateMutability: 'nonpayable',
//         type: 'function',
//       }),
//       []
//     );

//     // 2. Estimate gas
//     const gasResult = await thorClient.transactions.estimateGas([clause], walletInfo.address);

//     // 3. Build the transaction body
//     const txBody = await thorClient.transactions.buildTransactionBody(
//       [clause],
//       gasResult.totalGas
//     );

//     // 4. Get signer and sign the transaction
//     const signer = await provider.getSigner(walletInfo.address);
//     const rawSignedTx = await signer.signTransaction({
//       ...txBody,
//       origin: walletInfo.address
//     });

//     // 5. Decode the signed transaction
//     const signedTx = Transaction.decode(
//       HexUInt.of(rawSignedTx.slice(2)).bytes,
//       true
//     );
//     console.log('signedTx',signedTx)
//     // 6. Send the transaction
//     const sendTransactionResult = await thorClient.transactions.sendTransaction(signedTx);
//     console.log('send results',sendTransactionResult)
//     // 7. Wait for transaction receipt
//     const receipt = await thorClient.transactions.waitForTransaction(sendTransactionResult.id);
//     console.log('receipt', receipt)

//     if (receipt.reverted) {
//       throw new Error(`Enter reverted: ${receipt.revertReason || 'Unknown reason'}`);
//     }
//     return sendTransactionResult.id;
//   } catch (err) {
//     throw new Error(`Failed to enter lottery: ${err.message}`);
//   }
// };

export const getRevertReason = async (
  thorClient,
  transactionHash
) => {
  try {
      console.log(thorClient, transactionHash)
      const revertReason = await thorClient.transactions.getRevertReason(transactionHash);
      console.log(revertReason);
      return revertReason
  } catch (err) {
    throw new Error(`Failed to fetch revert reason: ${err.message}`);
  }
}

// Pick a winner from the lottery
export const pickWinner = async (
  thorClient,
  provider,
  walletInfo,
  lotteryAddress,
) => {
  try {
    // 1. Build the clause for the pickWinner function
    const clause = Clause.callFunction(
      lotteryAddress,
      new ABIFunction({
        name: 'pickWinner',
        inputs: [],
        outputs: [{ type: 'address' }],
        constant: false,
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
      }),
      []
    );
    // 2. Estimate gas
    const gasResult = await thorClient.transactions.estimateGas([clause], walletInfo.address);
    // 3. Build the transaction body
    const txBody = await thorClient.transactions.buildTransactionBody(
      [clause],
      gasResult.totalGas
    );
    // 4. Get signer and sign the transaction
    const signer = await provider.getSigner(walletInfo.address);
    const rawSignedTx = await signer.signTransaction({
      ...txBody,
      origin: walletInfo.address
    });
    // 5. Decode the signed transaction
    const signedTx = Transaction.decode(
      HexUInt.of(rawSignedTx.slice(2)).bytes,
      true
    );
    // 6. Send the transaction
    const sendTransactionResult = await thorClient.transactions.sendTransaction(signedTx);
    // 7. Wait for transaction receipt
    const receipt = await thorClient.transactions.waitForTransaction(sendTransactionResult.id);
    if (receipt.reverted) {
      throw new Error(`PickWinner reverted: ${receipt.revertReason || 'Unknown reason'}`);
    }
    
    return {
      transactionId: sendTransactionResult.id,
      receipt: receipt
    };
  } catch (err) {
    throw new Error(`Failed to pick winner: ${err.message}`);
  }
};

// Fetch lottery status
export const getLotteryStatus = async (thorClient, lotteryAddress, lotteryABI, decimals) => {
  try {
    // Correct order: address first, then ABI
    const lotteryContract = thorClient.contracts.load(lotteryAddress, lotteryABI);
    
    // Use .read instead of .call to access read functions
    const [playerCount, uniquePlayerCount, balance, lastWinner, lastWinningAmount] = await Promise.all([
      lotteryContract.read.getPlayerCount(),
      lotteryContract.read.getUniquePlayerCount(),
      lotteryContract.read.getBalance(),
      lotteryContract.read.getLastWinner(),
      lotteryContract.read.getLastWinningAmount(),
    ]);
    
    const formattedBalance = Math.floor(Number(balance) / 10 ** decimals);
    const formattedWinningAmount = Math.floor(Number(lastWinningAmount) / 10 ** decimals);
    return {
      playerCount: playerCount.toString(), // Total entries
      uniquePlayerCount: uniquePlayerCount.toString(), // Unique Players
      balance: formattedBalance.toString(),
      lastWinner: lastWinner,
      lastWinningAmount: formattedWinningAmount.toString(),
    };
  } catch (err) {
    throw new Error(`Failed to fetch lottery status: ${err.message}`);
  }
};

// src/services/lotteryService.js
export const pastWinner = async (thorClient, lotteryAddress, lotteryABI) => {
  try {
    const lotteryContract = thorClient.contracts.load(lotteryAddress, lotteryABI);
    const lastWinner = await lotteryContract.read.getLastWinner();
    return lastWinner; // Return the address directly
  } catch (err) {
    throw new Error(`Failed to fetch last winner: ${err.message}`);
  }
};

// Fetch win probability for a wallet
export const getWinProbability = async (thorClient, lotteryAddress, lotteryABI, walletAddress) => {
  try {
    const lotteryContract = thorClient.contracts.load(lotteryAddress, lotteryABI);
    
    // Call the getWinProbability function
    const probability = await lotteryContract.read.getWinProbability(walletAddress);
    
    // Convert to a readable percentage (e.g., 1234 -> 12.34%)
    const formattedProbability = (Number(probability) / 100).toFixed(2);
    
    return formattedProbability;
  } catch (err) {
    throw new Error(`Failed to fetch win probability: ${err.message}`);
  }
};

// ERC20 ABI for allowance and balanceOf functions
const erc20ABI = [
  {
    constant: true,
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
];

// Fetch the token allowance for a user
export const getTokenAllowance = async (thorClient, tokenAddress, owner, spender) => {
  try {
    const tokenContract = thorClient.contracts.load(tokenAddress, erc20ABI);
    const allowance = await tokenContract.read.allowance(owner, spender);
    return allowance; // Returns a BigInt or string (depending on SDK version)
  } catch (err) {
    throw new Error(`Failed to fetch token allowance: ${err.message}`);
  }
};


