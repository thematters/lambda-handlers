import type { Knex } from 'knex'
import type { NotificationType } from '../notification/types.js'

import { sendmail } from './sendmail.js'

import { NOTICE_TYPE } from '../notification/enums.js'
import { NotificationService } from '../notification/index.js'

export const sendDailySummaryEmails = async (knex: Knex) => {
  const notice = new NotificationService(knex, knex)
  const users = await notice.findDailySummaryUsers()

  const jobs = users.map(async (user) => {
    if (!user.email || !user.emailVerified) {
      console.log(
        `User ${user.id} does not have an verified email address, skipping`
      )
      return
    }

    const notices = await notice.findDailySummaryNoticesByUser(user.id)
    if (!notices || notices.length <= 0) {
      console.log(`User ${user.id} does not have any notices, skipping`)
      return
    }

    const filterNotices = (type: NotificationType) =>
      notices.filter((notice) => notice.noticeType === type)

    await sendmail({
      to: user.email,
      recipient: {
        displayName: user.displayName,
      },
      notices: {
        user_new_follower: filterNotices(NOTICE_TYPE.user_new_follower),
        article_new_collected: filterNotices(NOTICE_TYPE.article_new_collected),
        article_new_appreciation: filterNotices(
          NOTICE_TYPE.article_new_appreciation
        ),
        article_new_subscriber: filterNotices(
          NOTICE_TYPE.article_new_subscriber
        ),
        article_new_comment: filterNotices(NOTICE_TYPE.article_new_comment),
        article_mentioned_you: filterNotices(NOTICE_TYPE.article_mentioned_you),
        comment_new_reply: filterNotices(NOTICE_TYPE.comment_new_reply),
        article_comment_mentioned_you: filterNotices(
          NOTICE_TYPE.article_comment_mentioned_you
        ),

        // circle
        circle_invitation: filterNotices(NOTICE_TYPE.circle_invitation),
        circle_new_subscriber: filterNotices(NOTICE_TYPE.circle_new_subscriber),
        circle_new_follower: filterNotices(NOTICE_TYPE.circle_new_follower),
        circle_new_unsubscriber: filterNotices(
          NOTICE_TYPE.circle_new_unsubscriber
        ),
        circle_new_article: filterNotices(NOTICE_TYPE.circle_new_article),
        circle_new_broadcast: filterNotices(NOTICE_TYPE.circle_new_broadcast),
        circle_new_broadcast_comments: filterNotices(
          NOTICE_TYPE.circle_new_broadcast_comments
        ),
        circle_new_discussion_comments: filterNotices(
          NOTICE_TYPE.circle_new_discussion_comments
        ),
      },
      language: user.language,
    })
  })
  await Promise.all(jobs)
}
