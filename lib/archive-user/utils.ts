import { ARTICLE_STATE } from '../constants/index.js'
import { pgKnex as knex } from '../db.js'
import { s3DeleteFile } from '../utils/aws.js'
import { deleteFile as cfDeleteFile } from '../utils/cloudflare.js'

const s3Bucket = process.env.MATTERS_AWS_S3_BUCKET || ''

export const getUserState = async (userId: string) => {
  const res = await knex('user').where('id', userId).first()
  return res.state
}

export const deleteDrafts = async (authorId: string) => {
  const drafts = await findDraftByAuthor(authorId)

  // delete drafts
  await _deleteDrafts(drafts.map((draft) => draft.id))

  // delete drafts' assets
  const draftEntityTypeId = await getDraftEntityTypeId()
  await Promise.all(
    drafts.map(async (draft) => {
      await deleteAsset({
        entityTypeId: draftEntityTypeId,
        entityId: draft.id,
      })
    })
  )
}

export const deleteUnpulishedArticles = async (authorId: string) =>
  knex('article')
    .where({ authorId })
    .whereIn('state', [ARTICLE_STATE.pending, ARTICLE_STATE.error])
    .del()

export const deleteUserAssets = async (userId: string) => {
  await knex('user').where('id', userId).update({
    avatar: null,
    profileCover: null,
  })
  await knex('oauth_client').where('user_id', userId).update({
    avatar: null,
  })
  await deleteAsset({ entityTypeId: '1', entityId: userId })
}

const getDraftEntityTypeId = async () => {
  const res = await knex('entity_type')
    .select('id')
    .where({ table: 'draft' })
    .first()
  return res.id
}

const findDraftByAuthor = (authorId: string) =>
  knex('draft').select().where({ authorId })

const deleteAsset = async ({
  entityTypeId,
  entityId,
}: {
  entityTypeId: string
  entityId: string
}) => {
  const assetIds = await knex('asset_map')
    .where({ entityTypeId, entityId })
    .del()
    .returning('asset_id')

  const paths = await knex('asset')
    .whereIn(
      'id',
      assetIds.map(({ assetId }) => assetId)
    )
    .whereNotIn('id', knex('asset_map').select('asset_id'))
    .del()
    .returning('path')

  const logError = (err: Error) => console.error('delete assets ERROR:', err)
  await Promise.allSettled(
    paths
      .map(({ path }) => [
        s3DeleteFile(s3Bucket, path).catch(logError),
        cfDeleteFile(path).catch(logError),
      ])
      .flat()
  )
}

const _deleteDrafts = async (ids: string[]) =>
  knex('draft').whereIn('id', ids).del()
