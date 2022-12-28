import { sql } from "../../lib/db.js";
import { Mail } from "../../lib/mail.js";

const sgKey = process.env.SENDGRID_API_KEY || "";
const siteDomain = process.env.MATTERS_SITE_DOMAIN || "";
const newFeatureTagId = process.env.MATTERS_NEW_FEATURE_TAG_ID || "";

const mail = new Mail(sgKey);

export const sendmail = async (
  userId: string,
  lastSeen: Date,
  type: "NEWUSER" | "ACTIVE"
) => {
  const { displayName, email, language, createdAt } = await loadUserInfo(
    userId
  );
  const subject = getSubject(displayName, type, language);
  const recipient = { displayName, days: getDays(createdAt) };
  const [
    articlesRecommended,
    numDonations,
    numAppreciations,
    usersRecommended,
    articlesNewFeature,
  ] = await Promise.all([
    loadRecommendedArticles(userId, lastSeen, 3),
    loadNumDonations(userId),
    loadNumAppreciations(userId),
    loadRecommendedUsers(userId, 3),
    loadNewFeatureArticles(newFeatureTagId, 1),
  ]);
  const articlesHottest =
    articlesRecommended.length === 0
      ? await loadHottestArticles(userId, 3)
      : [];
  await mail.send({
    from: "Matters<ask@matters.news>",
    templateId: "d-22b0f1c254d74cadaf6b2d246e0b4c14",
    personalizations: [
      {
        to: email,
        // @ts-ignore
        dynamic_template_data: {
          subject,
          siteDomain,
          recipient,
          type,
          articlesRecommended,
          articlesHottest,
          numDonations,
          numAppreciations,
          usersRecommended,
          articlesNewFeature,
        },
      },
    ],
  });
};

// helpers

type Language = "zh_hant" | "zh_hans" | "en";

type UserInfo = {
  displayName: string;
  email: string;
  language: Language;
  createdAt: Date;
};

type User = {
  id: string;
  userName: string;
  displayName: string;
};

type Article = {
  id: string;
  title: string;
  displayName: string;
  mediaHash: string;
};

const loadUserInfo = async (userId: string): Promise<UserInfo> => {
  const res =
    await sql`select display_name, email, language, created_at from public.user where id=${userId}`;
  return res[0] as UserInfo;
};

const loadRecommendedArticles = async (
  userId: string,
  lastSeen: Date,
  limit: number
) => {
  const articles = await loadDoneeHotArticles(userId, lastSeen, limit);
  if (articles.length < limit) {
    return articles.concat(
      await loadFolloweeHotArticles(
        userId,
        lastSeen,
        limit - articles.length,
        articles.map(({ id }) => id)
      )
    );
  } else {
    return articles;
  }
};

const loadHottestArticles = async (
  userId: string,
  limit: number
): Promise<Article[]> => sql`
    SELECT h.id, h.title, u.display_name, a.media_hash
    FROM article_hottest_materialized h 
    JOIN article a ON h.id = a.id
    JOIN public.user u ON a.author_id=u.id
    WHERE h.id NOT IN (SELECT article_id FROM article_read_count WHERE user_id=${userId})
    ORDER BY h.score DESC
    LIMIT ${limit};
`;

const loadNumDonations = async (userId: string): Promise<number> => {
  const res =
    await sql`SELECT count(*) FROM transaction WHERE purpose='donation' AND state='succeeded' AND recipient_id=${userId}`;
  return +res[0].count;
};

const loadNumAppreciations = async (userId: string): Promise<number> => {
  const res =
    await sql`SELECT sum(amount) FROM appreciation WHERE purpose='appreciate' AND recipient_id=${userId};`;
  return +res[0].sum;
};

const loadRecommendedUsers = async (
  userId: string,
  limit: number
): Promise<User[]> => sql`
    SELECT u.id, u.user_name, u.display_name
    FROM public.user u
    LEFT OUTER JOIN (
      SELECT sender_id, COUNT(*) AS num_donations
      FROM transaction
      WHERE
        recipient_id=${userId}
        AND purpose='donation'
        AND state='succeeded'
      GROUP BY sender_id
    ) user_donation
      ON u.id=user_donation.sender_id
    LEFT OUTER JOIN (
      SELECT sender_id, COUNT(*) as num_appreciations
      FROM appreciation
      WHERE recipient_id=${userId} AND purpose='appreciate'
      GROUP BY sender_id
    ) user_appreciation
      ON u.id=user_appreciation.sender_id
    LEFT OUTER JOIN (
      SELECT user_id, created_at AS follow_at FROM action_user WHERE action='follow' AND target_id=${userId}
    ) user_follower
      ON u.id=user_follower.user_id
    LEFT OUTER JOIN (
      SELECT target_id, 1 AS is_followee FROM action_user WHERE action='follow' AND user_id=${userId}
    ) user_followee
      ON u.id=user_followee.target_id
    WHERE u.state='active' AND ( num_donations > 0 OR num_appreciations > 0)
    ORDER BY 
      num_donations DESC NULLS LAST,
      num_appreciations DESC NULLS LAST,
      is_followee DESC NULLS LAST,
      follow_at DESC NULLS LAST
    LIMIT ${limit};
`;

const loadNewFeatureArticles = async (
  tagId: string,
  limit: number
): Promise<Article[]> => sql`
    SELECT
      article.id,
      article.title,
      u.display_name,
      article.media_hash
    FROM article_tag
    JOIN article ON article_tag.article_id=article.id
    JOIN public.user u ON article.author_id=u.id
    WHERE tag_id=${tagId}
    ORDER BY article.created_at DESC
    LIMIT ${limit};
`;

const getSubject = (
  displayName: string,
  type: "NEWUSER" | "ACTIVE",
  language: Language
): string => {
  const subjects = {
    NEWUSER: {
      zh_hant: `${displayName}，剛來到馬特市，想與你分享 Matters 的小秘密`,
      zh_hans: `${displayName}，刚来到马特市，想与你分享 Matters 的小秘密`,
      en: `${displayName}，剛來到馬特市，想與你分享 Matters 的小秘密`,
    },
    ACTIVE: {
      zh_hant: `${displayName}，在你離開 Matters 的期間， 我們為你整理了精彩內容`,
      zh_hans: `${displayName}，在你离开 Matters 的期间， 我们为你整理了精彩内容`,
      en: `${displayName}，在你離開 Matters 的期間， 我們為你整理了精彩內容`,
    },
  };
  const copys = subjects[type];
  return copys[language];
};

const loadDoneeHotArticles = async (
  userId: string,
  lastSeen: Date,
  limit: number
): Promise<Article[]> => {
  return loadArticles(
    userId,
    lastSeen,
    limit,
    sql`SELECT recipient_id FROM transaction WHERE purpose='donation' AND sender_id=${userId} AND state='succeeded'`,
    sql(["0"]) // sql([]) not work, work around it
  );
};

const loadFolloweeHotArticles = async (
  userId: string,
  lastSeen: Date,
  limit: number,
  excludedArticleIds: string[]
): Promise<Article[]> => {
  return loadArticles(
    userId,
    lastSeen,
    limit,
    sql`SELECT target_id FROM action_user WHERE user_id=${userId} AND action='follow'`,
    sql(excludedArticleIds)
  );
};

const loadArticles = async (
  userId: string,
  lastSeen: Date,
  limit: number,
  targetAuthorIdFragment: any,
  excludedArticleIdsFragment: any
): Promise<Article[]> => sql`
    SELECT
      article.id,
      article.title,
      u.display_name,
      article.media_hash
    FROM article 
    INNER JOIN public.user u
      ON author_id = u.id
    LEFT OUTER JOIN (
      SELECT target_id, COUNT(id) AS num_donations
        FROM transaction
        WHERE purpose='donation' AND state='succeeded' AND target_type=4
        GROUP BY target_id
    ) article_donation 
      ON article.id = article_donation.target_id
    LEFT OUTER JOIN (
      SELECT reference_id, SUM(amount) AS num_appreciation
        FROM appreciation
        WHERE purpose='appreciate'
        GROUP BY reference_id
    ) article_appreciation 
       ON article.id = article_appreciation.reference_id
    LEFT OUTER JOIN (
      SELECT comment.target_id, COUNT(comment.id) AS num_comments
        FROM comment, article
        WHERE 
          comment.target_id=article.id
          AND comment.author_id != article.author_id
          AND comment.type='article'
          AND comment.state='active'
          AND comment.target_type_id=4
        GROUP BY comment.target_id
    ) article_comment 
      ON article.id = article_comment.target_id
    WHERE 
      article.created_at >= ${lastSeen}
      AND article.author_id IN (${targetAuthorIdFragment})
      AND article.id NOT IN (SELECT article_id FROM article_read_count WHERE user_id=${userId})
      AND article.id NOT IN ${excludedArticleIdsFragment}
      AND (
        article_donation.num_donations >= 1
        OR article_appreciation.num_appreciation >= 15
        OR article_comment.num_comments >= 2
      )
    ORDER BY
      article_donation.num_donations DESC NULLS LAST,
      article_appreciation.num_appreciation DESC NULLS LAST,
      article_comment.num_comments DESC NULLS LAST
    LIMIT ${limit};
    `;

const getDays = (past: Date) => {
  const oneDay = 24 * 60 * 60 * 1000;
  const now = new Date();
  return Math.round(Math.abs((+now - +past) / oneDay));
};

// const mediaHashToLink = (siteDomain: string, mediaHash: string) => `https://${siteDomain}/@-/-${mediaHash}`

// sendmail('3685', new Date('2022-10-18'), 'NEWUSER').then(()=>{process.exit()})
