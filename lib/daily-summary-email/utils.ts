import { Base64 } from "js-base64";
import { makeSummary } from "@matters/ipns-site-generator";

import { sql, pgKnex } from "../../lib/db.js";
import {
  APPRECIATION_PURPOSE,
  ARTICLE_STATE,
  COMMENT_STATE,
  COMMENT_TYPE,
  NODE_TYPE,
} from "./enum.js";

type UserDigest = {
  id: string;
  userName: string;
  displayName: string;
  avatar: string | null;
};

type ArticlePartial = {
  id: string;
  title: string;
  slug: string;
  authorId: string;
  mediaHash: string;
};

export const getUserDigest = async (
  user: UserDigest | null
): Promise<UserDigest | undefined> => {
  if (!user) {
    return;
  }

  let avatar = user.avatar;
  if (avatar) {
    const url = await findAssetUrl(avatar);
    if (url) {
      avatar = url;
    }
  }

  return {
    id: user.id,
    userName: user.userName,
    displayName: user.displayName,
    avatar,
  };
};

export const getArticleDigest = async (article: ArticlePartial | null) => {
  if (!article) {
    return;
  }

  const [author, appreciationsReceivedTotal, articleCount, commentCount] =
    await Promise.all([
      findUser(article.authorId),
      sumArticleAppreciation(article.id),
      countArticleActiveCollectedBy(article.id),
      countArticleComments(article.id),
    ]);

  const authorDigest = await getUserDigest(author);
  const responseCount = articleCount + commentCount;

  return {
    id: article.id,
    author: authorDigest,
    title: article.title,
    slug: encodeURIComponent(article.slug),
    mediaHash: article.mediaHash,
    appreciationsReceivedTotal,
    responseCount,
  };
};

export const getCommentDigest = async (comment: any | undefined) => {
  if (!comment) {
    return;
  }

  const content = makeSummary(comment.content, 21);

  return {
    id: comment.id,
    globalId: toGlobalId({ type: NODE_TYPE.Comment, id: comment.id }),
    content: content.length === comment.content ? content : `${content}…`,
    article: await getArticleDigest(await findArticle(comment.targetId)),
  };
};

export const getActors = async (actors: UserDigest[]) => {
  return Promise.all(actors.map(async (actor) => getUserDigest(actor)));
};

// helpers

const findArticle = async (id: string): Promise<ArticlePartial | null> => {
  const result = await sql<
    ArticlePartial[]
  >`SELECT id, title, slug, author_id, media_hash FROM article WHERE id = ${id}`;
  if (result.length !== 1) {
    return null;
  }
  return result[0];
};

const countArticleComments = async (articleId: string) => {
  const result = await pgKnex("comment")
    .where({
      targetId: articleId,
      state: COMMENT_STATE.active,
      type: COMMENT_TYPE.article,
    })
    .count()
    .first();
  return parseInt((result?.count as string) || "0", 10);
};

const sumArticleAppreciation = async (articleId: string) => {
  const result = await pgKnex
    .select()
    .from("appreciation")
    .whereIn(
      ["reference_id", "purpose"],
      [
        [articleId, APPRECIATION_PURPOSE.appreciate],
        [articleId, APPRECIATION_PURPOSE.appreciateSubsidy],
      ]
    )
    .sum("amount", { as: "sum" })
    .first();
  return parseInt(result?.sum || "0", 10);
};

const countArticleActiveCollectedBy = async (articleId: string) => {
  const result = await pgKnex("collection")
    .rightJoin("article", "collection.entrance_id", "article.id")
    .where({
      "collection.article_id": articleId,
      "article.state": ARTICLE_STATE.active,
    })
    .countDistinct("entrance_id")
    .first();
  return parseInt((result?.count as string) || "0", 10);
};

const findUser = async (id: string): Promise<UserDigest | null> => {
  const result = await sql<
    UserDigest[]
  >`SELECT id, user_name, display_name, avatar FROM public.user WHERE id = ${id}`;
  if (result.length !== 1) {
    return null;
  }
  return result[0];
};

const findAssetUrl = async (id: string): Promise<string | null> => {
  const path = await findAssetPath(id);
  return path ? `${getAssetEndPoint()}/${path}` : null;
};

const findAssetPath = async (id: string) => {
  const result = await sql`SELECT path FROM asset WHERE id = ${id}`;
  if (result.length !== 1) {
    return null;
  }
  return result[0].path;
};

const getAssetEndPoint = (): string => {
  const endpoint = process.env.MATTERS_AWS_CLOUD_FRONT_ENDPOINT;
  if (!endpoint) {
    throw Error("please provide MATTERS_AWS_CLOUD_FRONT_ENDPOINT env");
  }
  return `https://${endpoint}`;
};

const toGlobalId = ({ type, id }: { type: NODE_TYPE; id: number | string }) =>
  Base64.encodeURI(`${type}:${id}`);
