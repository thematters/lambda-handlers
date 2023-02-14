export enum PAYMENT_PROVIDER {
  likecoin = "likecoin",
  matters = "matters",
  stripe = "stripe",
  blockchain = "blockchain",
}

export enum TRANSACTION_STATE {
  pending = "pending",
  succeeded = "succeeded",
  failed = "failed",
  canceled = "canceled",
}

export enum TRANSACTION_PURPOSE {
  donation = "donation",
  addCredit = "add-credit",
  refund = "refund",
  fee = "fee",
  payout = "payout",
  subscription = "subscription",
  subscriptionSplit = "subscription-split",
}

export enum TRANSACTION_TARGET_TYPE {
  article = "article",
  transaction = "transaction",
  circlePrice = "circle_price",
}

export enum TRANSACTION_REMARK {
  // LIKE & BLOCKCHAIN
  TIME_OUT = "time_out",

  // BLOCKCHAIN
  INVALID = "invalid",
}

export const SUBSCRIPTION_STATE = {
  active: "active",
  pastDue: "past_due",
  unpaid: "unpaid",
  canceled: "canceled",
  incomplete: "incomplete",
  incompleteExpired: "incomplete_expired",
  trialing: "trialing",
};

export enum INVITATION_STATE {
  pending = "pending",
  accepted = "accepted",
  transfer_succeeded = "transfer_succeeded",
  transfer_failed = "transfer_failed",
}
