import crypto from 'node:crypto'

import type { Language } from './types'

import { sql, sqlRO, ARRAY_TYPE } from '../lib/db.js'
import * as d3 from 'd3-array'

import { Mail } from './mail.js'
import { DAY, EMAIL_FROM_ASK } from './constants/index.js'

const siteDomain = process.env.MATTERS_SITE_DOMAIN || ''
export const isProd = siteDomain === 'https://matters.town'
export const billboardUrl = isProd
  ? `https://billboard.matters-lab.io`
  : `https://billboard-develop.matters-lab.io`
export const claimLink = `${billboardUrl}/claim`

interface AuthorDistrib {
  // author: string;
  // clr_amount: string
  title: string
  url: string
  eth_address: string
  shares: number
  userName: string
  displayName: string
  email: string
  language: Language
}

export async function sendQfNotifications(
  distribs: AuthorDistrib[],
  amountTotal: number | bigint,
  sharesTotal: number | bigint,
  roundEndedAt: Date | string,
  doNotify = false
) {
  console.log(new Date(), `sendQfNotifications with:`, {
    distribs,
    amountTotal,
    sharesTotal,
    roundEndedAt,
    doNotify,
  })

  const authorGroups = d3.rollup(
    distribs,
    (groups) =>
      // d3.sum does not work on BigInt;
      groups.reduce(
        (acc, d) =>
          acc + (BigInt(amountTotal) * BigInt(d.shares)) / BigInt(sharesTotal),
        0n
      ),
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
    ({ id, userName, displayName, email, language }) => ({
      userId: id as string,
      userName: userName as string,
      displayName: displayName as string,
      email: email as string,
      language: language as Language,
      amount: showAmount(authorGroups.get(userName)!),
    })
  )
  console.log(`sending in-site ${authors.length} notifications:`, items)

  if (!doNotify) return

  await Promise.all([
    sendQfNotificationEmails(items, doNotify),
    sendQfNotifInsite(items, doNotify),
  ])

  // do update each user's lastQfNotifiedAt timestamp, make be able to re-run whole round for partial failure
  const retDoUpdateLastNotified =
    await sql`-- do update lastQfNotifiedAt timestamp
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
  else return `${(Number(amount) / 1e6).toFixed(6)}` // ≈
}

const getNoticeMessage = (
  language: Language,
  amount: string | number
): string => {
  switch (language) {
    case 'en':
      return `You've received a ${amount} USDT funding from Billboard. Click this notification to go to the claim page.`
    case 'zh_hans':
      return `你已获得 Billboard 配捐共 ${amount} USDT，点击此则通知前往领取页面`
    case 'zh_hant':
    default:
      return `你已獲得 Billboard 配捐共 ${amount} USDT，點擊此則通知前往領取頁面`
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
  }>,
  doNotify = false
) {
  if (!doNotify) return

  const allNotices = items.map(({ userId, language, amount, ...rest }) => ({
    userId, // language,
    message: getNoticeMessage(language, amount),
  }))
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
  }>,
  doNotify = false
) {
  // if (!doNotify) return

  return Promise.allSettled(
    items.map(({ userName, displayName, email, language, amount }) => {
      console.log(`send QF-fund mail notification to:`, {
        userName,
        displayName,
        email,
        language,
        amount,
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
    })
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
