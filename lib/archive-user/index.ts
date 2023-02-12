import { pgKnex as knex } from "../db.js";
import { s3DeleteFile } from "../utils.js";
import { ASSET_TYPE } from "./enum.js";

const draftEntityTypeId = process.env.MATTERS_DRAFT_ENTITY_TYPE_ID || '';
const s3Bucket = process.env.MATTERS_AWS_S3_BUCKET || ''

export const archiveUser = (userId: string) => {
  // delete unlinked drafts
  await deleteUnpublishedDrafts(userId);

  // delete assets
  await deleteUserAssets(userId);
};

// helpers

const deleteUnpublishedDrafts = (userId: string) => {
  const drafts = await findUnpublishedByAuthor(authorId);

  // delete assets
  await Promise.all(
    drafts.map(async (draft) => {
      const assets = await findAssetAndAssetMap({
        entityTypeId: draftEntityTypeId,
        entityId: draft.id,
      });

      const assetPaths: { [id: string]: string } = {};
      assets.forEach((asset) => {
        assetPaths[`${asset.assetId}`] = asset.path;
      });

      if (Object.keys(assetPaths).length > 0) {
        await deleteAssetAndAssetMap(assetPaths);
      }
    })
  );

  // delete drafts
  await deleteDrafts(drafts.map((draft) => draft.id));
};

const deleteUserAssets = (userId: string) => {
  const types = [
    ASSET_TYPE.avatar,
    ASSET_TYPE.profileCover,
    ASSET_TYPE.oauthClientAvatar,
    ASSET_TYPE.profileCover,
  ];
  const assets = (await findAssetsByAuthorAndTypes(userId, types)).reduce(
    (data: any, asset: any) => {
      data[`${asset.id}`] = asset.path;
      return data;
    },
    {}
  );

  if (assets && Object.keys(assets).length > 0) {
    await deleteAssetAndAssetMap(assets);
  }
};

const findUnpublishedByAuthor = (authorId: string) =>
  knex()
    .select()
    .from("draft")
    .where({ authorId, archived: false })
    .andWhereNot({ publishState: PUBLISH_STATE.published })
    .orderBy("updated_at", "desc");

const findAssetAndAssetMap = async ({
  entityTypeId,
  entityId,
}: {
  entityTypeId: string;
  entityId: string;
}) =>
  knex("asset_map")
    .select("asset_map.*", "uuid", "path", "type", "created_at")
    .rightJoin("asset", "asset_map.asset_id", "asset.id")
    .where({ entityTypeId, entityId });

const deleteAssetAndAssetMap = async (assetPaths: { [id: string]: string }) => {
  const ids = Object.keys(assetPaths);
  const paths = Object.keys(assetPaths);

  await knex.transaction(async (trx) => {
    await trx("asset_map").whereIn("asset_id", ids).del();
    await trx("asset").whereIn("id", ids).del();
  });

  try {
    await Promise.all(paths.map((path) => s3DeleteFile(s3Bucket, path)));
  } catch (e) {
    logger.error(e);
  }
};

const deleteDrafts = async (ids: string[]) =>
  knex("draft").whereIn("id", ids).del();

const findAssetsByAuthorAndTypes = (authorId: string, types: string[]) =>
  knex("asset").whereIn("type", types).andWhere({ authorId });
