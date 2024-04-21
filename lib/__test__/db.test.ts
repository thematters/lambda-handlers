import { dbApi } from '../db'

test('db methods', async () => {
  await dbApi.listArticles()
  await dbApi.listRecentArticles()
  await dbApi.listRecentArticlesToPublish()
  await dbApi.listAuthorArticles({ authorId: 1 })
  console.log(
    await dbApi.updateArticleDataMediaHash(1, {
      mediaHash: 'media_hash',
      dataHash: 'data_hash',
    })
  )
})
