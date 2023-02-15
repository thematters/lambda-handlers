import _Stripe from "stripe";

import { DAY } from "../constants/index.js";

const isTest = process.env.MATTERS_ENV === "test";
const stripeSecret = process.env.MATTERS_STRIPE_SECRET || "";

const LOCAL_STRIPE = {
  host: "localhost",
  port: "12111",
  protocol: "http",
};

/**
 * Interact with Stripe
 *
 * API Docs:
 * @see {@url https://stripe.com/docs/api}
 *
 */
export class Stripe {
  stripeAPI: _Stripe;

  constructor() {
    let options: Record<string, any> = {};
    if (isTest) {
      options = LOCAL_STRIPE;
    }

    this.stripeAPI = new _Stripe(stripeSecret, {
      apiVersion: "2022-11-15",
      ...options,
    });
  }
  /**
   * Get delivery failed events in last 3 days.
   */
  getDeliveryFailedEvents = async () => {
    let cursor;
    let fetch = true;
    let hasMore = true;

    const now = Date.now();
    const threeDays = DAY * 3;
    const events: Array<Record<string, any>> = [];

    while (hasMore && fetch) {
      // fetch events from stripe
      const batch: Record<string, any> = await this.stripeAPI.events.list({
        delivery_success: false,
        limit: 50,
        starting_after: cursor,
      });

      // Process batch data
      const data = batch?.data || [];
      data.map((event: Record<string, any>) => {
        const time = (event?.created || 0) * 1000;
        if (now - time < threeDays) {
          events.push(event);
        } else {
          fetch = false;
        }
      });

      // Check should run next batch
      hasMore = !!batch?.has_more;
      cursor = events[events.length - 1]?.id;
    }
    return events;
  };
}
