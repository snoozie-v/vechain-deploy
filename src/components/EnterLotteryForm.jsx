import { useContext, useState, useEffect } from 'react';
import { VeChainContext } from '../context/VeChainContext';
import { approveToken, enterLottery, getWinProbability, getTokenAllowance } from '../services/lotteryService';
import lotteryABI from '../components/lotteryABI';

const EnterLotteryForm = ({ lotteryAddress, tokenAddress, onEnterSuccess }) => {
  const { thorClient, provider, walletInfo } = useContext(VeChainContext);
  const [output, setOutput] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [isCheckingAllowance, setIsCheckingAllowance] = useState(false);
  const [winProbability, setWinProbability] = useState(null);
  const [allowance, setAllowance] = useState(null);
  const [isAllowanceLoading, setIsAllowanceLoading] = useState(false);

  const APPROVAL_AMOUNT = 100_000_000_000_000_000_000_000n; // 10000 tokens with 18 decimals
  const ENTRY_AMOUNT = 10_000_000_000_000_000_000_000n; // 1 token with 18 decimals (from contract)

  // Fetch win probability and allowance when component mounts or dependencies change
  useEffect(() => {
    const fetchData = async () => {
      if (!thorClient || !walletInfo || !lotteryAddress || !tokenAddress) return;

      setIsAllowanceLoading(true);
      try {
        // Fetch win probability
        const probability = await getWinProbability(thorClient, lotteryAddress, lotteryABI, walletInfo.address);
        setWinProbability(probability);

        // Fetch token allowance
        const allowance = await getTokenAllowance(thorClient, tokenAddress, walletInfo.address, lotteryAddress);
        setAllowance(BigInt(allowance)); // Convert to BigInt for comparison
      } catch (err) {
        console.error('Failed to fetch data:', err.message);
        // Check for the specific "No players in the lottery" error
        if (err.message.includes('No players in the lottery')) {
          setOutput('No players in the lottery yet');
          setWinProbability(null);
        } else {
          setOutput(`Error fetching data: ${err.message}`);
          setWinProbability(null);
        }
        setAllowance(null);
      } finally {
        setIsAllowanceLoading(false);
      }
    };


    fetchData();
  }, [thorClient, walletInfo, lotteryAddress, tokenAddress]);

  const handleCheckAllowance = async () => {
    if (!thorClient || !walletInfo || !lotteryAddress || !tokenAddress) {
      setOutput('Missing required context');
      return;
    }
    setIsCheckingAllowance(true);
    try {
      const allowance = await getTokenAllowance(thorClient, tokenAddress, walletInfo.address, lotteryAddress);
      setAllowance(BigInt(allowance));
      setOutput(`Approval checked: ${(Number(allowance) / 10 ** 18).toFixed(2)} SHT approved`);
    } catch (err) {
      setOutput(`Error checking approval: ${err.message}`);
    } finally {
      setIsCheckingAllowance(false);
    }
  };

  const handleApprove = async () => {
    if (!thorClient || !provider || !walletInfo) {
      setOutput('Missing required context');
      return;
    }
    setIsApproving(true);
    try {
      const txID = await approveToken(
        thorClient,
        provider,
        walletInfo,
        tokenAddress,
        lotteryAddress,
        APPROVAL_AMOUNT
      );
      setOutput(`Approval successful: ${txID}`);
      // Refresh allowance after approval
      const newAllowance = await getTokenAllowance(thorClient, tokenAddress, walletInfo.address, lotteryAddress);
      setAllowance(BigInt(newAllowance));
    } catch (err) {
      setOutput(`Approval error: ${err.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  const handleEnter = async () => {
    if (!thorClient || !provider || !walletInfo) {
      setOutput('Missing required context');
      return;
    }
    setIsEntering(true);
    try {
      const txID = await enterLottery(thorClient, provider, walletInfo, lotteryAddress, lotteryABI);
      setOutput(`Entered lottery: ${txID}`);
      onEnterSuccess(); // Trigger status refresh in LotteryStatus

      // Refresh win probability and allowance after entering
      const probability = await getWinProbability(thorClient, lotteryAddress, lotteryABI, walletInfo.address);
      setWinProbability(probability);
      const newAllowance = await getTokenAllowance(thorClient, tokenAddress, walletInfo.address, lotteryAddress);
      setAllowance(BigInt(newAllowance));
    } catch (err) {
      setOutput(`Enter error: ${err.message}`);
    } finally {
      setIsEntering(false);
    }
  };

  // Format allowance for display (convert from 18 decimals to whole tokens)
  const formattedAllowance = allowance !== null ? (Number(allowance) / 10 ** 18).toFixed(2) : '0.00';

  // Determine if approval is needed
  const needsApproval = allowance === null || allowance < ENTRY_AMOUNT;

  return (
    <div>
      <h2>Enter Lottery</h2>

      <div>
        <button
          onClick={handleCheckAllowance}
          disabled={!thorClient || !walletInfo || isCheckingAllowance || isApproving || isEntering}
        >
          {isCheckingAllowance ? 'Checking...' : 'Check Approval'}
        </button>
      </div>
      {isAllowanceLoading ? (
        <p>Loading allowance...</p>
      ) : (
        allowance !== null && <p>Approved tokens: {formattedAllowance} SHT</p>
      )}

      {needsApproval ? (
        <button
          onClick={handleApprove}
          disabled={!thorClient || !walletInfo || isApproving || isEntering || isCheckingAllowance}
        >
          {isApproving ? 'Approving...' : `Approve ${APPROVAL_AMOUNT / 10n ** 18n} SHT`}
        </button>
      ) : (
        <button
          onClick={handleEnter}
          disabled={!thorClient || !walletInfo || isApproving || isEntering || isCheckingAllowance}
        >
          {isEntering ? 'Entering...' : 'Enter Lottery (10,000 SHT)'}
        </button>
      )}

      {winProbability !== null && (
        <p>Your win probability: {winProbability}%</p>
      )}
      {output && <p>{output}</p>}
    </div>
  );
};

export default EnterLotteryForm;
