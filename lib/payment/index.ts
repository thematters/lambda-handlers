import { v4 } from "uuid";
import { pgKnex as knex } from "../db.js";
import { INVITATION_STATE } from "../constants/index.js";
import {
  TRANSACTION_STATE,
  TRANSACTION_REMARK,
  TRANSACTION_PURPOSE,
  SUBSCRIPTION_STATE,
  PAYMENT_PROVIDER,
} from "./enum.js";

export class PaymentService {
  knex: typeof knex;

  constructor() {
    this.knex = knex;
  }

  cancelTimeoutTransactions = async () =>
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

  findActiveSubscriptions = async ({
    userId,
    provider,
  }: {
    userId: string;
    provider?: PAYMENT_PROVIDER;
  }) => {
    const subscriptions = await this.knex
      .select()
      .from("circle_subscription")
      .where({ userId, ...(provider ? { provider } : {}) })
      .whereIn("state", [
        SUBSCRIPTION_STATE.active,
        SUBSCRIPTION_STATE.trialing,
        SUBSCRIPTION_STATE.pastDue,
      ]);

    return subscriptions || [];
  };

  createSubscriptionOrItem = async (data: {
    userId: string;
    priceId: string;
    providerPriceId: string;
    providerCustomerId: string;
    subscriptions: any[];
  }) => {
    const { userId, priceId, subscriptions } = data;

    const invitation = await this.findPendingInvitation({ userId, priceId });
    const targetMattersSub = !!invitation;
    const targetStripeSub = !invitation;
    const hasMattersSub = subscriptions.some(
      (sub) => sub.provider === PAYMENT_PROVIDER.matters
    );
    const hasStripeSub = subscriptions.some(
      (sub) => sub.provider === PAYMENT_PROVIDER.stripe
    );

    if (
      (targetMattersSub && !hasMattersSub) ||
      (targetStripeSub && !hasStripeSub)
    ) {
      await this.createSubscription({ ...data, invitation });
    } else {
      await this.createSubscriptionItem({ ...data, invitation });
    }
  };

  private findPendingInvitation = async (params: {
    userId: string;
    priceId: string;
  }) => {
    const user = await this.knex
      .select()
      .from("user")
      .where({ id: params.userId })
      .first();
    const records = await this.knex
      .select("ci.id")
      .from("circle_invitation as ci")
      .join("circle_price as cp", "cp.circle_id", "ci.circle_id")
      .where({
        "cp.id": params.priceId,
        "ci.state": INVITATION_STATE.pending,
      })
      .andWhere(function () {
        this.where("ci.user_id", params.userId).orWhere("ci.email", user.email);
      })
      .orderBy("ci.created_at", "desc");

    return records.length > 0 ? records[0] : undefined;
  };
  /**
   * Create a subscription by a given circle price,
   * subscription item will be created correspondingly.
   */
  private createSubscription = async ({
    userId,
    priceId,
    providerPriceId,
    providerCustomerId,
    invitation,
  }: {
    userId: string;
    priceId: string;
    providerPriceId: string;
    providerCustomerId: string;
    invitation: any;
  }) => {
    /**
     * Create Matters subscription if it's with trial invitation
     */
    const targetMattersSub = !!invitation;

    if (targetMattersSub) {
      // Create to DB
      const [mattersDBSub] = await this.knex("circle_subscription")
        .insert({
          provider: PAYMENT_PROVIDER.matters,
          providerSubscriptionId: v4(),
          state: SUBSCRIPTION_STATE.trialing,
          userId,
        })
        .returning("*");
      const [mattersDBSubItem] = await this.knex("circle_subscription_item")
        .insert({
          subscriptionId: mattersDBSub.id,
          userId,
          priceId,
          provider: PAYMENT_PROVIDER.matters,
          providerSubscriptionItemId: v4(),
        })
        .returning("*");

      // Mark invitation as accepted
      await this.acceptInvitation(invitation.id, mattersDBSubItem.id);
      return;
    }
  };

  /**
   * Create a subscription item by a given circle price,
   * and added to subscription.
   */
  private createSubscriptionItem = async ({
    userId,
    priceId,
    providerPriceId,
    subscriptions,
    invitation,
  }: {
    userId: string;
    priceId: string;
    providerPriceId: string;
    subscriptions: any[];
    invitation: any;
  }) => {
    /**
     * Create Matters subscription item if it's with trial invitation
     */
    const targetMattersSub = !!invitation;

    if (targetMattersSub) {
      const mattersDBSubs = subscriptions.filter(
        (sub) => sub.provider === PAYMENT_PROVIDER.matters
      );
      const mattersDBSub = mattersDBSubs && mattersDBSubs[0];

      // Create to DB
      const [mattersDBSubItem] = await this.knex("circle_subscription_item")
        .insert({
          subscriptionId: mattersDBSub.id,
          userId,
          priceId,
          provider: PAYMENT_PROVIDER.matters,
          providerSubscriptionItemId: v4(),
        })
        .returning("*");

      // Mark invitation as accepted
      await this.acceptInvitation(invitation.id, mattersDBSubItem.id);
      return;
    }
  };

  private acceptInvitation = async (
    ivtId: string,
    subscriptionItemId: string
  ) => {
    await this.knex("circle_invitation")
      .where("id", ivtId)
      .update({
        state: INVITATION_STATE.accepted,
        accepted_at: this.knex.fn.now(),
        subscriptionItemId,
      })
      .returning("*");
  };
}
