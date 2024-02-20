import { createPublicClient, createWalletClient, http } from "viem";
import { polygon, polygonMumbai } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

export const chains = {
  "polygon-mainnet": polygon,
  "polygon-mumbai": polygonMumbai,
};

export const network = process.env.NETWORK as keyof typeof chains;

export const account = privateKeyToAccount(
  process.env.ACCOUNT_PRIVATE_KEY as `0x${string}`,
);

export const publicClient = createPublicClient({
  chain: chains[network],
  transport: http(process.env.ALCHEMY_API_URL),
  cacheTime: 0,
});

export const walletClient = createWalletClient({
  chain: chains[network],
  transport: http(process.env.ALCHEMY_API_URL),
  cacheTime: 0,
});
