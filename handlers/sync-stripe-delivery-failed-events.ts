import { syncStripeDeliveryFailedEvents } from "../lib/payment/utils.js";

// envs
// MATTERS_ENV
// MATTERS_STRIPE_SECRET
// MATTERS_SLACK_TOKEN
// MATTERS_SLACK_STRIPE_ALERT_CHANNEL

export const handler = async (event: any) => syncStripeDeliveryFailedEvents();
