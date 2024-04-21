import { BetaAnalyticsDataClient } from '@google-analytics/data'

import {
  pgKnexRO as knexRO,
  pgKnex as knex,
  type ArticleVersionDB,
  type ArticleDB,
} from './db.js'

const propertyId = process.env.MATTERS_GA4_PROPERTY_ID
const projectId = process.env.MATTERS_GA4_PROJECT_ID
const clientEmail = process.env.MATTERS_GA4_CLIENT_EMAIL
const privateKey = process.env.MATTERS_GA4_PRIVATE_KEY || ''

export const TABLE_NAME = 'article_ga4_data'

interface Row {
  path: string
  totalUsers: string
}

interface MergedData {
  [key: string]: number
}

export const getLocalDateString = (date: Date) => {
  // return utc+8 date string in YYYY-MM-DD format
  return date.toLocaleDateString('sv', { timeZone: 'Asia/Taipei' })
}

export const fetchGA4Data = async ({
  startDate,
  endDate,
}: {
  startDate: string
  endDate: string
}): Promise<Row[]> => {
  const analyticsDataClient = new BetaAnalyticsDataClient({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'),
    },
  })
  const limit = 10000
  let offset = 0
  const result: Row[] = []
  for (;;) {
    const res = await request(
      { startDate, endDate, limit, offset },
      analyticsDataClient
    )
    result.push(...res)
    offset += limit
    if (res.length < limit) {
      break
    }
  }
  return result
}

export const saveGA4Data = async (
  data: MergedData,
  { startDate, endDate }: { startDate: string; endDate: string }
) => {
  const rows = Object.entries(data).map(([id, totalUsers]) => ({
    articleId: id,
    totalUsers,
    dateRange: `[${startDate}, ${endDate}]`,
  }))
  const updateRows = []
  const insertRows = []
  for (const { articleId, dateRange, totalUsers } of rows) {
    const res = await knexRO(TABLE_NAME)
      .where({ articleId, dateRange })
      .select('id', 'totalUsers')
      .first()
    if (res && res.totalUsers) {
      if (res.totalUsers !== String(totalUsers)) {
        // only update when totalUsers is different
        updateRows.push({ id: res.id, totalUsers })
      }
    } else {
      insertRows.push({ articleId, dateRange, totalUsers })
    }
  }
  if (updateRows.length > 0) {
    for (const { id, totalUsers } of updateRows) {
      await knex(TABLE_NAME).update({ totalUsers }).where({ id: id })
    }
  }
  if (insertRows.length > 0) {
    await knex(TABLE_NAME).insert(insertRows)
  }
}

export const convertAndMerge = async (rows: Row[]): Promise<MergedData> => {
  const converted = Promise.all(
    rows.map(async (row) => ({
      id: await pathToId(row.path),
      totalUsers: parseInt(row.totalUsers, 10),
    }))
  )
  const res: MergedData = {}
  const ret = await knexRO<ArticleDB>('article').max('id').first()
  const maxLegalId = ret ? parseInt(ret.max) : 0
  for (const row of await converted) {
    if (row.id in res) {
      res[row.id] += row.totalUsers
    } else {
      if (row.id && parseInt(row.id) <= maxLegalId) {
        res[row.id] = row.totalUsers
      }
    }
  }
  return res
}

const pathToId = async (path: string) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, __, articlePath] = path.split('/')
  if (articlePath) {
    const parts = articlePath.split('-')
    const idLike = parts[0]
    const hash = parts[parts.length - 1]
    if (/^-?\d+$/.test(idLike)) {
      return idLike
    } else {
      return hashToId(hash)
    }
  }
}

const hashToId = async (hash: string) => {
  const res = await knexRO<ArticleVersionDB>('article_version')
    .where({ mediaHash: hash })
    .select('article_id')
    .first()
  if (res) {
    return res.articleId
  } else {
    return null
  }
}

// https://developers.google.com/analytics/devguides/reporting/data/v1
const request = async (
  {
    startDate,
    endDate,
    limit,
    offset,
  }: {
    startDate: string
    endDate: string
    limit: number
    offset: number
  },
  client: BetaAnalyticsDataClient
): Promise<Row[]> => {
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate,
        endDate,
      },
    ],
    dimensions: [
      {
        name: 'pagePath',
      },
    ],
    dimensionFilter: {
      filter: {
        fieldName: 'pagePath',
        stringFilter: {
          matchType: 'BEGINS_WITH',
          value: '/@',
        },
      },
    },
    metrics: [
      {
        name: 'totalUsers',
        //name: 'activeUsers',
      },
    ],
    limit,
    offset,
    returnPropertyQuota: true,
  })
  if (response && response.rows) {
    console.log(response.propertyQuota)
    console.log(`total rows count: ${response.rowCount}`)
    return response.rows.map((row) => ({
      path: (row.dimensionValues && row.dimensionValues[0].value) ?? '',
      totalUsers: (row.metricValues && row.metricValues[0].value) ?? '0',
    }))
  } else {
    throw new Error('No response received.')
  }
}
