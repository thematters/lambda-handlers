import { Cache } from '../../lib/cache'
import { handler } from '../likecoin-batch-update-civic-liker-caches'

const getCivicLikerStatus = async (likerId: string) => {
  const cache = new Cache()
  return await cache.redis.get(cache.genKey('civic-liker', { id: likerId }))
}

test('wrong input', async () => {
  let res = await handler({} as any)
  expect(res.statusCode).toBe(400)

  res = await handler(['likerId'] as any)
  expect(res.statusCode).toBe(400)
  res = await handler([{}] as any)
  expect(res.statusCode).toBe(400)
  res = await handler([{ id: 'likerId' }] as any)
  expect(res.statusCode).toBe(400)
  res = await handler([{ expires: 1678074589 }] as any)
  expect(res.statusCode).toBe(400)
  res = await handler([{ id: 'likerId', expires: '1678074589' }] as any)
  expect(res.statusCode).toBe(400)
  res = await handler([{ id: 'likerId', expires: 1678074589000 }] as any)
  expect(res.statusCode).toBe(400)
  res = await handler([{ id: 'likerId', expires: 1678074589 }, {}] as any)
  expect(res.statusCode).toBe(400)
})
test('good input', async () => {
  let res = await handler([])
  expect(res.statusCode).toBe(200)
  res = await handler([{ id: 'not-exsit-likerId', expires: 1678074589 }])
  expect(res.statusCode).toBe(200)

  expect(await getCivicLikerStatus('test_liker_id_2')).toBeNull()
  res = await handler([{ id: 'test_liker_id_2', expires: getFutureTime() }])
  expect(res.statusCode).toBe(200)
  expect(await getCivicLikerStatus('test_liker_id_2')).toBe('true')

  const oldTime = 1678074589
  res = await handler([{ id: 'test_liker_id_2', expires: oldTime }])
  expect(res.statusCode).toBe(200)
  await new Promise((r) => setTimeout(r, 1000))
  expect(await getCivicLikerStatus('test_liker_id_2')).toBeNull()
})

const getFutureTime = () => Math.ceil(+Date.now() / 1000) + 10
