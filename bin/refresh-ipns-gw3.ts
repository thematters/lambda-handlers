#!/usr/bin/env -S node --trace-warnings --loader ts-node/esm

import slugify from '@matters/slugify'

import {
  refreshPinLatest,
  refreshIPNSFeed,
  purgeIPNS,
} from '../lib/refresh-ipns-gw3.js'
import { AuthorFeed } from '../lib/author-feed-ipns.js'
import { dbApi } from '../lib/db.js'

async function main() {
  const args = process.argv.slice(2)
  let mode: 'publishIPNS' | 'publishIPFS' | 'uploadPinning' | 'purgeIPNS' =
    'publishIPNS'

  switch (args?.[0]) {
    case '--publishIPNS':
    case '--publishIPFS':
    case '--uploadPinning':
    case '--purgeIPNS': // remove IPNS from gw3 for too old no updating ones
      mode = args?.[0].substring(2) as any
      args.shift()
      break
  }

  if (mode === 'publishIPFS') {
    const userName = args?.[0]
    const limit = parseInt(args?.[1] ?? '1')
    const offset = parseInt(args?.[2] ?? '0')

    const articles = await dbApi.listRecentArticlesToPublish({
      userName,
      take: limit,
      skip: offset,
    })
    console.log(
      new Date(),
      `found ${articles.length} articles not published:`,
      articles
    )

    const [author] = await dbApi.getAuthor(articles?.[0]?.userName as string)
    console.log(new Date(), 'get author:', author)
    if (!author) {
      console.error(new Date(), 'no such user.')
      return
    }

    const [ipnsKeyRec] = await dbApi.getUserIPNSKey(author.id)
    console.log(new Date(), 'get user ipns:', ipnsKeyRec)

    const feed = new AuthorFeed({
      author,
      ipnsKey: ipnsKeyRec?.ipnsKey,
      // webfHost, // this is a fake one; no need for single article publishing
      articles,
    })

    // console.log(new Date(), "get author feed:", feed);
    await feed.loadData()

    console.log(
      new Date(),
      `found ${articles.length} articles to publish:`,
      articles
    )
    for (const article of articles.slice(0, 1)) {
      const res = await feed.publishToIPFS(article)
      console.log(new Date(), `from published IPFS:`, res)
      if (!res) continue
      const { contentHash, mediaHash } = res
      const dbRes = await dbApi.updateArticleDataMediaHash(
        article.articleVersionId,
        {
          dataHash: contentHash,
          mediaHash,
        }
      )
      console.log(new Date(), `from published IPFS, dbRes:`, dbRes)
    }
    return
  } else if (mode === 'uploadPinning') {
    const limit = parseInt(args?.[0] ?? '100')
    const offset = parseInt(args?.[1] ?? '0')
    await refreshPinLatest({ limit, offset })
    return
  } else if (mode === 'purgeIPNS') {
    await purgeIPNS({ skip: 10000 })
    return
  }

  let forceReplace = false
  let useMattersIPNS: boolean | undefined
  let webfHost: string | undefined

  // publish IPNS mode
  console.log(new Date(), 'running with:', args)
  while (args?.[0]?.startsWith('--')) {
    switch (args?.[0]?.split('=')?.[0]) {
      case '--forceReplace':
        forceReplace = true
        break
      case '--useMattersIPNS':
        // case "--useMattersIPNS=true": useMattersIPNS = true;
        useMattersIPNS = !(args?.[0]?.split('=')?.[1] === 'false')
        break
      // case "--useMattersIPNS=false": useMattersIPNS = false; break;
      case '--webfHost':
        webfHost = args?.[0]?.split('=')?.[1] as string
        console.log(new Date(), 'set webfHost:', webfHost)
        break
    }
    args.shift()
  }

  // await testPinning();

  const userName = args?.[0]
  let limit = parseInt(args?.[1] || '50')

  let res = await refreshIPNSFeed(userName, {
    limit,
    forceReplace,
    useMattersIPNS,
    webfHost,
  })
  console.log(new Date(), `refreshIPNSFeed res:`, res)
  if (res && res.missing <= res.limit / 10) return

  if (res?.limit > 0) limit = res?.limit

  if (limit > 10 && !((res?.missingInLast50 ?? res?.missing) === 0)) {
    // try again with limit: 10
    res = await refreshIPNSFeed(userName, {
      limit: 10,
      forceReplace,
      useMattersIPNS,
      webfHost,
    })
    console.log(new Date(), `try again refreshIPNSFeed res:`, res)
  }
}

main().catch((err) => console.error(new Date(), 'ERROR:', err))
