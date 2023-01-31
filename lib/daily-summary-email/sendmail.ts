import type { Language } from "../types";

import _ from "lodash";

import { DB_NOTICE_TYPE } from "./enum.js";
import { Mail } from "../../lib/mail.js";
import { EMAIL_FROM_ASK } from "../../lib/constants/index.js";
import { NoticeItem } from "./notice.js";
import {
  getUserDigest,
  getArticleDigest,
  getActors,
  getCommentDigest,
} from "./utils.js";

const siteDomain = process.env.MATTERS_SITE_DOMAIN || "";
const isProd = siteDomain === "https://matters.news";

const mail = new Mail();

export const sendmail = async ({
  to,
  recipient,
  language,
  notices,
}: {
  to: string;
  recipient: {
    displayName: string;
  };
  language: Language;
  notices: {
    user_new_follower: NoticeItem[];
    article_new_collected: NoticeItem[];
    article_new_appreciation: NoticeItem[];
    article_new_subscriber: NoticeItem[];
    article_new_comment: NoticeItem[];
    article_mentioned_you: NoticeItem[];
    comment_new_reply: NoticeItem[];
    comment_mentioned_you: NoticeItem[];

    circle_invitation: NoticeItem[];

    circle_new_subscriber: NoticeItem[];
    circle_new_follower: NoticeItem[];
    circle_new_unsubscriber: NoticeItem[];
    circle_new_article: NoticeItem[];
    circle_new_broadcast: NoticeItem[];
    circle_new_broadcast_comments: NoticeItem[];
    circle_new_discussion_comments: NoticeItem[];
  };
}) => {
  const templateId = getTemplateId(language);
  const subject = getSubject(language, recipient.displayName);

  const user_new_follower = await Promise.all(
    notices.user_new_follower.map(async ({ actors = [] }) => ({
      actors: await getActors(actors),
      actorCount: actors.length > 3 ? actors.length : false,
    }))
  );
  const article_new_collected = await Promise.all(
    notices.article_new_collected.map(async ({ actors = [], entities }) => ({
      actor: await getUserDigest(actors[0]),
      article: await getArticleDigest(entities && entities.target),
    }))
  );
  const article_new_appreciation = await Promise.all(
    notices.article_new_appreciation.map(async ({ actors = [], entities }) => ({
      actors: await getActors(actors),
      article: await getArticleDigest(entities && entities.target),
    }))
  );
  const article_mentioned_you = await Promise.all(
    notices.article_mentioned_you.map(async ({ actors = [], entities }) => ({
      actor: await getUserDigest(actors[0]),
      article: await getArticleDigest(entities && entities.target),
    }))
  );
  const article_new_subscriber = await Promise.all(
    notices.article_new_subscriber.map(async ({ actors = [], entities }) => ({
      actors: await getActors(actors),
      article: await getArticleDigest(entities && entities.target),
    }))
  );
  const article_new_comment = await Promise.all(
    notices.article_new_comment.map(async ({ actors = [], entities }) => ({
      actors: await getActors(actors),
      article: await getArticleDigest(entities && entities.target),
    }))
  );
  const comment_new_reply = await Promise.all(
    notices.comment_new_reply.map(async ({ actors = [], entities }) => ({
      actor: await getUserDigest(actors[0]),
      comment: await getCommentDigest(entities && entities.target),
    }))
  );
  const comment_mentioned_you = await Promise.all(
    notices.comment_mentioned_you.map(async ({ actors = [], entities }) => ({
      actor: await getUserDigest(actors[0]),
      comment: await getCommentDigest(entities && entities.target),
    }))
  );
  const circle_new_subscriber = await Promise.all(
    notices.circle_new_subscriber.map(async ({ actors = [], entities }) => ({
      actor: await getUserDigest(actors[0]),
      actorCount: actors.length > 3 ? actors.length : false,
    }))
  );
  const circle_new_follower = await Promise.all(
    notices.circle_new_follower.map(async ({ actors = [] }) => ({
      actors: await getActors(actors),
      actorCount: actors.length > 3 ? actors.length : false,
    }))
  );
  const circle_new_unsubscriber = await Promise.all(
    notices.circle_new_unsubscriber.map(async ({ actors = [], entities }) => ({
      actor: await getUserDigest(actors[0]),
      actorCount: actors.length > 3 ? actors.length : false,
    }))
  );
  // TODO
  // const circle_new_article = await Promise.all(
  //   notices.circle_new_article.map(async ({ actors = [], entities }) => ({
  //     actor: await getUserDigest(actors[0]),
  //     article: await getArticleDigest(entities && entities.target),
  //   }))
  // )
  // const circle_new_broadcast = await Promise.all(
  //   notices.circle_new_broadcast.map(async ({ actors = [], entities }) => ({
  //     actor: await getUserDigest(actors[0]),
  //     comment: await getCommentDigest(entities && entities.target),
  //   }))
  // )
  // const in_circle_new_broadcast_reply = await Promise.all(
  //   notices.circle_new_comments.map(
  //     async ({ actors = [], entities }) => ({
  //       actor: await getUserDigest(actors[0]),
  //       comment: await getCommentDigest(entities && entities.target),
  //     })
  //   )
  // )

  await mail.send({
    from: EMAIL_FROM_ASK,
    templateId,
    personalizations: [
      {
        to,
        dynamicTemplateData: {
          subject,
          siteDomain,
          recipient,
          section: {
            follow: !!_.get(notices.user_new_follower, "0"),
            article: [
              DB_NOTICE_TYPE.article_new_collected,
              DB_NOTICE_TYPE.article_new_appreciation,
              DB_NOTICE_TYPE.article_new_subscriber,
              DB_NOTICE_TYPE.article_new_comment,
            ].some((type) => _.get(notices, `${type}.0`)),
            mention: [
              DB_NOTICE_TYPE.article_mentioned_you,
              DB_NOTICE_TYPE.comment_mentioned_you,
              DB_NOTICE_TYPE.comment_new_reply,
            ].some((type) => _.get(notices, `${type}.0`)),
          },
          notices: {
            user_new_follower,
            article_new_collected,
            article_new_appreciation,
            article_new_subscriber,
            article_new_comment,
            article_mentioned_you,
            comment_new_reply,
            comment_mentioned_you,
            circle_new_subscriber,
            circle_new_follower,
            circle_new_unsubscriber,
            // circle_new_article,
            // circle_new_broadcast,
            // circle_new_broadcast_comments
            // circle_new_discussion_comments
          },
        },
      },
    ],
    trackingSettings: {
      ganalytics: {
        enable: true,
        utmSource: "matters",
        utmMedium: "email",
        // utmTerm?: string;
        utmContent: "dailySummary",
        // utmCampaign?: string;
      },
    },
  });
};

// helpers

const getSubject = (language: Language, displayName: string): string => {
  const copys = {
    zh_hant: `🐿️  ${displayName}，這是專屬於你的 Matters 日報`,
    zh_hans: `🐿️  ${displayName}，这是专属于你的 Matters 日报`,
    en: `🐿️  ${displayName}，這是專屬於你的 Matters 日報`,
  };
  return copys[language];
};

const getTemplateId = (language: Language): string => {
  const templateIdsDev = {
    zh_hant: "d-805ccf4182244f59a5388b581df1eeab",
    zh_hans: "d-e242f3e39f014279966e43425b208cbe",
    en: "d-805ccf4182244f59a5388b581df1eeab",
  };
  const templateIdsProd = {
    zh_hant: "d-4a5a938cdc0c4020a1e2feb67a553946",
    zh_hans: "d-7f4276f1b32f48a4a51df90cbbb1447a",
    en: "d-4a5a938cdc0c4020a1e2feb67a553946",
  };
  const templateIds = isProd ? templateIdsProd : templateIdsDev;
  return templateIds[language];
};
