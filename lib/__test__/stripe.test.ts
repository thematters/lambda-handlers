import { Stripe } from '../payment/stripe'

test.skip('fetch events list', async () => {
  const stripe = new Stripe()
  console.log(await stripe.getDeliveryFailedEvents())
})
