import { pgKnex as knex } from "../db.js";
import {
  TRANSACTION_STATE,
  TRANSACTION_REMARK,
  TRANSACTION_PURPOSE,
} from "./enum.js";

export const cancelTimeoutTransactions = async () =>
  await knex("transaction")
    .update({
      state: TRANSACTION_STATE.canceled,
      remark: TRANSACTION_REMARK.TIME_OUT,
    })
    .where("created_at", "<", knex.raw(`now() - ('30 minutes'::interval)`))
    .andWhere({ state: TRANSACTION_STATE.pending })
    .andWhereNot({
      purpose: TRANSACTION_PURPOSE.payout,
    });
