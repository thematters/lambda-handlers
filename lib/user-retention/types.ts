export type UserRetentionStateToMail = 'NEWUSER' | 'ACTIVE'
export type UserRetentionStateToMark = 'NORMAL' | 'ALERT' | 'INACTIVE'
export type UserRetentionState =
  | UserRetentionStateToMail
  | UserRetentionStateToMark

export type SendmailFn = (
  userId: string,
  lastSeen: Date | null,
  type: UserRetentionStateToMail
) => Promise<void>
