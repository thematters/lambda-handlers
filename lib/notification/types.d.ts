import type { TableName, User, Language } from '../types'

import {
  NOTICE_TYPE,
  BUNDLED_NOTICE_TYPE,
  OFFICIAL_NOTICE_EXTEND_TYPE,
  LANGUAGES,
} from './enums'

type BaseNoticeType = keyof typeof NOTICE_TYPE

type BundledNoticeType = keyof typeof BUNDLED_NOTICE_TYPE

type OfficialNoticeExtendType = keyof typeof OFFICIAL_NOTICE_EXTEND_TYPE

type NoticeEntityType =
  // primary target
  | 'target'
  // secondary target
  | 'comment'
  | 'reply'
  | 'collection'
  | 'tag'
  | 'article'
  | 'circle'

export type NotificationType =
  | BaseNoticeType
  | BundledNoticeType
  | OfficialNoticeExtendType

interface NotificationRequiredParams {
  event: NotificationType
}

interface NotificationEntity<
  T extends NoticeEntityType = NoticeEntityType,
  K extends TableName = TableName
> {
  type: T
  entityTable: K
  entity: any
}

/**
 * User
 */
interface NoticeUserNewFollowerParams extends NotificationRequiredParams {
  event: NOTICE_TYPE.user_new_follower
  recipientId: string
  actorId: string
}

/**
 * Article
 */
interface NoticeArticlePublishedParams extends NotificationRequiredParams {
  event: NOTICE_TYPE.article_published
  recipientId: string
  entities: [NotificationEntity<'target', 'article'>]
}

interface NoticeArticleNewAppreciationParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.article_new_appreciation
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'article'>]
}

interface NoticeArticleNewSubscriberParams extends NotificationRequiredParams {
  event: NOTICE_TYPE.article_new_subscriber
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'article'>]
}

interface NoticeArticleMentionedYouParams extends NotificationRequiredParams {
  event: NOTICE_TYPE.article_mentioned_you
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'article'>]
}

interface NoticeRevisedArticlePublishedParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.revised_article_published
  recipientId: string
  entities: [NotificationEntity<'target', 'article'>]
}

interface NoticeRevisedArticleNotPublishedParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.revised_article_not_published
  recipientId: string
  entities: [NotificationEntity<'target', 'article'>]
}

interface NoticeCircleNewArticleParams extends NotificationRequiredParams {
  event: NOTICE_TYPE.circle_new_article
  recipientId: string
  entities: [NotificationEntity<'target', 'article'>]
}

// Article-Article
interface NoticeArticleNewConnectedParams extends NotificationRequiredParams {
  event: NOTICE_TYPE.article_new_collected
  recipientId: string
  actorId: string
  entities: [
    NotificationEntity<'target', 'article'>,
    NotificationEntity<'collection', 'article'>
  ]
}

/**
 * Collection
 */
interface NoticeCollectionLikedParams extends NotificationRequiredParams {
  event: NOTICE_TYPE.collection_liked
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'collection'>]
}

/**
 * Moment
 */
interface NoticeMomentLikedParams extends NotificationRequiredParams {
  event: NOTICE_TYPE.moment_liked
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'moment'>]
}

interface NoticeMomentMentionedYouParams extends NotificationRequiredParams {
  event: NOTICE_TYPE.moment_mentioned_you
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'moment'>]
}

/**
 * Comment
 */
interface NoticeArticleNewCommentParams extends NotificationRequiredParams {
  event: NOTICE_TYPE.article_new_comment
  recipientId: string
  actorId: string
  entities: [
    NotificationEntity<'target', 'article'>,
    NotificationEntity<'comment', 'comment'>
  ]
}

interface NoticeArticleCommentMentionedYouParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.article_comment_mentioned_you
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'comment'>]
}

interface NoticeArticleCommentLikedParams extends NotificationRequiredParams {
  event: NOTICE_TYPE.article_comment_liked
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'comment'>]
}

interface NoticeMomentNewCommentParams extends NotificationRequiredParams {
  event: NOTICE_TYPE.moment_new_comment
  recipientId: string
  actorId: string
  entities: [
    NotificationEntity<'target', 'moment'>,
    NotificationEntity<'comment', 'comment'>
  ]
}

interface NoticeMomentCommentMentionedYouParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.moment_comment_mentioned_you
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'comment'>]
}

interface NoticeMomentCommentLikedParams extends NotificationRequiredParams {
  event: NOTICE_TYPE.moment_comment_liked
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'comment'>]
}

interface NoticeCircleNewBroadcastParams extends NotificationRequiredParams {
  event: NOTICE_TYPE.circle_new_broadcast
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'comment'>]
}

// Comment-Comment
interface NoticeCommentNewReplyParams extends NotificationRequiredParams {
  event: NOTICE_TYPE.comment_new_reply
  recipientId: string
  actorId: string
  entities: [
    NotificationEntity<'target', 'comment'>,
    NotificationEntity<'reply', 'comment'>
  ]
}

// Campaign-Article
interface NoticeCampaignArticleFeaturedParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.campaign_article_featured
  recipientId: string
  entities: [
    NotificationEntity<'target', 'campaign'>,
    NotificationEntity<'article', 'article'>
  ]
}

/**
 * Transaction
 */
interface NoticePaymentReceivedDonationParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.payment_received_donation
  recipientId: string
  actorId: string | null
  entities: [NotificationEntity<'target', 'transaction'>]
}

/**
 * Circle
 */
interface NoticeCircleInvitationParams extends NotificationRequiredParams {
  event: NOTICE_TYPE.circle_invitation
  actorId: string
  recipientId: string
  entities: [NotificationEntity<'target', 'circle'>]
}

interface NoticeCircleBroadcastMentionedYouParams
  extends NotificationRequiredParams {
  event: BUNDLED_NOTICE_TYPE.circle_broadcast_mentioned_you
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'circle'>]
  data: { entityTypeId: string; entityId: string }
}

interface NoticeCircleDiscussionMentionedYouParams
  extends NotificationRequiredParams {
  event: BUNDLED_NOTICE_TYPE.circle_discussion_mentioned_you
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'circle'>]
  data: { entityTypeId: string; entityId: string }
}

// for circle owner
interface NoticeCircleNewSubscriberParams extends NotificationRequiredParams {
  event: NOTICE_TYPE.circle_new_subscriber
  actorId: string
  recipientId: string
  entities: [NotificationEntity<'target', 'circle'>]
}

interface NoticeCircleNewFollowerParams extends NotificationRequiredParams {
  event: NOTICE_TYPE.circle_new_follower
  actorId: string
  recipientId: string
  entities: [NotificationEntity<'target', 'circle'>]
}

interface NoticeCircleNewUnsubscriberParams extends NotificationRequiredParams {
  event: NOTICE_TYPE.circle_new_unsubscriber
  actorId: string
  recipientId: string
  entities: [NotificationEntity<'target', 'circle'>]
}

interface NoticeCircleNewBroadcastCommentsParams
  extends NotificationRequiredParams {
  event: BUNDLED_NOTICE_TYPE
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'circle'>]
  data: { comments?: string[]; replies?: string[]; mentions?: string[] }
}

interface NoticeCircleNewDiscussionCommentsParams
  extends NotificationRequiredParams {
  event: BUNDLED_NOTICE_TYPE
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'circle'>]
  data: { comments?: string[]; replies?: string[]; mentions?: string[] }
}

/**
 * System
 */
interface NoticeOfficialAnnouncementParams extends NotificationRequiredParams {
  event: NOTICE_TYPE.official_announcement
  recipientId: string
  message: string
  data: { link: string }
}

// Punish
interface NoticeUserBannedParams extends NotificationRequiredParams {
  event: OFFICIAL_NOTICE_EXTEND_TYPE.user_banned
  recipientId: string
}

interface NoticeUserBannedPaymentParams extends NotificationRequiredParams {
  event: OFFICIAL_NOTICE_EXTEND_TYPE.user_banned_payment
  recipientId: string
}

interface NoticeUserFrozenParams extends NotificationRequiredParams {
  event: OFFICIAL_NOTICE_EXTEND_TYPE.user_frozen
  recipientId: string
}

interface NoticeUserUnbannedParams extends NotificationRequiredParams {
  event: OFFICIAL_NOTICE_EXTEND_TYPE.user_unbanned
  recipientId: string
}

interface NoticeCommentBannedParams extends NotificationRequiredParams {
  event: OFFICIAL_NOTICE_EXTEND_TYPE.comment_banned
  entities: [NotificationEntity<'target', 'comment'>]
  recipientId: string
}

interface NoticeArticleBannedParams extends NotificationRequiredParams {
  event: OFFICIAL_NOTICE_EXTEND_TYPE.article_banned
  entities: [NotificationEntity<'target', 'article'>]
  recipientId: string
}

interface NoticeArticleReportedParams extends NotificationRequiredParams {
  event: OFFICIAL_NOTICE_EXTEND_TYPE.article_reported
  entities: [NotificationEntity<'target', 'article'>]
  recipientId: string
}

interface NoticeCommentReportedParams extends NotificationRequiredParams {
  event: OFFICIAL_NOTICE_EXTEND_TYPE.comment_reported
  entities: [NotificationEntity<'target', 'comment'>]
  recipientId: string
}

interface NoticeWriteChallengeAppliedParams extends NotificationRequiredParams {
  event:
    | OFFICIAL_NOTICE_EXTEND_TYPE.write_challenge_applied
    | OFFICIAL_NOTICE_EXTEND_TYPE.write_challenge_applied_late_bird
  recipientId: string
  data: { link: string }
}

interface NoticeBadgeGrandSlamAwardedParams extends NotificationRequiredParams {
  event: OFFICIAL_NOTICE_EXTEND_TYPE.badge_grand_slam_awarded
  recipientId: string
}

interface NoticeWriteChallengeAnnouncementParams
  extends NotificationRequiredParams {
  event: OFFICIAL_NOTICE_EXTEND_TYPE.write_challenge_announcement
  data: { link: string; campaignId: string; messages: Record<Language, string> }
}

export type NotificationParams =
  // User
  | NoticeUserNewFollowerParams
  // Article
  | NoticeArticlePublishedParams
  | NoticeArticleNewConnectedParams
  | NoticeArticleNewAppreciationParams
  | NoticeArticleNewSubscriberParams
  | NoticeArticleMentionedYouParams
  | NoticeRevisedArticlePublishedParams
  | NoticeRevisedArticleNotPublishedParams
  | NoticeCircleNewArticleParams
  // Collection
  | NoticeCollectionLikedParams
  // Moment
  | NoticeMomentLikedParams
  | NoticeMomentMentionedYouParams
  // Comment
  | NoticeArticleCommentMentionedYouParams
  | NoticeArticleCommentLikedParams
  | NoticeArticleNewCommentParams
  | NoticeMomentCommentMentionedYouParams
  | NoticeMomentCommentLikedParams
  | NoticeMomentNewCommentParams
  | NoticeCircleNewBroadcastParams
  // Comment-Comment
  | NoticeCommentNewReplyParams
  // Campaign-Article
  | NoticeCampaignArticleFeaturedParams
  // Payment
  | NoticePaymentReceivedDonationParams
  // Circle
  | NoticeCircleInvitationParams
  | NoticeCircleNewSubscriberParams
  | NoticeCircleNewFollowerParams
  | NoticeCircleNewUnsubscriberParams
  | NoticeCircleNewBroadcastCommentsParams
  | NoticeCircleNewDiscussionCommentsParams
  // Official
  | NoticeOfficialAnnouncementParams
  | NoticeUserBannedParams
  | NoticeUserBannedPaymentParams
  | NoticeUserFrozenParams
  | NoticeUserUnbannedParams
  | NoticeCommentBannedParams
  | NoticeArticleBannedParams
  | NoticeArticleReportedParams
  | NoticeCommentReportedParams
  | NoticeWriteChallengeAppliedParams
  | NoticeBadgeGrandSlamAwardedParams
  | NoticeWriteChallengeAnnouncementParams

export type NoticeUserId = string

export interface NoticeEntity {
  type: NoticeEntityType
  table: TableName
  entityId: string
}

export type NoticeEntitiesMap = Record<NoticeEntityType, any>
export type NoticeMessage = string
export interface NoticeData {
  // used by official announcement notices
  link?: string
  // reason for banned/frozen users, not in used
  reason?: string

  // used by circle new bundled notices
  comments?: string[]
  replies?: string[]
  mentions?: string[]
}

export interface NoticeDetail {
  id: string
  unread: boolean
  deleted: boolean
  updatedAt: Date
  noticeType: BaseNoticeType
  message?: NoticeMessage
  data?: NoticeData
}

export type NoticeItem = NoticeDetail & {
  createdAt: Date
  type: BaseNoticeType
  actors?: User[]
  entities?: NoticeEntitiesMap
}

type BasePutParams = {
  type: BaseNoticeType
  entities?: NotificationEntity[]
  actorId?: NoticeUserId | null
  data?: NoticeData | null

  resend?: boolean // used by circle invitation notice

  bundle?: {
    disabled?: boolean
    mergeData?: boolean // used by circle bundled notice
  }
}

export type PutNoticesParams = BasePutParams & {
  recipientIds: NoticeUserId[]
  messages?: NoticeMessage[] | null
}

export type PutNoticeParams = BasePutParams & {
  recipientId: NoticeUserId
  message?: NoticeMessage | null
}

// DB schema

export interface NoticeDB {
  id: string
  uuid: string
  unread: boolean
  deleted: boolean
  noticeDetailId: string
  recipientId: string
  createdAt: Date
  updatedAt: Date
}

export interface NoticeDetailDB {
  id: string
  noticeType: string
  message: string
  data: any
  createdAt: Date
}

export interface UserNotifySettingDB {
  id: string
  userId: string
  enable: boolean
  mention: boolean
  userNewFollower: boolean
  newComment: boolean
  newLike: boolean
  articleNewSubscription: boolean
  articleSubscribedNewComment: boolean
  reportFeedback: boolean
  email: boolean
  tag: boolean
  circleNewFollower: boolean
  circleNewDiscussion: boolean
  circleNewSubscriber: boolean
  circleNewUnsubscriber: boolean
  circleMemberBroadcast: boolean
  circleMemberNewDiscussion: boolean
  circleMemberNewDiscussionReply: boolean
  inCircleNewArticle: boolean
  inCircleNewBroadcast: boolean
  inCircleNewBroadcastReply: boolean
  inCircleNewDiscussion: boolean
  inCircleNewDiscussionReply: boolean
  articleNewCollected: boolean
  circleMemberNewBroadcastReply: boolean
  createdAt: Date
  updatedAt: Date
}
