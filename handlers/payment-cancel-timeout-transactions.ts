import { PaymentService } from '../lib/payment/index.js'

// envs
// MATTERS_PG_HOST
// MATTERS_PG_USER
// MATTERS_PG_PASSWORD
// MATTERS_PG_DATABASE

const paymentService = new PaymentService()

export const handler = async (event: any) =>
  paymentService.cancelTimeoutTransactions()
