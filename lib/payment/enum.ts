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
