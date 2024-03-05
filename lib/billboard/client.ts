import { createPublicClient, createWalletClient, http } from 'viem'
import { optimism, optimismSepolia, polygon, polygonMumbai } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

export const chains = {
  'polygon-mainnet': polygon,
  'polygon-mumbai': polygonMumbai,
  'op-sepolia': optimismSepolia,
  'op-mainnet': optimism,
}

export const network = process.env.NETWORK as keyof typeof chains

const alchemyAPIKey = process.env.ALCHEMY_API_KEY
export const rpcs: { [chain in keyof typeof chains]: string } = {
  'polygon-mainnet': `https://polygon-mainnet.g.alchemy.com/v2/${alchemyAPIKey}`,
  'polygon-mumbai': `https://polygon-mumbai.g.alchemy.com/v2/${alchemyAPIKey}`,
  'op-sepolia': `https://opt-sepolia.g.alchemy.com/v2/${alchemyAPIKey}`,
  'op-mainnet': `https://opt-mainnet.g.alchemy.com/v2/${alchemyAPIKey}`,
}

export const account = privateKeyToAccount(
  process.env.ACCOUNT_PRIVATE_KEY as `0x${string}`
)

export const publicClient = createPublicClient({
  chain: chains[network],
  transport: http(rpcs[network]),
  cacheTime: 0,
})

export const walletClient = createWalletClient({
  chain: chains[network],
  transport: http(rpcs[network]),
  cacheTime: 0,
})
