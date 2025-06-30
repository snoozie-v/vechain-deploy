import { useContext, useState } from "react";
import { VeChainContext } from "../context/VeChainContext";
import {getTokenBalance} from "../services/tokenService";
import shtABI from "../components/shtABI";
import { getRevertReason } from "../services/lotteryService";


const Testing = ({tokenAddress}) => {
    const { thorClient } = useContext(VeChainContext);
    const [output, setOutput] = useState("Output will appear here");
    const [walletInput, setWalletInput] = useState(""); // State for wallet address input
    const [decimals, setDecimals] = useState(null); // State for token decimals
    const [transactionHash, setTransactionHash] = useState("")

    const getBlock = async () => {
    if (!thorClient) return setOutput("ThorClient not initialized");
    try {
      const block = await thorClient.blocks.getBestBlockCompressed();
      setOutput(block ? `Block Number: ${block.number}` : "No block found");
    } catch (err) {
      setOutput(`Error fetching block: ${err.message}`);
    }
  };

    // Updated function to check token balance without decimals
  const checkTokenBalance = async () => {
    if (!thorClient) {
      setOutput("ThorClient not initialized");
      return;
    }
    if (!walletInput || !/^0x[a-fA-F0-9]{40}$/.test(walletInput)) {
      setOutput("Please enter a valid wallet address");
      return;
    }
    if (decimals === null) {
      setOutput("Please fetch token decimals first by clicking 'Get Token Decimals'");
      return;
    }
    try {
      const balance = await getTokenBalance(
        thorClient,
        tokenAddress,
        shtABI,
        walletInput
      );
      // Convert balance to whole number by dividing by 10^decimals and truncating decimals
      const formattedBalance = Math.floor(Number(balance) / 10 ** decimals);
      setOutput(`Token balance for ${walletInput}: ${formattedBalance} SHT`);
    } catch (err) {
      setOutput(`Error fetching balance: ${err.message}`);
    }
  };
  const handleRevertReason = async () => {
    try {
      const reason = await getRevertReason(
        thorClient,
        transactionHash
      )
      setOutput(reason)
      console.log(reason)
    } catch (err) {
      setOutput(`Error fetching reason ${err.message}`)
    }
    
  }
    // New function to fetch token decimals
  const getTokenDecimals = async () => {
    if (!thorClient) {
      setOutput("ThorClient not initialized");
      return;
    }
    try {
      // Create a contract instance using thorClient
      const contract = thorClient.contracts.load(
        tokenAddress,
        shtABI
      );
      // Call the decimals function
      const result = await contract.read.decimals();
      const decimalsValue = Number(result[0]); // Convert to number
      setDecimals(decimalsValue);
      setOutput(`Token decimals: ${decimalsValue}`);
    } catch (err) {
      setOutput(`Error fetching decimals: ${err.message}`);
    }
  };

    return (
        <div>
            <h3>Testing</h3>
            <button onClick={getBlock}>Get Block Number</button>
            <button onClick={getTokenDecimals}>Get Decimals</button>
            <div>
                <input 
                type="text"
                placeholder="enter transaction hash"
                value={transactionHash}
                onChange={(e) => setTransactionHash(e.target.value)}
                style={{ margin: "10px", padding: "5px", width: "300px" }}
                />
                <button onClick={handleRevertReason}> Get Revert Reason</button>
            </div>
            <div>
                <input
                type="text"
                placeholder="Enter wallet address"
                value={walletInput}
                onChange={(e) => setWalletInput(e.target.value)}
                style={{ margin: "10px", padding: "5px", width: "300px" }}
                />
                <button onClick={checkTokenBalance}>Get Token Balance</button>
            </div>

            {output && <p>{output}</p>}
        </div>
    )
}

export default Testing
