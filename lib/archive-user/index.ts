import { USER_STATE } from "../constants/index.js";

import {
  getUserState,
  deleteUnpublishedDrafts,
  deleteUserAssets,
} from "./utils.js";

export const archiveUser = async (userId: string) => {
  const state = await getUserState(userId);
  if (state !== USER_STATE.archived) {
    console.warn(`Unexpected user state: ${state} for user ${userId}`);
    return;
  }
  // delete unlinked drafts
  await deleteUnpublishedDrafts(userId);

  // delete assets
  await deleteUserAssets(userId);
};
