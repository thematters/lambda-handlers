export const DAY = 24 * 60 * 60 * 1000;

export const EMAIL_FROM_ASK = "Matters<ask@matters.news>";

export const ARTICLE_STATE = {
  active: "active",
  archived: "archived",
  banned: "banned",
  pending: "pending",
  error: "error",
};

export const PUBLISH_STATE = {
  unpublished: "unpublished",
  pending: "pending",
  error: "error",
  published: "published",
};

export const USER_STATE = {
  frozen: "frozen",
  onboarding: "onboarding",
  active: "active",
  banned: "banned",
  archived: "archived",
};

export enum INVITATION_STATE {
  pending = "pending",
  accepted = "accepted",
  transfer_succeeded = "transfer_succeeded",
  transfer_failed = "transfer_failed",
}
