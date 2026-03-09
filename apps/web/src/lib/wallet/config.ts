import { http, type Config, createConfig } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import { supportedChains } from './chains';

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const walletConnectEnabled =
  walletConnectProjectId &&
  walletConnectProjectId.trim().length > 0 &&
  walletConnectProjectId !== 'placeholder';

const connectors = walletConnectEnabled
  ? [
      injected({
        shimDisconnect: true,
      }),
      walletConnect({
        projectId: walletConnectProjectId,
        showQrModal: true,
      }),
    ]
  : [
      injected({
        shimDisconnect: true,
      }),
    ];

export const walletConfig: Config = createConfig({
  chains: supportedChains,
  connectors,
  ssr: true,
  transports: Object.fromEntries(supportedChains.map((chain) => [chain.id, http()])) as Record<
    number,
    ReturnType<typeof http>
  >,
});
