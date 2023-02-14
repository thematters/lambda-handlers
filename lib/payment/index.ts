import { v4 } from "uuid";
import { invalidateFQC } from "@matters/apollo-response-cache";

import { pgKnex as knex } from "../db.js";
import { Cache } from "../cache.js";
import { NODE_TYPE } from "../constants/index.js";
import {
  TRANSACTION_STATE,
  TRANSACTION_REMARK,
  TRANSACTION_PURPOSE,
  PAYMENT_PROVIDER,
  SUBSCRIPTION_STATE,
  SUBSCRIPTION_ITEM_REMARK,
  PRICE_STATE,
  INVITATION_STATE,
} from "./enum.js";

export class PaymentService {
  knex: typeof knex;

  constructor() {
    this.knex = knex;
  }

  cancelTimeoutTransactions = async () =>
    await this.knex("transaction")
      .update({
        state: TRANSACTION_STATE.canceled,
        remark: TRANSACTION_REMARK.TIME_OUT,
      })
      .where("created_at", "<", knex.raw(`now() - ('30 minutes'::interval)`))
      .andWhere({ state: TRANSACTION_STATE.pending })
      .andWhereNot({
        purpose: TRANSACTION_PURPOSE.payout,
      });

  transferTrialEndSubscriptions = async () => {
    // obtain trial end subscription items from the past 7 days
    const trialEndSubItems = await this.knex
      .select(
        "csi.id",
        "csi.subscription_id",
        "csi.user_id",
        "csi.price_id",
        "circle_price.provider_price_id",
        "circle_price.circle_id",
        "expired_ivts.id as invitation_id"
      )
      .from(
        knex("circle_invitation")
          .select(
            "*",
            knex.raw(
              `accepted_at + duration_in_days * '1 day'::interval AS ended_at`
            )
          )
          .where({ state: INVITATION_STATE.accepted })
          .whereNotNull("subscription_item_id")
          .as("expired_ivts")
      )
      .leftJoin(
        "circle_subscription_item as csi",
        "csi.id",
        "expired_ivts.subscription_item_id"
      )
      .leftJoin("circle_price", "circle_price.id", "csi.price_id")
      .where({
        "csi.provider": PAYMENT_PROVIDER.matters,
        "csi.archived": false,
        "circle_price.state": PRICE_STATE.active,
      })
      .andWhere("ended_at", ">", knex.raw(`now() - interval '1 months'`))
      .andWhere("ended_at", "<=", knex.raw(`now()`));

    const succeedItemIds = [];
    const failedItemIds = [];
    for (const item of trialEndSubItems) {
      try {
        // archive Matters subscription item
        await this.archiveMattersSubItem({
          subscriptionId: item.subscriptionId,
          subscriptionItemId: item.id,
        });

        // create Stripe subscription item
        await this.createStripeSubItem({
          userId: item.userId,
          subscriptionItemId: item.id,
          priceId: item.priceId,
          providerPriceId: item.providerPriceId,
        });

        // mark invitation as `transfer_succeeded`
        await this.markInvitationAs({
          invitationId: item.invitationId,
          state: INVITATION_STATE.transfer_succeeded,
        });

        succeedItemIds.push(item.id);
        console.info(`Matters subscription item ${item.id} moved to Stripe.`);
      } catch (error) {
        // mark invitation as `transfer_failed`
        await this.markInvitationAs({
          invitationId: item.invitationId,
          state: INVITATION_STATE.transfer_failed,
        });

        failedItemIds.push(item.id);
        console.error(error);
      }

      // invalidate user & circle
      const cache = new Cache();
      invalidateFQC({
        node: { type: NODE_TYPE.User, id: item.userId },
        redis: cache.redis,
      });
      invalidateFQC({
        node: { type: NODE_TYPE.Circle, id: item.circleId },
        redis: cache.redis,
      });
    }
  };

  private archiveMattersSubItem = async ({
    subscriptionId,
    subscriptionItemId,
  }: {
    subscriptionId: string;
    subscriptionItemId: string;
  }) => {
    const subItems = await this.knex("circle_subscription_item")
      .select()
      .where({ subscriptionId, archived: false });

    // cancel the subscription if only one subscription item left
    if (subItems.length <= 1) {
      await this.knex("circle_subscription")
        .where({ id: subscriptionId })
        .update({
          state: SUBSCRIPTION_STATE.canceled,
          canceledAt: new Date(),
          updatedAt: new Date(),
        });
    }

    await this.knex("circle_subscription_item")
      .where({ id: subscriptionItemId })
      .update({
        archived: true,
        updatedAt: new Date(),
        canceledAt: new Date(),
        remark: SUBSCRIPTION_ITEM_REMARK.trial_end,
      });
  };

  private createStripeSubItem = async ({
    userId,
    subscriptionItemId,
    priceId,
    providerPriceId,
  }: {
    userId: string;
    subscriptionItemId: string;
    priceId: string;
    providerPriceId: string;
  }) => {
    // retrieve user customer and subscriptions
    const customer = await this.knex("customer")
      .select()
      .where({
        userId,
        provider: PAYMENT_PROVIDER.stripe,
        archived: false,
      })
      .first();
    const subscriptions = await this.findActiveSubscriptions({
      userId,
    });

    if (!customer || !customer.cardLast4) {
      throw new Error("Credit card is required on customer");
    }

    await this.createSubscriptionOrItem({
      userId,
      priceId,
      providerPriceId,
      providerCustomerId: customer.customerId,
      subscriptions,
    });
  };

  private markInvitationAs = async ({
    invitationId,
    state,
  }: {
    invitationId: string;
    state: INVITATION_STATE;
  }) => knex("circle_invitation").where({ id: invitationId }).update({ state });

  private findActiveSubscriptions = async ({
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

  private createSubscriptionOrItem = async (data: {
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
