import { useState, useEffect } from 'react';
import { ThorClient, ProviderInternalBaseWallet, VeChainProvider } from '@vechain/sdk-network';
import { Mnemonic, Secp256k1, Address } from '@vechain/sdk-core';
import { Buffer } from 'buffer';
import { VeChainContext } from './VeChainContext';

// Polyfill Buffer
if (typeof window.Buffer === 'undefined') {
  window.Buffer = Buffer;
}

const mnemonic = import.meta.env.VITE_REACT_APP_MNEMONIC || '';
const words = mnemonic ? mnemonic.split(' ') : [];
const VET_DERIVATION_PATH = "m/44'/818'/0'/0/0";

// Initialize dev wallet (only for development)
let devWalletInfo = null;
let devWallet = null;
let devSenderAccount = null;

if (mnemonic && import.meta.env.DEV) {
  try {
    if (words.length !== 12 && words.length !== 24) {
      throw new Error('Invalid mnemonic: must be 12 or 24 words');
    }
    const privateKey = Mnemonic.toPrivateKey(words, VET_DERIVATION_PATH);
    const publicKey = Secp256k1.derivePublicKey(privateKey);
    const address = Address.ofPublicKey(publicKey).toString();

    devWalletInfo = { privateKey, address };
    devSenderAccount = { privateKey, address };
    devWallet = new ProviderInternalBaseWallet([{ privateKey, address }]);
  } catch (err) {
    console.error('Error initializing dev wallet:', err.message);
  }
}

export const VeChainContextProvider = ({ children }) => {
  const [thorClient, setThorClient] = useState(null);
  const [provider, setProvider] = useState(null);
  const [error, setError] = useState(null);
  const [connectedAccount, setConnectedAccount] = useState(null);

  useEffect(() => {
    const initializeThorClient = async () => {
      try {
        const nodeUrl = import.meta.env.VITE_VECHAIN_NODE_URL || 'https://testnet.vechain.org/';
        const client = ThorClient.at(nodeUrl, { isPollingEnabled: false });
        setThorClient(client);
        setProvider(new VeChainProvider(client, devWallet || new ProviderInternalBaseWallet([]), false));
      } catch (err) {
        setError(`Error initializing ThorClient: ${err.message}`);
        console.error(err);
      }
    };
    initializeThorClient();
  }, []);

  const updateProviderWithAccount = (account) => {
    if (account && thorClient) {
      const userWallet = new ProviderInternalBaseWallet([]);
      setProvider(new VeChainProvider(thorClient, userWallet, false));
      setConnectedAccount(account);
    } else {
      setProvider(new VeChainProvider(thorClient, devWallet || new ProviderInternalBaseWallet([]), false));
      setConnectedAccount(null);
    }
  };

  return (
    <VeChainContext.Provider
      value={{
        thorClient,
        walletInfo: devWalletInfo,
        provider,
        error,
        senderAccount: connectedAccount ? { address: connectedAccount } : devSenderAccount,
        wallet: devWallet,
        connectedAccount,
        updateProviderWithAccount,
      }}
    >
      {children}
    </VeChainContext.Provider>
  );
};
