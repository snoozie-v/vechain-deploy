import { useContext, useState } from "react";
import { VeChainContext } from "../context/VeChainContext";
import {deployLottery} from "../services/lotteryService"
import lotteryABI from "../components/lotteryABI"; // Import lottery ABI
import lotteryBytecode from "../components/lotteryBytecode"; // Import lottery bytecode
import {deployToken,transferToken,getTokenBalance } from "../services/tokenService";
import shtByte from "../components/shtByte";
import shtABI from "../components/shtABI";

const Deployment = ({tokenAddress}) => {
  const { thorClient, walletInfo, provider } = useContext(VeChainContext);
  const [output, setOutput] = useState("Contract Address will appear here");


  const deploySHT = async () => {
    try {
      const address = await deployToken(
        thorClient,
        provider,
        walletInfo,
        shtABI,
        shtByte
      );
      // setTokenAddress(address);
      setOutput(`SHT deployed at: ${address}`);
      await transferToken(
        thorClient,
        provider,
        walletInfo,
        address,
        shtABI,
        "0x137a3F23e0227D09404B077CAAD2ec4f7e9B67f1",
        20000000000000000000000n
      );
      const balance = await getTokenBalance(
        thorClient,
        address,
        shtABI,
        walletInfo.address
      );
      setOutput(`SHT deployed at: ${address}, Deployer balance: ${balance}`);
    } catch (err) {
      setOutput(`Error deploying SHT: ${err.message}`);
    }
  };

  const deployLotteryContract = async () => {
    console.log('thorclient', thorClient)
    if (!thorClient || !provider || !walletInfo) {
      
      setOutput("Missing required context for deployment");
      return;
    }
    if (!tokenAddress) {
      setOutput("Token contract must be deployed first");
      return;
    }
    try {
      const address = await deployLottery(
        thorClient,
        provider,
        walletInfo,
        lotteryABI,
        lotteryBytecode
      );
      console.log(address);
      // setLotteryAddress(address); // Store lottery address
      setOutput(`Lottery deployed at: ${address}`);
    } catch (err) {
      setOutput(`Error deploying Lottery: ${err.message}`);
    }
  };


return (
    <div>
        <h3>Token Deployment</h3>
        <button onClick={deploySHT} disabled={!thorClient || !walletInfo?.privateKey}>
        Deploy SHT
      </button>
      <button
        onClick={deployLotteryContract}
        disabled={!thorClient || !walletInfo?.privateKey}
      >
        Deploy Lottery
      </button>
    {output && <p>{output}</p>}
    </div>
)
}
export default Deployment
