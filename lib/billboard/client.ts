import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbiItem,
} from 'viem'
import {
  mainnet,
  optimism,
  optimismSepolia,
  polygon,
  polygonMumbai,
} from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

export const chains = {
  'eth-mainnet': mainnet,
  'polygon-mainnet': polygon,
  'polygon-mumbai': polygonMumbai,
  'op-sepolia': optimismSepolia,
  'op-mainnet': optimism,
}

const alchemyAPIKey = process.env.ALCHEMY_API_KEY

export const rpcs: { [chain in keyof typeof chains]: string } = {
  'eth-mainnet': `https://eth-mainnet.g.alchemy.com/v2/${alchemyAPIKey}`,
  'polygon-mainnet': `https://polygon-mainnet.g.alchemy.com/v2/${alchemyAPIKey}`,
  'polygon-mumbai': `https://polygon-mumbai.g.alchemy.com/v2/${alchemyAPIKey}`,
  'op-sepolia': `https://opt-sepolia.g.alchemy.com/v2/${alchemyAPIKey}`,
  'op-mainnet': `https://opt-mainnet.g.alchemy.com/v2/${alchemyAPIKey}`,
}

export const account = privateKeyToAccount(
  process.env.ACCOUNT_PRIVATE_KEY as `0x${string}`
)

function getPublicClient(network: keyof typeof chains) {
  return createPublicClient({
    chain: chains[network],
    transport: http(rpcs[network]),
    cacheTime: 0,
  })
}

export const publicClientETHMainnet = getPublicClient('eth-mainnet')
export const publicClientPolygonMainnet = getPublicClient('polygon-mainnet')
export const publicClientOpMainnet = getPublicClient('op-mainnet')

export const network = process.env.NETWORK as keyof typeof chains

export const publicClientDefault = getPublicClient(network)

export const publicClient = publicClientDefault

export const walletClient = createWalletClient({
  chain: chains[network],
  transport: http(rpcs[network]),
  cacheTime: 0,
})

export async function getETHMainetNFTs(owner: string) {
  return fetch(
    `https://eth-mainnet.g.alchemy.com/nft/v3/${alchemyAPIKey}/getContractsForOwner/?owner=${owner}`,
    {
      headers: { accept: 'application/json' },
    }
  ).then((res) => res.json())
}

export const AddressMattersTravLoggerContract =
  '0x8515ba8EF2CF2F2BA44b26fF20337D7A2bc5e6D8'
export const AddressENSDomainContract =
  '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85'

export const MattersCurationEvent = parseAbiItem(
  'event Curation(address indexed from, address indexed to, address indexed token, string uri, uint256 amount)'
)

export const AddressMattersOPCurationContract =
  '0x5edebbdae7b5c79a69aacf7873796bb1ec664db8' // created at OP Block 117058632
export const AddressMattersOPSepoliaCurationContract =
  '0x92a117aea74963cd0cedf9c50f99435451a291f7' // created at OpSepolia Block 8438904

export const gitcoinContractAddress =
  '0x6726fe9c89fb04eaef388c11cf55be6aa0a62fb9'
export const gitcoinContractABI = parseAbiItem(
  // 'event Curation(address indexed from, address indexed to, address indexed token, string uri, uint256 amount)'
  'event ApplicationStatusesUpdated(uint256 indexed index, uint256 indexed status)'
)
