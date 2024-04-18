import { ARTICLE_STATE, PUBLISH_STATE, USER_STATE } from '../constants/index.js'
import { pgKnex as knex } from '../db.js'
import { s3DeleteFile } from '../utils/aws.js'
import { deleteFile as cfDeleteFile } from '../utils/cloudflare.js'

import { ASSET_TYPE } from './enum.js'

const s3Bucket = process.env.MATTERS_AWS_S3_BUCKET || ''

export const getUserState = async (userId: string) => {
  const res = await knex('user').where('id', userId).first()
  return res.state
}

export const deleteUnpublishedDrafts = async (authorId: string) => {
  const drafts = await findUnpublishedByAuthor(authorId)
  console.log(drafts)

  const draftEntityTypeId = await getDraftEntityTypeId()
  // delete assets
  await Promise.all(
    drafts.map(async (draft) => {
      const assets = await findAssetAndAssetMap({
        entityTypeId: draftEntityTypeId,
        entityId: draft.id,
      })

      const assetPaths: { [id: string]: string } = {}
      assets.forEach((asset) => {
        assetPaths[`${asset.assetId}`] = asset.path
      })

      if (Object.keys(assetPaths).length > 0) {
        await deleteAssetAndAssetMap(assetPaths)
      }
    })
  )

  // update draft.article_id to null
  await unlinkUnpublishedDrafts(drafts.map((draft) => draft.id))
  // delete not active articles
  await deleteUnpulishedArticles(drafts.map((draft) => draft.articleId))
  // delete drafts
  await deleteDrafts(drafts.map((draft) => draft.id))
}

export const deleteUserAssets = async (userId: string) => {
  const types = [
    ASSET_TYPE.avatar,
    ASSET_TYPE.profileCover,
    ASSET_TYPE.oauthClientAvatar,
    ASSET_TYPE.profileCover,
  ]
  const assets = (await findAssetsByAuthorAndTypes(userId, types)).reduce(
    (data: any, asset: any) => {
      data[`${asset.id}`] = asset.path
      return data
    },
    {}
  )

  if (assets && Object.keys(assets).length > 0) {
    await deleteAssetAndAssetMap(assets)
  }
}

const getDraftEntityTypeId = async () => {
  const res = await knex('entity_type')
    .select('id')
    .where({ table: 'draft' })
    .first()
  return res.id
}

const findUnpublishedByAuthor = (authorId: string) =>
  knex('draft')
    .select()
    .where({ authorId, archived: false })
    .andWhereNot({ publishState: PUBLISH_STATE.published })
    .orderBy('updated_at', 'desc')

const findAssetAndAssetMap = async ({
  entityTypeId,
  entityId,
}: {
  entityTypeId: string
  entityId: string
}) =>
  knex('asset_map')
    .select('asset_map.*', 'uuid', 'path', 'type', 'created_at')
    .rightJoin('asset', 'asset_map.asset_id', 'asset.id')
    .where({ entityTypeId, entityId })

const deleteAssetAndAssetMap = async (assetPaths: { [id: string]: string }) => {
  const ids = Object.keys(assetPaths)
  const paths = Object.keys(assetPaths)

  await knex.transaction(async (trx) => {
    await trx('asset_map').whereIn('asset_id', ids).del()
    await trx('asset').whereIn('id', ids).del()
  })

  const logError = (err: Error) => {
    console.error('delete assets ERROR:', err)
  }

  await Promise.allSettled(
    paths
      .map((path) => [
        s3DeleteFile(s3Bucket, path).catch(logError),
        cfDeleteFile(path).catch(logError),
      ])
      .flat()
  )
}

const unlinkUnpublishedDrafts = async (ids: string[]) =>
  knex('draft').whereIn('id', ids).update('article_id', null)

const deleteUnpulishedArticles = async (ids: string[]) =>
  knex('article')
    .whereIn('id', ids)
    .andWhereNot('state', ARTICLE_STATE.active)
    .del()

const deleteDrafts = async (ids: string[]) =>
  knex('draft').whereIn('id', ids).del()

const findAssetsByAuthorAndTypes = (authorId: string, types: string[]) =>
  knex('asset').whereIn('type', types).andWhere({ authorId })
