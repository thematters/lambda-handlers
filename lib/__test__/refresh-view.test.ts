import { refreshView } from '../refresh-view'

test('unexpected view', async () => {
  await expect(refreshView('fake-view')).rejects.toThrow()
  await expect(refreshView('tag_count_materialized')).rejects.toThrow()
})

test('expected view', async () => {
  await refreshView('user_activity_materialized')
})
