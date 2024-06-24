import { USER_STATE } from '../constants/index.js'

import {
  getUserState,
  deleteDrafts,
  deleteUnpulishedArticles,
  archiveJournal,
  deleteUserAssets,
} from './utils.js'

export const archiveUser = async (userId: string) => {
  const state = await getUserState(userId)
  if (state !== USER_STATE.archived) {
    console.warn(`Unexpected user state: ${state} for user ${userId}`)
    return
  }
  // delete drafts
  await deleteDrafts(userId)

  // delete not active articles
  await deleteUnpulishedArticles(userId)

  // archive journal
  await archiveJournal(userId)

  // delete user assets
  await deleteUserAssets(userId)
}
