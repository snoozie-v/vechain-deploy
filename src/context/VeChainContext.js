
import { createContext } from 'react';

export const VeChainContext = createContext({
  thorClient: null,
  walletInfo: null,
  provider: null,
  error: null,
  senderAccount: null,
  wallet: null,
  connectedAccount: null,
  updateProviderWithAccount: () => {},
});
