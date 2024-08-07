export type User = {
  id: string
  uuid: string
  userName: string
  displayName: string
  description: string
  avatar: string
  email: string
  emailVerified: string
  likerId?: string
  passwordHash: string
  paymentPasswordHash?: string
  baseGravity: number
  currGravity: number
  language: LANGUAGES
  // oauthType: any
  role: UserRole
  state: UserState
  createdAt: string
  updatedAt: string
  agreeOn: string
  ethAddress: string
}

export type Language = 'zh_hant' | 'zh_hans' | 'en'

export type TableName =
  | 'user'
  | 'comment'
  | 'article'
  | 'collection'
  | 'moment'
  | 'transaction'
  | 'circle'
  | 'campaign'
