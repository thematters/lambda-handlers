export const DAY = 24 * 60 * 60 * 1000

export const EMAIL_FROM_ASK = 'Matters<ask@matters.town>'

export enum NODE_TYPE {
  Article = 'Article',
  Comment = 'Comment',
  Draft = 'Draft',
  User = 'User',
  Tag = 'Tag',
  Appreciation = 'Appreciation',
  Transaction = 'Transaction',
  Circle = 'Circle',
  Topic = 'Topic',
  Chapter = 'Chapter',

  SkippedListItem = 'SkippedListItem',
  Price = 'Price',
  Invitation = 'Invitation',
  Announcement = 'Announcement',
  CryptoWallet = 'CryptoWallet',
  CryptoWalletNFTAsset = 'NFTAsset',

  // Unions & Interfaces
  Node = 'Node',
  Notice = 'Notice',
  Response = 'Response',
  TransactionTarget = 'TransactionTarget',
}

export const ARTICLE_STATE = {
  active: 'active',
  archived: 'archived',
  banned: 'banned',
  pending: 'pending',
  error: 'error',
}

export const PUBLISH_STATE = {
  unpublished: 'unpublished',
  pending: 'pending',
  error: 'error',
  published: 'published',
}

export const USER_STATE = {
  frozen: 'frozen',
  onboarding: 'onboarding',
  active: 'active',
  banned: 'banned',
  archived: 'archived',
}
