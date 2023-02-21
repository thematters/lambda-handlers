import { Slack } from "../utils/slack.js";
import { Stripe } from "./stripe.js";

export const syncStripeDeliveryFailedEvents = async () => {
  const stripe = new Stripe();
  const slack = new Slack();
  const result = await stripe.getDeliveryFailedEvents();
  if (result && result.length > 0) {
    // send message to Slack
    await Promise.all(
      result.map((event) =>
        slack.sendStripeAlert({
          data: {
            id: event.id,
            type: event.type,
            pending_webhooks: event.pending_webhooks,
          },
          message: "Delivery failed event",
        })
      )
    );
  }
};
