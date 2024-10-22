export enum NOTICE_TYPE {
  // user
  user_new_follower = 'user_new_follower',

  // article
  article_published = 'article_published',
  article_new_appreciation = 'article_new_appreciation',
  article_new_subscriber = 'article_new_subscriber',
  article_mentioned_you = 'article_mentioned_you',
  revised_article_published = 'revised_article_published',
  revised_article_not_published = 'revised_article_not_published',
  circle_new_article = 'circle_new_article',

  // article-article
  article_new_collected = 'article_new_collected',

  // collection
  collection_liked = 'collection_liked',

  // moment
  moment_liked = 'moment_liked',
  moment_mentioned_you = 'moment_mentioned_you',

  // comment
  article_comment_liked = 'article_comment_liked',
  moment_comment_liked = 'moment_comment_liked',
  article_comment_mentioned_you = 'article_comment_mentioned_you',
  moment_comment_mentioned_you = 'moment_comment_mentioned_you',
  article_new_comment = 'article_new_comment',
  moment_new_comment = 'moment_new_comment',
  circle_new_broadcast = 'circle_new_broadcast',

  // comment-comment
  comment_new_reply = 'comment_new_reply',

  // campaign-article
  campaign_article_featured = 'campaign_article_featured',

  // transaction
  payment_received_donation = 'payment_received_donation',

  // circle
  circle_invitation = 'circle_invitation',
  circle_new_subscriber = 'circle_new_subscriber',
  circle_new_follower = 'circle_new_follower',
  circle_new_unsubscriber = 'circle_new_unsubscriber',
  circle_new_broadcast_comments = 'circle_new_broadcast_comments',
  circle_new_discussion_comments = 'circle_new_discussion_comments',

  // misc
  official_announcement = 'official_announcement',
}

export enum BUNDLED_NOTICE_TYPE {
  // CircleNewBroadcasts
  'in_circle_new_broadcast_reply' = 'in_circle_new_broadcast_reply',
  'circle_member_new_broadcast_reply' = 'circle_member_new_broadcast_reply',
  'circle_broadcast_mentioned_you' = 'circle_broadcast_mentioned_you',

  // CircleNewDiscussions
  'in_circle_new_discussion' = 'in_circle_new_discussion',
  'in_circle_new_discussion_reply' = 'in_circle_new_discussion_reply',
  'circle_member_new_discussion' = 'circle_member_new_discussion',
  'circle_member_new_discussion_reply' = 'circle_member_new_discussion_reply',
  'circle_discussion_mentioned_you' = 'circle_discussion_mentioned_you',
}

// types act as `official_announcement`
export enum OFFICIAL_NOTICE_EXTEND_TYPE {
  user_banned = 'user_banned',
  user_banned_payment = 'user_banned_payment',
  user_frozen = 'user_frozen',
  user_unbanned = 'user_unbanned',
  comment_banned = 'comment_banned',
  article_banned = 'article_banned',
  article_reported = 'article_reported',
  comment_reported = 'comment_reported',
  // write challenge related
  badge_grand_slam_awarded = 'badge_grand_slam_awarded',
  write_challenge_applied = 'write_challenge_applied',
  write_challenge_applied_late_bird = 'write_challenge_applied_late_bird',
  write_challenge_announcement = 'write_challenge_announcement',
}

export enum USER_ACTION {
  follow = 'follow',
  block = 'block',
  subscribe = 'subscribe',
  upVote = 'up_vote',
  downVote = 'down_vote',
}
