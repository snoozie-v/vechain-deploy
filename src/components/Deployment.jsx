import { useContext, useState } from "react";
import { VeChainContext } from "../context/VeChainContext";
import {deployLottery} from "../services/lotteryService"
import lotteryABI from "../abis/lotteryABI"; // Import lottery ABI
import lotteryBytecode from "../abis/lotteryBytecode"; // Import lottery bytecode
import {deployToken,transferToken,getTokenBalance } from "../services/tokenService";
import shtByte from "../abis/shtByte";
import shtABI from "../abis/shtABI";
import flipABI from "../abis/flipABI";
import flipBytecode from "../abis/flipBytecode";
import { deployFlipCoin } from "../services/flipService";
import hangManABI from "../abis/hangManABI";
import hangManBytecode from "../abis/hangManBytecode";

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

const deployHangMan = async () => {
  console.log('thorClient:', thorClient);
  if (!thorClient || !provider || !walletInfo) {
    setOutput("Missing required context for deployment");
    return;
  }
  try {
    const address = await deployFlipCoin(
      thorClient,
      provider,
      walletInfo,
      hangManABI,
      hangManBytecode
    );
    console.log('Deployed FlipCoin at:', address);
    setOutput(`Flip deployed at: ${address}`);
  } catch (err) {
    console.error('Full error:', err);
    setOutput(`Error deploying Flip: ${err.message}`);
  }
};

 const deployFlip = async () => {
  console.log('thorClient:', thorClient);
  if (!thorClient || !provider || !walletInfo) {
    setOutput("Missing required context for deployment");
    return;
  }
  try {
    const address = await deployFlipCoin(
      thorClient,
      provider,
      walletInfo,
      flipABI,
      flipBytecode
    );
    console.log('Deployed FlipCoin at:', address);
    setOutput(`Flip deployed at: ${address}`);
  } catch (err) {
    console.error('Full error:', err);
    setOutput(`Error deploying Flip: ${err.message}`);
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
      <button onClick={deployFlip} disabled={!thorClient || !walletInfo?.privateKey}>
        Deploy Flip
        </button>
      <button onClick={deployHangMan} disabled={!thorClient || !walletInfo?.privateKey}>
        Deploy HangMan
        </button>
  
    {output && <p>{output}</p>}
    </div>
)
}
export default Deployment
