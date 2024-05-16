import { DB_NOTICE_TYPE } from './enum.js'
import type { DBNoticeType } from './notice'
import { Notice } from './notice.js'
import { sendmail } from './sendmail.js'

export const sendDailySummaryEmails = async () => {
  const notice = new Notice()
  const users = await notice.findDailySummaryUsers()

  const jobs = users.map(async (user) => {
    if (!user.email) {
      console.log(`User ${user.id} does not have an email address, skipping`)
      return
    }

    const notices = await notice.findDailySummaryNoticesByUser(user.id)
    if (!notices || notices.length <= 0) {
      console.log(`User ${user.id} does not have any notices, skipping`)
      return
    }

    const filterNotices = (type: DBNoticeType) =>
      notices.filter((notice) => notice.noticeType === type)

    await sendmail({
      to: user.email,
      recipient: {
        displayName: user.displayName,
      },
      notices: {
        user_new_follower: filterNotices(DB_NOTICE_TYPE.user_new_follower),
        article_new_collected: filterNotices(
          DB_NOTICE_TYPE.article_new_collected
        ),
        article_new_appreciation: filterNotices(
          DB_NOTICE_TYPE.article_new_appreciation
        ),
        article_new_subscriber: filterNotices(
          DB_NOTICE_TYPE.article_new_subscriber
        ),
        article_new_comment: filterNotices(DB_NOTICE_TYPE.article_new_comment),
        article_mentioned_you: filterNotices(
          DB_NOTICE_TYPE.article_mentioned_you
        ),
        comment_new_reply: filterNotices(DB_NOTICE_TYPE.comment_new_reply),
        comment_mentioned_you: filterNotices(
          DB_NOTICE_TYPE.comment_mentioned_you
        ),

        // circle
        circle_invitation: filterNotices(DB_NOTICE_TYPE.circle_invitation),
        circle_new_subscriber: filterNotices(
          DB_NOTICE_TYPE.circle_new_subscriber
        ),
        circle_new_follower: filterNotices(DB_NOTICE_TYPE.circle_new_follower),
        circle_new_unsubscriber: filterNotices(
          DB_NOTICE_TYPE.circle_new_unsubscriber
        ),
        circle_new_article: filterNotices(DB_NOTICE_TYPE.circle_new_article),
        circle_new_broadcast: filterNotices(
          DB_NOTICE_TYPE.circle_new_broadcast
        ),
        circle_new_broadcast_comments: filterNotices(
          DB_NOTICE_TYPE.circle_new_broadcast_comments
        ),
        circle_new_discussion_comments: filterNotices(
          DB_NOTICE_TYPE.circle_new_discussion_comments
        ),
      },
      language: user.language,
    })
  })
  await Promise.all(jobs)
}
