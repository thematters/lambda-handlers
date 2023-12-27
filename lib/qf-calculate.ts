// import fs from "fs";

import type { Language } from './types'

import crypto from 'node:crypto'
import util from 'node:util'
import { StandardMerkleTree } from '@openzeppelin/merkle-tree'
// import { // createPublicClient, http, fallback, parseAbiItem } from 'viem'
// import { mainnet, optimism, optimismSepolia, polygon } from 'viem/chains'

import * as d3 from 'd3-array'
import { tsvFormat } from 'd3-dsv'

import { sql, sqlRO, ARRAY_TYPE } from '../lib/db.js'
import { BigIntMath } from '../lib/bigint-math.js'
// import { PolygonScanAPI } from '../lib/polygonscan.js'
import {
  publicClientDefault,
  publicClientETHMainnet,
  publicClientOpMainnet,
  publicClientPolygonMainnet,
  getETHMainetNFTs,
  AddressMattersTravLoggerContract,
  AddressENSDomainContract,
  AddressMattersOPCurationContract,
  AddressMattersOPSepoliaCurationContract,
  MattersCurationEvent,
  // EtherScanAPI,
} from './billboard/client.js'
import { checkSendersTrustPoints } from './billboard/qf-thresholds.js'
import { s3GetFile, s3PutFile } from '../lib/utils/aws.js'
import { Mail } from './mail.js'
import { DAY, EMAIL_FROM_ASK } from './constants/index.js'

const siteDomain = process.env.MATTERS_SITE_DOMAIN || ''
export const isProd = siteDomain === 'https://matters.town'
export const billboardUrl = isProd
  ? `https://billboard.matters-lab.io`
  : `https://billboard-develop.matters-lab.io`
export const claimLink = `${billboardUrl}/claim`
export const s3FilePathPrefix = isProd ? `rounds` : `web-develop/rounds`

export const MattersBillboardS3Bucket = 'matters-billboard'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '' // for servide side run only;

export async function calculateQFScore({
  // between = ["2023-12-01", "2023-12-31T23:59:59.999Z"],
  fromTime,
  toTime,
  fromBlock,
  toBlock,
  finalize,
  amountTotal = 250_000_000n, // 250 USDT
  sharesTotal = 10_000,
  write_gist = true,
}: {
  // between: string[];
  fromTime?: Date
  toTime?: Date
  fromBlock: bigint
  toBlock: bigint
  amountTotal?: bigint
  sharesTotal?: number
  finalize?: boolean
  write_gist?: boolean // for server side run only;
}) {
  const started = new Date()

  const blockNumbers = await Promise.all([
    publicClientDefault.getBlockNumber(),
    publicClientPolygonMainnet.getBlockNumber(),
    publicClientETHMainnet.getBlockNumber(),
  ])
  console.log(
    new Date(),
    'blockNumbers [OP, Polygon, ETH-mainnet]:',
    blockNumbers
  )
  const [latestOPBlockNumber] = blockNumbers

  if (toBlock > latestOPBlockNumber) {
    toBlock = latestOPBlockNumber
    toTime = started // .toISOString()
    finalize = false // cannot finalize for future block
  }

  {
    const res1 = await // EtherScanAPI.getBlockReward({ blockno: fromBlock })
    publicClientDefault.getBlock({ blockNumber: fromBlock })
    console.log(
      new Date(),
      'get block timestamp:',
      res1 // new Date(+res1?.timeStamp * 1e3)
    )
    if (res1?.timestamp) {
      let fromTimestamp = +Number(res1.timestamp)
      if (fromTimestamp % 2 === 1) fromTimestamp++ // every OP block is around ~2 seconds, if it starts with odd number, round it to next even;
      fromTime = new Date(fromTimestamp * 1e3)
    }
    const res2 = await // EtherScanAPI.getBlockReward({ blockno: toBlock })
    publicClientDefault.getBlock({ blockNumber: toBlock })
    console.log(
      new Date(),
      'get block timestamp:',
      res2
      // new Date(+res2?.timeStamp * 1e3)
    )
    if (res2?.timestamp) {
      let toTimestamp = +Number(res2.timestamp)
      if (toTimestamp % 2 === 1) toTimestamp++
      toTime = new Date(toTimestamp * 1e3)
    }
  }

  console.log(new Date(), `find out events between:`, {
    fromTime,
    toTime,
    fromBlock,
    toBlock,
  })

  const contractAddress = isProd
    ? AddressMattersOPCurationContract
    : AddressMattersOPSepoliaCurationContract // '0x5edebbdae7b5c79a69aacf7873796bb1ec664db8',

  const logs = (await publicClientDefault.getLogs({
    address: contractAddress,
    event: MattersCurationEvent,
    fromBlock, // : isProd ? 117058632n : 8438904n, // the contract creation block;
    toBlock,
    // strict: true,
  })) as any[]
  if (!(logs.length > 0)) {
    console.error(
      new Date(),
      `there aren't enough logs (${logs.length}) between the two block numbers, try again with a larger range:`,
      {
        address: contractAddress,
        event: MattersCurationEvent,
        fromBlock,
        toBlock,
      }
    )
    return void 0 as any
  }
  logs.reverse() // get from latest to earliest

  const seqs = logs.map(
    ({
      blockNumber,
      transactionHash,
      args: { from, to, token, uri, amount },
      eventName,
    }) => ({
      blockNumber,
      transactionHash,
      eventName,
      from,
      to,
      token,
      uri,
      amount,
      dataHash: uri?.match(/^ipfs:\/\/(Qm[A-Za-z0-9]{44})$/)?.[1],
    })
  )

  const seqsByDataHash = d3.group(seqs, (d) => d.dataHash)
  console.log(new Date(), `found ${seqs?.length} seqs between:`, seqsByDataHash)

  // console.log("contract logs: %o", logs);
  const stats = {
    blockNumbers: new Set<string>(),
    transactionHashes: new Set<string>(),
    fromAddresses: new Set<string>(),
    toAddresses: new Set<string>(),
    allAddresses: new Set<string>(),
    token: new Set<string>(),
    uri: new Set<string>(),
    amount: [] as bigint[],
    eventName: new Set<string>(),
  }

  const [minBlockNumber, maxBlockNumber] = d3.extent(
    // BigIntMath.max(
    logs.map((log) => log.blockNumber)
  ) // as bigint;
  logs.forEach((log: any) => {
    stats.blockNumbers.add(log.blockNumber)
    stats.transactionHashes.add(log.transactionHash)
    stats.fromAddresses.add(log.args.from)
    stats.toAddresses.add(log.args.to)
    stats.allAddresses.add(log.args.from)
    stats.allAddresses.add(log.args.to)
    stats.token.add(log.args.token)
    stats.uri.add(log.args.uri)
    stats.amount.push(log.args.amount)
    stats.eventName.add(log.eventName)
  })
  stats.amount.sort(ascending)

  const nftHoldersMap = new Map<
    string,
    {
      travLoggers?: number
      ensDomains?: number
      totalCount?: number
      totalContracts?: number
    }
  >()
  await Promise.all(
    Array.from(stats.fromAddresses, async (address) => {
      const res = await getETHMainetNFTs(address)
      // console.log( new Date(), `getting NFTs for Address:${nftHoldersMap.size}:`, address, res);
      const travLoggers = res?.contracts?.find(
        (row: any) => row?.address === AddressMattersTravLoggerContract
      )?.totalBalance
      const ensDomains = res?.contracts?.find(
        (row: any) => row?.address === AddressENSDomainContract
      )?.totalBalance
      const totalCount = // d3.sum(
        res?.contracts.reduce(
          (acc: number, row: any) => acc + +row.totalBalance,
          0
        )
      nftHoldersMap.set(address.toLowerCase(), {
        travLoggers: travLoggers && parseInt(travLoggers),
        ensDomains: ensDomains && parseInt(ensDomains),
        totalCount,
        totalContracts: res?.totalCount,
      })
    })
  )
  console.log(
    new Date(),
    `got nftHolders for ${stats.fromAddresses.size} addresses:`
    // nftHoldersMap
  )

  const statsAmount = {
    count: stats.amount.length,
    min: stats.amount[0],
    max: stats.amount[stats.amount.length - 1],
    sum: stats.amount.reduce((acc, amount) => acc + amount),
    quantiles: [
      stats.amount[0],
      quantileSorted(stats.amount, 'p25'),
      quantileSorted(stats.amount, 'p50'),
      quantileSorted(stats.amount, 'p75'),
      stats.amount[stats.amount.length - 1],
    ],
  }

  const ipfsArticleHashes = await (isProd // dev-db has migrated article_version, while prod-db not yet; TODO update Prod code to keep consistency
    ? sqlRO`-- get de-duplicated donation records from darft data_hash
SELECT article.id ::int, article.title, article.summary, article.created_at,
  draft.data_hash AS data_hash,
  article.data_hash AS latest_data_hash,
  lower(author.eth_address) AS eth_address,
  author.user_name, author.display_name, author.email, article.author_id ::int,
  concat(${siteDomain} ::text, '/@', user_name, '/', article.id, '-', article.slug) AS url
FROM public.draft LEFT JOIN public.article ON article_id=article.id
LEFT JOIN public.user author ON article.author_id=author.id
WHERE author.eth_address IS NOT NULL
  AND draft.data_hash =ANY(${Array.from(seqsByDataHash.keys()).filter(Boolean)})
ORDER BY article.id DESC ; `
    : sqlRO`-- get de-duplicated donation records from darft data_hash
SELECT article.id ::int, title, summary, article_version.created_at, article_version.data_hash,
  latest_data_hash, -- draft.data_hash AS draft_data_hash,
  lower(author.eth_address) AS eth_address,
  author.user_name, author.display_name, author.email, article.author_id ::int,
  concat(${siteDomain} ::text, '/a/', article.short_hash) AS url
FROM public.article_version
LEFT JOIN public.article ON article_id=article.id
LEFT JOIN (
  SELECT DISTINCT ON (article.id) article.id, article_version.data_hash AS latest_data_hash
  FROM public.article_version
  LEFT JOIN public.article ON article_id=article.id
  ORDER BY article.id DESC, article_version.id DESC
) latest_data_hash ON latest_data_hash.id=article.id
LEFT JOIN public.user author ON article.author_id=author.id
WHERE author.eth_address IS NOT NULL
  AND article_version.data_hash =ANY(${Array.from(seqsByDataHash.keys()).filter(
    Boolean
  )})
ORDER BY article.id DESC ; `)

  const dataHashMappings = d3.group(ipfsArticleHashes, (d) => d.dataHash)
  const dataHashRevisdedMappings = // new Map(
    d3.group(ipfsArticleHashes, (d) => d.latestDataHash)

  console.log(
    new Date(),
    `found ${dataHashMappings.size} dataHashMappings from ${ipfsArticleHashes.length} entries:`,
    'dataHashMappings:',
    dataHashMappings.size,
    Array.from(dataHashMappings.keys()),
    'dataHashRevisdedMappings:',
    dataHashRevisdedMappings.size,
    dataHashRevisdedMappings
    // stats
  )

  const usdtDonationsStats = (
    await sqlRO`--get stats of all USDT transactions;
SELECT COUNT(*) ::int AS num_transactions,
  COUNT(DISTINCT sender_id) ::int AS num_senders,
  COUNT(DISTINCT recipient_id) ::int AS num_recipients,
  COUNT(DISTINCT target_id) ::int AS num_targets,
  json_build_object(
    'min', MIN(amount),
    'p05', ROUND(percentile_cont(0.05) within group (order by amount asc) ::numeric, 6),
    'p10', ROUND(percentile_cont(0.1) within group (order by amount asc) ::numeric, 6),
    'p25', ROUND(percentile_cont(0.25) within group (order by amount asc) ::numeric, 6),
    'p50', ROUND(percentile_cont(0.5) within group (order by amount asc) ::numeric, 6),
    'p75', ROUND(percentile_cont(0.75) within group (order by amount asc) ::numeric, 6),
    'p90', ROUND(percentile_cont(0.9) within group (order by amount asc) ::numeric, 6),
    'p95', ROUND(percentile_cont(0.95) within group (order by amount asc) ::numeric, 6),
    'max', MAX(amount),
    'sum', SUM(amount),
    'avg', ROUND(AVG(amount), 6)
  ) AS amount_stats
FROM public.transaction
WHERE purpose='donation' AND state='succeeded'
  AND currency='USDT'
  AND target_type=4 -- for articles;
  AND created_at BETWEEN ${fromTime!} AND ${toTime!} ;`
  )?.[0]

  const statsSummary = {
    blockNumbers: stats.blockNumbers.size,
    transactionHashes: stats.transactionHashes.size,
    fromAddresses: stats.fromAddresses.size,
    toAddresses: stats.toAddresses.size,
    allAddresses: stats.allAddresses.size,
    token:
      stats.token.size === 1 ? Array.from(stats.token)[0] : stats.token.size,
    eventName:
      stats.eventName.size === 1
        ? Array.from(stats.eventName)[0]
        : stats.eventName.size,
    uri: stats.uri.size,
    amount: {
      ...statsAmount,
      sum_u$: +(Number(statsAmount.sum) / 1e6).toFixed(6),
      avg_u$: +(Number(statsAmount.sum) / 1e6 / stats.amount.length).toFixed(6),
    },
  }
  console.log('stats:', stats, statsSummary, {
    numIPFSCids: ipfsArticleHashes.length,
    ...usdtDonationsStats,
  })

  const dateFormat = new Intl.DateTimeFormat('zh-tw', {
    dateStyle: 'full',
    timeStyle: 'long',
    timeZone: 'Asia/Taipei',
  })
  const runningBetween = `During MattersCuration contract runtime between \`${dateFormat.format(
    fromTime as Date
  )}\` ~ \`${dateFormat.format(toTime as Date)}\` (UTC+8)`

  const gist: any = {
    description: `Quadratic-Funding Calculations (${runningBetween})`,
    public: false,
    files: {
      'README.md': {
        content: `During MattersCuration contract runtime between (to overwrite later ...) ...`,
      },
    },
  }

  // output senders.tsv
  const sendersOut = new Map<string, any>()

  {
    const aggPerFromAddress = d3.rollup(
      seqs,
      (g) => ({
        amounts: g.map((d) => d.amount).sort(d3.ascending),
        latestBlockNumber: BigIntMath.max(...g.map((d) => d.blockNumber)),
        number_contributions: g.length,
        sum: g.reduce((acc, b) => acc + b.amount, 0n),
      }),
      (d) => d.from.toLowerCase() // lower
    )
    console.log(new Date(), 'aggPerFromAddress:', aggPerFromAddress)
    const addresses: string[] = Array.from(aggPerFromAddress.keys())

    const senders = await (isProd
      ? sqlRO`-- get all sender's social
SELECT sender.user_name, display_name, to_jsonb(sag.*) AS sag, to_jsonb(sat.*) AS sat,
  (sender.avatar IS NOT NULL) AS has_avatar,
  (LENGTH(sender.description) > 0) AS has_description,
  lower(sender.eth_address) AS eth_address,
  sender.created_at AS user_created_at, num_articles, -- num_articles_featured,
  earliest_article_published_at, ub.count AS num_badges, num_followers,
  last_donat.created_at AS earliest_donated_at,
  last_donat.title, all_donates.titles, last_donat.target_url, -- , last_donat.created_at
  num_articles_be_donated, num_donated_authors,
  num_read_articles, num_reading_days, num_comments
FROM public.user sender
LEFT JOIN social_account sag ON sag.user_id=sender.id AND sag.type='Google'
LEFT JOIN social_account sat ON sat.user_id=sender.id AND sag.type='Twitter'
LEFT JOIN (
  SELECT author_id, COUNT(*) ::int AS num_articles, MIN(created_at) AS earliest_article_published_at
  FROM public.article
  GROUP BY 1
) articles ON articles.author_id=sender.id
/* LEFT JOIN ( -- featured articles
  SELECT author_id, COUNT(article_id) ::int AS num_articles_featured
  FROM matters_choice
  LEFT JOIN article ON article_id=article.id
  GROUP BY 1
) articles_featured ON articles_featured.author_id=sender.id */
LEFT JOIN (
  SELECT DISTINCT ON (sender_id) sender_id ::int, tr.created_at, title,
    concat(${siteDomain} ::text, '/@', '/', target_id, '-', slug) AS target_url
  FROM transaction tr
  LEFT JOIN public.article ON target_id=article.id AND target_type=4
  WHERE tr.purpose='donation' AND tr.state='succeeded'
    AND tr.currency='USDT'
    -- AND tr.created_at >= $ {fromTime!}
    AND tr.created_at BETWEEN ${fromTime!} AND ${toTime!}
    -- AND target_type=4 -- AND target_id IN ( SELECT id FROM all_applicant_articles )
  ORDER BY sender_id, tr.created_at ASC
) last_donat ON last_donat.sender_id=sender.id
LEFT JOIN (
  SELECT sender_id ::int, ARRAY_AGG(DISTINCT concat(article.id, '-', article.slug)) AS titles
    -- concat('https://matters.town/@', '/', target_id, '-', slug) AS target_url
  FROM (
    SELECT DISTINCT ON (sender_id, target_id) sender_id, target_id, tr.created_at
    FROM transaction tr
    WHERE tr.purpose='donation' AND tr.state='succeeded'
      AND tr.currency='USDT'
      AND tr.created_at BETWEEN ${fromTime!} AND ${toTime!}
      AND target_type=4 -- AND target_id IN ( SELECT id FROM all_applicant_articles )
    ORDER BY sender_id, target_id, created_at ASC
  ) t
  LEFT JOIN public.article ON target_id=article.id
  GROUP BY 1
  -- ORDER BY sender_id, tr.created_at ASC
) all_donates ON all_donates.sender_id=sender.id
LEFT JOIN (
  SELECT recipient_id, COUNT(DISTINCT target_id) ::int AS num_articles_be_donated
  FROM transaction tr
  WHERE tr.purpose='donation' AND tr.state='succeeded'
    -- AND tr.created_at BETWEEN $ {fromTime!} AND $ {toTime!}
    AND target_type=4 -- AND target_id IN ( SELECT id FROM all_applicant_articles )
  GROUP BY 1
) all_donated ON all_donated.recipient_id=sender.id
LEFT JOIN (
  SELECT sender_id, COUNT(DISTINCT recipient_id) ::int AS num_donated_authors
  FROM transaction tr
  WHERE tr.purpose='donation' AND tr.state='succeeded'
    -- AND tr.created_at BETWEEN $ {fromTime!} AND $ {toTime!}
    AND target_type=4 -- AND target_id IN ( SELECT id FROM all_applicant_articles )
  GROUP BY 1
) all_donated_senders ON all_donated_senders.sender_id=sender.id
LEFT JOIN (
  SELECT user_id,
    COUNT(DISTINCT article_id) ::int AS num_read_articles,
    COUNT(DISTINCT created_at ::date) ::int AS num_reading_days
  FROM article_read_count
  WHERE user_id IS NOT NULL
  GROUP BY 1
) reading_actvs ON reading_actvs.user_id=sender.id
LEFT JOIN (
  SELECT author_id, COUNT(*) ::int AS num_comments
  FROM public.comment
  GROUP BY 1
) comments ON comments.author_id=sender.id
LEFT JOIN (
  SELECT target_id, COUNT(*) ::int AS num_followers
  FROM public.action_user
  GROUP BY 1
) actions ON actions.target_id=sender.id
LEFT JOIN (
  SELECT user_id, COUNT(*) ::int
  FROM public.user_badge
  WHERE enabled
  GROUP BY 1
) ub ON ub.user_id=sender.id
-- LEFT JOIN public.user_badge ub ON ub.user_id=sender.id AND ub.type='seed' AND ub.enabled
WHERE lower(sender.eth_address) =ANY(${addresses!})
-- ORDER BY sender.id DESC ;`
      : sqlRO`-- get all sender's social
SELECT sender.user_name, display_name, to_jsonb(sag.*) AS sag, to_jsonb(sat.*) AS sat,
  (sender.avatar IS NOT NULL) AS has_avatar,
  (LENGTH(sender.description) > 0) AS has_description,
  lower(sender.eth_address) AS eth_address,
  sender.created_at AS user_created_at, num_articles, -- num_articles_featured,
  earliest_article_published_at, ub.count AS num_badges, num_followers,
  last_donat.created_at AS earliest_donated_at,
  -- last_donat.title, all_donates.titles, last_donat.target_url, -- , last_donat.created_at
  last_donat.title, last_donat.target_url,
  num_articles_be_donated, num_donated_authors,
  num_read_articles, num_reading_days, num_comments
FROM public.user sender
LEFT JOIN social_account sag ON sag.user_id=sender.id AND sag.type='Google'
LEFT JOIN social_account sat ON sat.user_id=sender.id AND sag.type='Twitter'
LEFT JOIN (
  SELECT author_id, COUNT(*) ::int AS num_articles, MIN(created_at) AS earliest_article_published_at
  FROM public.article
  GROUP BY 1
) articles ON articles.author_id=sender.id
LEFT JOIN (
  SELECT DISTINCT ON (sender_id) sender_id ::int, tr.created_at, title, concat(${siteDomain} ::text, '/a/', short_hash) AS target_url
  FROM transaction tr
  LEFT JOIN public.article ON target_id=article.id AND target_type=4
  LEFT JOIN public.article_version ON article_id=article.id
  WHERE tr.purpose='donation' AND tr.state='succeeded'
    AND tr.currency='USDT'
    -- AND tr.created_at >= $ {fromTime!}
    AND tr.created_at BETWEEN ${fromTime!} AND ${toTime!}
    -- AND target_type=4 -- AND target_id IN ( SELECT id FROM all_applicant_articles )
  ORDER BY sender_id, tr.created_at ASC
) last_donat ON last_donat.sender_id=sender.id
LEFT JOIN (
  SELECT recipient_id, COUNT(DISTINCT target_id) ::int AS num_articles_be_donated
  FROM transaction tr
  WHERE tr.purpose='donation' AND tr.state='succeeded'
    -- AND tr.created_at BETWEEN $ {fromTime!} AND $ {toTime!}
    AND target_type=4 -- AND target_id IN ( SELECT id FROM all_applicant_articles )
  GROUP BY 1
) all_donated ON all_donated.recipient_id=sender.id
LEFT JOIN (
  SELECT sender_id, COUNT(DISTINCT recipient_id) ::int AS num_donated_authors
  FROM transaction tr
  WHERE tr.purpose='donation' AND tr.state='succeeded'
    -- AND tr.created_at BETWEEN $ {fromTime!} AND $ {toTime!}
    AND target_type=4 -- AND target_id IN ( SELECT id FROM all_applicant_articles )
  GROUP BY 1
) all_donated_senders ON all_donated_senders.sender_id=sender.id
LEFT JOIN (
  SELECT user_id,
    COUNT(DISTINCT article_id) ::int AS num_read_articles,
    COUNT(DISTINCT created_at ::date) ::int AS num_reading_days
  FROM article_read_count
  WHERE user_id IS NOT NULL
  GROUP BY 1
) reading_actvs ON reading_actvs.user_id=sender.id
LEFT JOIN (
  SELECT author_id, COUNT(*) ::int AS num_comments
  FROM public.comment
  GROUP BY 1
) comments ON comments.author_id=sender.id
LEFT JOIN (
  SELECT target_id, COUNT(*) ::int AS num_followers
  FROM public.action_user
  GROUP BY 1
) actions ON actions.target_id=sender.id
LEFT JOIN (
  SELECT user_id, COUNT(*) ::int
  FROM public.user_badge
  WHERE enabled
  GROUP BY 1
) ub ON ub.user_id=sender.id
-- LEFT JOIN public.user_badge ub ON ub.user_id=sender.id AND ub.type='seed' AND ub.enabled
WHERE lower(sender.eth_address) =ANY(${addresses!})
-- ORDER BY sender.id DESC ;`)

    const sendersMap = new Map(senders.map((u) => [u.ethAddress, u]))

    aggPerFromAddress.forEach((v, k) => {
      const senderObj = sendersMap.get(k)
      const obj = {
        userName: senderObj?.userName,
        displayName: senderObj?.displayName,
        ethAddress: k,
        trustPoints: 0.0,
        countDonations: v.number_contributions,
        sumDonations: v.sum,
        hasAvatar: senderObj?.hasAvatar,
        hasDescription: senderObj?.hasDescription,
        hasGoogleAccount: !!senderObj?.sag?.email, // check is valid
        hasTwitterAccount: !!senderObj?.sat?.userName, // check twitter history length;
        numBadges: senderObj?.numBadges,
        numArticles: senderObj?.numArticles,
        numArticlesFeatured: senderObj?.numArticlesFeatured,
        numArticlesBeDonated: senderObj?.numArticlesBeDonated,
        numDonatedAuthors: senderObj?.numDonatedAuthors,
        numReadArticles: senderObj?.numReadArticles,
        numReadingDays: senderObj?.numReadingDays,
        numComments: senderObj?.numComments,

        numFollowers: senderObj?.numFollowers,
        numTravloggHolders: nftHoldersMap.get(k)?.travLoggers,
        numETHMainnetENSDomains: nftHoldersMap.get(k)?.ensDomains,
        numETHMainnetNFTs: nftHoldersMap.get(k)?.totalCount,
        gitcoinActivities: 0, // opChainLogs.filter((log) => log.address === k) .length,

        isRegisteredBefore: +senderObj?.userCreatedAt < +fromTime!,
        userCreatedAt: senderObj?.userCreatedAt,
        earliestArticlePublishedAt: senderObj?.earliestArticlePublishedAt,
        earliestDonatedAt: senderObj?.earliestDonatedAt?.toISOString(),
        // "title (earliest)",
        titles: senderObj?.titles,
        amounts: v.amounts,
        trustExpr: '',
      }
      const points = checkSendersTrustPoints(obj)
      obj.trustPoints = d3.sum(Object.values(points))
      obj.trustExpr = `(${util.inspect(points, {
        compact: true,
        breakLength: Infinity,
      })})`
      sendersOut.set(k, obj)
    })

    const sendersContent = (gist.files[`senders.tsv`] = {
      content: tsvFormat(Array.from(sendersOut.values())), // bufs.join('\n'),
    })
  }

  const aggPerProj = d3.rollup(
    seqs,
    (g) => ({
      amounts: g.map((d) => d.amount).sort(ascending),
      to: Array.from(new Set(g.map((d) => d.to))),
      latestBlockNumber: BigIntMath.max(
        ...g.map((d) => d.blockNumber)
      ) as bigint,
      // number_donations
      number_contributions: g.length,
      number_contribution_addresses: new Set(g.map((d) => d.from)).size,
      // .sort( d3.ascending // (a, b) => a == null || b == null ? NaN : a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN , // https://github.com/d3/d3-array/blob/main/src/ascending.js
      sum: g.reduce((acc, b) => acc + b.amount, 0n),
    }),
    (d) =>
      (dataHashMappings.get(d.dataHash)?.[0]?.dataHash ?? d.dataHash) || d.uri // d.dataHash || d.uri
  )
  console.log('for seqs contrib:', aggPerProj)

  const aggPerProjFrom = d3.rollup(
    seqs.filter(
      // filter out non-ipfs url
      // filter out if the sender has too low trust points;
      // filter out if the recipient address no longer has a matters account;
      ({ from, to, dataHash }) =>
        dataHash &&
        dataHashMappings.has(dataHash) &&
        (!isProd || // no threshold on web-develop
          sendersOut.get(from.toLowerCase()).trustPoints > 0) // threshold on Prod is 0 for now, will need to change later
    ),
    (g) => ({
      amounts: g.map((d) => d.amount),
      sum: g.reduce((acc, b) => acc + b.amount, 0n), // d3.sum(g, (d) => d.amount),
    }),
    (d) =>
      // dataHashMappings.has(d.dataHash)
      (dataHashMappings.get(d.dataHash)?.[0]?.dataHash ?? d.dataHash) || d.uri,
    (d) => d.from
  )

  const pair_totals = get_totals_by_pair(aggPerProjFrom)

  const clrs = calculate_clr(aggPerProjFrom, pair_totals, amountTotal)
  console.log('for seqs contrib pairs clrs:', clrs)

  // (1)
  // [cid, address, amount]
  const treeValues: [string, string, number][] = []

  // output distrib
  {
    const values = [] as any[]
    const clrsMap = new Map(clrs.map((r) => [r.id, r]))
    aggPerProj.forEach((v, proj) => {
      const {
        // number_contributions,
        // number_contribution_addresses,
        // contribution_amount, // clr_amount,
        clr_amount_pairw,
        clr_percent_pairw,
        clr_amount_orig,
        clr_percent_orig,
        shares,
        // url, created_at, author_eth, // tot, _q_summed,
      } = clrsMap.get(proj) || {}

      if (!clr_amount_orig || !shares) {
        console.error(
          new Date(),
          `wrong data "${proj}" no entry:`,
          clrsMap.get(proj)
        )
        return
      }

      const dataHashAttributes =
        dataHashRevisdedMappings.get(proj) ?? dataHashMappings.get(proj)
      values.push({
        id: proj,
        title: dataHashAttributes?.[0]?.title,
        number_contributions: aggPerProj.get(proj)?.number_contributions,
        number_contribution_addresses:
          aggPerProj.get(proj)?.number_contribution_addresses,
        contribution_amount: aggPerProj.get(proj)?.sum,
        clr_amount_pairw,
        clr_percent_pairw,
        clr_amount_orig,
        clr_percent_orig,
        shares,
        url: dataHashAttributes?.[0]?.url || proj,
        published: dataHashAttributes?.[0]?.createdAt,
        author_eth: dataHashAttributes?.[0]?.ethAddress,
        toAddress: aggPerProj.get(proj)?.to,
        userName: dataHashAttributes?.[0]?.userName,
        displayName: dataHashAttributes?.[0]?.displayName,
        email: dataHashAttributes?.[0]?.email,
        authorId: dataHashAttributes?.[0]?.authorId,
        // created_at,
        // author_eth, // tot, _q_summed,
        amounts: aggPerProj.get(proj)?.amounts,
      })

      // [ id, address, amount ],
      treeValues.push([
        proj,
        dataHashAttributes?.[0]?.ethAddress,
        // clr_amount_orig.toString(),
        shares,
      ])
    })

    const distrib = (gist.files[`distrib.tsv`] = {
      content: tsvFormat(values), // bufs.join('\n'),
    })

    const distribJSON = (gist.files[`distrib.json`] = {
      content:
        '[ ' +
        values
          // .filter(({ clr_amount_orig }) => clr_amount_orig > 0n)
          .map(
            ({
              id,
              title,
              clr_amount_orig,
              shares,
              url,
              created_at,
              author_eth,
              to_address,
              userName,
              displayName,
            }) =>
              JSON.stringify(
                {
                  id,
                  title,
                  clr_amount: clr_amount_orig,
                  shares,
                  url,
                  created_at,
                  eth_address:
                    aggPerProj.get(id)?.to?.[0] ||
                    dataHashMappings.get(id)?.[0]?.ethAddress ||
                    author_eth,

                  userName,
                  displayName,
                },
                replacer
              )
          )
          .join(',\n') +
        ' ]',
    })
  }

  // (2)
  const tree = StandardMerkleTree.of(treeValues, [
    'string',
    'address',
    'uint256',
  ])

  // (3)
  console.log(`Merkle Root with ${treeValues.length} entries:`, tree.root)

  gist.files['README.md'].content = `${runningBetween},

\`\`\`js
// from Optimism onChain:
${util.inspect(
  statsSummary, // replacer
  { compact: false }
  // (_, v) => (typeof v === 'bigint' ? +Number(v) : v),
  // 2
)}

// from MattersDB:
${util.inspect(
  {
    numIPFSCids: ipfsArticleHashes.length,
    ...usdtDonationsStats,
  },
  { compact: false }
)}

// for Distribute
${util.inspect(
  {
    amountTotal, // : util.format('%i', amountTotal),
    sharesTotal,
  },
  { compact: false }
)}
\`\`\`

Merkle Tree Root (with ${treeValues.length} entries): \`${tree.root}\`

this is analyzing results with [Quadratic Funding score calcuation with Pairwise Mechanism](https://github.com/gitcoinco/quadratic-funding?tab=readme-ov-file#implementation-upgrade-the-pairwise-mechanism)`

  // (4) // write out to somewhere S3 bucket?
  // fs.writeFileSync("out/tree.json", JSON.stringify(tree.dump(), null, 2));
  // console.log("Merkle-Tree Dump:", JSON.stringify(tree.dump(), null, 2));
  gist.files[`treedump.json`] = {
    content: JSON.stringify(tree.dump(), null, 2),
  }

  const existingRounds: any[] = []
  try {
    const res = await s3GetFile({
      bucket: MattersBillboardS3Bucket, // 'matters-billboard',
      key: `${s3FilePathPrefix}/rounds.json`,
    }) // .then((res) => console.log(new Date(), `s3 read existing rounds:`, res))
    console.log(
      new Date(),
      `s3 get existing rounds:`,
      res.ContentLength,
      res.ContentType
    )
    if (res.Body && res.ContentLength! > 0) {
      const existings = JSON.parse(await res.Body.transformToString()) as any[]
      existingRounds.push(...existings.filter(({ draft }) => !draft))
      console.log(
        new Date(),
        `prepend ${existingRounds.length} existing rounds:`
      )
    }
  } catch (err) {
    console.error(new Date(), 'ERROR in reading existing rounds:', err)
  }

  const currRoundPath = `${isProd ? 'optimism' : 'opSepolia'}-${fromBlock}-${
    toBlock! >= latestOPBlockNumber // current pending rounds?
      ? maxBlockNumber
      : toBlock!
  }`

  const rounds = existingRounds
    // .filter(({ draft }) => !draft)
    .concat([
      {
        id: `#${existingRounds.length + 1}`,
        root: tree.root,
        chain: isProd ? 'Optimism' : 'OpSepolia',
        dirpath: currRoundPath, // `${ isProd ? 'optimism' : 'opSepolia' }-${fromBlock}-${toBlock!}`,
        fromTime,
        toTime,
        fromBlock,
        toBlock,
        minBlockNumber,
        maxBlockNumber,
        // treeValues is list of tuple(cid string, address, share)
        cidsCount: new Set(Array.from(treeValues, (d) => d[0])).size,
        authorsCount: new Set(Array.from(treeValues, (d) => d[1])).size,
        amountTotal,
        sharesTotal: d3.sum(Array.from(treeValues, (d) => d[2])),
        // stats: statsSummary, // { fromAddresses:  },
        draft: finalize ? undefined : true, // this item is a draft, to be replaced to final
      },
    ])
  gist.files[`rounds.json`] = {
    // JSON.stringify(rounds, null, 2),
    content:
      '[ ' +
      rounds
        .map((row) =>
          JSON.stringify(
            row,
            (_, v) =>
              typeof v === 'bigint'
                ? v.toString() // util.format("%i", v) // +Number(v) // current numbers are all < Number.MAX_SAFE_INTEGER // 9_007_199_254_740_991
                : v // replacer,
            // 2 // omit to be compact
          )
        )
        .join(',\n') +
      ' ]',
  }

  let gist_url: string | undefined = undefined
  if (write_gist && GITHUB_TOKEN) {
    // skip if no GITHUB_TOKEN
    await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(gist),
    })
      .then(async (res) => {
        try {
          return await res.json()
        } catch (err) {
          console.log(new Date(), `failed parse as json:`, res.ok, res.headers)
          console.log(await res.text())
        }
      })
      .then((data) => {
        // console.log(data);
        gist_url = data?.html_url
      })
      .catch((err) => {
        console.error(new Date(), `failed POST to gist:`, err, 'with:', gist)
      })
  }

  await Promise.all(
    [
      'README.md',
      'distrib.json',
      'distrib.tsv',
      'senders.tsv',
      'treedump.json',
    ].map(
      (filename) =>
        s3PutFile({
          Bucket: MattersBillboardS3Bucket, // 'matters-billboard',
          Key: `${s3FilePathPrefix}/${currRoundPath}/${filename}`,
          Body: gist.files[filename].content,
        }) // .then((res) => console.log(new Date(), `s3 treedump:`, res));
    )
  )

  await s3PutFile({
    Bucket: MattersBillboardS3Bucket, // 'matters-billboard',
    Key: `${s3FilePathPrefix}/rounds.json`,
    Body: gist.files[`rounds.json`].content,
    // ACL: "public-read",
    ContentType: 'application/json',
  }).then((res) => console.log(new Date(), `s3 saved rounds:`, rounds))

  return { root: tree.root, gist_url }

  /*
   * calculates the clr amount at the given threshold and total pot
   **/
  function calculate_clr(
    aggregated_contributions: Map<
      string,
      Map<string, { amounts: bigint[]; sum: bigint }>
    >, // : PairNumber, // Map<string, Map<string, bigint>>
    pair_totals: PairNumber,
    // threshold: number,
    total_pot: bigint,
    total_shares = 10_000,
    {
      M = 25_000_000n, // 25 USDT Dollars
      N = 1_000n, // median is $0.1 USDT Dollar
    } = {}
  ) {
    let bigtot = 0n
    let _q_bigsummed = 0.0
    const totals = []
    for (const [proj, contribz] of aggregated_contributions.entries()) {
      let tot = 0n
      let _num = 0,
        _sum = 0n,
        _q_summed = 0.0
      // const _amounts = [];

      // pairwise match
      for (const [k1, v1] of contribz.entries()) {
        _num++
        _sum += v1.sum
        // _amounts.push(...v1.amounts);
        _q_summed += Math.sqrt(Number(v1.sum))

        for (const [k2, v2] of contribz.entries()) {
          if (k2 > k1) {
            // quadratic formula
            tot +=
              (BigIntMath.sqrt(v1.sum * v2.sum) * // k(i,j) below
                M) /
              ((pair_totals.get(k1)?.get(k2) ?? 0n) + M)
          }
        }

        if (tot === 0n && contribz.size === 1)
          tot += N * BigIntMath.sqrt(Array.from(contribz.values())[0].sum)
      }

      bigtot += tot
      _q_bigsummed += _q_summed

      totals.push({
        id: proj,
        // title: dataHashMappings.get(proj)?.title || "",
        // number_contributions: aggPerProj.get(proj)?.number_contributions ?? _num,
        // number_contribution_addresses: _num,
        // contribution_amount: _sum,
        clr_amount: tot,
        clr_amount_pairw: 0n,
        clr_percent_pairw: 0.0,
        clr_amount_orig: 0n,
        clr_percent_orig: 0.0,
        shares: 0, // of 10_000 shares, simulate floating points
        // url: dataHashMappings.get(proj)?.url || proj,
        created_at: dataHashMappings.get(proj)?.[0]?.createdAt,
        author_eth: dataHashMappings.get(proj)?.[0]?.ethAddress,
        tot,
        _q_summed,
        // amounts: _amounts.sort(ascending),
      })
    }

    for (const proj of totals) {
      proj.clr_percent_pairw = Number(proj.tot) / Number(bigtot)
      proj.clr_amount_pairw =
        (total_pot * BigInt(Math.round(proj.clr_percent_pairw * 1e18))) /
        BigInt(1e18)
      proj.clr_percent_orig = proj._q_summed / _q_bigsummed
      proj.clr_amount_orig =
        BigInt(Math.round(Number(total_pot) * proj.clr_percent_orig * 1e6)) /
        1_000_000n
      proj.shares = Math.round((total_shares * proj._q_summed) / _q_bigsummed)
    }

    if (totals.length >= 2) {
      // after some float-point numbers calculation, the totals might not add up, need to adjust to match total;
      let rem = total_pot
      let firstNonZero = totals.findIndex((p) => p.clr_amount_pairw > 0n)

      for (let i = firstNonZero + 1; i < totals.length; i++) {
        rem -= totals[i].clr_amount_pairw
      }
      if (totals[firstNonZero].clr_amount_pairw != rem) {
        console.log(
          new Date(),
          `adjust [${firstNonZero}].clr_amount_pairw: from ${totals[firstNonZero].clr_amount_pairw} to ${rem}`
        )
        totals[firstNonZero].clr_amount_pairw = rem
      }

      rem = total_pot
      firstNonZero = totals.findIndex((p) => p.clr_amount_orig > 0n)
      for (let i = firstNonZero + 1; i < totals.length; i++) {
        rem -= totals[i].clr_amount_orig
      }
      if (totals[firstNonZero].clr_amount_orig != rem) {
        console.log(
          new Date(),
          `adjust [${firstNonZero}].clr_amount_orig: from ${totals[firstNonZero].clr_amount_orig} to ${rem}`
        )
        totals[firstNonZero].clr_amount_orig = rem
      }

      let remsh = total_shares
      firstNonZero = totals.findIndex((p) => p.shares > 0)
      for (let i = firstNonZero + 1; i < totals.length; i++) {
        remsh -= totals[i].shares
      }
      if (totals[firstNonZero].shares != remsh) {
        console.log(
          new Date(),
          `adjust [${firstNonZero}].shares: from ${totals[firstNonZero].shares} to ${remsh}`
        )
        totals[firstNonZero].shares = remsh
      }
    }

    console.log(
      `calculate_clr: ${bigtot} distributed to ${totals.length} projects`,
      { bigtot }
    )

    return totals
  }
}

interface AuthorDistrib {
  // author: string;
  clr_amount: string
  title: string
  url: string
  eth_address: string
  userName: string
  displayName: string
  email: string
  language: Language
}

// endBlockNumber: bigint,
export async function sendQfNotifications(
  distribs: AuthorDistrib[],
  roundEndedAt: Date | string,
  doNotify = false
) {
  console.log(new Date(), `sendQfNotifications with:`, {
    distribs,
    roundEndedAt,
    doNotify,
  })

  const authorGroups = d3.rollup(
    distribs,
    (groups) =>
      // d3.sum does not work on BigInt;
      groups.reduce((acc, d) => acc + BigInt(d.clr_amount), 0n),
    (d) => d.userName
  )
  console.log(
    new Date(),
    `processing ${distribs.length} distribs to ${authorGroups.size} authors:`,
    authorGroups,
    'sum:',
    Array.from(authorGroups.values()).reduce((acc, n) => acc + n, 0n)
  )

  const authors =
    await sqlRO`-- find out authors in the distribs; send qf distrib notifications to qualified authors
SELECT -- DISTINCT ON (u.id)
  u.*, (crypto_wallet.count_address_r14days > 1) AS wallet_changes
FROM public.user u
LEFT JOIN (
  SELECT user_id, COUNT(DISTINCT address) ::int AS count_address_r14days,
    MAX(updated_at) AS updated_at
  FROM public.crypto_wallet_signature
  WHERE updated_at >= ${roundEndedAt} ::date - '14 days' ::interval
  GROUP BY 1
) crypto_wallet ON user_id=u.id
WHERE user_name = ANY (${Array.from(authorGroups.keys())})
  AND state IN ('active')
  AND ((extra->'lastQfNotifiedAt') IS NULL OR (extra->>'lastQfNotifiedAt') ::timestamp <= ${roundEndedAt} ::timestamp)
-- ORDER BY u.id, crypto_wallet.updated_at DESC NULLS LAST ; `
  console.log(
    new Date(),
    `send qf notices to ${authors.length} authors:`,
    authors
  )
  if (!(authors.length > 0)) {
    return void 0 as any
  }

  const items = authors.map(
    ({ id, userName, displayName, email, language, walletChanges }) => ({
      userId: id as string,
      userName: userName as string,
      displayName: displayName as string,
      email: email as string,
      language: language as Language,
      walletChanges: walletChanges as boolean,
      amount: showAmount(authorGroups.get(userName)!),
    })
  )
  console.log(`sending in-site ${authors.length} notifications:`, items)

  if (!doNotify) return

  await Promise.all([
    sendQfNotificationEmails(items, doNotify), // make sure finishes sending emails first...

    sendQfNotifInsite(items, doNotify),
  ])

  const retDoUpdateLastNotified = await sql`-- do update
UPDATE public.user
SET extra = jsonb_set(COALESCE(extra, '{}'::jsonb), '{lastQfNotifiedAt}', ${new Date().toISOString()} ::jsonb )
WHERE user_name = ANY (${items.map(({ userName }) => userName)})
RETURNING * ; `

  console.log(
    `updated ${retDoUpdateLastNotified.length}`,
    retDoUpdateLastNotified
  )

  return items // authors // sent
}

// show bigint numbers like 3_000_000 to 3.00 USDT
function showAmount(amount: bigint) {
  if (amount < 1000n) return `<0.01`
  // bigint division to always truncate down
  else return `${(Number(amount / 10000n) / 100).toFixed(2)}` // ≈
}

const getNoticeMessage = (
  language: Language,
  amount: string | number,
  walletChanges?: boolean
): string => {
  switch (language) {
    case 'en':
      return walletChanges
        ? `You've received a ${amount} USDT funding from Billboard. Due to recent wallet address changes, the funding will be split according to the proportion of support received. Switch wallets to collect funds separately. Click this notification to go to the claim page.`
        : `You've received a ${amount} USDT funding from Billboard. Click this notification to go to the claim page.`
    case 'zh_hans':
      return walletChanges
        ? `你已获得 Billboard 配捐共 ${amount} USDT，因过去 14 天中有更换钱包地址，配捐金额将会按各钱包收到的支持比例拆分，请切换钱包地址分别领取。点击此则通知前往领取页面`
        : `你已获得 Billboard 配捐共 ${amount} USDT，点击此则通知前往领取页面`
    case 'zh_hant':
    default:
      return walletChanges
        ? `你已獲得 Billboard 配捐共 ${amount} USDT，因過去 14 天中有更換錢包地址，配捐金額將會按各錢包收到的支持比例拆分，請切換錢包地址分別領取。點擊此則通知前往領取頁面`
        : `你已獲得 Billboard 配捐共 ${amount} USDT，點擊此則通知前往領取頁面`
  }
}

async function sendQfNotifInsite(
  items: Array<{
    userId: string | number
    userName: string
    displayName: string
    email: string
    language: Language
    amount: number | string
    walletChanges?: boolean
  }>,
  doNotify = false
) {
  if (!doNotify) return

  const allNotices = items.map(
    ({ userId, language, amount, walletChanges, ...rest }) => ({
      userId, // language,
      message: getNoticeMessage(language, amount, walletChanges),
    })
  )
  const allMessages = Array.from(
    new Set(allNotices.map(({ message }) => message))
  )

  const messageIds = await sql<
    Array<{ id: number | string; noticeType: string; message: string }>
  >`SELECT * FROM notice_detail WHERE created_at>=CURRENT_DATE -'1 week'::interval AND notice_type='official_announcement' AND message=ANY(${allMessages}) ;`
  const messageIdsMap = new Map(
    messageIds.map(({ id, message }) => [message, id])
  )
  console.log(`got existings messageIds:`, messageIdsMap)

  if (messageIdsMap.size < allMessages.length) {
    const missingOnes = allMessages.filter((msg) => !messageIdsMap.has(msg))
    const newInserted =
      await sql`INSERT INTO notice_detail(notice_type, message, data) SELECT * FROM UNNEST(
    ${sql.array(
      missingOnes.map(() => 'official_announcement'),
      ARRAY_TYPE
    )} ::text[],
    ${sql.array(
      missingOnes, // all missing messages
      ARRAY_TYPE
    )} ::text[],
    ${sql.array(
      missingOnes.map(() => JSON.stringify({ link: claimLink })), // all missing messages
      ARRAY_TYPE
    )} ::jsonb[]
) RETURNING * ;`

    console.log(`got new inserted messageIds:`, newInserted)
    newInserted.forEach(({ id, message }) => messageIdsMap.set(message, id))
  }

  console.log(`got all messageIds:`, messageIdsMap)

  const retNewNotices = await sql`-- insert new notices;
WITH new_notices AS (
  INSERT INTO notice(uuid, notice_detail_id, recipient_id)
  SELECT * FROM UNNEST(
      ${sql.array(
        allNotices.map(() => crypto.randomUUID()),
        ARRAY_TYPE
      )} ::uuid[],
      ${sql.array(
        allNotices.map(({ message }) => messageIdsMap.get(message)!), // notice_detail_id,
        ARRAY_TYPE
      )} ::int[],
      ${sql.array(
        allNotices.map(({ userId }) => userId), // recipient_id
        ARRAY_TYPE
      )} ::int[]
  )
  ON CONFLICT (uuid) DO NOTHING
  RETURNING *
)

SELECT nn.*,
  user_name, display_name, state, u.created_at AS user_created_at,
  notice_type, message, data AS notice_data
FROM new_notices nn
LEFT JOIN notice_detail ON notice_detail_id=notice_detail.id
LEFT JOIN public.user u ON recipient_id=u.id
-- WHERE u.state IN ('active') -- NOT IN ('archived', 'banned', 'frozen')
ORDER BY nn.id DESC ;`

  console.log(`got all retNewNotices:`, retNewNotices)
}

const mail = new Mail()

// the distrib.json file format for each author;
export async function sendQfNotificationEmails(
  items: Array<{
    userName: string
    displayName: string
    email: string
    language: Language
    amount?: number | string
    walletChanges?: boolean
  }>,
  doNotify = false
) {
  // if (!doNotify) return

  return Promise.allSettled(
    items.map(
      ({ userName, displayName, email, language, amount, walletChanges }) => {
        console.log(`send QF-fund mail notification to:`, {
          userName,
          displayName,
          email,
          language,
          amount,
          walletChanges,
        })
        if (!email) {
          return // can't send if no email
        }
        if (!doNotify) return

        return mail
          .send({
            from: EMAIL_FROM_ASK,
            templateId: getTemplateId(language),
            personalizations: [
              {
                to: email,
                dynamicTemplateData: {
                  subject: getSubject(language),
                  displayName,
                  siteDomain,
                  amount,
                  walletChanges,
                  claimLink,
                  billboardUrl,
                  billboardAnnouncementLink:
                    language === 'en'
                      ? `https://matters.town/@web3/554164-test-lauch-of-on-chain-advertisment-protocol-with-80-revenue-back-to-creators-bafybeifsq4u5wewvwsogeo3nxilu4lycxjsed7lfilteikskbiig46qaei?locale=en`
                      : 'https://matters.town/@hi176/554162-matters-試驗全新鏈上廣告機制-收入-80-配捐創作者-bafybeih5wa5s2ndr5ahsxwj3rlwo25erjggmvvdnr6s5mnocngiqk6224e',
                },
              },
            ],
          })
          .then((res: any) => console.log(`mail "${email}" res:`, res))
          .catch((err: Error) => console.error(`mail "${email}" ERROR:`, err))
      }
    )
  )
}

function getTemplateId(language: Language): string {
  const templateIdsDev = {
    zh_hant: 'd-dd6f9660b30a40eaa831254275c4b0b6',
    zh_hans: 'd-f33d89d33a72419dbfc504c09ca84f81',
    en: 'd-6c33968152a14578918789241f63279a',
  }
  const templateIdsProd = {
    // branch out when necessary
    zh_hant: 'd-dd6f9660b30a40eaa831254275c4b0b6',
    zh_hans: 'd-f33d89d33a72419dbfc504c09ca84f81',
    en: 'd-6c33968152a14578918789241f63279a',
  }
  return (isProd ? templateIdsProd : templateIdsDev)[language]
}
function getSubject(language: Language): string {
  switch (language) {
    case 'zh_hans':
      return 'Matters 用户专属，Billboard 广告收入 USDT 配捐送达啰！开信了解如何领取 💖'
    case 'en':
      return 'Matters users only, USDT matching funds from Billboard advertising revenue are on their way! Open the email and claim it 💖'
    default:
    case 'zh_hant':
      return 'Matters 用戶專屬，Billboard 廣告收入 USDT 配捐送達囉！開信了解如何領取 💖'
  }
}

// https://github.com/d3/d3-array/blob/main/src/quantile.js#L23
export function quantileSorted(
  values: bigint[],
  p: 'median' | 'p50' | 'p75' | 'p25'
) {
  if (!(n = values.length)) return
  if (n < 2) return values[0]

  switch (p) {
    case 'median':
    case 'p50':
      i = (n - 1) * 0.5
      break
    case 'p25':
      i = (n - 1) * 0.25
      break
    case 'p75':
      i = (n - 1) * 0.75
      break
  }
  // eslint-disable-next-line no-var
  var n,
    i, // = (n - 1) * p,
    i0 = Math.floor(i),
    value0 = values[i0],
    value1 = values[i0 + 1]
  console.log('quantile:', { p, [i0]: value0, [i0 + 1]: value1 })
  return (
    value0 +
    (i === i0 // if exactly on a index;
      ? 0n
      : p === 'median' || p === 'p50'
      ? (value1 - value0) >> 1n
      : p === 'p25'
      ? (value1 - value0) >> 2n
      : p === 'p75'
      ? ((value1 - value0) >> 2n) * 3n
      : 0n)
  )
}

/*     translates django grant data structure to a list of lists
 *     returns:
        list of lists of grant data
            [[grant_id (str), user_id (str), contribution_amount (float)]]
 * */
function translate_data(
  grants_data: Array<{
    id: string
    contributions: Array<{ [key: string]: string }>
  }>
) {
  return grants_data
    .map(({ id, contributions }) =>
      contributions.map((obj) => [
        id,
        Object.keys(obj)[0], // user_id,
        Object.values(obj)[0], // amount,
      ])
    )
    .flat(1)
}

type PairNumber = Map<string, Map<string, bigint>>

export // get pair totals
function get_totals_by_pair(
  contrib_dict: Map<string, Map<string, { sum: bigint }>>
) {
  const tot_overlap: PairNumber = new Map()
  for (const [_, contribz] of contrib_dict.entries()) {
    for (const [k1, v1] of contribz.entries()) {
      // if (!tot_overlap.has(k1)) tot_overlap.set(k1, new Map());
      const tm = tot_overlap.get(k1) || new Map()
      for (const [k2, v2] of contribz.entries()) {
        tm.set(k2, BigIntMath.sqrt(v1.sum * v2.sum) + (tm.get(k2) ?? 0n))
      }
      if (!tot_overlap.has(k1)) tot_overlap.set(k1, tm)
    }
  }

  return tot_overlap
}

export function replacer(_: string, v: any) {
  switch (typeof v) {
    case 'bigint':
      return v.toString()
    default:
      return v
  }
}

// https://github.com/d3/d3-array/blob/main/src/ascending.js
function ascending(a: any, b: any) {
  // prettier-ignore
  return a == null || b == null ? NaN : a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}

export async function checkDropEventsAndNotifs() {
  const logs = await publicClientOpMainnet.getLogs({
    // Billboard (Distribution): 0xbc4bd6f101e128b4b403f8d3a7a4f2976fbf8a1c
    address: '0xbc4bd6f101e128b4b403f8d3a7a4f2976fbf8a1c',
    // parseAbiItem('event Drop(string indexed, uint256)'),
    event: {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'string',
          name: 'treeId_',
          type: 'string',
        },
        {
          indexed: false,
          internalType: 'uint256',
          name: 'amount_',
          type: 'uint256',
        },
      ],
      name: 'Drop',
      type: 'event',
    },
    fromBlock: 8439158n, // the contract creation block; 8571271n,
  })
  logs.reverse() // get descending order;

  console.log(
    new Date(),
    `got ${logs?.length} events:`,
    logs?.slice(0, 3),
    `with latest Drop event blockNumber:`,
    logs?.[0]?.blockNumber
  )

  // await sendQfNotifications([], logs?);
}
