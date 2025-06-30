// Displays lottery state (players, prize)
import { useContext, useEffect, useState } from 'react';
import { VeChainContext } from '../context/VeChainContext';
import { getLotteryStatus } from '../services/lotteryService';
import lotteryABI from '../components/lotteryABI';

const LotteryStatus = ({ lotteryAddress, statusTrigger, decimals }) => {
  const { thorClient } = useContext(VeChainContext);
  const [status, setStatus] = useState({
    playerCount: '0',
    uniquePlayerCount: '0',
    balance: '0',
    lastWinner: '0x0',
    lastWinningAmount: '0',
  });
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    if (!thorClient || !lotteryAddress) {
      setError('Missing required context or lottery address');
      return;
    }
    try {
      const data = await getLotteryStatus(thorClient, lotteryAddress, lotteryABI, decimals);
      setStatus(data);
      setError('');
    } catch (err) {
      setError(`Error fetching status: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [thorClient, lotteryAddress, statusTrigger]);

  return (
    <div>
      <h2>Lottery Status</h2>
      {error ? (
        <p>{error}</p>
      ) : (
        <div>
          <p><strong>Entry Count:</strong> {status.playerCount}</p>
          <p><strong>Unique Players:</strong> {status.uniquePlayerCount}</p>
          <p><strong>Current Prize Balance:</strong> {status.balance * .9} SHT</p>
          <p><strong>Current Burn Balance:</strong> {status.balance * .1} SHT</p>
          <p><strong>Last Winner:</strong> {status.lastWinner}</p>
          <p><strong>Last Winning Amount:</strong> {status.lastWinningAmount} SHT</p>
          <p><strong>Last Burn Amount:</strong> {(status.lastWinningAmount / .9)-status.lastWinningAmount} SHT</p>
        </div>
      )}
      {/* <button onClick={fetchStatus}>Refresh Status</button> */}
    </div>
  );
};

export default LotteryStatus;
