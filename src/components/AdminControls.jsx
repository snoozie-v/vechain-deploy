import { useContext, useState, useEffect } from 'react';
import { VeChainContext } from '../context/VeChainContext';
import { pastWinner, initializeLottery, pickWinner } from '../services/lotteryService';
import lotteryABI from '../components/lotteryABI';

const AdminControls = ({ lotteryAddress }) => {
  const { thorClient, provider, walletInfo } = useContext(VeChainContext);
  const [output, setOutput] = useState('Output will appear here');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [feeWalletInput, setFeeWalletInput] = useState('');
  const [isPicking, setIsPicking] = useState(false)

useEffect(() => {
  const checkOwner = async () => {
    if (!thorClient || !walletInfo || !lotteryAddress) {
      return;
    }
    try {
      const lotteryContract = thorClient.contracts.load(lotteryAddress, lotteryABI);
      const owner = await lotteryContract.read.owner();

      // Ensure owner is a string
      const formattedOwner = typeof owner === 'string' ? owner.toLowerCase() : String(owner).toLowerCase();
      const formattedWalletInfo = walletInfo.address.toLowerCase();
      setIsOwner(formattedOwner === formattedWalletInfo);
    } catch (err) {
      console.error('Error checking owner:', err.message, err.stack);
    }
  };
  checkOwner();
}, [thorClient, walletInfo, lotteryAddress]);

  const handleInitialize = async () => {
        if (!thorClient || !provider || !walletInfo) {
        setOutput('Missing required context');
        return;
        }
        if (!feeWalletInput.match(/^0x[a-fA-F0-9]{40}$/)) {
        setOutput('Invalid fee wallet address');
        return;
        }
        setIsInitializing(true);
        try {
        const txID = await initializeLottery(
            thorClient,
            provider,
            walletInfo,
            lotteryAddress,
            lotteryABI,
            feeWalletInput
        );
        setOutput(`Lottery initialized: ${txID}`);
        } catch (err) {
        setOutput(`Initialization error: ${err.message}`);
        } finally {
        setIsInitializing(false);
        }
    }

    const handlePickWinner = async () => {
    if (!thorClient || !provider || !walletInfo) {
        setOutput('Missing required context');
        return;
    }
    setIsPicking(true);
    try {
        // Call pickWinner transaction
        const txResponse = await pickWinner(thorClient, provider, walletInfo, lotteryAddress);
        const txID = txResponse.transactionId; // Extract the transactionId string
        // Wait for transaction confirmation
        await thorClient.transactions.waitForTransaction(txID);
        // Fetch last winner
        const lastWinner = await pastWinner(thorClient, lotteryAddress, lotteryABI);
        setOutput(`Picked winner: ${lastWinner}`);
    } catch (err) {
        setOutput(`Error: ${err.message}`);
        console.error(err);
    } finally {
        setIsPicking(false);
    }
    };
    return (
        <>
            {isOwner && (
                <div>
                    <div>
                        <h3>Admin Controls</h3>
                        <div>
                        <button
                            onClick={handlePickWinner}
                            disabled={!thorClient || !walletInfo || isInitializing || isPicking}
                        >
                            {isPicking ? 'Picking Winner...' : 'Pick Winner'}
                        </button>
                    </div><br />
                        <input
                            type="text"
                            placeholder="Fee Wallet Address (0x...)"
                            value={feeWalletInput}
                            onChange={(e) => setFeeWalletInput(e.target.value)}
                            disabled={isInitializing}
                        />
                        <button
                            onClick={handleInitialize}
                            disabled={!thorClient || !walletInfo || isInitializing}
                        >
                            {isInitializing ? 'Initializing...' : 'Initialize Lottery'}
                        </button>
                    </div>


                    {output && <p>{output}</p>}
                </div>
            )}
        </>
    );

}

export default AdminControls
