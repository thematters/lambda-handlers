import { BetaAnalyticsDataClient } from "@google-analytics/data";

const propertyId = process.env.MATTERS_GA4_PROPERTY_ID;
const projectId = process.env.MATTERS_GA4_PROJECT_ID;
const clientEmail = process.env.MATTERS_GA4_CLIENT_EMAIL;
const privateKey = process.env.MATTERS_GA4_PRIVATE_KEY || "";

const main = async () => {
  const startDate = "2023-11-21";
  const endDate = "2023-11-21";
  const client = new BetaAnalyticsDataClient({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    },
  });
  const [response] = await client.runReport({
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
          value: "/@hi176/464031",
        },
      },
    },
    metrics: [
      {
        name: "totalUsers",
        //name: 'activeUsers',
      },
    ],
    returnPropertyQuota: true,
  });
  console.dir(response.rows, { depth: null });
};

main();
