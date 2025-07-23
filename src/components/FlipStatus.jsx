import { useContext, useState, useEffect } from "react";
import { VeChainContext } from "../context/VeChainContext";
import flipABI from "../abis/flipABI";
import shtABI from "../abis/shtABI";
import { getFlipStatus, playFlip, approveToken, depositFunds, withdrawFunds } from "../services/flipService";

const FlipStatus = ({ flipAddress, tokenAddress, decimals }) => {
  const { thorClient, provider, walletInfo } = useContext(VeChainContext);
  const [status, setStatus] = useState({
    houseBalance: "0",
    tokenBalance: "0",
  });
  const [playAMT, setPlayAMT] = useState("");
  const [error, setError] = useState("");
  const [output, setOutput] = useState("");
  const [choice, setChoice] = useState(true); // Default to heads
  const APPROVAL_AMOUNT = "100000000000000000000000"; // 100000 tokens with 18 decimals
  const DEPOSIT_AMOUNT = "1000000000000000000000"; // 100 tokens with 18 decimals
  const MIN_WAGER = 1; // 1 token
  const MAX_WAGER = 100; // 100 tokens

  const fetchStatus = async () => {
    if (!thorClient || !flipAddress || !tokenAddress) {
      setError("Missing required context or addresses");
      return;
    }
    try {
      const data = await getFlipStatus(thorClient, flipAddress, flipABI, tokenAddress, shtABI, decimals);
      setStatus(data);
      setError("");
    } catch (err) {
      setError(`Error fetching status: ${err.message}`);
    }
  };

  const approvePlay = async () => {
    if (!thorClient || !provider || !walletInfo || !tokenAddress || !flipAddress) {
      setError("Missing required context or addresses");
      return;
    }
    try {
      const txID = await approveToken(thorClient, provider, walletInfo, tokenAddress, flipAddress, APPROVAL_AMOUNT);
      setOutput(`Approval successful: ${txID}`);
      setError("");
    } catch (err) {
      setError(`Error approving tokens: ${err.message}`);
    }
  };

  const handlePlay = async () => {
    if (!thorClient || !provider || !walletInfo || !flipAddress || !tokenAddress) {
      setError("Missing required context or addresses");
      return;
    }
    // Validate wager input
    const wager = parseFloat(playAMT);
    if (isNaN(wager) || wager <= 0) {
      setError("Please enter a valid wager amount");
      return;
    }
    if (wager < MIN_WAGER) {
      setError(`Wager must be at least ${MIN_WAGER} tokens`);
      return;
    }
    if (wager > MAX_WAGER) {
      setError(`Wager must not exceed ${MAX_WAGER} tokens`);
      return;
    }
    // Convert wager to wei (18 decimals)
    const wagerInWei = BigInt(Math.floor(wager * 10 ** decimals)).toString();
    try {
      const { txID, result, payout } = await playFlip(
        thorClient,
        provider,
        walletInfo,
        flipAddress,
        tokenAddress,
        shtABI,
        flipABI,
        choice,
        wagerInWei
      );
      const outcome = result ? "Won" : "Lost";
      const payoutTokens = (Number(payout) / 10 ** decimals).toFixed(2);
      setOutput(
        <span style={{ color: result ? "green" : "red" }}>
          Play successful: {txID} (Chose {choice ? "Heads" : "Tails"}, Wager: {wager} tokens, {outcome}, Payout: {payoutTokens} tokens)
        </span>
      );
      setError("");
      await fetchStatus(); // Refresh balances after play
    } catch (err) {
      setError(`Error playing: ${err.message}`);
    }
  };

  const handleDeposit = async () => {
    if (!thorClient || !provider || !walletInfo || !tokenAddress || !flipAddress) {
      setError("Missing required context or addresses");
      return;
    }
    try {
      const txID = await depositFunds(
        thorClient,
        provider,
        walletInfo,
        tokenAddress,
        flipAddress,
        shtABI,
        flipABI,
        DEPOSIT_AMOUNT
      );
      setOutput(`Deposit successful: ${txID}`);
      setError("");
      await fetchStatus(); // Refresh balances after deposit
    } catch (err) {
      setError(`Error depositing funds: ${err.message}`);
    }
  };

    const handleWithdraw = async () => {
    if (!thorClient || !provider || !walletInfo || !tokenAddress || !flipAddress) {
      setError("Missing required context or addresses");
      return;
    }
    try {
      const txID = await withdrawFunds(
        thorClient,
        provider,
        walletInfo,
        tokenAddress,
        flipAddress,

      );
      setOutput(`Withdrawal successful: ${txID}`);
      setError("");
      await fetchStatus(); // Refresh balances after withdrawal
    } catch (err) {
      setError(`Error withdrawing funds: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [thorClient, flipAddress, tokenAddress]);

  const isValidWager = () => {
    const wager = parseFloat(playAMT);
    return !isNaN(wager) && wager >= MIN_WAGER && wager <= MAX_WAGER;
  };

  return (
    <div>
      <h2>Flippin SHT</h2>
      {error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : (
        <div>
          <p>
            <strong>SHT Balance:</strong> {status.tokenBalance} tokens
          </p>
        </div>
      )}
      <div>
        <label>
          Wager Amount (tokens):
          <input
            type="number"
            step="0.1"
            min={MIN_WAGER}
            max={MAX_WAGER}
            value={playAMT}
            onChange={(e) => setPlayAMT(e.target.value)}
            placeholder={`Enter wager (${MIN_WAGER} - ${MAX_WAGER} tokens)`}
          />
        </label>
      </div>
      <div>
        <label>
          <input
            type="radio"
            checked={choice === true}
            onChange={() => setChoice(true)}
          />
          Heads
        </label>
        <label>
          <input
            type="radio"
            checked={choice === false}
            onChange={() => setChoice(false)}
          />
          Tails
        </label>
      </div>
      <button onClick={fetchStatus}>Refresh Status</button>
      <button onClick={approvePlay}>Approve Play</button>
      <button onClick={handlePlay} disabled={!isValidWager()}>
        Play
      </button>
      <button onClick={handleDeposit}>Deposit</button>
      <button onClick={handleWithdraw}>Withdraw</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {output && <p>{output}</p>}
    </div>
  );
};

export default FlipStatus;
