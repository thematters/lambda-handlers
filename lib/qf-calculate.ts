// import fs from "fs";

import type { Language } from "./types";

import util from "util";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { createPublicClient, http, fallback, getContract } from "viem";
import { mainnet, optimism, optimismSepolia, polygon } from "viem/chains";

import * as d3 from "d3-array";

import { sqlRO } from "../lib/db.js";
import { BigIntMath } from "../lib/bigint-math.js";
import { PolygonScanAPI } from "../lib/polygonscan.js";
import { s3PutFile } from "../lib/utils/aws.js";
import { Mail } from "./mail.js";
import { DAY, EMAIL_FROM_ASK } from "./constants/index.js";

const siteDomain = process.env.MATTERS_SITE_DOMAIN || "";
const isProd = siteDomain === "https://matters.town";

const MATTERS_ALCHEMY_KEY = process.env.MATTERS_ALCHEMY_KEY || "";
const MATTERS_ALCHEMY_KEY_POLYGON =
  process.env.MATTERS_ALCHEMY_KEY_POLYGON ||
  process.env.MATTERS_ALCHEMY_KEY ||
  "";
const MATTERS_ALCHEMY_KEY_MAINNET =
  process.env.MATTERS_ALCHEMY_KEY_MAINNET ||
  process.env.MATTERS_ALCHEMY_KEY ||
  "";
const MATTERS_ALCHEMY_KEY_OPTIMISM =
  process.env.MATTERS_ALCHEMY_KEY_OPTIMISM ||
  process.env.MATTERS_ALCHEMY_KEY ||
  "";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

const AddressTravLoggerContract = "0x8515ba8EF2CF2F2BA44b26fF20337D7A2bc5e6D8";
const AddressENSDomainContract = "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85";

// const alchemy = ;

export const pubClientMainnet = createPublicClient({
  chain: mainnet,
  transport: fallback([
    http(`https://eth-mainnet.g.alchemy.com/v2/${MATTERS_ALCHEMY_KEY_MAINNET}`),
  ]),
});
export const pubClientOptimism = createPublicClient({
  chain: optimism,
  transport: fallback([
    http(
      `https://opt-mainnet.g.alchemy.com/v2/${MATTERS_ALCHEMY_KEY_OPTIMISM}`
    ),
  ]),
});
export const pubClientOptimismSepolia = createPublicClient({
  chain: optimismSepolia,
  transport: fallback([
    http(
      `https://opt-sepolia.g.alchemy.com/v2/${MATTERS_ALCHEMY_KEY_OPTIMISM}`
    ),
  ]),
});

export const pubClientPolygon = createPublicClient({
  chain: polygon,
  transport: fallback([
    http(
      `https://polygon-mainnet.g.alchemy.com/v2/${MATTERS_ALCHEMY_KEY_POLYGON}`
    ), // alchemy, // infura
  ]), // http(),
});

const blockNumbers = await Promise.all([
  pubClientMainnet.getBlockNumber(),
  pubClientOptimism.getBlockNumber(),
  pubClientPolygon.getBlockNumber(),
]);
console.log(new Date(), "blockNumbers [mainnet, OP, Polygon]:", blockNumbers);

export const curationContractAddress =
  "0x5edebbdae7b5c79a69aacf7873796bb1ec664db8";
export const curationContractABI = [
  // { inputs: [], name: "InvalidURI", type: "error" },
  // { inputs: [], name: "SelfCuration", type: "error" },
  // { inputs: [], name: "TransferFailed", type: "error" },
  // { inputs: [], name: "ZeroAddress", type: "error" },
  // { inputs: [], name: "ZeroAmount", type: "error" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      {
        indexed: true,
        internalType: "contract IERC20",
        name: "token",
        type: "address",
      },
      { indexed: false, internalType: "string", name: "uri", type: "string" },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Curation",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      { indexed: false, internalType: "string", name: "uri", type: "string" },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Curation",
    type: "event",
  },
  // { inputs: [ { internalType: "address", name: "to_", type: "address" }, { internalType: "contract IERC20", name: "token_", type: "address" }, { internalType: "uint256", name: "amount_", type: "uint256" }, { internalType: "string", name: "uri_", type: "string" }, ], name: "curate", outputs: [], stateMutability: "nonpayable", type: "function", },
  // { inputs: [ { internalType: "address", name: "to_", type: "address" }, { internalType: "string", name: "uri_", type: "string" }, ], name: "curate", outputs: [], stateMutability: "payable", type: "function", },
  // { inputs: [{ internalType: "bytes4", name: "interfaceId_", type: "bytes4" }], name: "supportsInterface", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function", },
] as const;

export const gitcoinContractAddress =
  "0x6726fe9c89fb04eaef388c11cf55be6aa0a62fb9";
export const gitcoinContractABI = [
  // ...
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "index",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "status",
        type: "uint256",
      },
    ],
    name: "ApplicationStatusesUpdated",
    type: "event",
  },
] as const;

export const POINTS = {
  // mattersHasArticlesBeFeatured: 2.0, // has articles be featured
  mattersHasDonatedFeatured: 2.0, // has donated to featured articles
  mattersNumDonatedAuthors: 2.0, // has donated to others authors' articles
  mattersNumArticlesBeDonated: 2.0, // has articles be donated
  mattersReadingPoints: 2.0, // has read articles>= 30 && has reading_days >= 5
  mattersComments: 1.0, // 評論 ≥ 10
  mattersHasBadgedFollowers: 1.0, // has followers with Traveloggers、Badge、ENS
  mattersHas5Followers: 1.0, // need numFollowers >= 5
  mattersAgeBefore: 1.0, // need userRegistraiton time < period beginning
  mattersBadges: 6.0, // need hold badges >= 1
  mattersTravloggHolders: 6.0, // need hold TravloggNFT >= 1

  gitcoinActivities: 3.0, // gitcoin donations >= 1

  hasSocialTwitter: 3.0,
  hasSocialGoogle: 1.0,

  ethENSDomains: 2.0,
  ethNFTs: 1.0, // any other NFTs on ETH mainnet
} as const;

export async function calculateQFScore({
  // between = ["2023-12-01", "2023-12-31T23:59:59.999Z"],
  fromTime,
  toTime,
  fromBlock,
  toBlock,
  appendToRounds,
  amount = 500_000_000n, // 500 USDT
  write_gist,
}: {
  // between: string[];
  fromTime?: Date | string;
  toTime?: Date | string;
  fromBlock?: bigint;
  toBlock?: bigint;
  amount?: bigint;
  appendToRounds?: boolean;
  write_gist?: boolean;
}) {
  const started = new Date();
  const fromTimestamp = Date.parse(fromTime as string);
  let toTimestamp = Date.parse(toTime as string); // , +started);
  if (
    Number.isNaN(fromTimestamp) &&
    Number.isNaN(toTimestamp) &&
    !(fromBlock && toBlock)
  ) {
    // wrong input; need either fromTime/toTime OR fromBlock/toBlock
    void 0; // TODO
  }

  if (toTimestamp > +started) {
    toTimestamp = +started;
    toTime = started.toISOString();
  }

  if (Number.isNaN(fromTimestamp)) {
    [fromTime, toTime] = await Promise.all([
      PolygonScanAPI.getBlockReward({
        blockno: fromBlock!,
      }).then((res) => new Date(res?.timeStamp * 1e3)),
      PolygonScanAPI.getBlockReward({
        blockno: toBlock!,
      }).then((res) => new Date(res?.timeStamp * 1e3)),
    ]);
    console.log(new Date(), "setting timestamps from polygon block numbers:", {
      fromTime,
      toTime,
      fromBlock,
      toBlock,
    });
  }
  if (!(fromBlock && toBlock)) {
    // to consider Optimism Chain blocks later;
    [fromBlock, toBlock] = await Promise.all(
      // between.map(time =>
      [
        PolygonScanAPI.getBlockFromTimestamp({
          timestamp: Math.floor(fromTimestamp / 1e3),
          closest: "before",
        }),
        PolygonScanAPI.getBlockFromTimestamp({
          timestamp: Math.ceil(toTimestamp / 1e3),
          closest: toTimestamp >= +started ? "before" : "after",
        }),
      ]
    );
    console.log(new Date(), "get polygon block numbers from timestamps:", {
      fromTime,
      toTime,
      fromBlock,
      toBlock,
    });
  }
  console.log(new Date(), `find out events between:`, {
    fromTime,
    toTime,
    fromBlock,
    toBlock,
  });

  const logs = (await pubClientPolygon.getContractEvents({
    address: curationContractAddress,
    abi: curationContractABI,
    eventName: "Curation",
    // fromBlock: 50735950n, // 34564355n is the creation block of the contract at Oct-20-2022 04:52:52 AM +UTC;
    fromBlock, // : 34000000n,
    // toBlock: 51484855n,
    toBlock,
  })) as any[];
  logs.reverse(); // get from latest to earliest
  console.log(
    new Date(),
    `found related logs:`,
    logs.filter((d) =>
      d?.args?.uri?.match(
        /QmbS4V7HUP9GWjNpnqxQB6SonuM3vkdNc2RyTkp98duEG8|QmRVVUZi38cj7TAJRvhwopf9Br4YN3T1PTA3jMRs41zwC7/
      )
    )
  );

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
      // dataHash: uri?.match(/^ipfs:\/\/(Qm[A-Za-z0-9]{44})$/)?.[1] || null,
      dataHash: uri?.match(/^ipfs:\/\/(Qm[A-Za-z0-9]{44})$/)?.[1],
      // uri?.startsWith("ipfs://") ? uri.substring(7) : null,
    })
  );
  const seqsByDataHash = d3.group(seqs, (d) => d.dataHash);
  console.log(
    new Date(),
    `found ${seqs?.length} seqs between;`,
    seqs.filter((d) =>
      d?.uri?.match(
        /QmbS4V7HUP9GWjNpnqxQB6SonuM3vkdNc2RyTkp98duEG8|QmRVVUZi38cj7TAJRvhwopf9Br4YN3T1PTA3jMRs41zwC7/ // the revised IDs
      )
    ),
    seqsByDataHash.get("QmbS4V7HUP9GWjNpnqxQB6SonuM3vkdNc2RyTkp98duEG8"),
    seqsByDataHash // new Set(seqs.map(({ dataHash }) => dataHash).filter(Boolean))
  );

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
  };
  const [minBlockNumber, maxBlockNumber] = d3.extent(
    // BigIntMath.max(
    logs.map((log) => log.blockNumber)
  ); // as bigint;
  logs.forEach((log: any) => {
    stats.blockNumbers.add(log.blockNumber);
    stats.transactionHashes.add(log.transactionHash);
    stats.fromAddresses.add(log.args.from);
    stats.toAddresses.add(log.args.to);
    stats.allAddresses.add(log.args.from);
    stats.allAddresses.add(log.args.to);
    stats.token.add(log.args.token);
    stats.uri.add(log.args.uri);
    stats.amount.push(log.args.amount);
    stats.eventName.add(log.eventName);
  });
  stats.amount.sort(
    ascending //(a, b) =>
    // https://github.com/d3/d3-array/blob/main/src/ascending.js
    // a == null || b == null ? NaN : a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN
  );

  const nftHoldersMap = new Map<
    string,
    {
      travLoggers?: number;
      ensDomains?: number;
      totalCount?: number;
      totalContracts?: number;
    }
  >();
  stats.fromAddresses.forEach(async (address) => {
    const res = await getNFTs(address);
    // console.log( new Date(), `getting NFTs for Address:${nftHoldersMap.size}:`, address, res);
    const travLoggers = res?.contracts?.find(
      (row: any) => row?.address === AddressTravLoggerContract
    )?.totalBalance;
    const ensDomains = res?.contracts?.find(
      (row: any) => row?.address === AddressENSDomainContract
    )?.totalBalance;
    const totalCount = // d3.sum(
      res?.contracts.reduce(
        (acc: number, row: any) => acc + +row.totalBalance,
        0
      );
    nftHoldersMap.set(address.toLowerCase(), {
      travLoggers: travLoggers && parseInt(travLoggers),
      ensDomains: ensDomains && parseInt(ensDomains),
      totalCount,
      totalContracts: res?.totalCount,
    });
    // console.log( new Date(), `getting NFTs for Address:${nftHoldersMap.size}:`, address, nftHoldersMap.get(address));
  });
  console.log(
    new Date(),
    `got nftHolders for ${stats.fromAddresses.size} addresses:`
    // nftHoldersMap
  );

  const statsAmount = {
    count: stats.amount.length,
    min: stats.amount[0],
    max: stats.amount[stats.amount.length - 1],
    // d3.sum(stats.amount), // stats.amount.reduce((acc, amount) => acc + amount, 0n),
    sum: stats.amount.reduce((acc, amount) => acc + amount),
    // d3.median(stats.amount),
    median:
      stats.amount.length % 2 === 1
        ? stats.amount[stats.amount.length >>> 1]
        : (stats.amount[stats.amount.length >>> 1] +
            stats.amount[(stats.amount.length >>> 1) - 1]) >>
          1n,
    // p75: stats.amount.length % 4 === 0 ?  ? stats.amount[(stats.amount.length >>> 2) *3]
    quantiles: [
      stats.amount[0],
      quantileSorted(stats.amount, "p25"),
      quantileSorted(stats.amount, "p50"),
      quantileSorted(stats.amount, "p75"),
      stats.amount[stats.amount.length - 1],
    ],
  };

  {
    const opChainLogs = await pubClientOptimism.getContractEvents({
      address: "0x6726fe9c89fb04eaef388c11cf55be6aa0a62fb9",
      abi: gitcoinContractABI,
      fromBlock: 112226413n, // Gitcoin Round19
    });
    // console.log(new Date(), `opChainLogs(${opChainLogs.length}):`, opChainLogs);
  }

  const ipfsArticleHashes =
    await sqlRO`-- get de-duplicated donation records from darft data_hash
SELECT article.id ::int, article.title, article.summary, article.created_at, article.data_hash, draft.data_hash AS draft_data_hash,
  lower(author.eth_address) AS eth_address,
  author.user_name, author.display_name, author.email, article.author_id ::int,
  concat('https://matters.town/@', user_name, '/', article.id, '-', article.slug) AS url
FROM public.draft LEFT JOIN public.article ON article_id=article.id
LEFT JOIN public.user author ON article.author_id=author.id
WHERE draft.data_hash =ANY(${Array.from(
      // new Set(seqs.map(({ dataHash }) => dataHash).filter(Boolean))
      seqsByDataHash.keys()
    ).filter(Boolean)})
ORDER BY article.id DESC ; `;

  const dataHashMappings = // new Map(
    d3.group(ipfsArticleHashes, (d) => d.draftDataHash);
  // ipfsArticleHashes.map(({ draftDataHash, ...rest }) => [draftDataHash, rest]) // );
  const dataHashRevisdedMappings = // new Map(
    d3.group(ipfsArticleHashes, (d) => d.dataHash);

  console.log(
    new Date(),
    `found ${dataHashMappings.size} dataHashMappings from ${ipfsArticleHashes.length} entries:`,
    dataHashMappings.get("QmXCj48vWEasC15P1x5hNBLCEGj7Crfbjy2r2dMv572Nem"),
    dataHashMappings.get("QmbS4V7HUP9GWjNpnqxQB6SonuM3vkdNc2RyTkp98duEG8"),
    dataHashRevisdedMappings.get(
      "QmbS4V7HUP9GWjNpnqxQB6SonuM3vkdNc2RyTkp98duEG8"
    ),
    Array.from(dataHashMappings.keys())
  );

  const usdtDonationsStats = (
    await sqlRO`--get stats of all USDT transactions;
SELECT COUNT(*) ::int AS num_transactions,
  COUNT(DISTINCT sender_id) ::int AS num_senders,
  COUNT(DISTINCT recipient_id) ::int AS num_recipients,
  COUNT(DISTINCT target_id) ::int AS num_targets,
  jsonb_build_object(
    'min', MIN(amount),
    'max', MAX(amount),
    'sum', SUM(amount),
    'avg', ROUND(AVG(amount), 6),
    'p25', percentile_cont(0.25) within group (order by amount asc),
    'p50', percentile_cont(0.5) within group (order by amount asc),
    'p75', percentile_cont(0.75) within group (order by amount asc)
  ) AS amount_stats
FROM public.transaction
WHERE purpose='donation' AND state='succeeded'
  AND currency='USDT'
  AND target_type=4 -- for articles;
  AND created_at BETWEEN ${fromTime!} AND ${toTime!} ;`
  )?.[0];

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
      sum_usdt: +(Number(statsAmount.sum) / 1e6).toFixed(6),
      avg_usdt: +(Number(statsAmount.sum) / 1e6 / stats.amount.length).toFixed(
        6
      ),
    },
  };
  console.log("stats:", statsSummary, {
    ipfsArticleHashes: ipfsArticleHashes.length,
    ...usdtDonationsStats,
  });

  const gist: any = {
    description: `quadratic-funding score for MattersCuration contract`,
    public: false,
    files: {
      "README.md": {
        content: `During MattersCuration contract runtime between ...`,
      },
    },
  };

  // output senders.tsv
  const sendersOut = new Map<string, any>();

  {
    const aggPerFromAddress = d3.rollup(
      seqs,
      (g) => ({
        amounts: g.map((d) => d.amount).sort(d3.ascending),
        latestBlockNumber: BigIntMath.max(...g.map((d) => d.blockNumber)),
        // number_donations
        number_contributions: g.length,
        // .sort( d3.ascending // (a, b) => a == null || b == null ? NaN : a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN , // https://github.com/d3/d3-array/blob/main/src/ascending.js
        sum: g.reduce((acc, b) => acc + b.amount, 0n),
      }),
      (d) => d.from.toLowerCase() // lower
      // (d) => d.uri,
    );
    console.log(new Date(), "aggPerFromAddress:", aggPerFromAddress);
    const addresses: string[] = Array.from(aggPerFromAddress.keys());

    const senders = await sqlRO`-- get all sender's social
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
    concat('https://matters.town/@', '/', target_id, '-', slug) AS target_url
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
-- ORDER BY sender.id DESC ;`;

    const sendersMap = new Map(senders.map((u) => [u.ethAddress, u]));

    aggPerFromAddress.forEach((v, k) => {
      const senderObj = sendersMap.get(k);
      const obj = {
        userName: senderObj?.userName,
        displayName: senderObj?.displayName,
        ethAddress: k,
        trustPoints: 0.0,
        count: v.number_contributions,
        sum: v.sum,
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

        isRegisteredBefore: senderObj?.userCreatedAt < fromTimestamp,
        userCreatedAt: senderObj?.userCreatedAt,
        earliestArticlePublishedAt: senderObj?.earliestArticlePublishedAt,
        earliestDonatedAt: senderObj?.earliestDonatedAt?.toISOString(),
        // "title (earliest)",
        titles:
          // "url",
          // csvEscape(sendersMap.get(k)?.title),
          senderObj?.titles, // Array.isArray(sendersMap.get(k)?.titles) ? JSON.stringify(sendersMap.get(k)?.titles) : null,
        // sendersMap.get(k)?.targetUrl,
        amounts: v.amounts,
        trustExpr: "",
      };
      const points = {
        // obj.numArticlesFeatured > 0 ? POINTS.mattersHasArticlesBeFeatured : 0.0, //
        mattersNumArticlesBeDonated:
          obj.numArticlesBeDonated >= 5
            ? POINTS.mattersNumArticlesBeDonated
            : 0.0,
        mattersNumDonatedAuthors:
          obj.numDonatedAuthors >= 10 ? POINTS.mattersNumDonatedAuthors : 0.0,
        mattersReadingPoints:
          obj.numReadArticles >= 30 && obj.numReadingDays >= 5
            ? POINTS.mattersReadingPoints
            : 0.0,
        mattersComments: obj.numComments >= 10 ? POINTS.mattersComments : 0.0,

        // false ? POINTS.mattersHasDonatedFeatured : 0.0, // TBD
        // false ? POINTS.mattersHasBadgedFollowers : 0.0, // TBD
        mattersHas5Followers:
          obj.numFollowers >= 5 ? POINTS.mattersHas5Followers : 0.0, //
        mattersAgeBefore: obj.isRegisteredBefore
          ? POINTS.mattersAgeBefore
          : 0.0, // need userRegistraiton time < period beginning
        mattersBadges: obj.numBadges >= 1 ? POINTS.mattersBadges : 0.0, // need hold badges >= 1
        mattersTravloggHolders:
          obj.numTravloggHolders! >= 1 ? POINTS.mattersTravloggHolders : 0.0, // need hold TravloggNFT >= 1
        numETHMainnetENSDomains:
          obj.numETHMainnetENSDomains! >= 1 ? POINTS.ethENSDomains : 0.0,
        numETHMainnetNFTs:
          obj.numETHMainnetENSDomains! >= 1 ? POINTS.ethNFTs : 0.0,
        gitcoinActivities:
          obj?.gitcoinActivities > 0 ? POINTS.gitcoinActivities : 0.0,

        // gitcoinActivities: 3.0, // gitcoin donations >= 1

        hasSocialGoogle: obj.hasGoogleAccount ? POINTS.hasSocialGoogle : 0.0,
        hasSocialTwitter: obj.hasTwitterAccount ? POINTS.hasSocialTwitter : 0.0,
        // ethENS: 2.0,
        // ethNFTs: 1.0, // any other NFTs on ETH mainnet
      };
      obj.trustPoints = d3.sum(Object.values(points));
      obj.trustExpr = `(${util.inspect(points, {
        compact: true,
        breakLength: Infinity,
      })})`;
      sendersOut.set(k, obj);
      // if (!headers) headers = Object.keys(obj);
    });

    if (sendersOut.size >= 1) {
      const [first] = sendersOut.values();
      const headers = Object.keys(first);
      const bufs = [];
      // const headers = Object.keys(values[0]);
      bufs.push(headers.join("\t"));

      sendersOut.forEach((row, k) => {
        bufs.push(
          headers.map((k) => csvEscape(row[k], k)).join("\t")
          // .trimEnd(),
        );
      });
      const sendersContent = (gist.files[`senders.tsv`] = {
        content: bufs.join("\n"),
      });
      // console.log(sendersContent.content);
    }
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
      latestTimestamp: undefined as Date | undefined,
    }), // d3.sum(g, (d) => d.amount),
    (d) =>
      (dataHashMappings.get(d.dataHash)?.[0]?.dataHash ?? d.dataHash) || d.uri // d.dataHash || d.uri
  );
  for (const [proj, data] of aggPerProj.entries()) {
    if (!data.latestBlockNumber) continue;
    const block = await pubClientPolygon.getBlock({
      blockNumber: data.latestBlockNumber,
    });
    // console.log('get block:', data.latestBlockNumber, block);
    data.latestTimestamp = new Date(Number(block.timestamp) * 1e3);
  }
  // console.log("for seqs contrib:", aggPerProj);

  const aggPerProjFrom = d3.rollup(
    seqs.filter(
      // filter out non-ipfs url
      ({ from, dataHash }) =>
        dataHash && sendersOut.get(from.toLowerCase()).trustPoints > 0 // && from address is not too low trust-score
    ),
    (g) => ({
      amounts: g.map((d) => d.amount),
      sum: g.reduce((acc, b) => acc + b.amount, 0n), // d3.sum(g, (d) => d.amount),
    }),
    (d) =>
      // dataHashMappings.has(d.dataHash)
      (dataHashMappings.get(d.dataHash)?.[0]?.dataHash ?? d.dataHash) || d.uri,
    (d) => d.from
  );

  // console.log("for seqs contrib:", aggPerProjFrom);
  const pair_totals = get_totals_by_pair(aggPerProjFrom);
  // console.log("for seqs contrib pairs:", pair_totals);

  // console.log( "for seqs contrib pairs JSON:", JSON.stringify( Object.fromEntries( Array.from(pair_totals.entries()).map(([k, m]) => [ k, Object.fromEntries(m.entries()), ])), replacer, 2));

  // const totAmount = BigInt(amount ?? 500_000_000n);
  const clrs = calculate_clr(aggPerProjFrom, pair_totals, amount);
  console.log("for seqs contrib pairs clrs:", clrs);

  // (1)
  // [cid, address, amount]
  const treeValues = clrs
    .filter(
      (clr) => clr.clr_amount_orig > 0n && clr.author_eth?.length === 42 // check it looks like a ethAddress
    )
    .map(({ id, author_eth, clr_amount_orig }) => [
      id,
      // to_address?.[0] || author_eth,
      aggPerProj.get(id)?.to?.[0] ||
        dataHashMappings.get(id)?.[0]?.ethAddress ||
        author_eth,
      clr_amount_orig.toString(),
    ]);

  // (2)
  const tree = StandardMerkleTree.of(treeValues, [
    "string",
    "address",
    "uint256",
  ]);

  // (3)
  console.log("Merkle Root:", tree.root);

  gist.files[
    "README.md"
  ].content = `During MattersCuration contract runtime between \`${fromTime}\` ~ \`${toTime}\`,
\`\`\`json
from Polygon onChain: ${JSON.stringify(
    statsSummary, // replacer
    (_, v) => (typeof v === "bigint" ? +Number(v) : v),
    2
  )}
from MattersDB: ${JSON.stringify(
    {
      ipfsArticleHashes: ipfsArticleHashes.length,
      ...usdtDonationsStats,
    },
    null,
    2
  )}
\`\`\`

Merkle Tree Root: \`${tree.root}\`

this is analyzing results with [Quadratic Funding score calcuation with Pairwise Mechanism](https://github.com/gitcoinco/quadratic-funding?tab=readme-ov-file#implementation-upgrade-the-pairwise-mechanism)`;

  // output distrib
  {
    const values = [] as any[];
    const clrsMap = new Map(clrs.map((r) => [r.id, r]));
    aggPerProj.forEach((v, proj) => {
      const {
        // number_contributions,
        // number_contribution_addresses,
        // contribution_amount, // clr_amount,
        clr_amount_pairw,
        clr_percent_pairw,
        clr_amount_orig,
        clr_percent_orig,
        // url, created_at, author_eth, // tot, _q_summed,
      } = clrsMap.get(proj) || {};
      const dataHashAttributes =
        dataHashRevisdedMappings.get(proj) ?? dataHashMappings.get(proj);
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
        url: dataHashAttributes?.[0]?.url || proj,
        created_at: dataHashAttributes?.[0]?.createdAt,
        author_eth: dataHashAttributes?.[0]?.ethAddress,
        to_address: aggPerProj.get(proj)?.to,
        userName: dataHashAttributes?.[0]?.userName,
        displayName: dataHashAttributes?.[0]?.displayName,
        email: dataHashAttributes?.[0]?.email,
        authorId: dataHashAttributes?.[0]?.authorId,
        // created_at,
        // author_eth, // tot, _q_summed,
        amounts: aggPerProj.get(proj)?.amounts,
      });
    });
    const headers = Object.keys(values[0]);
    const bufs = [];
    bufs.push(
      headers.join("\t")
      // "id	title	number_contributions	contribution_amount_USDT	clr_amount_USDT	url	created_at	author_eth"
    );
    values.forEach((row: any) =>
      bufs.push(headers.map((k) => csvEscape(row[k], k)).join("\t"))
    );
    // gist.files["distrib.tsv"] = { content: bufs.join("\n") };
    const distrib = (gist.files[`distrib.tsv`] = {
      content: bufs.join("\n"),
    });
    // console.log(distrib.content);
    const distribJSON = (gist.files[`distrib.json`] = {
      content:
        "[ " +
        values
          .filter(({ clr_amount_orig }) => clr_amount_orig > 0n)
          .map(
            ({
              id,
              title,
              clr_amount_orig,
              url,
              created_at,
              author_eth,
              to_address,
            }) =>
              JSON.stringify(
                {
                  id,
                  title,
                  clr_amount: clr_amount_orig,
                  url,
                  created_at,
                  eth_address:
                    aggPerProj.get(id)?.to?.[0] ||
                    dataHashMappings.get(id)?.[0]?.ethAddress ||
                    author_eth,

                  userName: dataHashMappings.get(id)?.[0]?.userName,
                  displayName: dataHashMappings.get(id)?.[0]?.displayName,
                  // email: dataHashMappings.get(proj)?.email,
                },
                replacer
              )
          )
          .join(",\n") +
        " ]",
    });
  }

  // (4) // write out to somewhere S3 bucket?
  // fs.writeFileSync("out/tree.json", JSON.stringify(tree.dump(), null, 2));
  // console.log("Merkle-Tree Dump:", JSON.stringify(tree.dump(), null, 2));
  gist.files[`treedump.json`] = {
    content: JSON.stringify(tree.dump(), null, 2),
  };

  let gist_url: string | undefined = undefined;
  if (write_gist && GITHUB_TOKEN) {
    // skip if no GITHUB_TOKEN
    await fetch("https://api.github.com/gists", {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify(gist),
    })
      .then((res) => res.json())
      .then((data) => {
        // console.log(data);
        gist_url = data?.html_url;
      });
  }

  await Promise.all(
    ["treedump.json", "distrib.json", "distrib.tsv", "senders.tsv"].map(
      (path) =>
        s3PutFile({
          Bucket: "matters-billboard",
          Key: `pre-rounds/polygon-${fromBlock}-${BigIntMath.min(
            maxBlockNumber,
            toBlock!
          )}/${path}`,
          Body: gist.files[path].content,
        }) // .then((res) => console.log(new Date(), `s3 treedump:`, res));
    )
  );
  const rounds = [
    {
      root: tree.root,
      chain: "Polygon",
      distrib: `polygon-${fromBlock}-${BigIntMath.min(
        maxBlockNumber,
        toBlock!
      )}/distrib.json`,
      fromTime,
      toTime,
      fromBlock,
      toBlock,
      minBlockNumber,
      maxBlockNumber,
      amount,
      stats: statsSummary, // { fromAddresses:  },
      draft: true, // this item is a draft, will be replaced to final
    },
  ];
  await s3PutFile({
    Bucket: "matters-billboard",
    Key: `pre-rounds/rounds.json`,
    Body:
      "[ " +
      rounds
        .map((row) =>
          JSON.stringify(
            row,
            (_, v) =>
              typeof v === "bigint"
                ? util.format("%i", v) // +Number(v) // current numbers are all < Number.MAX_SAFE_INTEGER // 9_007_199_254_740_991
                : v // replacer,
            // 2 // omit to be compact
          )
        )
        .join(",\n") +
      " ]",
    // ACL: "public-read",
    ContentType: "application/json",
  }).then((res) => console.log(new Date(), `s3 saved rounds:`, rounds));

  return { root: tree.root, gist_url };

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
    {
      M = 25_000_000n, // 25 USDT Dollars
      N = 1_000n, // median is $0.1 USDT Dollar
    } = {}
  ) {
    let bigtot = 0n;
    let _q_bigsummed = 0.0;
    const totals = [];
    for (const [proj, contribz] of aggregated_contributions.entries()) {
      let tot = 0n;
      let _num = 0,
        _sum = 0n,
        _q_summed = 0.0;
      // const _amounts = [];

      // pairwise match
      for (const [k1, v1] of contribz.entries()) {
        _num++;
        _sum += v1.sum;
        // _amounts.push(...v1.amounts);
        _q_summed += Math.sqrt(Number(v1.sum));

        for (const [k2, v2] of contribz.entries()) {
          if (k2 > k1) {
            // quadratic formula
            tot +=
              (BigIntMath.sqrt(v1.sum * v2.sum) * // k(i,j) below
                M) /
              ((pair_totals.get(k1)?.get(k2) ?? 0n) + M);
          }
        }

        if (tot === 0n && contribz.size === 1)
          tot += N * BigIntMath.sqrt(Array.from(contribz.values())[0].sum);
      }

      bigtot += tot;
      _q_bigsummed += _q_summed;

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
        // url: dataHashMappings.get(proj)?.url || proj,
        created_at: dataHashMappings.get(proj)?.[0]?.createdAt,
        author_eth: dataHashMappings.get(proj)?.[0]?.ethAddress,
        tot,
        _q_summed,
        // amounts: _amounts.sort(ascending),
      });
    }

    for (const proj of totals) {
      proj.clr_percent_pairw = Number(proj.tot) / Number(bigtot);
      proj.clr_amount_pairw =
        (total_pot * BigInt(Math.round(proj.clr_percent_pairw * 1e18))) /
        BigInt(1e18);
      proj.clr_percent_orig = proj._q_summed / _q_bigsummed;
      proj.clr_amount_orig =
        BigInt(Math.round(Number(total_pot) * proj.clr_percent_orig * 1e6)) /
        1_000_000n;
    }
    if (totals.length >= 2) {
      // recalculate if totals not match'ing
      let rem = total_pot;
      let firstNonZero = totals.findIndex((p) => p.clr_amount_pairw > 0n);

      for (let i = firstNonZero + 1; i < totals.length; i++) {
        rem -= totals[i].clr_amount_pairw;
      }
      totals[firstNonZero].clr_amount_pairw = rem;

      rem = total_pot;
      firstNonZero = totals.findIndex((p) => p.clr_amount_orig > 0n);
      for (let i = firstNonZero + 1; i < totals.length; i++) {
        rem -= totals[i].clr_amount_orig;
      }
      totals[firstNonZero].clr_amount_orig = rem;
    }

    console.log(
      `calculate_clr: ${bigtot} distributed to ${totals.length} projects`,
      { bigtot }
    );

    return totals;
  }
}

interface AuthorDistrib {
  // author: string;
  clr_amount: string;
  title: string;
  url: string;
  eth_address: string;
  userName: string;
  displayName: string;
  email: string;
  language: Language;
}

export async function checkDropEventsAndNotifs() {
  const logs = await pubClientOptimismSepolia.getLogs({
    // Billboard (Distribution): 0xbc4bd6f101e128b4b403f8d3a7a4f2976fbf8a1c
    address: "0xbc4bd6f101e128b4b403f8d3a7a4f2976fbf8a1c",
    // parseAbiItem('event Drop(string indexed, uint256)'),
    event: {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "string",
          name: "treeId_",
          type: "string",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "amount_",
          type: "uint256",
        },
      ],
      name: "Drop",
      type: "event",
    },
    fromBlock: 8439158n, // the contract creation block; 8571271n,
  });
  logs.reverse(); // get descending order;

  console.log(
    new Date(),
    `got ${logs?.length} events:`,
    logs?.slice(0, 3),
    `with latest Drop event blockNumber:`,
    logs?.[0]?.blockNumber
  );

  // await sendQfNotifications([], logs?);
}

export async function sendQfNotifications(
  items: AuthorDistrib[],
  endBlockNumber: bigint,
  doNotify = false
) {
  if (!doNotify) return;

  const authors =
    await sqlRO`-- send qf distrib notifications to qualified authors
SELECT *
FORM public.user
WHERE user_name = ANY (${items.map(({ userName }) => userName)})
  AND state IN ('active')
  AND (extra->'lastQfNotifiedBlockNumber') ::bigint < ${endBlockNumber.toString()} `;

  console.log(`sending in-site notifications:`, authors);

  return 0 as any;
}

const mail = new Mail();

// the distrib.json file format for each author;
export async function sendQfNotificationEmails(
  items: AuthorDistrib[],
  doSendMail = false
) {
  if (!doSendMail) return;

  return Promise.allSettled(
    items.map(({ userName, displayName, email, language }) => {
      console.log(`send QF-fund mail notification to:`, {
        userName,
        displayName,
        email,
        language,
      });
      if (!email) {
        return; // can't send if no email
      }

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
              },
            },
          ],
        })
        .then((res: any) => console.log(`mail "${email}" res:`, res))
        .catch((err: Error) => console.error(`mail "${email}" ERROR:`, err));
    })
  );
}

async function sendNotificationMail(
  distribs: Array<{
    userName: string;
    displayName: string;
    email: string;
    language: Language;
  }>,
  doSendMail = false
) {
  if (!doSendMail) return;
  return Promise.allSettled(
    distribs.map(({ userName, displayName, email, language }) => {
      if (!email) {
        return; // can't send if no email
      }

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
              },
            },
          ],
        })
        .then((res: any) => console.log(`mail "${email}" res:`, res))
        .catch((err: Error) => console.error(`mail "${email}" ERROR:`, err));
    })
  );
}

function getTemplateId(language: Language): string {
  const templateIdsDev = {
    zh_hant: "d-dd6f9660b30a40eaa831254275c4b0b6",
    zh_hans: "d-f33d89d33a72419dbfc504c09ca84f81",
    en: "d-f33d89d33a72419dbfc504c09ca84f81",
  };
  const templateIdsProd = {
    zh_hant: "d-dd6f9660b30a40eaa831254275c4b0b6",
    zh_hans: "d-f33d89d33a72419dbfc504c09ca84f81",
    en: "d-f33d89d33a72419dbfc504c09ca84f81",
  };
  return (isProd ? templateIdsProd : templateIdsDev)[language];
}
function getSubject(language: Language): string {
  switch (language) {
    case "zh_hans":
      return "Billboard 计画大展开！参与马特市的配捐激励奖金送达啰 💖";
    case "en":
      return "Billboard Plan is coming! Distributed amount has been transferred to your crypto wallet 💖";
    default:
    case "zh_hant":
      return "Billboard 計畫大展開！參與馬特市的配捐激勵獎金送達囉 💖";
  }
}

export function quantileSorted(
  values: bigint[],
  p: "median" | "p50" | "p75" | "p25"
) {
  if (!(n = values.length)) return;
  if (n < 2) return BigInt(values[0]);
  // if (p >= 1) return BigInt(values[n - 1]);
  switch (p) {
    case "median":
    case "p50":
      i = (n - 1) * 0.5;
      i0 = Math.floor(i);
      break;
    case "p25":
      i = (n - 1) * 0.25;
      i0 = Math.floor(i);
      break;
    case "p75":
      i = (n - 1) * 0.75;
      i0 = Math.floor(i);
      break;
  }
  // eslint-disable-next-line no-var
  var n,
    i, // = (n - 1) * p,
    i0, // = Math.floor(i),
    value0 = BigInt(values[i0]),
    value1 = BigInt(values[i0 + 1]);
  console.log("quantile:", { p, [i0]: value0, [i0 + 1]: value1 });
  return (
    value0 +
    (p === "median" || p === "p50"
      ? BigInt(value1 - value0) >> 1n
      : p === "p25"
      ? BigInt(value1 - value0) >> 2n
      : p === "p75"
      ? (BigInt(value1 - value0) >> 2n) * 3n
      : 0n)
  );
}

/*     translates django grant data structure to a list of lists
 *     returns:
        list of lists of grant data
            [[grant_id (str), user_id (str), contribution_amount (float)]]
 * */
function translate_data(
  grants_data: Array<{
    id: string;
    contributions: Array<{ [key: string]: string }>;
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
    .flat(1);
}

type PairNumber = Map<string, Map<string, bigint>>;

export // get pair totals
function get_totals_by_pair(
  contrib_dict: Map<string, Map<string, { sum: bigint }>>
) {
  const tot_overlap: PairNumber = new Map();
  for (const [_, contribz] of contrib_dict.entries()) {
    for (const [k1, v1] of contribz.entries()) {
      // if (!tot_overlap.has(k1)) tot_overlap.set(k1, new Map());
      const tm = tot_overlap.get(k1) || new Map();
      for (const [k2, v2] of contribz.entries()) {
        tm.set(k2, BigIntMath.sqrt(v1.sum * v2.sum) + (tm.get(k2) ?? 0n));
      }
      if (!tot_overlap.has(k1)) tot_overlap.set(k1, tm);
    }
  }

  return tot_overlap;
}

export function replacer(_: string, v: any) {
  switch (typeof v) {
    case "bigint":
      return v.toString();
    default:
      return v;
  }
}

// https://github.com/d3/d3-array/blob/main/src/ascending.js
function ascending(a: any, b: any) {
  // prettier-ignore
  return a == null || b == null ? NaN : a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}

function csvEscape(v: any, k: string) {
  // const v = row[k];
  if (v == null || v === "") return "";
  if (v instanceof Date) return v.toISOString();
  // if (k.startsWith("clr_amount")) { console.log("clr_amount:", k, v); return +(Number(v) / 1e6).toFixed(6); }
  switch (typeof v) {
    case "boolean":
      return v ? "Y" : "";
    case "bigint":
      return +(Number(v) / 1e6).toFixed(6);
    case "string":
      if (k === "title" || v?.includes(",")) {
        // return csvEscape(v.trim());
        const str = (v as string).trim();
        // prettier-ignore
        return !str ? "" : (str.includes('\t') || str.match(/["\t]/)) ? `"${str.replace('"', '""')}"` : str;
      }

    // eslint-disable-next-line no-fallthrough
    default:
      return v;
  }
  // return !str ? "" : str.match(/["\t]/) ? `"${str.replace('"', '""')}"` : str;
}

async function getNFTs(owner: string) {
  return fetch(
    `https://eth-mainnet.g.alchemy.com/nft/v3/${MATTERS_ALCHEMY_KEY_MAINNET}/getContractsForOwner/?owner=${owner}`,
    {
      headers: { accept: "application/json" },
    }
  ).then((res) => res.json());
}
