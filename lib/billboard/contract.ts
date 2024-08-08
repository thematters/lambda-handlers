import { billboardAbi, billboardRegistryAbi, distributionAbi } from './abi.js'
import { account } from './client.js'

export const billboardContract = {
  address: process.env.BILLBOARD_CONTRACT_ADDRESS as `0x${string}`,
  abi: billboardAbi,
  account,
} as const

export const billboardRegsitryContract = {
  address: process.env.BILLBOARD_REGISTRY_CONTRACT_ADDRESS as `0x${string}`,
  abi: billboardRegistryAbi,
} as const

export const distributionContract = {
  address: process.env.BILLBOARD_DISTRIBUTION_CONTRACT_ADDRESS as `0x${string}`,
  abi: distributionAbi,
  account,
} as const
