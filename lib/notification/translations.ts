import type { Knex } from 'knex'
import type { Language, TableName } from '../types'
import { makeSummary } from '@matters/ipns-site-generator'

import { i18n } from './utils.js'

export const findTranslation = async (
  {
    table,
    field,
    id,
    language,
  }: { table: TableName; field: string; id: string; language: Language },
  knex: Knex
) => {
  const { id: entityTypeId } = await knex('entity_type')
    .select('id')
    .where({ table })
    .first()
  const result = await knex('translation')
    .select('text')
    .where({ entityTypeId, entityField: field, entityId: id, language })
    .first()
  return result ? result.text : null
}

export default {
  user_banned: i18n<{ banDays?: number }>({
    zh_hant: ({ banDays }) =>
      banDays
        ? `因為違反社區規則，您已被禁言 ${banDays} 天，無法發佈作品和評論`
        : '因為違反社區規則，您已被禁言，無法發佈作品和評論',
    zh_hans: ({ banDays }) =>
      banDays
        ? `因为违反社区规则，您已被禁言 ${banDays} 天，无法发布作品和评论`
        : '因为违反社区规则，您已被禁言，无法发布作品和评论',
    en: ({ banDays }) =>
      banDays
        ? 'You have been fobidden to publish any contents' +
          `and comments within ${banDays} days for vilolating the Term of Use`
        : 'You have been fobidden to publish any contents and comments for vilolating the Term of Use',
  }),
  user_banned_payment: i18n({
    zh_hant:
      '由於系統偵測到異常金流，您的帳號將被暫時凍結，有任何疑問請來信 hi@matters.town 聯繫站方',
    zh_hans:
      '由于系統检测到异常金流，您的账号將被暂时冻结，有任何疑问请來信 hi@matters.town 联系站方',
    en: 'Due to the detection of irregular transactions, your account has been temporarily suspended. If you require further clarification, please contact us at hi@matters.town',
  }),
  user_frozen: i18n({
    zh_hant: '因為違反社區規則，Matters 決定將您的賬戶凍結，無法在站上進行互動',
    zh_hans: '因为违反社区规则，Matters 决定将您的账户冻结，无法在站上进行互动',
    en: 'Your account has been deactivated for vilolating the Term of Use',
  }),
  user_unbanned: i18n({
    zh_hant: '你的評論與創作權限已恢復',
    zh_hans: '你的评论与创作权限已恢复',
    en: 'Your account has been recover.',
  }),
  comment_banned: i18n<{ content: string }>({
    zh_hant: ({ content }) =>
      `因為違反社區規則，您的評論「${makeSummary(content, 21)}」已被隱藏`,
    zh_hans: ({ content }) =>
      `因为违反社区规则，您的评论“${makeSummary(content, 21)}”已被隐藏`,
    en: ({ content }) =>
      `You comment "${makeSummary(
        content,
        21
      )}" has been archived from Matters for violating the community rules`,
  }),
  article_banned: i18n<{ title: string }>({
    zh_hant: ({ title }) => `因為違反社區規則，您的作品《${title}》已被隱藏`,
    zh_hans: ({ title }) => `因为违反社区规则，您的作品《${title}》已被隐藏`,
    en: ({ title }) =>
      `You article "${title}" has been archived from Matters for violating the community rules`,
  }),
  comment_reported: i18n<{ content: string }>({
    zh_hant: ({ content }) => `您的評論被舉報「${makeSummary(content, 17)}」`,
    zh_hans: ({ content }) => `您的评论被举报“${makeSummary(content, 17)}”`,
    en: ({ content }) =>
      `Your comment "${makeSummary(
        content,
        17
      )}" has been reported by other users`,
  }),
  article_reported: i18n<{ title: string }>({
    zh_hant: ({ title }) => `您的作品《${title}}》被舉報`,
    zh_hans: ({ title }) => `您的作品《${title}}》被举报`,
    en: ({ title }) =>
      `Your article "${title}" has been reported by other users`,
  }),
  write_challenge_applied: i18n<{ name: string }>({
    zh_hant: ({ name }) =>
      `你已成功報名${name}，前往查看更多資訊、結交馬特市文友`,
    zh_hans: ({ name }) =>
      `你已成功报名${name}，前往查看更多资讯、结交马特市文友`,
    en: ({ name }) =>
      `You have successfully applied for ${name}. Go to check out more information and make friends in Matters.`,
  }),
  badge_grand_slam_awarded: i18n({
    zh_hant: '太棒了！恭喜獲得七日書大滿貫，快去看看你的新徽章',
    zh_hans: '太棒了！恭喜获得七日书大满贯，快去看看你的新徽章',
    en: 'Marvelous! Congratulations on winning the Seven-Day Free Writing Grand Slam, go check out your new badge.',
  }),
}
