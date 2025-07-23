// HangMan.jsx
import { useContext, useState, useEffect } from "react";
import { VeChainContext } from "../context/VeChainContext";
import hangABI from "../abis/hangManABI";
import shtABI from "../abis/shtABI";
import { getHangmanStatus, getGameState, startGame, guessLetter, approveToken, depositTokens, withdrawTokens } from "../services/hangManService";

const HangMan = ({ hangManAddress, tokenAddress, decimals }) => {
  const { thorClient, provider, walletInfo } = useContext(VeChainContext);
  const [status, setStatus] = useState({
    entryFee: "0",
    tokenBalance: "0",
  });
  const [game, setGame] = useState({
    active: false,
    displayedWord: null,
    wrongGuesses: 0,
    status: 'none',
  });
  const [letter, setLetter] = useState("");
  const [withdrawAMT, setWithdrawAMT] = useState("");
  const [error, setError] = useState("");
  const [output, setOutput] = useState("");
  const APPROVAL_AMOUNT = "100000000000000000000000"; // 100000 tokens with 18 decimals
  const DEPOSIT_AMOUNT = "1000000000000000000000"; // 1000 tokens with 18 decimals
  const MIN_WITHDRAW = 1; // 1 token
  const MAX_WITHDRAW = 10000; // 10000 tokens
  console.log(thorClient, hangManAddress, tokenAddress)
  const fetchStatus = async () => {
    if (!thorClient || !hangManAddress || !tokenAddress) {
      setError("Missing required context or addresses");
      return;
    }
    try {
      const data = await getHangmanStatus(thorClient, hangManAddress, hangABI, tokenAddress, shtABI, decimals);
      setStatus(data);
      const gameData = await getGameState(thorClient, hangManAddress, hangABI, walletInfo);
      console.log('fetchstatus gameData:', gameData)
      setGame(gameData);
      setError("");
    } catch (err) {
      setError(`Error fetching status: ${err.message}`);
    }
  };

  const approvePlay = async () => {
    if (!thorClient || !provider || !walletInfo || !tokenAddress || !hangManAddress) {
      setError("Missing required context or addresses");
      return;
    }
    try {
      const txID = await approveToken(thorClient, provider, walletInfo, tokenAddress, hangManAddress, APPROVAL_AMOUNT);
      setOutput(`Approval successful: ${txID}`);
      setError("");
    } catch (err) {
      setError(`Error approving tokens: ${err.message}`);
    }
  };

  const handleStart = async () => {
    if (!thorClient || !provider || !walletInfo || !hangManAddress || !tokenAddress) {
      setError("Missing required context or addresses");
      return;
    }
    try {
      const { txID, gameState } = await startGame(
        thorClient,
        provider,
        walletInfo,
        hangManAddress,
        tokenAddress,
        shtABI,
        hangABI
      );
      setGame(gameState);
      setOutput(`Game started: ${txID}`);
      setError("");
      await fetchStatus();
    } catch (err) {
      setError(`Error starting game: ${err.message}`);
    }
  };

  const handleGuess = async () => {
    if (!thorClient || !provider || !walletInfo || !hangManAddress || !tokenAddress) {
      setError("Missing required context or addresses");
      return;
    }
    if (!/^[a-z]$/.test(letter)) {
      setError("Please enter a single lowercase letter a-z");
      return;
    }
    try {
      const { txID, gameState } = await guessLetter(
        thorClient,
        provider,
        walletInfo,
        hangManAddress,
        shtABI,
        hangABI,
        letter
      );
      setGame(gameState);
      let msg = `Guessed ${letter}: ${txID}`;
      if (gameState.status !== 'ongoing') {
        const outcome = gameState.status;
        msg = (
          <span style={{ color: outcome === "won" ? "green" : "red" }}>
            {msg} (Game {outcome}{outcome === "won" ? ", Payout: 2 tokens" : ""})
          </span>
        );
      }
      setOutput(msg);
      setLetter("");
      setError("");
      await fetchStatus();
    } catch (err) {
      setError(`Error guessing letter: ${err.message}`);
    }
  };

  const handleDeposit = async () => {
    if (!thorClient || !provider || !walletInfo || !tokenAddress || !hangManAddress) {
      setError("Missing required context or addresses");
      return;
    }
    try {
      const txID = await depositTokens(
        thorClient,
        provider,
        walletInfo,
        tokenAddress,
        hangManAddress,
        shtABI,
        hangABI,
        DEPOSIT_AMOUNT
      );
      setOutput(`Deposit successful: ${txID}`);
      setError("");
      await fetchStatus();
    } catch (err) {
      setError(`Error depositing funds: ${err.message}`);
    }
  };

  const handleWithdraw = async () => {
    if (!thorClient || !provider || !walletInfo || !tokenAddress || !hangManAddress) {
      setError("Missing required context or addresses");
      return;
    }
    const withdraw = parseFloat(withdrawAMT);
    if (isNaN(withdraw) || withdraw <= 0) {
      setError("Please enter a valid withdraw amount");
      return;
    }
    if (withdraw < MIN_WITHDRAW) {
      setError(`Withdraw must be at least ${MIN_WITHDRAW} tokens`);
      return;
    }
    if (withdraw > MAX_WITHDRAW) {
      setError(`Withdraw must not exceed ${MAX_WITHDRAW} tokens`);
      return;
    }
    const withdrawInWei = BigInt(Math.floor(withdraw * 10 ** decimals)).toString();
    try {
      const txID = await withdrawTokens(
        thorClient,
        provider,
        walletInfo,
        tokenAddress,
        hangManAddress,
        shtABI,
        hangABI,
        withdrawInWei
      );
      setOutput(`Withdrawal successful: ${txID}`);
      setError("");
      await fetchStatus();
    } catch (err) {
      setError(`Error withdrawing funds: ${err.message}`);
    }
  };

//   useEffect(() => {
//     fetchStatus();
//     const interval = setInterval(fetchStatus, 30000);
//     return () => clearInterval(interval);
//   }, [thorClient, hangmanAddress, tokenAddress]);

  const isValidWithdraw = () => {
    const withdraw = parseFloat(withdrawAMT);
    return !isNaN(withdraw) && withdraw >= MIN_WITHDRAW && withdraw <= MAX_WITHDRAW;
  };

  const getGameStatusDisplay = () => {
    if (game.status === 'none') return "No game started";
    if (game.status === 'ongoing') return "Ongoing";
    return game.status.charAt(0).toUpperCase() + game.status.slice(1);
  };

  return (
    <div>
      <h2>Hanging SHT</h2>
      {error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : (
        <div>
          <p>
            <strong>Entry Fee:</strong> {status.entryFee} tokens
          </p>
          <p>
            <strong>SHT Balance:</strong> {status.tokenBalance} tokens
          </p>
          <p>
            <strong>Game Status:</strong> {getGameStatusDisplay()}
          </p>
          {(game.status === 'won' || game.status === 'lost') && (
            <>
              <p>
                <strong>Word was:</strong> {game.displayedWord}
              </p>
              <p>
                <strong>Wrong Guesses:</strong> {game.wrongGuesses}/6
              </p>
            </>
          )}
          {game.status === 'ongoing' && (
            <>
              <p>
                <strong>Word:</strong> {game.displayedWord}
              </p>
              <p>
                <strong>Wrong Guesses:</strong> {game.wrongGuesses}/6
              </p>
              <input
                type="text"
                maxLength="1"
                value={letter}
                onChange={(e) => setLetter(e.target.value.toLowerCase())}
                placeholder="Enter a letter"
              />
              <button onClick={handleGuess}>Guess</button>
            </>
          )}
          {game.status !== 'ongoing' && (
            <button onClick={handleStart}>Start Game</button>
          )}
        </div>
      )}
      <button onClick={fetchStatus}>Refresh Status</button>
      <button onClick={approvePlay}>Approve Play</button>
      <button onClick={handleDeposit}>Deposit</button>
      <div>
        <label>
          Withdraw Amount (tokens):
          <input
            type="number"
            step="0.1"
            min={MIN_WITHDRAW}
            max={MAX_WITHDRAW}
            value={withdrawAMT}
            onChange={(e) => setWithdrawAMT(e.target.value)}
            placeholder={`Enter amount (${MIN_WITHDRAW} - ${MAX_WITHDRAW} tokens)`}
          />
        </label>
      </div>
      <button onClick={handleWithdraw} disabled={!isValidWithdraw()}>
        Withdraw
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {output && <p>{output}</p>}
    </div>
  );
};

export default HangMan;
