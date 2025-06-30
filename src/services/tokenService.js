import { deployContract } from "./contractService";

export const deployToken = async (thorClient, provider, walletInfo, abi, bytecode) => {
  return deployContract(thorClient, provider, walletInfo, abi, bytecode); // Reuse deployContract
};

export const transferToken = async (thorClient, provider, walletInfo, contractAddress, abi, recipient, amount) => {
  const signer = await provider.getSigner(walletInfo.address);
  const contract = thorClient.contracts.load(contractAddress, abi, signer);
  const txResult = await contract.transact.transfer(recipient, amount);
  const receipt = await txResult.wait();

  if (receipt.reverted) {
    throw new Error(`Transaction reverted: ${receipt.revertReason || 'Unknown reason'}`);
  }
  return receipt;
};




// Fetch the token balance for a user
export const getTokenBalance = async (thorClient, tokenAddress, shtABI, walletInput) => {
  try {
    const tokenContract = thorClient.contracts.load( tokenAddress, shtABI );
    console.log(tokenContract)
    const balance = await tokenContract.read.balanceOf(walletInput);
    return balance; // Returns a BigInt or string
  } catch (err) {
    throw new Error(`Failed to fetch token balance: ${err.message}`);
  }
};
