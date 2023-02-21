export enum DB_NOTICE_TYPE {
  // user
  user_new_follower = "user_new_follower",

  // article
  article_published = "article_published",
  article_new_appreciation = "article_new_appreciation",
  article_new_subscriber = "article_new_subscriber",
  article_mentioned_you = "article_mentioned_you",
  revised_article_published = "revised_article_published",
  revised_article_not_published = "revised_article_not_published",
  circle_new_article = "circle_new_article",

  // article-article
  article_new_collected = "article_new_collected",

  // article-tag
  article_tag_has_been_added = "article_tag_has_been_added",
  article_tag_has_been_removed = "article_tag_has_been_removed",
  article_tag_has_been_unselected = "article_tag_has_been_unselected",

  // tag
  tag_adoption = "tag_adoption",
  tag_leave = "tag_leave",
  tag_add_editor = "tag_add_editor",
  tag_leave_editor = "tag_leave_editor",

  // comment
  comment_pinned = "comment_pinned",
  comment_mentioned_you = "comment_mentioned_you",
  article_new_comment = "article_new_comment",
  subscribed_article_new_comment = "subscribed_article_new_comment",
  circle_new_broadcast = "circle_new_broadcast",

  // comment-comment
  comment_new_reply = "comment_new_reply",

  // transaction
  payment_received_donation = "payment_received_donation",
  payment_payout = "payment_payout",

  // circle
  circle_invitation = "circle_invitation",
  circle_new_subscriber = "circle_new_subscriber",
  circle_new_follower = "circle_new_follower",
  circle_new_unsubscriber = "circle_new_unsubscriber",
  circle_new_broadcast_comments = "circle_new_broadcast_comments",
  circle_new_discussion_comments = "circle_new_discussion_comments",

  // crypto
  crypto_wallet_airdrop = "crypto_wallet_airdrop",
  crypto_wallet_connected = "crypto_wallet_connected",

  // misc
  official_announcement = "official_announcement",
}

export const APPRECIATION_PURPOSE = {
  appreciate: "appreciate",
  superlike: "superlike",
  appreciateComment: "appreciate-comment",
  appreciateSubsidy: "appreciate-subsidy",
  invitationAccepted: "invitation-accepted",
  joinByInvitation: "join-by-invitation",
  joinByTask: "join-by-task",
  firstPost: "first-post",
  systemSubsidy: "system-subsidy",
};

export const COMMENT_STATE = {
  active: "active",
  archived: "archived",
  banned: "banned",
  collapsed: "collapsed",
};

export const COMMENT_TYPE = {
  article: "article",
  circleDiscussion: "circle_discussion",
  circleBroadcast: "circle_broadcast",
};
