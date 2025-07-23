import { useState, useContext } from "react";
import EnterLotteryForm from "./components/EnterLotteryForm";
import LotteryStatus from "./components/LotteryStatus";
import AdminControls from "./components/AdminControls";
import './App.css';
import Deployment from "./components/Deployment";
import Testing from "./components/Testing";
import { VeChainContext } from "./context/VeChainContext";
import FlipStatus from "./components/FlipStatus";
import HangMan from "./components/HangMan";

function App() {
  // const { walletInfo, connectedAccount, updateProviderWithAccount } = useContext(VeChainContext); // Add connectedAccount and updateProviderWithAccount
  
  // const lotteryAddress = "0x69223c809fd2b166b3e5dee87e8125bc460c7e08"; // test net lottery address
  const tokenAddress = "0xf7fbcf2ae9f5b3cf4dd72fa6e1ada84499e8c3b2"; // test net SHT token address
  const hangManAddress = "0x6dd029cead2b9fcd1bca548a45048e558d05ef3c" // test net hangMan
  // const hangMan2 = "0xa5a0dac0007bf85923bb47a8cd0c8cd2c6ceeb0c"
  // const flipAddress = "0xd845d8688938e028392deb37789d0e08dd9e7600" // test net flip

  // const lotteryAddress = "0xbBba29c0C7c8407F6cde77fe7C4B037aAFC3D2c4" // main net lottery address
  // const tokenAddress = "0x9AF004570f2a301D99F2cE4554E564951eE48e3c"; // main net SHT Token address

  console.log(hangManAddress)

  const decimals = 18;


  return (
    <div className="lottery-form-container">
      {/* <h1>Testnet Games</h1> */}

      <div>
        {/* {tokenAddress && (
          <p>
            <strong>Token Contract Address:</strong> {tokenAddress}
          </p>
        )}
        {hangManAddress && (
          <p>
            <strong>HangMan Contract Address:</strong> {hangManAddress}
          </p>
        )} */}
        {/* {lotteryAddress && (
          <p>
            <strong>Lottery Contract Address:</strong> {lotteryAddress}
          </p>
        )}
        {flipAddress && (
          <p>
            <strong>Flip Contract Address:</strong> {flipAddress}
          </p>
        )} */}

      </div>

      {/* <EnterLotteryForm
        lotteryAddress={lotteryAddress}
        tokenAddress={tokenAddress}
        onEnterSuccess={() => setStatusTrigger((prev) => prev + 1)}
      />
      {lotteryAddress && (
        <LotteryStatus
          lotteryAddress={lotteryAddress}
          statusTrigger={statusTrigger}
          decimals={decimals}
        />
      )}
      <AdminControls lotteryAddress={lotteryAddress} /> */}


      {/* Preserved commented-out sections */}
 
      {/* <Testing tokenAddress={tokenAddress}/> */}
      {/* <Deployment tokenAddress={tokenAddress}/> */}
      {/* <FlipStatus flipAddress={flipAddress} tokenAddress={tokenAddress} decimals={decimals}/> */}
      <HangMan hangManAddress={hangManAddress} tokenAddress={tokenAddress} decimals={decimals}/>
    </div>
  );
}

export default App;
