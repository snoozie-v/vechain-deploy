import { useState, useContext } from "react";

import LotteryStatus from "./components/LotteryStatus";
import AdminControls from "./components/AdminControls";
import './App.css';
import Deployment from "./components/Deployment";
import Testing from "./components/Testing";
import { VeChainContext } from "./context/VeChainContext";

function App() {
  // const { walletInfo, connectedAccount, updateProviderWithAccount } = useContext(VeChainContext); // Add connectedAccount and updateProviderWithAccount
  
  // const lotteryAddress = "0x69223c809fd2b166b3e5dee87e8125bc460c7e08"; // test net lottery address
  const lotteryAddress = "" // placeholder for main net lottery address
  const tokenAddress = "0x9AF004570f2a301D99F2cE4554E564951eE48e3c"; // main net SHT Token address
  const [statusTrigger, 
    // setStatusTrigger
  ] = useState(0);

  const decimals = 18;


  return (
    <div className="lottery-form-container">
      <h1>SHT Lotto</h1>

      <div>
        {tokenAddress && (
          <p>
            <strong>Token Contract Address:</strong> {tokenAddress}
          </p>
        )}
        {lotteryAddress && (
          <p>
            <strong>Lottery Contract Address:</strong> {lotteryAddress}
          </p>
        )}
        {decimals !== null && (
          <p>
            <strong>Token Decimals:</strong> {decimals}
          </p>
        )}
      </div>

      {/* <EnterLotteryForm
        lotteryAddress={lotteryAddress}
        tokenAddress={tokenAddress}
        onEnterSuccess={() => setStatusTrigger((prev) => prev + 1)}
      /> */}
      {lotteryAddress && (
        <LotteryStatus
          lotteryAddress={lotteryAddress}
          statusTrigger={statusTrigger}
          decimals={decimals}
        />
      )}

      {/* Preserved commented-out sections */}
    <AdminControls lotteryAddress={lotteryAddress} /> 
    <Testing tokenAddress={tokenAddress}/>
      <Deployment tokenAddress={tokenAddress}/>
    </div>
  );
}

export default App;
