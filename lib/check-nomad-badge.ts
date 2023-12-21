import crypto from "node:crypto";

import type { Language } from "./types";
import { Mail } from "./mail.js";
import { sql, sqlSIW } from "../lib/db.js";
import { DAY, EMAIL_FROM_ASK } from "./constants/index.js";

type NomadBadgeLevel = 1 | 2 | 3 | 4;

const siteDomain = process.env.MATTERS_SITE_DOMAIN || "";
// const siteOrigin = `https://${siteDomain}`;
const isProd = siteDomain === "https://matters.town";

const mail = new Mail();

const MATTERS_CAMPAIGN_TAGS_IDS = JSON.parse(
  process.env.MATTERS_CAMPAIGN_TAGS_IDS || "[157201]"
); // https://matters.town/tags/157201-nomadmatters?type=latest
const MATTERS_CAMPAIGN_BEGINS =
  process.env.MATTERS_CAMPAIGN_BEGINS || "2023-12-14T16:00:00.000Z"; // 2023-12-15T00:00 in UTC+8
const MATTERS_CAMPAIGN_ENDS =
  process.env.MATTERS_CAMPAIGN_ENDS || "2024-01-14T15:59:59.999Z"; // 2024-01-15T23:59 in UTC+8

const ARRAY_TYPE = 1009; // Postgres internal value shouldn't be here;

const getNewLevel = (referredCount: number): NomadBadgeLevel => {
  // const referredCount = referralsMap.get(userName) || 0;
  if (referredCount >= 20) return 4 as const;
  else if (referredCount >= 10) return 3 as const;
  else if (referredCount >= 5) return 2 as const;
  else return 1 as const;
};
// const shouldGetNewLevel = ( // userName: string, referredCount: number, newLevel: NomadBadgeLevel
// ): boolean => { // const referredCount = referralsMap.get(userName) || 0; switch (newLevel) { case 4: return referredCount >= 20; case 3: return referredCount >= 10; case 2: return referredCount >= 5; default: return true; } };

export async function checkNomadBadge({
  campaignTagIds = MATTERS_CAMPAIGN_TAGS_IDS, // [157201],// https://matters.town/tags/157201-nomadmatters?type=latest
  campaignBegins,
  campaignEnds,
  dryRun = true,
}: {
  campaignTagIds?: number[];
  campaignBegins?: Date | string;
  campaignEnds?: Date | string;
  dryRun?: boolean;
} = {}): Promise<any> {
  // const [{ version, now }] = await sql` SELECT VERSION(), NOW() `; console.log("pgres:", { version, now });

  if (!campaignBegins) campaignBegins = new Date(MATTERS_CAMPAIGN_BEGINS);
  if (!campaignEnds) campaignEnds = new Date(MATTERS_CAMPAIGN_ENDS);
  // const nomadTagId = 157201; // https://matters.town/tags/157201-nomadmatters?type=latest

  const allParticipants = await sql<
    Array<{
      userId: number;
      userName: string;
      displayName: string;
      email: string;
      language: Language;
      currentLevel: NomadBadgeLevel;
      currentReferredCount: number;
      referral?: {
        referredCount: number;
      };
      // newLevel: NomadBadgeLevel;
    }>
  >`-- query all campaign applicants
WITH all_applicant_articles AS (
  SELECT DISTINCT ON (author_id)
    author_id ::int, article.id ::int, article.title, article.created_at
  FROM article_tag
  LEFT JOIN public.article ON article_id=article.id
  WHERE article.state IN ('active')
    AND article.created_at BETWEEN ${campaignBegins!} AND ${campaignEnds!}
    AND tag_id =ANY(${campaignTagIds})
  ORDER BY author_id, article.created_at ASC
), all_apprs_to_applicants AS (
  SELECT DISTINCT ON (sender_id) sender_id ::int, created_at
  FROM appreciation
  WHERE reference_id IN ( SELECT id FROM all_applicant_articles )
    AND purpose IN ('appreciate')
    AND created_at BETWEEN ${campaignBegins!} AND ${campaignEnds!}
  ORDER BY sender_id, -- updated_at DESC,
    created_at ASC
), all_donations_to_applicants AS (
  SELECT DISTINCT ON (sender_id) sender_id ::int, created_at
  FROM transaction
  WHERE purpose='donation' AND state='succeeded'
    AND target_type=4 AND target_id IN ( SELECT id FROM all_applicant_articles )
    AND created_at BETWEEN ${campaignBegins!} AND ${campaignEnds!}
  ORDER BY sender_id, -- updated_at DESC,
    created_at ASC
), merged_all AS (
  SELECT DISTINCT ON (user_id) user_id, last_act, last_act_at
  FROM (
    SELECT author_id ::int AS user_id, 'article_applicant' AS last_act, created_at AS last_act_at FROM all_applicant_articles
    UNION ALL
    SELECT sender_id ::int AS user_id, 'appr_to_applicant' AS last_act, created_at AS last_act_at FROM all_apprs_to_applicants
    UNION ALL
    SELECT sender_id ::int AS user_id, 'donate_to_applicant' AS last_act, created_at AS last_act_at FROM all_donations_to_applicants
  ) t
  ORDER BY user_id, last_act_at ASC
), all_referrals AS (
  SELECT t.*
  FROM (
    SELECT extra->>'referralCode' AS referral_user_name, COUNT(*) ::int AS "referredCount", MAX(created_at) AS latest_referred
    FROM public.user
    WHERE state IN ('active') -- NOT IN ('archived', 'banned', 'frozen')
      AND created_at BETWEEN ${campaignBegins!} AND ${campaignEnds!}
      AND extra->'referralCode' IS NOT NULL
    GROUP BY 1
    -- HAVING COUNT(*) >=5
  ) t
  JOIN public.user u ON referral_user_name=u.user_name -- use INNER JOIN; the referral_code must be existing user_names
  WHERE state IN ('active') -- NOT IN ('archived', 'banned', 'frozen')
  -- WHERE COALESCE((u.extra->'referredCount')::int, 0) < count
  -- ORDER BY latest_referred DESC, count DESC -- LIMIT 13 
)

SELECT user_name, display_name, aa.*,
  u.email, u.language, u.created_at, u.state,
  COALESCE((ub.extra->'level')::int, 0) AS current_level, -- current nomad badge level
  COALESCE((u.extra->'referredCount')::int, 0) AS current_referred_count,
  to_jsonb(all_referrals.*) - 'referral_user_name' AS referral
FROM merged_all aa
LEFT JOIN public.user u ON aa.user_id=u.id
LEFT JOIN public.user_badge ub ON ub.user_id=aa.user_id AND ub.type='nomad' AND ub.enabled IS true
LEFT JOIN all_referrals ON referral_user_name=u.user_name
WHERE u.state IN ('active') -- NOT IN ('archived', 'banned', 'frozen')
  AND ( ub.extra IS NULL -- newly gaining nomad1
    OR COALESCE((u.extra->'referredCount')::int, -1) < all_referrals."referredCount" -- find out only those having new referrals
  )
ORDER BY aa.last_act_at ASC ; `;

  console.log(
    `consider all new (${allParticipants?.length ?? 0}) participants:`,
    allParticipants
  );
  if (allParticipants.length === 0) {
    console.log(`no new participants found; nothing to do...`);
    return;
  }

  const newNomad1BadgedUsers = allParticipants.filter(
    ({ currentLevel }) => currentLevel < 1 // && (referralsMap.get(userName) || 0) >= 0
    // && shouldGetNewLevel(userName, 1)
  ); // for all ones got Lv1

  console.log(
    `consider new nomad1 (${newNomad1BadgedUsers.length}) badged users:`,
    newNomad1BadgedUsers
  );
  if (newNomad1BadgedUsers.length > 0) {
    // send badges, send mattersDB notification, send emails
    await notifyNomadBadge(newNomad1BadgedUsers, 1, !dryRun);
    await sendNomadBadgeMail(newNomad1BadgedUsers, 1, !dryRun);
  }

  const newNomad2BadgedUsers = allParticipants.filter(
    ({ userName, currentLevel, referral }) =>
      currentLevel < 2 && // (referralsMap.get(userName) || 0) >= 5
      getNewLevel(referral?.referredCount || 0) >= 2
  ); // for all ones got Lv2

  console.log(
    `consider new nomad2 (${newNomad2BadgedUsers.length}) badged users:`,
    newNomad2BadgedUsers
  );
  if (newNomad2BadgedUsers.length > 0) {
    // send badges, send mattersDB notification, send emails
    await delay(1300); // give it a few seconds for all prior level mails sent
    await notifyNomadBadge(newNomad2BadgedUsers, 2, !dryRun);
    await sendNomadBadgeMail(newNomad2BadgedUsers, 2 as const, !dryRun);
  }

  const newNomad3BadgedUsers = allParticipants.filter(
    ({ userName, currentLevel, referral }) =>
      currentLevel < 3 && // (referralsMap.get(userName) || 0) >= 10
      // shouldGetNewLevel(referral?.referredCount || 0, 3)
      getNewLevel(referral?.referredCount || 0) >= 3
  ); // for all ones got Lv3

  console.log(
    `consider new nomad3 (${newNomad3BadgedUsers.length}) badged users:`,
    newNomad3BadgedUsers
  );
  if (newNomad3BadgedUsers.length > 0) {
    // send badges, send mattersDB notification, send emails
    await delay(1300); // give it a few seconds for all prior level mails sent
    await notifyNomadBadge(newNomad3BadgedUsers, 3, !dryRun);
    await sendNomadBadgeMail(newNomad3BadgedUsers, 3 as const, !dryRun);
  }

  const newNomad4BadgedUsers = allParticipants.filter(
    ({ userName, currentLevel, referral }) =>
      currentLevel < 4 && // (referralsMap.get(userName) || 0) >= 20
      // shouldGetNewLevel(referral?.referredCount || 0, 4)
      getNewLevel(referral?.referredCount || 0) >= 4
  ); // for all ones got Lv4

  console.log(
    `consider new nomad4 (${newNomad4BadgedUsers.length}) badged users:`,
    newNomad4BadgedUsers
  );
  if (newNomad4BadgedUsers.length > 0) {
    // send badges, send mattersDB notification, send emails
    await delay(1300); // give it a few seconds for all prior level mails sent
    await notifyNomadBadge(newNomad4BadgedUsers, 4, !dryRun);
    await sendNomadBadgeMail(newNomad4BadgedUsers, 4 as const, !dryRun);
  }

  // update each user's referredCount
  const referrals = allParticipants.filter(
    ({ currentReferredCount, referral }) =>
      currentReferredCount < (referral?.referredCount || 0)
  );
  if (referrals.length > 0) {
    await updateReferredCount(referrals, !dryRun);
  }

  const allNewBadges = allParticipants
    .map(({ userId, currentLevel, referral }) => ({
      userId,
      type: "nomad" as const,
      currentLevel,
      newLevel: getNewLevel(referral?.referredCount || 0),
    }))
    .filter(({ currentLevel, newLevel }) => currentLevel < newLevel);

  if (allNewBadges.length > 0) {
    return putBadges(allNewBadges, !dryRun);
  }
}

// update eacho user's referredCount
async function updateReferredCount(
  referrals: Array<{
    userName: string;
    referral?: {
      referredCount: number;
    };
  }>,
  doUpdate = false
) {
  if (!doUpdate) return;
  // if (referrals.length === 0) return;

  const usersWithUpdatedRefCount = await sqlSIW`-- upsert all new badges
UPDATE public.user u SET
  extra=COALESCE(u.extra, '{}'::jsonb) || t.extra, updated_at=CURRENT_TIMESTAMP
FROM (
  SELECT * FROM UNNEST(
    ${sqlSIW.array(
      referrals.map(({ userName }) => userName),
      ARRAY_TYPE
    )} ::text[],
    ${sqlSIW.array(
      referrals.map(({ referral }) => JSON.stringify(referral)),
      ARRAY_TYPE
    )} ::jsonb[]
  )
) AS t(user_name, extra)
WHERE u.user_name=t.user_name -- skip AND u.extra->'referredCount' < t.extra->'referredCount'
RETURNING u.* ;`;

  console.log("log user by referrals:", usersWithUpdatedRefCount);
}

async function putBadges(
  newNomadBadges: Array<{
    userId: number;
    type: "nomad";
    newLevel: NomadBadgeLevel;
  }>,
  doUpdate = false
) {
  if (!doUpdate) return;

  const retBadges = await sqlSIW`-- upsert all new badges
WITH new_badges AS (
  INSERT INTO public.user_badge AS ub(user_id, type, extra)
    SELECT * FROM UNNEST(
      ${sqlSIW.array(
        newNomadBadges.map(({ userId }) => userId),
        ARRAY_TYPE
      )} ::int[],
      ${sqlSIW.array(
        newNomadBadges.map(({ type }) => type),
        ARRAY_TYPE
      )} ::text[],
      ${sqlSIW.array(
        newNomadBadges.map(({ newLevel }) =>
          JSON.stringify({ level: newLevel })
        ),
        ARRAY_TYPE
      )} ::jsonb[]
    )
  ON CONFLICT (user_id, type)
  DO UPDATE
    SET enabled=true,
      extra=(COALESCE(ub.extra, '{}' ::jsonb) || jsonb_build_object('updatedAt', NOW()) || EXCLUDED.extra)
  RETURNING *
)

SELECT user_name, display_name, state, u.created_at, u.updated_at, language,
  (ub.type || COALESCE(ub.extra->>'level', '')) AS badge_type,
  u.extra AS user_data,
  to_jsonb(ub.*) AS badge_data
FROM new_badges ub
LEFT JOIN public.user u ON user_id=u.id
ORDER BY ub.id DESC ;`;

  console.log("upsert'ed new badges:", retBadges);
  return retBadges;
}

const getTemplateId = (language: Language): string => {
  const templateIdsDev = {
    zh_hant: "d-ead2168972df477ca329d3c1e9ba2ca8",
    zh_hans: "d-78b94f4b29d7437ba2db8802f2aac587",
    en: "d-b5f06dcfc0984953b0b8f6fbf38d7b25",
  };
  const templateIdsProd = {
    zh_hant: "d-4d4b3b0535a444e983631fdac6e4316c",
    zh_hans: "d-3a7aa2ff240e4a7e8275b371a3aabf51",
    en: "d-b5f06dcfc0984953b0b8f6fbf38d7b25",
  };
  const templateIds = isProd ? templateIdsProd : templateIdsDev;
  return templateIds[language];
};

const getBadgeName = (
  language: Language,
  newLevel: NomadBadgeLevel
): string => {
  switch (language) {
    case "en":
      return newLevel >= 4
        ? "Firebolt"
        : newLevel >= 3
        ? "Nimbus Ferry"
        : newLevel >= 2
        ? "Meteor Canoe"
        : "Moonlight Dream";
    case "zh_hans":
      return newLevel >= 4
        ? "火閃電"
        : newLevel >= 3
        ? "光輪號"
        : newLevel >= 2
        ? "流星號"
        : "月之夢";
    case "zh_hant":
    default:
      return newLevel >= 4
        ? "火閃電"
        : newLevel >= 3
        ? "光輪號"
        : newLevel >= 2
        ? "流星號"
        : "月之夢";
  }
};

const getNoticeMessage = (
  language: Language,
  newLevel: NomadBadgeLevel
): string => {
  switch (language) {
    case "en":
      return newLevel >= 4
        ? "You've successfully invited 20 friends to join the Nomad Matters, an achievement attained by very few. Your badge has now been upgraded to the highest level,  Firebolt! Showcase your badge to the community."
        : newLevel >= 3
        ? "Impressive! You've invited 10 friends on the Nomad's path. The Level 3 Nimbus Ferry badge has flown to your creative profile. Invite another 10 companions to journey together towards the final destination, where the highest level of honor awaits you. Click to view Nomad Matters and invitation procedures"
        : newLevel >= 2
        ? "You have successfully invited 5 friends to follow the Nomad Matters and upgraded to the Level 2 Meteor Canoe badge. Invite five more to continue leveling up! Click to view Nomad Matters and invitation procedures"
        : "Congratulations on earning the Nomad Matters Level 1 Moon Dream badge! It's now displayed on your creative profile. Next, invite 5 friends to register and participate in the Nomad Matters, and you'll receive an even higher-level badge. Click to view Nomad Matters and invitation procedures";
    case "zh_hans":
      return newLevel >= 4
        ? "你成功邀请了 20 位朋友参与游牧者计划，这是极少数人才能达到的成就，徽章已升级为最高等级火闪电！向社区展示你的徽章吧！"
        : newLevel >= 3
        ? "你在游牧者之路邀请了 10 位朋友，太厉害了！LV3 光轮号徽章已经飞到了你的创作主页。再邀请 10 位同行者，一起迈向终点站，最高等级的荣誉正在等着你。点击查看游牧者计划及邀请方式"
        : newLevel >= 2
        ? "你已成功邀请 5 位朋友关注游牧者计划，并升级为 LV2 流星号徽章，接下来再邀请五位就能继续升级！点击查看游牧者计划及邀请方式"
        : "恭喜你获得游牧者计划 LV1 月之梦徽章，已经展示在你的创作主页啰！接下来邀请 5 位朋友注册并参与游牧者计划，你将获得更高等级的徽章。点击查看游牧者计划及邀请方式";
    case "zh_hant":
    default:
      return newLevel >= 4
        ? "你成功邀請了 20 位朋友參與遊牧者計畫，這是極少數人才能達到的成就，徽章已升級為最高等級火閃電！向社區展示你的徽章吧！"
        : newLevel >= 3
        ? "你在遊牧者之路邀請了 10 位朋友，太厲害了！LV3 光輪號徽章已經飛到了你的創作主頁。再邀請 10 位同行者，一起邁向終點站，最高等級的榮譽正在等著你。點擊查看遊牧者計畫及邀請方式"
        : newLevel >= 2
        ? "你已成功邀請 5 位朋友關注遊牧者計畫，並升級為 LV2 流星號徽章，接下來再邀請五位就能繼續升級！點擊查看遊牧者計畫及邀請方式"
        : "恭喜你獲得遊牧者計畫 LV1 月之夢徽章，已經展示在你的創作主頁囉！接下來邀請 5 位朋友註冊並參與遊牧者計畫，你將獲得更高等級的徽章。點擊查看遊牧者計畫及邀請方式";
  }
};

const getSubject = (language: Language, newLevel: NomadBadgeLevel): string => {
  switch (language) {
    case "en":
      return newLevel >= 4
        ? "You have earned the highest honor of Firebolt badge in Nomad Matters!"
        : newLevel >= 3
        ? "You have earned Level 3 Nimbus Ferry badge in Nomad Matters!"
        : newLevel >= 2
        ? "You have earned Level 2 Meteor Canoe badge in Nomad Matters!"
        : "You have earned Level 1 Moonlight Dream badge in Nomad Matters!";
    case "zh_hans":
      return newLevel >= 4
        ? "感谢参与游牧者计划，你已经升级并获得最高荣誉「火闪电」徽章！ "
        : newLevel >= 3
        ? "感谢参与游牧者计划，你已经升级并获得「光轮号」徽章！ "
        : newLevel >= 2
        ? "感谢参与游牧者计划，你已经升级并获得「流星号」徽章！ "
        : "感谢参与游牧者计划，你已经升级并获得「月之梦」徽章！ ";
    case "zh_hant":
    default:
      return newLevel >= 4
        ? "感謝參與遊牧者計畫，你已經升級並獲得最高榮譽「火閃電」徽章！"
        : newLevel >= 3
        ? "感謝參與遊牧者計畫，你已經升級並獲得「光輪號」徽章！"
        : newLevel >= 2
        ? "感謝參與遊牧者計畫，你已經升級並獲得「流星號」徽章！"
        : "感謝參與遊牧者計畫，你已經升級並獲得「月之夢」徽章！";
  }
};

async function notifyNomadBadge(
  newNomadBadgedUsers: Array<{
    userId: number;
    userName: string;
    displayName: string;
    email: string;
    language: Language;
  }>,
  newLevel: NomadBadgeLevel,
  doNotify = false
) {
  if (!doNotify) return;

  const allNotices = newNomadBadgedUsers.map(
    ({ userId, language, ...rest }) => ({
      userId, // language,
      message: getNoticeMessage(language, newLevel),
      // noticeId: undefined as number | string | undefined,
      // ...rest,
    })
  );
  const allMessages = Array.from(
    new Set(allNotices.map(({ message }) => message))
  );
  const messageIds = await sql<
    Array<{ id: number | string; noticeType: string; message: string }>
  >`SELECT * FROM notice_detail WHERE created_at>=CURRENT_DATE -'1 week'::interval AND notice_type='official_announcement' AND message=ANY(${allMessages}) ;`;
  const messageIdsMap = new Map(
    messageIds.map(({ id, message }) => [message, id])
  );
  console.log(`got existings messageIds:`, messageIdsMap);

  if (messageIdsMap.size < allMessages.length) {
    const missingOnes = allMessages.filter((msg) => !messageIdsMap.has(msg));
    const newInserted =
      await sqlSIW`INSERT INTO notice_detail(notice_type, message, data) SELECT * FROM UNNEST(
    ${sqlSIW.array(
      missingOnes.map(() => "official_announcement"),
      ARRAY_TYPE
    )} ::text[],
    ${sqlSIW.array(
      missingOnes, // all missing messages
      ARRAY_TYPE
    )} ::text[],
    ${sqlSIW.array(
      missingOnes.map(() =>
        newLevel <= 3 // only Lv1, Lv2, Lv3 need link on message
          ? JSON.stringify({
              link: isProd
                ? "/@hi176/476404"
                : "/@rsdyobw/22048-launching-the-nomad-matters-initiative",
            })
          : null
      ), // all missing messages
      ARRAY_TYPE
    )} ::jsonb[]
) RETURNING * ;`;

    console.log(`got new inserted messageIds:`, newInserted);
    newInserted.forEach(({ id, message }) => messageIdsMap.set(message, id));
  }

  console.log(`got all messageIds:`, messageIdsMap);

  const retNewNotices = await sqlSIW`-- insert new notices;
WITH new_notices AS (
  INSERT INTO notice(uuid, notice_detail_id, recipient_id)
  SELECT * FROM UNNEST(
      ${sqlSIW.array(
        allNotices.map(() => crypto.randomUUID()),
        ARRAY_TYPE
      )} ::uuid[],
      ${sqlSIW.array(
        allNotices.map(({ message }) => messageIdsMap.get(message)!), // notice_detail_id,
        ARRAY_TYPE
      )} ::int[],
      ${sqlSIW.array(
        allNotices.map(({ userId }) => userId), // recipient_id
        ARRAY_TYPE
      )} ::int[]
  )
  ON CONFLICT (uuid) DO NOTHING
  RETURNING *
)

SELECT nn.*,
  user_name, display_name, state, u.created_at AS user_created_at,
  notice_type, message, data AS notice_data
FROM new_notices nn
LEFT JOIN notice_detail ON notice_detail_id=notice_detail.id
LEFT JOIN public.user u ON recipient_id=u.id
-- WHERE u.state IN ('active') -- NOT IN ('archived', 'banned', 'frozen')
ORDER BY nn.id DESC ;`;

  console.log(`got all retNewNotices:`, retNewNotices);
}

async function sendNomadBadgeMail(
  newNomadBadgedUsers: Array<{
    // userId: number; type: string; extra: any;
    userName: string;
    displayName: string;
    email: string;
    language: Language;
    // newLevel: NomadBadgeLevel;
  }>,
  newLevel: NomadBadgeLevel,
  doSendMail = false
) {
  if (!doSendMail) return;

  return Promise.allSettled(
    newNomadBadgedUsers.map(({ userName, displayName, email, language }) => {
      const shareLink = `${siteDomain}/@${userName}?dialog=nomad-badge`;

      console.log(`send mail notification to:`, {
        userName,
        displayName,
        email,
        language,
        newLevel,
        shareLink,
      });

      if (!email) {
        return; // can't send if no email
      }

      return mail
        .send({
          from: EMAIL_FROM_ASK,
          templateId: getTemplateId(language),
          personalizations: [
            {
              to: email,
              dynamicTemplateData: {
                subject: getSubject(language, newLevel),
                displayName,
                siteDomain,
                shareLink,
                newLevel,
                campaignLink: isProd
                  ? `${siteDomain}/@hi176/476404`
                  : `${siteDomain}/@rsdyobw/22048-launching-the-nomad-matters-initiative`,
                // campaignLink: "${siteDomain}/@rsdyobw/22048-launching-the-nomad-matters-initiative?utm_source=share_copy&referral=nrux",
                // recipient, type,
              },
            },
          ],
        })
        .then((res: any) => console.log(`mail "${email}" res:`, res))
        .catch((err: Error) => console.error(`mail "${email}" ERROR:`, err));
    })
  );
}

const delay = (timeout: number) =>
  new Promise((fulfilled) => setTimeout(fulfilled, timeout));
