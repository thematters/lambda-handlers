import { ExchangeRate } from '../exchange-rate'

// stub data

const coingeckoAPIData = {
  likecoin: {
    hkd: 0.01919234,
    twd: 0.07643,
    usd: 0.0024524,
    last_updated_at: 1668738838,
  },
  tether: {
    hkd: 7.82,
    twd: 31.15,
    usd: 0.999504,
    last_updated_at: 1668738623,
  },
}

const exchangeRatesDataAPIData = {
  base: 'HKD',
  date: '2022-11-18',
  rates: {
    HKD: 1,
    TWD: 3.982979,
    USD: 0.127826,
  },
  success: true,
  timestamp: 1668752883,
}

const exchangeRate = new ExchangeRate()
jest
  .spyOn(exchangeRate as any, 'requestCoingeckoAPI')
  .mockResolvedValue(Promise.resolve(coingeckoAPIData))
jest
  .spyOn(exchangeRate as any, 'requestExchangeRatesDataAPI')
  .mockResolvedValue(Promise.resolve(exchangeRatesDataAPIData))

test('update token rates', async () => {
  await exchangeRate.updateTokenRates()
})

test('update fiat rates', async () => {
  await exchangeRate.updateFiatRates()
})
