import axios from 'axios'

const cloudflareAccountId = process.env.MATTERS_CLOUDFLARE_ACCOUNT_ID || ''
const cloudflareApiToken = process.env.MATTERS_CLOUDFLARE_API_TOKEN || ''

const CLOUDFLARE_IMAGES_URL = `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/images/v1`

export const deleteFile = async (id: string) =>
  axios.delete(`/${id}`, {
    baseURL: CLOUDFLARE_IMAGES_URL,
    headers: {
      Authorization: `Bearer ${cloudflareApiToken}`,
    },
  })
