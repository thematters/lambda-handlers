import { ExchangeRate } from "../lib/exchange-rate.js";

// envs
// MATTERS_EXCHANGE_RATES_DATA_API_KEY
// MATTERS_CACHE_HOST
// MATTERS_CACHE_PORT

// AWS EventBridge can configure the input event sent to Lambda,
// see https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-transform-target-input.html for info.
type ExchangeRateEvent = {
  data: {
    type: "token" | "fiat";
  };
};

export const handler = async (event: ExchangeRateEvent) => {
  const exchangeRate = new ExchangeRate();
  if (event.data.type === "token") {
    await exchangeRate.updateTokenRates();
  } else {
    await exchangeRate.updateFiatRates();
  }
};
