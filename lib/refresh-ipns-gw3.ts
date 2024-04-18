import path from 'node:path'
import { Readable } from 'node:stream'
// import { Blob } from "node:buffer";

import { CID } from 'multiformats/cid'
import shuffle from 'lodash/shuffle.js'

import { AuthorFeed } from '../lib/author-feed-ipns.js'
import { ipfsPool } from '../lib/ipfs-servers.js'
import { dbApi, Item } from '../lib/db.js'

const GW3_API_BASE_URL = 'https://gw3.io'
const GW3_ACCOUNT_API_BASE_URL = 'https://account.gw3.io'

// import { Client } from 'gw3-sdk';
const gw3AccessKey = process.env.GW3_ACCESS_KEY || ''
const gw3AccessSecret = process.env.GW3_ACCESS_SECRET || ''
const MATTERS_SITE_DOMAIN_PREFIX =
  process.env.MATTERS_SITE_DOMAIN_PREFIX || 'matters.town'

// export const gw3Client = new Client(gw3AccessKey, gw3AccessSecret);

function getTs() {
  return Math.floor(Date.now() / 1000).toString()
}

class GW3Client {
  #gw3AccessKey: string
  #gw3AccessSecret: string
  #config: { baseURL: string }
  #authHeaders: {
    'X-Access-Key': string
    'X-Access-Secret': string
  }

  constructor(key: string, secret: string) {
    this.#gw3AccessKey = key
    this.#gw3AccessSecret = secret
    this.#authHeaders = {
      'X-Access-Key': this.#gw3AccessKey,
      'X-Access-Secret': this.#gw3AccessSecret,
    }
    this.#config = { baseURL: 'https://gw3.io' }
  }
  #makeAuthHeaders() {
    return {
      'X-Access-Key': this.#gw3AccessKey,
      'X-Access-Secret': this.#gw3AccessSecret,
    }
  }

  async addPin(cid: string, name?: string) {
    const u = new URL(
      `${this.#config.baseURL}/api/v0/pin/add?arg=${cid}&ts=${getTs()}`
    )
    // let pinUrl = `/api/v0/pin/add?arg=${cid}&ts=${getTs()}`;
    if (name) {
      // pinUrl += `&name=${name}`;
      u.searchParams.set('name', name)
    }

    const res = await fetch(u, {
      method: 'POST',
      headers: this.#authHeaders, // this.#makeAuthHeaders(),
    })
    // console.log(new Date(), "addPin res:", res.ok, res.status, res.headers);

    return res.json()
  }

  async rmPin(cid: string) {
    const u = new URL(
      `${this.#config.baseURL}/api/v0/pin/rm?arg=${cid}&ts=${getTs()}`
    )
    const res = await fetch(u, {
      method: 'POST',
      headers: this.#authHeaders, // this.#makeAuthHeaders(),
    })
    // console.log(new Date(), "rmPin res:", res.ok, res.status, res.headers);

    return res.json()
  }

  async listPins({
    limit = 100,
    start = 0,
    status,
  }: { limit?: number; start?: number; status?: string } = {}) {
    const u = new URL(`${GW3_ACCOUNT_API_BASE_URL}/api/v0/pin?ts=${getTs()}`)
    if (limit) u.searchParams.set('limit', limit as any as string)
    if (start) u.searchParams.set('start', start as any as string)
    if (status) u.searchParams.set('status', status)

    const res = await fetch(u, {
      method: 'GET',
      headers: this.#authHeaders, // this.#makeAuthHeaders(),
    })
    return res.json()
  }

  async getPin(cid: string) {
    const u = `${GW3_ACCOUNT_API_BASE_URL}/api/v0/pin/${cid}?ts=${getTs()}`
    const res = await fetch(u, {
      method: 'GET',
      headers: this.#authHeaders, // this.#makeAuthHeaders(),
    })
    // console.log(new Date(), "getPin res:", res.ok, res.status, res.headers);

    return res.json()
  }

  async renamePin(cid: string, name: string) {
    const u = `${GW3_ACCOUNT_API_BASE_URL}/api/v0/pin/rename?ts=${getTs()}`
    const res = await fetch(u, {
      method: 'POST',
      headers: this.#authHeaders, // this.#makeAuthHeaders(),
      body: JSON.stringify({ cid, name }),
    })
    // console.log(new Date(), "getPin res:", res.ok, res.status, res.headers);

    return res.json()
  }

  async addPinWait(cid: string, name?: string, wait = 60e3) {
    await this.addPin(cid, name)
    do {
      const res = await this.getPin(cid)
      console.log(new Date(), 'check addPin wait:', res?.data)
      if (res.code === 200 && res.data?.status !== 'pinning') {
        return res.data
      }
      const r = 1000 * (2 + 10 * Math.random())
      await delay(r)

      wait -= r
    } while (wait > 0)
  }

  async getDAG(cid: string) {
    const u = `${GW3_API_BASE_URL}/api/v0/dag/get?ts=${getTs()}&arg=${cid}`
    const res = await fetch(u, {
      method: 'GET',
      headers: this.#authHeaders, // this.#makeAuthHeaders(),
    })
    console.log(
      new Date(),
      'getDAG res:',
      res.ok,
      res.status,
      res.statusText,
      res.headers
    )

    return res.json()
  }

  async dagImport(file: File | Blob | string) {
    const size =
      (file as Blob).size ??
      // (file as Buffer).byteLength ??
      (file as any).length

    const res = await fetch(
      `https://gw3.io/api/v0/dag/import?size=${size}&ts=${getTs()}`,
      {
        method: 'POST',
        headers: this.#authHeaders, // this.#makeAuthHeaders(),
      }
    )
    console.log(
      new Date(),
      'dag import res:',
      res.ok,
      res.status,
      res.statusText,
      res.headers
      // await res.text()
    )
    const resImport = await res.json()
    if (resImport?.code !== 200 || !resImport?.data?.url) {
      console.error(new Date(), 'dag import error:', resImport)
      return resImport
    }
    // const { data: { url: importUrl } } = res;
    const importUrl = resImport.data.url
    console.log(
      new Date(),
      `dag import sending ${size} bytes file to:`,
      importUrl
    )

    const body = new FormData()
    body.set('file', file)
    const res2 = await fetch(importUrl, {
      method: 'POST',
      // headers: { "Content-Type": "multipart/form-data", },
      body,
    })
    console.log(
      new Date(),
      'dag import post res:',
      res2.ok,
      res2.status,
      res2.statusText,
      res2.headers
      // await res.text()
    )
    // if (data.Stats.BlockCount < 1) { }

    return res2.json()
  }

  async importFolder(cid: string) {
    const res = await fetch(
      `https://gw3.io/api/v0/folder/${cid}?ts=${getTs()}`,
      {
        method: 'PUT',
        headers: this.#authHeaders, // this.#makeAuthHeaders(),
      }
    )
    if (!res.ok) {
      console.error(
        new Date(),
        'folder import res:',
        res.ok,
        res.status,
        res.statusText,
        res.headers,
        await res.text()
      )
      return
    }

    return res.json()
  }

  async callFolderOperation(
    cid: string,
    {
      add,
      remove,
      pin_new,
      unpin_old = true,
    }: {
      add?: [string, string][]
      remove?: string[]
      pin_new?: boolean
      unpin_old?: boolean
    } = {}
  ) {
    const reqBody = { cid, add, remove, pin_new, unpin_old }
    const res = await fetch(
      `https://gw3.io/api/v0/folder/operation?ts=${getTs()}`,
      {
        method: 'POST',
        headers: this.#authHeaders, // this.#makeAuthHeaders(),
        body: JSON.stringify(reqBody),
      }
    )
    console.log(
      new Date(),
      'folder operation res:',
      res.ok,
      res.status,
      res.statusText,
      res.headers,
      reqBody
    )
    return res.json()
  }

  async updateIPNSName({
    ipnsKey,
    cid,
    pin,
  }: {
    ipnsKey: string
    cid: string
    pin?: boolean
  }) {
    const u = new URL(
      `https://gw3.io/api/v0/name/publish?key=${ipnsKey}&arg=${cid}&ts=${getTs()}`
    )
    if (pin === true || pin === false)
      // not undefined
      u.searchParams.set('pin', `${pin}`)
    const res = await fetch(u, {
      method: 'POST',
      headers: this.#authHeaders, // this.#makeAuthHeaders(),
    })

    console.log(
      new Date(),
      `ipns name update res:`,
      res.ok,
      res.status,
      res.statusText,
      res.headers,
      { ipnsKey, cid }
      // reqBody
    )
    return res.json()
  }

  async importIPNSName({
    ipnsKey,
    cid,
    alias,
    pem,
    seq = 10000,
  }: {
    ipnsKey: string
    cid: string
    pem: string
    alias?: string
    seq?: number
  }) {
    const reqBody = {
      name: ipnsKey,
      value: cid,
      secret_key: pem,
      format: 'pem-pkcs8-cleartext',
      alias,
      seq,
    }
    const res = await fetch(`https://gw3.io/api/v0/name/import?ts=${getTs()}`, {
      method: 'POST',
      headers: this.#authHeaders, // this.#makeAuthHeaders(),
      body: JSON.stringify(reqBody),
    })
    console.log(
      new Date(),
      'ipns name import res:',
      res.ok,
      res.status,
      res.statusText,
      res.headers,
      { ipnsKey, cid, alias }
      // reqBody
    )
    return res.json()
  }

  async rmIPNSName(kid: string) {
    const u = new URL(`${this.#config.baseURL}/api/v0/name/rm?ts=${getTs()}`)
    u.searchParams.set('key', kid)
    const res = await fetch(u, {
      method: 'POST',
      headers: this.#authHeaders, // this.#makeAuthHeaders(),
    })
    // console.log(new Date(), "rmIPNS res:", res.ok, res.status, res.headers);

    return res.json()
  }

  async getIpns(kid: string) {
    const u = `${GW3_ACCOUNT_API_BASE_URL}/api/v0/ipns/${kid}?ts=${getTs()}`
    const res = await fetch(u, {
      method: 'GET',
      headers: this.#authHeaders, // this.#makeAuthHeaders(),
    })
    // console.log(new Date(), "getPin res:", res.ok, res.status, res.headers);

    return res.json()
  }

  async getIpnsByName(alias: string) {
    const u = new URL(
      `${GW3_ACCOUNT_API_BASE_URL}/api/v0/ipns/search?ts=${getTs()}`
    )
    u.searchParams.set('alias', alias)
    const res = await fetch(u, {
      method: 'GET',
      headers: this.#authHeaders, // this.#makeAuthHeaders(),
    })
    console.log(new Date(), 'search IPNS res:', res.ok, res.status, res.headers)

    return res.json()
  }

  async getStats() {
    const u = new URL(`${GW3_ACCOUNT_API_BASE_URL}/api/v0/stats?ts=${getTs()}`)
    const res = await fetch(u, {
      method: 'GET',
      headers: this.#authHeaders, // this.#makeAuthHeaders(),
    })
    // console.log( new Date(), "get usage stats res:", res.ok, res.status, res.headers);

    return res.json()
  }
}

export const gw3Client = new GW3Client(gw3AccessKey, gw3AccessSecret)

export async function refreshPinLatest({
  limit = 100,
  offset = 0,
  mergeCollectionsTop = true,
} = {}) {
  const articles = await dbApi.listRecentArticles({
    take: limit,
    skip: offset,
  })
  if (offset <= 100e3) mergeCollectionsTop = false // don't merge for last 100,000 articles

  const articlesByCid = new Map(
    articles
      .filter(({ dataHash }) => dataHash)
      .map((item) => [item.dataHash, item])
  )

  console.log(
    new Date(),
    `got ${articles.length} latest articles`,
    articles.map(
      ({ id, slug, userName }) =>
        `${MATTERS_SITE_DOMAIN_PREFIX}/@${userName}/${id}-${slug}`
    )
  )

  const statusByCid = new Map<string, any>()
  const rowsByStatus = new Map<string, any[]>()
  const addedTime = Date.now()
  {
    // for (let tries = 0; tries < 1; tries++) {
    // await delay(1000 * (2 + 10 * Math.random()));

    const res = await Promise.all(
      articles.map(
        async ({ id, slug, userName, dataHash }) =>
          dataHash && {
            userName,
            dataHash,
            path: `matters.town/@${userName}/${id}-${slug}`,
            ...(await gw3Client.getPin(dataHash)),
          }
      )
    )
    const rows = res.map((r) => (r?.code === 200 ? r.data : r))
    rowsByStatus.clear()
    statusByCid.clear()

    rows.forEach((item) => {
      const status = item?.status ?? 'no-result'
      if (item?.cid) statusByCid.set(item.cid, item)
      const group = rowsByStatus.get(status) || []
      if (!rowsByStatus.has(status)) rowsByStatus.set(status, group)
      group.push(item)
    })
    const now = new Date()
    console.log(
      now,
      `${+now - +addedTime}ms elapsed, got ${
        rowsByStatus.get('pinned')?.length
      } pinned...`
    )
    // if (rowsByStatus.get("pinned")?.length === limit) break; // break if all pinned early
  }

  const skipStatuses = new Set(['pinned', 'pinning'])
  const resAdd = await Promise.all(
    articles.map(
      async ({ id, slug, userName, dataHash }) =>
        dataHash && {
          userName,
          dataHash,
          path: `matters.town/@${userName}/${id}-${slug}`,
          ...(statusByCid.get(dataHash)?.status in skipStatuses
            ? statusByCid.get(dataHash)
            : await gw3Client.addPin(
                dataHash,
                `${MATTERS_SITE_DOMAIN_PREFIX}/@${userName}/${id}-${slug}`
              )),
        }
    )
  )
  console.log(
    new Date(),
    `added ${articles.length} pins, not ok ones:`,
    resAdd.filter((r) => r?.code !== 200)
  )

  for (let tries = 0; tries < 5; tries++) {
    await delay(1000 * (2 + 10 * Math.random()))

    const res = await Promise.all(
      articles.map(
        async ({ id, slug, userName, dataHash }) =>
          dataHash && {
            userName,
            dataHash,
            path: `matters.town/@${userName}/${id}-${slug}`,
            ...(await gw3Client.getPin(dataHash)),
          }
      )
    )
    const rows = res.map((r) => (r?.code === 200 ? r.data : r))
    statusByCid.clear()
    rowsByStatus.clear()
    rows.forEach((item) => {
      const status = item?.status ?? 'no-result'
      if (item?.cid) statusByCid.set(item.cid, item)
      const group = rowsByStatus.get(status) || []
      if (!rowsByStatus.has(status)) rowsByStatus.set(status, group)
      group.push(item)
    })
    const now = new Date()
    console.log(
      now,
      `after ${tries} retries ${+now - +addedTime}ms elapsed, got ${
        rowsByStatus.get('pinned')?.length
      } pinned...`
    )
    if (rowsByStatus.get('pinned')?.length === limit) break // break if all pinned early
  }

  const toAddEntries = rowsByStatus.get('pinned')?.map(({ name, cid }) => {
    if (name) name = path.basename(name)
    const arti = articlesByCid.get(cid)
    return [
      name
        ? path.basename(name)
        : arti
        ? `${arti.id}-${arti.slug}`
        : `${new Date().toISOString()}`,
      cid,
    ]
  }) as [string, string][]

  if (!mergeCollectionsTop) {
    console.log(
      new Date(),
      `skip merging ${toAddEntries.length}(/${limit}) cids into one.`,
      Array.from(statusByCid.values()).filter((r) => r?.status !== 'pinned')
      // rowsByStatus
      // toAddEntries
    )
    return
  }

  console.log(
    new Date(),
    `merging ${toAddEntries.length} cids into one.`,
    toAddEntries
  )

  // merge the pinned into a big directory:
  const EMPTY_DAG_ROOT = 'QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn'
  await gw3Client.addPinWait(EMPTY_DAG_ROOT, 'EMPTY_DAG_ROOT')

  let newTopDir = EMPTY_DAG_ROOT // starts from empty
  let mergedCount = 0
  while (toAddEntries?.length > 0) {
    await gw3Client.importFolder(newTopDir)

    const add = toAddEntries.splice(0, 50) // gw3 API changed the limit to 50 since 8/28
    const resFolderOps = await gw3Client.callFolderOperation(newTopDir, {
      add,
      pin_new: true,
      unpin_old: newTopDir === EMPTY_DAG_ROOT ? undefined : true,
    })
    console.log(
      new Date(),
      'folder/operation res:',
      toAddEntries.length,
      resFolderOps
    )
    if (!resFolderOps?.data?.cid) {
      console.error(
        new Date(),
        `folder/operation failed, stopped at ${newTopDir}: with ${toAddEntries.length} remaining addEntries.`
      )
      break
    }
    mergedCount += add.length

    // const prior = lastCid;
    newTopDir = resFolderOps.data.cid
  }

  const stats: { [key: string]: number } = Array.from(
    rowsByStatus,
    ([status, group]) => [status, group.length]
  ).reduce(
    (acc, [status, length]) => Object.assign(acc, { [status]: length }),
    {}
  )
  console.log(
    new Date(),
    `merged ${stats['pinned']} cids into one, with ${toAddEntries.length} left, unpin all pinned sub-links.`,
    newTopDir,
    mergedCount
  )

  // unpin all sub-links
  if (newTopDir !== EMPTY_DAG_ROOT && toAddEntries?.length === 0)
    rowsByStatus
      .get('pinned')
      ?.forEach(({ cid }) => cid && gw3Client.rmPin(cid))

  console.log(
    new Date(),
    `tried pinning ${articles.length} cids:`,
    stats
    // rows?.slice(0, 10)
  )

  gw3Client.addPin(EMPTY_DAG_ROOT, 'EMPTY_DAG_ROOT')

  gw3Client.renamePin(
    newTopDir,
    `matters-town-collection-${mergedCount}-articles-${articles?.[0].id}-to-${
      articles.slice(-1)?.[0].id
    }`
  )
}

function printUsagePercentage(statsData: any): void {
  // const resStats = await gw3Client.getStats();
  // const resStatsData = resStats?.code === 200 ? resStats.data : null;

  console.log(
    new Date(),
    'printUsagePercentage:',
    statsData &&
      `next_bill_at: ${new Date(
        statsData.next_bill_at * 1e3
      ).toISOString()}; pinned_count: ${statsData.pinned_count} (${(
        (100 * statsData.pinned_count) /
        statsData.pinned_count_limit
      ).toFixed(1)}%); pinned_bytes: ${(statsData.pinned_bytes / 1073741824) // 1024*1024*1024
        .toFixed(1)}GiB (${(
        (100 * statsData.pinned_bytes) /
        statsData.pinned_bytes_limit
      ).toFixed(1)}%); ingress: ${(statsData.ingress / 1073741824) // 1024*1024*1024
        .toFixed(1)}GiB (${(
        (100 * statsData.ingress) /
        statsData.ingress_limit
      ).toFixed(1)}%); egress: ${(statsData.egress / 1073741824) // 1024*1024*1024
        .toFixed(1)}GiB (${(
        (100 * statsData.egress) /
        statsData.egress_limit
      ).toFixed(1)}%); ipns: ${statsData.ipns} (${(
        (100 * statsData.ipns) /
        statsData.ipns_limit
      ).toFixed(1)}%)`
    // resStats
  )
}

export async function purgeGw3Pins({
  skip = 100000,
  countOneTime = 100, // unpin at most 100 items at a time
  // usageRatioThreshold = 0.9,
  // resStats,
  // }: { skip?: number; usageRatioThreshold?: number; resStats?: any } = {}) {
} = {}) {
  for (
    let unpinned = 0, retries = 0;
    unpinned < countOneTime && retries < 10;
    retries++
  ) {
    const resListPins = await gw3Client.listPins({
      start: skip + retries * 100,
    })
    console.log(new Date(), 'listPins:', resListPins)
    const started = +Date.now() / 1000

    const pins = resListPins?.code === 200 ? resListPins?.data : null
    for (const item of pins) {
      if (
        +started - item.created_at <= 604800 ||
        // 3600*24*7; don't unpin if still within 7 days;
        item.name?.match(/^matters\.town\/@\w+$/)
      )
        // might be the top IPNS directory
        continue

      if (
        item.status === 'failure' ||
        (item.status === 'pinned' &&
          ((+started - item.created_at > 2592000 && // 3600*24*30 for over 30 days
            item.size >= 100 * 1024) ||
            item.name?.match(/^matters-town-collection/)))
      ) {
        console.log(new Date(), 'to unpin:', item)
        await gw3Client.rmPin(item.cid)
        if (++unpinned >= countOneTime) break
      }
    }
    console.log(new Date(), `purge pins:`, { unpinned })
  }
}

export async function purgeIPNS({
  skip = 10000,
  usageRatioThreshold = 0.9,
  resStats,
}: { skip?: number; usageRatioThreshold?: number; resStats?: any } = {}) {
  if (!resStats) resStats = await gw3Client.getStats()
  let resStatsData = resStats?.code === 200 ? resStats.data : null

  printUsagePercentage(resStatsData)
  if (!resStatsData) return // some API wrong;

  if (
    resStatsData.pinned_count / resStatsData.pinned_count_limit <
      usageRatioThreshold &&
    resStatsData.pinned_bytes / resStatsData.pinned_bytes_limit <
      usageRatioThreshold &&
    resStatsData.ipns / resStatsData.ipns_limit < usageRatioThreshold
  )
    return // NO-OP if all metrics of usage are less than threshold

  const authors = await dbApi.listRecentIPNSAuthors({
    skip,
    range: '5 years',
  })
  const started = Date.now()

  const toPurged = []
  const accountStats = {
    validCount: 0,
    noIPNS: 0,
    hasEthAddress: 0,
    recentIPNS: 0,
    skippedValidIPNS: 0,
  }
  let lIdx = 0
  while (
    lIdx < authors.length &&
    toPurged.length < 100 &&
    accountStats.validCount < skip
  ) {
    const ent = authors[lIdx++]
    if (
      ent.ipnsKey == null || // ent.lastDataHash == null ||
      ent.stats == null
    ) {
      accountStats.noIPNS++
      continue
    }

    accountStats.validCount++
    if (+started - +ent.lastSeen <= 365 * 24 * 3600e3) {
      accountStats.recentIPNS++
      continue
    } else if (ent.ethAddress != null) {
      accountStats.hasEthAddress++
      continue
    } else if (ent.authorState !== 'active' || ent.isRestricted) {
      toPurged.push(ent)
    }
  }
  console.log(
    new Date(),
    `scanned ${lIdx} authors, got ${toPurged.length} restricted accounts to purge:`,
    accountStats
  )

  for (
    let idx = authors.length - 1;
    idx >= lIdx && toPurged.length < 100;
    idx--
  ) {
    // pick up from backward from earliest
    const ent = authors[idx]
    if (ent.ipnsKey == null || ent.lastDataHash == null) {
      accountStats.noIPNS++
      continue
    }
    if (
      +started - +ent.lastSeen <=
      365 * 24 * 3600e3 // less than 1 year
    ) {
      accountStats.skippedValidIPNS++
      continue
    } else if (ent.ethAddress != null) {
      accountStats.hasEthAddress++
      continue
    }
    toPurged.push(ent)
  }
  console.log(
    new Date(),
    `fully scanned ${authors.length} authors, got ${toPurged.length} expired authors to purge:`,
    accountStats,
    toPurged
  )

  let cnt = 0
  for (const [idx, ent] of toPurged.entries()) {
    console.log(new Date(), `purging ${idx}:`, ent)
    const res = await gw3Client.getIpns(ent.ipnsKey)
    if (res?.code === 200) cnt++
    await Promise.all([
      gw3Client.rmIPNSName(ent.ipnsKey), // save number of IPNS
      ent.isRestricted && ent.lastDataHash && gw3Client.rmPin(ent.lastDataHash), // save some number of pins & IPFS space
    ])

    const [ret] = await dbApi.updateUserIPNSKey(
      ent.authorId,
      {
        // lastDataHash: ent.lastDataHash,
        // lastPublished: null,
        isPurged: true,
        // purgedAt: null
      },
      [
        'testGw3IPNSKey',
        'pem',
        'useMattersIPNS',
        'lastCidSize',
        'lastCidSublinks',
        'retriesAfterMissing',
        'missingInLast50',
      ]
    )
    console.log(new Date(), `${idx + 1}: purged:`, res, ret, ent)

    await delay(2e3)
  }

  if (
    resStatsData.pinned_count / resStatsData.pinned_count_limit >=
      usageRatioThreshold ||
    resStatsData.pinned_bytes / resStatsData.pinned_bytes_limit >=
      usageRatioThreshold
  )
    await purgeGw3Pins({
      skip:
        Math.floor(
          (resStatsData.pinned_count_limit / 2 + // beginning at middle point and add some +/- randomness;
            10000 * (Math.random() - 0.5)) /
            100
        ) * 100, // align to multiple of 100s
    })

  resStats = await gw3Client.getStats()
  resStatsData = resStats?.code === 200 ? resStats.data : null

  const ended = new Date()
  console.log(
    ended,
    `elapsed ${((+ended - +started) / 60e3).toFixed(1)}m, purged ${
      toPurged.length
    } authors: removed ${cnt} ipns from gw3.`,
    resStats
  )
  printUsagePercentage(resStatsData)
}

const ALLOWED_USER_STATES = new Set(['active', 'onboarding', 'frozen'])

export async function refreshIPNSFeed(
  userName: string,
  {
    limit = 50,
    incremental = true,
    forceReplace = false,
    useMattersIPNS,
    webfHost,
  }: {
    limit?: number
    incremental?: boolean
    forceReplace?: boolean
    useMattersIPNS?: boolean
    webfHost?: string
  } = {}
) {
  const [author] = await dbApi.getAuthor(userName)
  console.log(new Date(), 'get author:', author)
  if (!author || !ALLOWED_USER_STATES.has(author?.state)) {
    console.log(new Date(), `no such user:`, author)
    return
  }
  const [ipnsKeyRec] = await dbApi.getUserIPNSKey(author.id)
  console.log(new Date(), 'get user ipns:', ipnsKeyRec)
  if (!ipnsKeyRec) {
    // TODO: generate ipnsKeyRec here
    console.error(
      new Date(),
      `skip no ipnsKeyRec: for author: '${author.displayName} (@${author.userName})'`
    )
    // return;
  }
  // if (useMattersIPNS == null) { // undefined
  console.log(
    new Date(),
    `input useMattersIPNS:`,
    typeof useMattersIPNS,
    useMattersIPNS,
    ipnsKeyRec?.stats?.useMattersIPNS
  )
  useMattersIPNS = useMattersIPNS ?? ipnsKeyRec?.stats?.useMattersIPNS ?? false // remember the settings from last time
  console.log(
    new Date(),
    `input useMattersIPNS:`,
    typeof useMattersIPNS,
    useMattersIPNS,
    ipnsKeyRec?.stats?.useMattersIPNS
  )

  const articles = await dbApi.listAuthorArticles({
    authorId: author.id,
    take: limit,
  })
  const drafts = await dbApi.listDrafts({
    ids: articles.map((item: Item) => item.draftId as string),
    take: limit,
  })

  const lastArti = articles[0]

  console.log(
    new Date(),
    `get ${articles.length} articles /${drafts.length} drafts for author: '${author.displayName} (@${author.userName})', last_article:`,
    lastArti
  )
  if (articles.length <= 10) {
    forceReplace = true
    console.log(
      new Date(),
      `author '${author.displayName} (@${author.userName})' has ${articles.length} (<=10) articles, set all replace mode.`
    )
  }

  if (webfHost === '') {
    // reset
    webfHost = undefined
  } else if (webfHost == null) {
    console.log(new Date(), `setting webfHost:`, {
      webfHost,
      orig: ipnsKeyRec?.stats?.webfHost,
    })
    webfHost = ipnsKeyRec?.stats?.webfHost // remember the settings from last time
  }

  const feed = new AuthorFeed({
    author,
    ipnsKey: ipnsKeyRec?.ipnsKey,
    webfHost,
    drafts,
    articles,
  })
  // console.log(new Date(), "get author feed:", feed);
  await feed.loadData()
  // const { html, xml, json } = feed.generate();
  // console.log(new Date(), "get author feed generated:", { html, xml, json });

  const kname = `matters-town-homepages-topdir-for-${author.userName}-${author.uuid}`

  const key = await ipfsPool.genKey()
  // const pem = key.privateKey.export({ format: "pem", type: "pkcs8" }) as string;
  let imported,
    ipfs = ipfsPool.get()
  const keyPair = {
    ipnsKey: '',
    pem: key.privateKey.export({ format: 'pem', type: 'pkcs8' }) as string,
  }
  // let failures = 0;
  for (let failures = 0; failures <= ipfsPool.size; failures++) {
    try {
      console.log(
        new Date(),
        'importing key:',
        key // pem
      )
      ;({ imported, client: ipfs } = await ipfsPool.importKey({
        name: kname,
        pem: keyPair.pem,
      }))
      if (imported) {
        console.log(new Date(), 'new generated key:', imported)
        keyPair.ipnsKey = imported.Id
        // keyPair.pem = key.privateKey.export({ format: "pem", type: "pkcs8" }) as string;
        Promise.resolve(ipfs.key.rm(kname)).catch((err) => {
          console.error(new Date(), `ERROR:`, err)
        }) // rm async
        break
      }
      console.log(
        new Date(),
        `got nothing from imported, probably has an existing name:`,
        kname
      )
      // ipfs.key.rm(kname);
      Promise.resolve(ipfs.key.rm(kname)).catch((err) => {
        console.error(new Date(), `ERROR:`, err)
      }) // rm async
    } catch (err) {
      console.error(new Date(), 'get ipfs import ERROR:', err)
    }
  }
  if (!imported) {
    console.log(new Date(), 'no keys generated', ipfsPool.size)
    return
  }

  // console.log(new Date, `processing ${}'s last article:`, );

  const dateSuffix = new Date().toISOString().substring(0, 13)
  const directoryName = `${kname}-with-${lastArti?.id || ''}-${
    lastArti?.slug || ''
  }@${dateSuffix}`

  if (useMattersIPNS && ipnsKeyRec?.privKeyPem) {
    console.log(
      new Date(),
      `use matters pre-generated keypair:`,
      useMattersIPNS
    )
    keyPair.ipnsKey = ipnsKeyRec.ipnsKey
    keyPair.pem = ipnsKeyRec.privKeyPem
  } else if (!useMattersIPNS) {
    // use the new generated key pair
  } else if (ipnsKeyRec?.stats?.testGw3IPNSKey && ipnsKeyRec?.stats?.pem) {
    keyPair.ipnsKey = ipnsKeyRec.stats.testGw3IPNSKey
    keyPair.pem = ipnsKeyRec.stats.pem
  }

  // TO MOVE TO library
  // const extraBundles = await feed.activityPubBundles(); // { author, // userName: author.userName, ipnsKey: keyPair.ipnsKey, });
  const contents = [
    // { path: `${directoryName}/index.html`, content: html, },
    // { path: `${directoryName}/rss.xml`, content: xml, },
    // { path: `${directoryName}/feed.json`, content: json, },
    ...(await feed.feedBundles()),
    ...(await feed.activityPubBundles()),
  ].map(({ path, content }) => ({
    path: `${directoryName}/${path}`,
    content,
  }))

  const addEntries: [string, string][] = []
  const promises: Promise<any>[] = []

  const results = []
  for await (const result of ipfs.addAll(contents)) {
    results.push(result)
    if (result.path === directoryName) {
      // topDirHash = result.cid?.toString();
      promises.push(gw3Client.addPin(result.cid?.toString(), result.path))
    } else if (result.path.startsWith(directoryName) && !forceReplace) {
      // replace mode will start with this new topDirHash, no need to keep pinning files inside
      // get all paths below, 'index.html' 'feed.json' 'rss.xml'
      // if (result.cid)
      addEntries.push([path.basename(result.path), result.cid?.toString()])
      promises.push(gw3Client.addPin(result.cid?.toString(), result.path))
    }
  }

  const topDirCid = results.find((r) => r.path === directoryName)?.cid
  if (!topDirCid) {
    console.error(new Date(), 'cannot find root cid', results)
    return
  }
  const topDirHash = topDirCid.toString()
  const dagStream = await ipfs.dag.export(topDirCid)
  console.log(new Date(), 'dagStream:', dagStream)
  // console.log(new Date(), "dagStream:", Readable.from(dagStream));
  const bufs = []
  for await (const chunk of dagStream) {
    // console.log(new Date(), `${bufs.length}:`, typeof chunk, chunk);
    bufs.push(chunk)
  }
  const carFile = new Blob(bufs) // Buffer.concat(bufs);
  console.log(new Date(), `got total ${bufs.length} chunks:`, carFile)
  const resDagImport = await gw3Client.dagImport(carFile)
  console.log(new Date(), 'resDagImport:', resDagImport)

  await Promise.all(promises)
  promises.splice(0, promises.length)

  console.log(
    new Date(),
    `ipfs.addAll got ${results.length} results:`,
    results,
    addEntries
  )

  // const res = await Promise.all( results .map(({ path, cid }) => gw3Client.addPin(cid?.toString(), path)));
  // console.log(new Date(), "ipfs.addAll results pinning:", res);

  // TODO: pool wait'ing all becomes pinned

  const lastDataHash = ipnsKeyRec?.lastDataHash as string

  let lastCid = (forceReplace ? topDirHash : lastDataHash) || topDirHash // fallback to topDirHash if non existed before

  let lastCidData = await gw3Client.addPinWait(
    lastCid,
    `matters.town/@${author.userName}-lastest-top-dir-hash`
  )
  if (lastCidData?.status !== 'pinned') {
    console.log(
      new Date(),
      `lastCid top-dir-hash: "${lastCid}" not pinned yet:`,
      lastCidData
    )
    return
  }

  let dagLinks = await gw3Client.getDAG(lastCid)
  console.log(
    new Date(),
    `get prior running last cid ${lastCid} dag ${+dagLinks?.Links
      ?.length} links:`,
    dagLinks?.Links
  )
  let existingLinks = new Map<string, any>(
    dagLinks?.Links?.map((e: any) => [e.Name, e])
  )
  let existingCids = new Set<string>(
    dagLinks?.Links?.map((e: any) => e.Hash['/'])?.filter(Boolean)
  )

  articles // .slice(0, limit)
    .forEach((arti) => {
      if (arti.dataHash && !existingCids.has(arti.dataHash)) {
        addEntries.push([`${arti.id}-${arti.slug}`, arti.dataHash])

        promises.push(
          gw3Client
            .addPin(
              arti.dataHash,
              `matters.town/@${author.userName}/${arti.id}-${arti.slug}`
            )
            .then((resData) => {
              if (resData?.code !== 200) {
                console.error(
                  new Date(),
                  `failed add pin ${arti.dataHash}:`,
                  resData
                )
              }
            })
        )
      }
    })
  console.log(new Date(), `wait adding non-existed ${promises.length} cids.`)
  if (promises.length > 0) {
    await Promise.all(promises)
    promises.splice(0, promises.length)

    await delay(1000 * (2 + 10 * Math.random()))
  }

  const res = await Promise.all(
    addEntries.map(([, cid]) => gw3Client.getPin(cid))
  )
  console.log(
    new Date(),
    `get all 3 index + lastest articles ${addEntries.length} pinning:`,
    // res,
    res.map((r) => (r.code === 200 ? r.data : r))
  )

  const waitCids = new Set([lastCid])
  addEntries // .slice(0, 10)
    .forEach(([, cid]) => {
      if (cid && !existingCids.has(cid)) waitCids.add(cid)
    })

  for (let i = 0; i < 10 && waitCids.size > 0; i++) {
    console.log(
      new Date(),
      `wait on ${waitCids.size} cids to settle:`,
      waitCids
    )
    const res = await Promise.all(
      Array.from(waitCids, (cid) => cid && gw3Client.getPin(cid))
    )
    const rows = res.map((r) => (r.code === 200 ? r.data : r))
    console.log(new Date(), `pinning status:`, rows)
    rows.forEach((r) => {
      // if (r.status === "pinned") waitCids.delete(r.cid);
      switch (r?.status) {
        case 'pinned':
        case 'failure':
          waitCids.delete(r.cid)
      }
    })
    if (waitCids.size === 0) {
      console.log(new Date(), 'all settled (pinned or failure).')
      break
    }
    await delay(1000 * (5 + 20 * Math.random()))

    if (i >= 7 && waitCids.size > 0) {
      // at last rounds
      // after 5 retries if there's still pending try dagImport some failed cids
      // const [cid] = waitCids;
      const cid =
        Array.from(waitCids)[Math.floor(Math.random() * waitCids.size)] // pick one randomly to dag import
      console.log(
        new Date(),
        `still have ${waitCids.size} not pinned, trying dagImport:`,
        cid
      )

      const dagStream = await ipfs.dag.export(CID.parse(cid))
      console.log(new Date(), 'dagStream:', dagStream)
      // console.log(new Date(), "dagStream:", Readable.from(dagStream));
      const bufs: Uint8Array[] = []
      try {
        await Promise.race([
          (async function () {
            for await (const chunk of dagStream) {
              // console.log(new Date(), `${bufs.length}:`, typeof chunk, chunk);
              bufs.push(chunk)
            }
          })().catch((err) =>
            console.error(new Date(), 'read dagStream ERROR:', err)
          ),
          delay(130e3), // wait max 3minutes
        ])
      } catch (err) {
        console.log(`ERROR:`, err)
      } finally {
        console.log(new Date(), `got ${bufs.length} chunks.`)
      }
      if (bufs.length > 0) {
        const carFile = new Blob(bufs) // Buffer.concat(bufs);
        console.log(new Date(), `got total ${bufs.length} chunks:`, carFile)
        const resDagImport = await gw3Client.dagImport(carFile)
        console.log(new Date(), 'resDagImport:', resDagImport)

        const resData = await gw3Client.addPinWait(cid)
        console.log(new Date(), `got pin again:`, { cid }, resData)
        if (resData?.status === 'pinned') waitCids.delete(cid)
      }
    }
  }

  console.log(
    new Date(),
    `after poll waiting, ${waitCids.size} not pinned, will add rest ${addEntries.length} entries:`,
    addEntries
  )

  const toAddEntries = forceReplace
    ? articles
        .filter(({ dataHash }) => dataHash && !waitCids.has(dataHash))
        .map(
          (arti) =>
            [`${arti.id}-${arti.slug}`, arti.dataHash] as [string, string]
        )
    : addEntries.filter(([name, cid]) => {
        if (existingLinks.get(name)?.Hash?.['/'] === cid) return false // already there, no need to re-attach
        if (waitCids.has(cid)) return false // can no way add it if not pinned
        return true
      })
  console.log(
    new Date(),
    `missing ${toAddEntries.length} (from ${addEntries.length}) entries:`,
    toAddEntries
  )

  console.log(
    new Date(),
    `import ${toAddEntries.length} entries into folder:`,
    lastCid
  )
  while (toAddEntries.length > 0) {
    // await gw3Client.addPin(lastCid, `matters-town-homepages/for-${author.userName}-latest-top-dir-hash`);
    await gw3Client.importFolder(lastCid)
    // after PUT folder, better to wait 1sec
    // otherwise, often got { code: 400, msg: 'PIN resource is locked for processing by the system' }
    // await delay(1000 * (1 + 10 * Math.random()));

    const resFolderOps = await gw3Client.callFolderOperation(lastCid, {
      add: toAddEntries.splice(0, 50), // gw3 API changed the limit to 50 since 8/28
      pin_new: true,
      unpin_old: true,
    })
    console.log(
      new Date(),
      'folder/operation res:',
      toAddEntries.length,
      resFolderOps
    )
    if (!resFolderOps?.data?.cid) {
      console.error(
        new Date(),
        `folder/operation failed, stopped at ${lastCid}: with ${toAddEntries.length} remaining addEntries.`
      )
      break
    }
    const prior = lastCid
    lastCid = resFolderOps.data.cid
    console.log(new Date(), 'folder/operation after attached new cid:', lastCid)

    if (incremental) {
      console.log(
        new Date(),
        `once folder/operation only for incremental mode, still has ${toAddEntries.length} missing.`
      )
      break
    }

    // toAddEntries.splice(0, 10);
    shuffle(toAddEntries)
    // await gw3Client.addPin( lastCid, `matters-town-homepages/for-${author.userName}-latest`);
    // TODO: wait it becomes 'pinned'

    // if (prior !== lastCid) gw3Client.rmPin(prior); // no need to wait, let it run async with best effort
  }

  const testGw3IPNSKey = keyPair.ipnsKey // imported.Id;
  const resGetIpns1 = await gw3Client.getIpns(keyPair.ipnsKey)
  // console.log(new Date(), "ipns name get:", resGetIpns2);
  console.log(new Date(), `ipns name get ${keyPair.ipnsKey}:`, resGetIpns1)

  let resIPNS

  const topAuthorDirName = `matters.town/@${author.userName}` // ${ extraBundles.length > 0 ? `@${dateSuffix}` : "" }`;
  {
    // check & delete if exists
    const res = await gw3Client.getIpnsByName(topAuthorDirName)
    if (res?.code === 200 && res.data.name !== keyPair.ipnsKey) {
      // name/rm
      const res2 = await gw3Client.rmIPNSName(res.data.name)
    }
  }

  if (resGetIpns1?.code === 200) {
    // existed: do update
    if (resGetIpns1?.data.value === lastCid) {
      console.log(new Date(), `lastCid remained the same, no need to update:`, {
        // testGw3IPNSKey,
        keyPair, // .ipnsKey,
        lastCid,
        ipnsKeyRec,
      })
      return ipnsKeyRec?.stats
    }

    resIPNS = await gw3Client.updateIPNSName({
      ipnsKey: keyPair.ipnsKey,
      cid: lastCid,
    })
    console.log(new Date(), `updated ipns:`, resIPNS)
  } else {
    // not existed: do import

    const importArgs = {
      ipnsKey: keyPair.ipnsKey,
      cid: lastCid,
      pem: keyPair.pem,
      alias: topAuthorDirName,
    }
    resIPNS = await gw3Client.importIPNSName(importArgs)
    // console.log(new Date(), "ipns name (import) publish:", resImport, { lastDataHash, lastCid, });
  }
  if (resIPNS?.code !== 200) {
    console.error(new Date(), `failed ipns update:`, resIPNS, {
      lastDataHash,
      lastCid,
    })
    return
  }

  const resGetIpns2 = await gw3Client.getIpns(keyPair.ipnsKey)
  // console.log(new Date(), "ipns name get:", resGetIpns2);
  console.log(new Date(), `ipns name get ${keyPair.ipnsKey}:`, resGetIpns2)

  dagLinks = await gw3Client.getDAG(lastCid) // retrieve again
  console.log(
    new Date(),
    `get current running last cid ${lastCid} dag ${+dagLinks?.Links
      ?.length} links:`,
    dagLinks?.Links
  )
  existingLinks = new Map<string, any>(
    dagLinks?.Links?.map((e: any) => [e.Name, e])
  )
  existingCids = new Set<string>(
    dagLinks?.Links?.map((e: any) => e.Hash['/'])?.filter(Boolean)
  )

  // add all sub-links to unpin
  const toUnpinCids = new Set<string>(existingCids)

  const missingEntries = articles.filter(
    ({ id, slug, dataHash }) =>
      // !(existingLinks.get(name)?.Hash["/"] === cid) && waitCids.has(cid)
      !existingLinks.has(`${id}-${slug}`)
  )
  const missingEntriesInLast50 = articles.slice(0, 50).filter(
    ({ id, slug, dataHash }) =>
      // !(existingLinks.get(name)?.Hash["/"] === cid) && waitCids.has(cid)
      !existingLinks.has(`${id}-${slug}`)
  )
  if (missingEntries.length > 0) {
    console.log(
      new Date(),
      `still has ${missingEntries.length} entries missing:`,
      missingEntries.map(({ id, slug, dataHash }) => ({
        path: `${id}-${slug}`,
        dataHash,
      }))
    )
  }
  gw3Client.renamePin(lastCid, topAuthorDirName) // async without wait'ing
  lastCidData = await gw3Client.addPinWait(lastCid, topAuthorDirName)
  console.log(new Date(), `lastCid ${lastCid} pin:`, lastCidData)

  const newTopDagLinks = await gw3Client.getDAG(lastCid)
  newTopDagLinks?.Links?.forEach((e: any) => toUnpinCids.add(e?.Hash['/']))

  const statsData = {
    userName: author.userName,
    limit: Math.max(articles.length, drafts.length),
    missing: missingEntries.length,
    missingInLast50:
      missingEntries.length === 0 ? undefined : missingEntriesInLast50.length,
    ipnsKey: keyPair.ipnsKey, // testGw3IPNSKey,
    privKeyPEM: keyPair.pem,
    ...(useMattersIPNS ? null : { testGw3IPNSKey, pem: keyPair.pem }),
    pemName: kname,
    lastDataHash: lastCid,
    lastCidSize: lastCidData?.size,
    lastCidSublinks: newTopDagLinks?.Links?.length,
    // lastPublished: ipnsKeyRecUpdated?.lastPublished,
    lastPublished: resGetIpns2?.data?.publish_at
      ? new Date(resGetIpns2.data.publish_at * 1000)
      : undefined,
    retriesAfterMissing:
      missingEntries.length > 0
        ? (ipnsKeyRec?.stats?.retriesAfterMissing ?? 0) + 1
        : undefined,
    useMattersIPNS: useMattersIPNS || undefined,
    webfHost,
  }
  let ipnsKeyRecUpdated: Item = ipnsKeyRec!

  if (lastCid === lastDataHash) {
    console.log(
      new Date(),
      `skip update because new lastCid is same as lastDataHash:`,
      { lastCid, lastDataHash }
    )
  } else {
    const [ret] = await dbApi.upsertUserIPNSKey(
      author.id,
      statsData,
      Array.from(
        // keys to delte from stats
        new Set(
          [
            [
              missingEntries.length === 0
                ? ['retriesAfterMissing', 'missingInLast50']
                : undefined,
            ],
            [
              missingEntriesInLast50.length === 0
                ? 'missingInLast50'
                : undefined,
            ],
            [useMattersIPNS ? ['testGw3IPNSKey', 'pem'] : 'useMattersIPNS'],
            [webfHost == null ? 'webfHost' : undefined],
            'isPurged',
          ]
            .flat(Infinity)
            .filter(Boolean)
        )
      ) as string[]
    )
    console.log(new Date(), 'ipns name updated:', ret)
    if (ret) {
      ipnsKeyRecUpdated = ret
      // statsData.lastPublished = ret.lastPublished;
    }
  }

  console.log(
    new Date(),
    `updated for author: '${author.displayName} (@${author.userName})' at ${webfHost}: get ${articles.length} articles /${drafts.length} drafts`,
    missingEntriesInLast50.map(({ id, slug, dataHash }) => ({
      path: `${id}-${slug}`,
      dataHash,
    })),
    statsData
  )

  toUnpinCids.delete(lastCid)
  if (ipnsKeyRecUpdated?.lastDataHash)
    toUnpinCids.delete(ipnsKeyRecUpdated.lastDataHash)
  if (toUnpinCids.size > 0) {
    console.log(
      new Date(),
      `try unpin all ${toUnpinCids.size} unneeded pins:`,
      toUnpinCids
    )
    toUnpinCids.forEach((cid) => {
      gw3Client.rmPin(cid)
    })
  }

  return statsData
}

function delay(timeout: number) {
  return new Promise((fulfilled) => setTimeout(fulfilled, timeout))
}
