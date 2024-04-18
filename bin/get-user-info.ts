import { getUserInfo } from '../lib/get-user-info.js'

async function main() {
  const args = process.argv.slice(2)
  const userName = args[0] || 'az'
  const year = Number.parseInt(args[1], 10) || 2022
  const res = await getUserInfo(userName, { year })
  console.log(new Date(), 'got res:', res)
}

main().catch((err) => console.error(new Date(), 'ERROR:', err))
