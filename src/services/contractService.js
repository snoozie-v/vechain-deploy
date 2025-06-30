export const deployContract = async (thorClient, provider, walletInfo, abi, bytecode) => {
  if (!thorClient || !provider || !walletInfo.privateKey) {
    throw new Error('ThorClient, provider, or wallet not initialized');
  }

  const signer = await provider.getSigner(walletInfo.address);
  const factory = thorClient.contracts.createContractFactory(abi, bytecode, signer);

  await factory.startDeployment({ gas: 500000, gasPriceCoef: 255 });
  const contract = await factory.waitForDeployment();
  const receipt = contract.deployTransactionReceipt;

  if (receipt.outputs[0].contractAddress) {
    return receipt.outputs[0].contractAddress;
  }
  throw new Error('Deployment failed: No contract address');
};


