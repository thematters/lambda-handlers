import axios from "axios";

import { Cache } from "./cache.js";

// ENVS

const exchangeRatesDataAPIKey = process.env.MATTERS_EXCHANGE_RATES_DATA_API_KEY;

// TYPES

type TokenCurrency = "LIKE" | "USDT";
type FiatCurrency = "HKD";

type FromCurrency = TokenCurrency | FiatCurrency;
type ToCurrency = "HKD" | "TWD" | "USD";

interface Pair {
  from: FromCurrency;
  to: ToCurrency;
}

interface Rate extends Pair {
  rate: number;
  updatedAt: Date;
}

// CONSTANTS

const tokenCurrencies: TokenCurrency[] = ["LIKE", "USDT"];
const fiatCurrencies: FiatCurrency[] = ["HKD"];
const quoteCurrencies: ToCurrency[] = ["TWD", "HKD", "USD"];

const TOKEN_TO_COINGECKO_ID = {
  LIKE: "likecoin",
  USDT: "tether",
} as const;

const COINGECKO_API_URL = "https://api.coingecko.com/api/v3/simple/price";
const EXCHANGE_RATES_DATA_API_URL =
  "https://api.apilayer.com/exchangerates_data/latest";

// MAIN

export class ExchangeRate {
  cache: Cache;
  expire: number;

  constructor() {
    this.cache = new Cache();
    this.expire = 60 * 60 * 24 * 10; // 10 days
  }

  updateTokenRates = async () => {
    await this.updateRatesToCache(await this.fetchTokenRates());
  };

  updateFiatRates = async () => {
    await this.updateRatesToCache(await this.fetchFiatRates());
  };

  private updateRatesToCache = async (rates: Rate[]) => {
    for (const rate of rates) {
      this.cache.storeObject({
        key: this.cache.genKey("exchangeRate", this.genCacheKeys(rate)),
        data: rate,
        expire: this.expire,
      });
    }
  };

  private genCacheKeys = (pair: Pair) => ({ id: pair.from + pair.to });

  private getTokenPairs = () => {
    const pairs = [];
    for (const t of tokenCurrencies) {
      for (const q of quoteCurrencies) {
        pairs.push({ from: t, to: q });
      }
    }
    return pairs;
  };

  private getFiatPairs = () => {
    const pairs = [];
    for (const f of fiatCurrencies) {
      for (const q of quoteCurrencies) {
        pairs.push({ from: f, to: q });
      }
    }
    return pairs;
  };

  private fetchTokenRates = async (): Promise<Rate[]> => {
    const data = await this.requestCoingeckoAPI(
      tokenCurrencies,
      quoteCurrencies
    );
    const rates: Rate[] = [];
    for (const t of tokenCurrencies) {
      for (const q of quoteCurrencies) {
        rates.push(this.parseCoingeckoData(data, { from: t, to: q }));
      }
    }
    return rates;
  };

  private fetchFiatRates = async (): Promise<Rate[]> => {
    const rates: Rate[] = [];
    for (const f of fiatCurrencies) {
      const data = await this.requestExchangeRatesDataAPI(f, quoteCurrencies);
      for (const q of quoteCurrencies) {
        rates.push(this.parseExchangeRateData(data, { from: f, to: q }));
      }
    }
    return rates;
  };

  private parseCoingeckoData = (
    data: any,
    pair: { from: TokenCurrency; to: ToCurrency }
  ): Rate => ({
    from: pair.from,
    to: pair.to,
    rate: data[TOKEN_TO_COINGECKO_ID[pair.from]][pair.to.toLowerCase()],
    updatedAt: new Date(
      data[TOKEN_TO_COINGECKO_ID[pair.from]].last_updated_at * 1000
    ),
  });

  private parseExchangeRateData = (data: any, pair: Pair): Rate => ({
    from: pair.from,
    to: pair.to,
    rate: data.rates[pair.to],
    updatedAt: new Date(data.timestamp * 1000),
  });

  private requestCoingeckoAPI = async (
    bases: TokenCurrency[],
    quotes: ToCurrency[]
  ): Promise<any | never> => {
    const ids = bases.map((i) => TOKEN_TO_COINGECKO_ID[i]).join();
    const vs_currencies = quotes.join();
    try {
      const reps = await axios.get(COINGECKO_API_URL, {
        params: {
          ids,
          vs_currencies,
          include_last_updated_at: true,
        },
      });
      if (reps.status !== 200) {
        throw new Error(`Unexpected Coingecko response code: ${reps.status}`);
      }
      return reps.data;
    } catch (error: any) {
      const path = error.request.path;
      const msg = error.response.data
        ? JSON.stringify(error.response.data)
        : error;
      throw new Error(`Failed to request Coingecko API( ${path} ): ${msg}`);
    }
  };

  private requestExchangeRatesDataAPI = async (
    base: FiatCurrency,
    quotes: ToCurrency[]
  ): Promise<any | never> => {
    const symbols = quotes.join();
    const headers = { apikey: exchangeRatesDataAPIKey };
    try {
      const reps = await axios.get(EXCHANGE_RATES_DATA_API_URL, {
        params: {
          base,
          symbols,
        },
        headers,
      });
      if (!reps.data.success) {
        throw new Error(`Unexpected Exchange Rates Data API response status`);
      }
      return reps.data;
    } catch (error: any) {
      const path = error.request.path;
      const msg = error.response.data
        ? JSON.stringify(error.response.data)
        : error;
      throw new Error(
        `Failed to request Exchange Rates Data API( ${path} ): ${msg}`
      );
    }
  };
}
