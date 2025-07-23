import { ABIFunction, HexUInt, Transaction, Clause  } from '@vechain/sdk-core';

export const computeDisplayedWord = (word, guessedLetters) => {
  let display = '';
  for (const char of word) {
    const index = char.charCodeAt(0) - 'a'.charCodeAt(0);
    if (index < 0 || index > 25) {
      display += char; // Assume a-z, but fallback
    } else if (guessedLetters[index]) {
      display += char;
    } else {
      display += '_';
    }
  }
  return display;
};



export const getHangmanStatus = async (thorClient, hangmanAddress, hangABI, tokenAddress, tokenABI, decimals) => {
  try {
    const hangmanContract = thorClient.contracts.load(hangmanAddress, hangABI);
    const tokenContract = thorClient.contracts.load(tokenAddress, tokenABI);

    const [entryFee, tokenBalance] = await Promise.all([
      hangmanContract.read.entryFee(),
      tokenContract.read.balanceOf(hangmanAddress)
    ]);

    const formattedEntryFee = Math.floor(Number(entryFee) / 10 ** decimals);
    const formattedTokenBalance = Math.floor(Number(tokenBalance) / 10 ** decimals);

    return {
      entryFee: formattedEntryFee.toString(),
      tokenBalance: formattedTokenBalance.toString()
    };
  } catch (err) {
    throw new Error(`Failed to fetch hangman status: ${err.message}`);
  }
};


// Function to manually decode a string from ABI-encoded data
const decodeString = (data) => {
  // Remove '0x' prefix and extract string data
  const hex = data.slice(2);
  // Offset (32 bytes = 64 hex chars) for dynamic type (string)
  const offset = parseInt(hex.slice(0, 64), 16) * 2; // Convert to hex position
  const length = parseInt(hex.slice(offset, offset + 64), 16) * 2; // String length in bytes
  const stringData = hex.slice(offset + 64, offset + 64 + length);
  // Convert hex to ASCII
  let result = '';
  for (let i = 0; i < stringData.length; i += 2) {
    result += String.fromCharCode(parseInt(stringData.slice(i, i + 2), 16));
  }
  return result;
};
// Function to manually decode a uint256 from ABI-encoded data
const decodeUint256 = (data) => {
  // Remove '0x' prefix and take first 32 bytes (64 hex chars)
  const hex = data.slice(2);
  return BigInt(`0x${hex.slice(0, 64)}`).toString();
};

// ... other functions remain unchanged ...

export const getGameState = async (thorClient, hangmanAddress, hangABI, walletInfo) => {
  try {
    console.log('getGameState start', Date.now());
    const hangmanContract = thorClient.contracts.load(hangmanAddress, hangABI);

    // Read the public mapping games(address)
    const gameData = await hangmanContract.read.games(walletInfo.address);
    console.log("gamedata", gameData);
    const [word, wrongGuesses, active, player] = gameData;
    console.log("shows player", player);
    console.log('wrong', Number(wrongGuesses));
    console.log('active', active);

    let status = 'none';
    if (player && typeof player === 'string' && player.toLowerCase() !== '0x0000000000000000000000000000000000000000') {
      if (active) {
        status = 'ongoing';
      } else if (Number(wrongGuesses) >= 6) {
        status = 'lost';
      } else {
        status = 'won';
      }
    }
    console.log('determined status', status);

    let displayedWord = null;
    let wrongGuessesNum = Number(wrongGuesses);
    if (status === 'ongoing') {
      try {
        // Simulate getDisplayedWord with correct caller
        const getDisplayedWordFunc = new ABIFunction({
          name: 'getDisplayedWord',
          inputs: [],
          outputs: [{ type: 'string' }],
          constant: true,
          stateMutability: 'view',
          type: 'function',
        });
        const displayedClause = Clause.callFunction(hangmanAddress, getDisplayedWordFunc, []);
        const displayedSim = await thorClient.transactions.simulateTransaction([displayedClause], {
          caller: walletInfo.address,
        });
        console.log('displayedSim', displayedSim);
        if (displayedSim[0].reverted) {
          const revertReason = thorClient.transactions.decodeRevertReason(displayedSim[0].data) || 'Simulation failed';
          throw new Error(`getDisplayedWord reverted: ${revertReason}`);
        }
        // Manually decode the string
        displayedWord = decodeString(displayedSim[0].data);
        console.log('displayedWord', displayedWord);

        // Simulate getWrongGuesses with correct caller
        const getWrongGuessesFunc = new ABIFunction({
          name: 'getWrongGuesses',
          inputs: [],
          outputs: [{ type: 'uint256' }],
          constant: true,
          stateMutability: 'view',
          type: 'function',
        });
        const wrongClause = Clause.callFunction(hangmanAddress, getWrongGuessesFunc, []);
        const wrongSim = await thorClient.transactions.simulateTransaction([wrongClause], {
          caller: walletInfo.address,
        });
        console.log('wrongSim', wrongSim);
        if (wrongSim[0].reverted) {
          const revertReason = thorClient.transactions.decodeRevertReason(wrongSim[0].data) || 'Simulation failed';
          throw new Error(`getWrongGuesses reverted: ${revertReason}`);
        }
        // Manually decode the uint256
        wrongGuessesNum = Number(decodeUint256(wrongSim[0].data));
        console.log('wrongGuessesNum', wrongGuessesNum);
      } catch (err) {
        console.error('View function error:', err);
        if (err.message.includes('No active game')) {
          // Fallback: respect active state from gameData
          if (active) {
            status = 'ongoing';
            displayedWord = word.replace(/./g, '_'); // Mask the word as no letters guessed
            wrongGuessesNum = Number(wrongGuesses);
          } else {
            status = Number(wrongGuesses) >= 6 ? 'lost' : 'won';
            displayedWord = word;
            wrongGuessesNum = Number(wrongGuesses);
          }
        } else {
          throw err;
        }
      }
    } else if (status === 'won' || status === 'lost') {
      displayedWord = word;
      wrongGuessesNum = Number(wrongGuesses);
    }

    console.log('getGameState end', Date.now(), { active, displayedWord, wrongGuesses: wrongGuessesNum, status });
    return {
      active,
      displayedWord,
      wrongGuesses: wrongGuessesNum,
      status
    };
  } catch (err) {
    console.error('getGameState error:', err);
    throw new Error(`Failed to fetch game state: ${err.message}`);
  }
};




export const startGame = async (
  thorClient,
  provider,
  walletInfo,
  hangmanAddress,
  tokenAddress,
  tokenABI,
  hangABI
) => {
  try {
    const hangmanContract = thorClient.contracts.load(hangmanAddress, hangABI);
    const tokenContract = thorClient.contracts.load(tokenAddress, tokenABI);

    const entryFee = await hangmanContract.read.entryFee();
    const tokenBalance = await tokenContract.read.balanceOf(hangmanAddress);

    if (Number(tokenBalance) < Number(entryFee) * 2) {
      throw new Error('Contract has insufficient token balance for potential payout');
    }

    const allowance = await tokenContract.read.allowance(walletInfo.address, hangmanAddress);
    if (Number(allowance) < Number(entryFee)) {
      throw new Error('Insufficient allowance. Please approve tokens first.');
    }

    const startFunction = new ABIFunction({
      name: 'startGame',
      inputs: [],
      outputs: [],
      constant: false,
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function',
    });

    const clause = Clause.callFunction(hangmanAddress, startFunction, []);

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

    const gameState = await getGameState(thorClient, hangmanAddress, hangABI, walletInfo);

    return {
      txID: sendTransactionResult.id,
      gameState
    };
  } catch (err) {
    console.error('StartGame error:', err);
    throw new Error(`Failed to start game: ${err.message}`);
  }
};

export const guessLetter = async (
  thorClient,
  provider,
  walletInfo,
  hangmanAddress,
  tokenABI,
  hangABI,
  letter
) => {
  try {
    if (letter.length !== 1 || !/[a-z]/.test(letter)) {
      throw new Error('Invalid letter: must be a single lowercase letter a-z');
    }

    const hexLetter = `0x${letter.charCodeAt(0).toString(16).padStart(2, '0')}`;

    const guessFunction = new ABIFunction({
      name: 'guessLetter',
      inputs: [
        { name: 'letter', type: 'bytes1' }
      ],
      outputs: [],
      constant: false,
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function',
    });

    const clause = Clause.callFunction(hangmanAddress, guessFunction, [hexLetter]);

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

    const gameState = await getGameState(thorClient, hangmanAddress, hangABI, walletInfo);

    return {
      txID: sendTransactionResult.id,
      gameState
    };
  } catch (err) {
    console.error('GuessLetter error:', err);
    throw new Error(`Failed to guess letter: ${err.message}`);
  }
};

export const depositTokens = async (
  thorClient,
  provider,
  walletInfo,
  tokenAddress,
  hangmanAddress,
  tokenABI,
  hangABI,
  amount
) => {
  try {
    const tokenContract = thorClient.contracts.load(tokenAddress, tokenABI);
    const hangmanContract = thorClient.contracts.load(hangmanAddress, hangABI);

    const callerBalance = await tokenContract.read.balanceOf(walletInfo.address);
    if (Number(callerBalance) < Number(amount)) {
      throw new Error(`Insufficient token balance: ${callerBalance} < ${amount}`);
    }

    const allowance = await tokenContract.read.allowance(walletInfo.address, hangmanAddress);
    if (Number(allowance) < Number(amount)) {
      throw new Error(`Insufficient allowance: ${allowance} < ${amount}. Please approve tokens first.`);
    }

    const clause = Clause.callFunction(
      hangmanAddress,
      new ABIFunction({
        name: 'depositTokens',
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
    console.error('DepositTokens error:', err);
    throw new Error(`Failed to deposit tokens: ${err.message}`);
  }
};

export const withdrawTokens = async (
  thorClient,
  provider,
  walletInfo,
  tokenAddress,
  hangmanAddress,
  tokenABI,
  hangABI,
  amount
) => {
  try {
    const clause = Clause.callFunction(
      hangmanAddress,
      new ABIFunction({
        name: 'withdrawTokens',
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
    console.error('WithdrawTokens error:', err);
    throw new Error(`Failed to withdraw tokens: ${err.message}`);
  }
};

export const approveToken = async (
  thorClient,
  provider,
  walletInfo,
  tokenAddress,
  hangmanAddress,
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
      [hangmanAddress, amount]
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
