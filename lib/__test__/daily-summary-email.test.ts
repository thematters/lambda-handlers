import {
  getUserDigest,
  getArticleDigest,
  getCommentDigest,
} from '../daily-summary-email/utils'
import { Notice } from '../daily-summary-email/notice'

test('getUserDigest', async () => {
  const user = {
    id: '1',
    userName: 'userName1',
    displayName: 'displayName1',
    avatar: null,
  }
  const userDigest1 = await getUserDigest(user)
  expect(userDigest1).toEqual(user)

  const userWithAvatar = {
    id: '1',
    userName: 'userName1',
    displayName: 'displayName1',
    avatar: '1',
  }
  process.env.MATTERS_AWS_CLOUD_FRONT_ENDPOINT = 'localhost'
  const userDigest2 = await getUserDigest(userWithAvatar)
  expect(userDigest2?.avatar).toBe('https://localhost/path/to/file.jpg')
})

test('getArticleDigest', async () => {
  const article = {
    id: '1',
    title: 'test article 1',
    slug: 'test-article-1',
    authorId: '1',
    mediaHash: 'someIpfsMediaHash1',
  }
  const articleDigest = await getArticleDigest(article)
  expect(articleDigest?.appreciationsReceivedTotal).toBeGreaterThanOrEqual(150)
  expect(articleDigest?.responseCount).toBeGreaterThanOrEqual(2)
})

test('getCommentDigest', async () => {
  const comment = {
    id: '1',
    content: '<div>Test comment 1</div>',
    targetId: '1',
  }
  const commentDigest = await getCommentDigest(comment)
  expect(commentDigest?.article).not.toBeUndefined()
})

describe('notice', () => {
  test('findDailySummaryUsers', async () => {
    const notice = new Notice()
    const users = await notice.findDailySummaryUsers()
    expect(users.length).toBeGreaterThanOrEqual(1)
  })
  test('findDailySummaryNoticesByUser', async () => {
    const notice = new Notice()
    await notice.findDailySummaryNoticesByUser('1')
  })
})
