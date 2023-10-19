import { BetaAnalyticsDataClient } from "@google-analytics/data";

import { pgKnexRO as knexRO, pgKnex as knex } from "./db.js";

const propertyId = process.env.MATTERS_GA4_PROPERTY_ID;

const analyticsDataClient = new BetaAnalyticsDataClient();

interface Row {
  path: string;
  totalUsers: string;
}

interface MergedData {
  [key: string]: number;
}

export const fetchGA4Data = async ({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}): Promise<Row[]> => {
  const limit = 10000;
  let offset = 0;
  const result: Row[] = [];
  while (true) {
    const res = await request({ startDate, endDate, limit, offset });
    result.push(...res);
    offset += limit;
    if (res.length < limit) {
      break;
    }
  }
  return result;
};

export const saveGA4Data = async (
  data: MergedData,
  { startDate, endDate }: { startDate: string; endDate: string }
) => {
  const rows = Object.entries(data).map(([id, totalUsers]) => ({
    articleId: id,
    totalUsers,
    dateRange: `[${startDate}, ${endDate}]`,
  }));
  const table = "article_ga4_data";
  const updateRows = [];
  const insertRows = [];
  for (const { articleId, dateRange, totalUsers } of rows) {
    const res = await knexRO(table)
      .where({ articleId, dateRange })
      .select("id", "totalUsers")
      .first();
    if (res && res.totalUsers) {
      if (res.totalUsers !== String(totalUsers)) {
        // only update when totalUsers is different
        updateRows.push({ id: res.id, totalUsers });
      }
    } else {
      insertRows.push({ articleId, dateRange, totalUsers });
    }
  }
  if (updateRows.length > 0) {
    for (const { id, totalUsers } of updateRows) {
      await knex(table).update({ totalUsers }).where({ id: id });
    }
  }
  if (insertRows.length > 0) {
    await knex(table).insert(insertRows);
  }
};

export const convertAndMerge = async (rows: Row[]): Promise<MergedData> => {
  const converted = Promise.all(
    rows.map(async (row) => ({
      id: await pathToId(row.path),
      totalUsers: parseInt(row.totalUsers, 10),
    }))
  );
  const res: MergedData = {};
  for (const row of await converted) {
    if (row.id in res) {
      res[row.id] += row.totalUsers;
    } else {
      res[row.id] = row.totalUsers;
    }
  }
  return res;
};

const pathToId = async (path: string) => {
  const [_, __, articlePath] = path.split("/");
  if (articlePath) {
    const parts = articlePath.split("-");
    const idLike = parts[0];
    const hash = parts[parts.length - 1];
    if (!isNaN(parseInt(idLike))) {
      return idLike;
    } else {
      return hashToId(hash);
    }
  }
};

const hashToId = async (hash: string) => {
  const res = await knexRO("article")
    .where({ mediaHash: hash })
    .select("id")
    .first();
  if (res) {
    return res.id;
  } else {
    return null;
  }
};

// https://developers.google.com/analytics/devguides/reporting/data/v1
const request = async ({
  startDate,
  endDate,
  limit,
  offset,
}: {
  startDate: string;
  endDate: string;
  limit: number;
  offset: number;
}): Promise<Row[]> => {
  const [response] = await analyticsDataClient.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate,
        endDate,
      },
    ],
    dimensions: [
      {
        name: "pagePath",
      },
    ],
    dimensionFilter: {
      filter: {
        fieldName: "pagePath",
        stringFilter: {
          matchType: "BEGINS_WITH",
          value: "/@",
        },
      },
    },
    metrics: [
      {
        name: "totalUsers",
        //name: 'activeUsers',
      },
    ],
    limit,
    offset,
    returnPropertyQuota: true,
  });
  if (response && response.rows) {
    console.log(response.propertyQuota);
    console.log(`total rows count: ${response.rowCount}`);
    return response.rows.map((row) => ({
      path: (row.dimensionValues && row.dimensionValues[0].value) ?? "",
      totalUsers: (row.metricValues && row.metricValues[0].value) ?? "0",
    }));
  } else {
    throw new Error("No response received.");
  }
};
