import type { User } from "../types";
import { uniqBy } from "lodash";
import { Knex } from "knex";

import { pgKnex } from "../db.js";
import { DB_NOTICE_TYPE } from "./enum.js";
import { DAY } from "../constants/index.js";

export type DBNoticeType = keyof typeof DB_NOTICE_TYPE;

type NoticeEntityType =
  // primary target
  | "target"
  // secondary target
  | "comment"
  | "reply"
  | "collection"
  | "tag"
  | "article"
  | "circle";

type NoticeMessage = string;

type NoticeData = {
  // used by official annoncement notices
  url?: string;
  // reason for banned/frozen users, not in used
  reason?: string;

  // usde by circle new bundled notices
  comments?: string[];
  replies?: string[];
  mentions?: string[];
};

type NoticeEntity = {
  type: NoticeEntityType;
  table: string;
  entityId: string;
};

type NoticeEntitiesMap = Record<NoticeEntityType, any>;

type NoticeDetail = {
  id: string;
  unread: boolean;
  deleted: boolean;
  updatedAt: Date;
  noticeType: DBNoticeType;
  message?: NoticeMessage;
  data?: NoticeData;
};

export type NoticeItem = NoticeDetail & {
  createdAt: Date;
  type: DBNoticeType;
  actors?: User[];
  entities?: NoticeEntitiesMap;
};

export class Notice {
  knex: Knex;

  constructor() {
    this.knex = pgKnex;
  }

  /**
   * Find notices with detail
   */
  findDetail = async ({
    where,
    whereIn,
    skip,
    take,
  }: {
    where?: any[][];
    whereIn?: [string, any[]];
    skip?: number;
    take?: number;
  }): Promise<NoticeDetail[]> => {
    const query = this.knex
      .select([
        "notice.id",
        "notice.unread",
        "notice.deleted",
        "notice.updated_at",
        "notice_detail.notice_type",
        "notice_detail.message",
        "notice_detail.data",
      ])
      .from("notice")
      .innerJoin(
        "notice_detail",
        "notice.notice_detail_id",
        "=",
        "notice_detail.id"
      )
      .orderBy("updated_at", "desc")
      .whereIn("notice_detail.notice_type", Object.values(DB_NOTICE_TYPE));

    if (where) {
      where.forEach((w) => {
        query.where(w[0], w[1], w[2]);
      });
    }

    if (whereIn) {
      query.whereIn(...whereIn);
    }

    if (skip) {
      query.offset(skip);
    }

    if (take || take === 0) {
      query.limit(take);
    }

    const result = await query;

    return result;
  };

  /**
   * Find notice entities by a given notice id
   */
  findEntities = async (noticeId: string): Promise<NoticeEntitiesMap> => {
    const entities = await this.knex
      .select([
        "notice_entity.type",
        "notice_entity.entity_id",
        "entity_type.table",
      ])
      .from("notice_entity")
      .innerJoin(
        "entity_type",
        "entity_type.id",
        "=",
        "notice_entity.entity_type_id"
      )
      .where({ noticeId });

    const _entities = {} as any;

    await Promise.all(
      entities.map(async ({ type, entityId, table }: any) => {
        const entity = await this.knex
          .select()
          .from(table)
          .where({ id: entityId })
          .first();

        _entities[type] = entity;
      })
    );

    return _entities;
  };

  /**
   * Find notice actors by a given notice id
   */
  findActors = async (
    noticeId: string
  ): Promise<Array<User & { noticeActorCreatedAt: string }>> => {
    const actors = await this.knex
      .select("user.*", "notice_actor.created_at as noticeActorCreatedAt")
      .from("notice_actor")
      .innerJoin("user", "notice_actor.actor_id", "=", "user.id")
      .where({ noticeId });
    return actors;
  };

  findDailySummaryUsers = async (): Promise<User[]> => {
    const recipients = await this.knex("notice")
      .select("user.*")
      .where({
        unread: true,
        deleted: false,
        "user_notify_setting.enable": true,
        "user_notify_setting.email": true,
      })
      .where(
        "notice.updated_at",
        ">=",
        this.knex.raw(`now() -  interval '1 days'`)
      )
      .join("user", "user.id", "recipient_id")
      .join(
        "user_notify_setting",
        "user_notify_setting.user_id",
        "recipient_id"
      )
      .groupBy("user.id");

    return recipients;
  };

  findDailySummaryNoticesByUser = async (
    userId: string
  ): Promise<NoticeItem[]> => {
    const validNoticeTypes: DBNoticeType[] = [
      DB_NOTICE_TYPE.user_new_follower,
      DB_NOTICE_TYPE.article_new_collected,
      DB_NOTICE_TYPE.article_new_appreciation,
      DB_NOTICE_TYPE.article_new_subscriber,
      DB_NOTICE_TYPE.article_new_comment,
      DB_NOTICE_TYPE.article_mentioned_you,
      DB_NOTICE_TYPE.comment_new_reply,
      DB_NOTICE_TYPE.comment_mentioned_you,
    ];
    const noticeDetails = await this.findDetail({
      where: [
        [{ recipientId: userId, deleted: false, unread: true }],
        [
          "notice.updated_at",
          ">=",
          this.knex.raw(`now() -  interval '1 days'`),
        ],
      ],
      whereIn: ["notice_detail.notice_type", validNoticeTypes],
    });

    const notices = await Promise.all(
      noticeDetails.map(async (n: NoticeDetail) => {
        const entities = (await this.findEntities(n.id)) as NoticeEntitiesMap;
        const actors = (await this.findActors(n.id)).filter(
          (actor) =>
            new Date(actor.noticeActorCreatedAt) >=
            new Date(Date.now() - DAY * 1)
        );

        return {
          ...n,
          createdAt: n.updatedAt,
          type: n.noticeType,
          actors,
          entities,
        };
      })
    );

    const uniqNotices = uniqBy(notices, (n) => {
      const actors = n.actors.map(({ id }) => id).join("");
      const entities = `${n?.entities?.target?.id || ""}`;
      const uniqId = `type:${n.type}::actors:${actors}::entities:${entities}`;

      return uniqId;
    });

    return uniqNotices;
  };
}
