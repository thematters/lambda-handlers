import { billboardAbi, billboardRegistryAbi, distributionAbi } from './abi.js'
import { publicClient, account } from './client.js'

// number of auctions to be cleared at once
const BATCH_SIZE = 2

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

type Auction = { tokenId: bigint; auctionId: bigint }

export const getClearableAuctions = async ({
  fromTokenId,
  toTokenId,
}: {
  // token id range to check
  fromTokenId: bigint
  toTokenId: bigint
}): Promise<Auction[]> => {
  // get auctions to be cleared
  const auctionIdsResults = await publicClient.multicall({
    contracts: Array.from(
      { length: Number(toTokenId - fromTokenId) + 1 },
      (_, i) => ({
        ...billboardRegsitryContract,
        functionName: 'nextBoardAuctionId',
        args: [BigInt(i) + fromTokenId],
      })
    ),
  })

  const auctionIds: Array<{ tokenId: bigint; auctionId: bigint }> =
    auctionIdsResults
      .filter(({ result }) => !!result && BigInt(result) > 0)
      .map(({ result }, i) => ({
        tokenId: BigInt(i + 1),
        auctionId: BigInt(result!),
      }))

  console.log('auctionIds to check: ', auctionIds)

  if (auctionIds.length <= 0) {
    return []
  }

  const autionsResults = await publicClient.multicall({
    contracts: auctionIds.map(({ tokenId, auctionId }) => ({
      ...billboardRegsitryContract,
      functionName: 'getAuction',
      args: [tokenId, auctionId],
    })),
  })

  const blockNow = await publicClient.getBlockNumber()
  const auctions = autionsResults
    .map(({ result }, i) => ({
      tokenId: auctionIds[i].tokenId,
      auctionId: auctionIds[i].auctionId,
      result,
    }))
    .filter(({ result }) => {
      if (!result) {
        return false
      }

      // already ended
      if (result.endAt > blockNow) {
        return false
      }

      // already cleared
      if (result.leaseEndAt) {
        return false
      }

      return true
    })
    .map(({ tokenId, auctionId }) => ({ tokenId, auctionId }))
    .slice(0, BATCH_SIZE)

  console.log('auctionIds to clear: ', auctions)

  return auctions
}
