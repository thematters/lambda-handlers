import type { Knex } from 'knex'
import type { NotificationType } from '../notification/types'

import { NOTICE_TYPE, OFFICIAL_NOTICE_EXTEND_TYPE } from '../notification/enums'
import { NotificationService } from '../notification'
import { getKnexClient } from '../utils/db'

let knex: Knex
let notificationService: NotificationService

const NOTIFICATION_TYPES: NotificationType[] = [
  ...Object.values(NOTICE_TYPE),
  ...Object.values(OFFICIAL_NOTICE_EXTEND_TYPE),
]
const recipientId = '1'

beforeAll(async () => {
  knex = getKnexClient(process.env.MATTERS_PG_RO_CONNECTION_STRING || '')
  notificationService = new NotificationService(knex, knex)
})

/**
 * Notification Service
 */
describe('user notify setting', () => {
  const defaultNoifySetting: Record<NotificationType, boolean> = {
    // user
    user_new_follower: true,

    // article
    article_published: true,
    article_new_appreciation: true,
    article_new_subscriber: false,
    article_mentioned_you: true,
    revised_article_published: true,
    revised_article_not_published: true,
    circle_new_article: true,

    // moment
    moment_liked: true,
    moment_mentioned_you: true,

    // article-article
    article_new_collected: false,

    // comment
    article_comment_liked: true,
    moment_comment_liked: true,
    article_comment_mentioned_you: true,
    moment_comment_mentioned_you: true,
    article_new_comment: true,
    moment_new_comment: true,
    circle_new_broadcast: true,

    // comment-comment
    comment_new_reply: true,

    // transaction
    payment_received_donation: true,

    // circle
    circle_invitation: true,
    circle_new_subscriber: true,
    circle_new_unsubscriber: true,
    circle_new_follower: true,

    circle_new_broadcast_comments: true, // only a placeholder
    circle_broadcast_mentioned_you: true,
    circle_member_new_broadcast_reply: true,
    in_circle_new_broadcast_reply: false,

    circle_new_discussion_comments: true, // only a placeholder
    circle_discussion_mentioned_you: true,
    circle_member_new_discussion: true,
    circle_member_new_discussion_reply: true,
    in_circle_new_discussion: true,
    in_circle_new_discussion_reply: false,

    // misc
    official_announcement: true,
    user_banned: true,
    user_banned_payment: true,
    user_frozen: true,
    user_unbanned: true,
    comment_banned: true,
    article_banned: true,
    comment_reported: true,
    article_reported: true,
  }

  test('user receives notifications', async () => {
    await Promise.all(
      NOTIFICATION_TYPES.map(async (type) => {
        // @ts-ignore
        const notifySetting = await notificationService.findNotifySetting(
          recipientId
        )
        const enable = await notificationService.checkUserNotifySetting({
          event: type,
          setting: notifySetting,
        })
        expect(enable).toBe(defaultNoifySetting[type])
      })
    )
  })
})

/**
 * Notice Service
 */
const getBundleableUserNewFollowerNotice = async () => {
  // @ts-ignore
  const bundleables = await notificationService.findBundleables({
    type: 'user_new_follower',
    actorId: '4',
    recipientId,
  })
  return bundleables[0]
}

describe('bundle notices', () => {
  test('bundleable', async () => {
    // bundleable
    const userNewFollowerNotice = await getBundleableUserNewFollowerNotice()
    expect(userNewFollowerNotice.id).not.toBeUndefined()
  })

  test('bundle successs', async () => {
    const notice = await getBundleableUserNewFollowerNotice()
    if (!notice) {
      throw new Error('expect notice is bundleable')
    }
    const noticeActors = await notificationService.findActors(notice.id)
    expect(noticeActors.length).toBe(2)
    // @ts-ignore
    await notificationService.addNoticeActor({
      noticeId: notice.id,
      actorId: '4',
    })
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const notice2Actors = await notificationService.findActors(notice.id)
    expect(notice2Actors.length).toBe(3)
  })

  test('bundle failed if the notice actor is duplicate', async () => {
    const notice = await getBundleableUserNewFollowerNotice()
    if (!notice) {
      throw new Error('expect notice is bundleable')
    }
    try {
      // @ts-ignore
      await notificationService.addNoticeActor({
        noticeId: notice.id,
        actorId: '2',
      })
    } catch (e) {
      expect(() => {
        throw e
      }).toThrowError('unique constraint')
    }
  })

  test('mark notice as read then it becomes unbundleable', async () => {
    const notice = await getBundleableUserNewFollowerNotice()
    if (!notice) {
      throw new Error('expect notice is bundleable')
    }
    await knex('notice').where({ id: notice.id }).update({ unread: false })
    const unbundleableNotice = await getBundleableUserNewFollowerNotice()
    expect(unbundleableNotice).toBeUndefined()
  })
})
