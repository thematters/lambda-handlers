/*global fetch*/

const accountId = process.env.MATTERS_CLOUDFLARE_ACCOUNT_ID;
const token = process.env.MATTERS_CLOUDFLARE_API_TOKEN;
const alertThreshold =
  +process.env.MATTERS_CLOUDFLARE_IMAGE_ALERT_THRESHOLD || 100e3; // 100k
const slackWebhook = process.env.MATTERS_SLACK_WEBHOOK;

const getRemainingCapacity = async (accountId, token) => {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/stats`,
    { headers }
  );
  if (res.ok) {
    const data = await res.json();
    if (data.success == true) {
      return data.result.count.allowed - data.result.count.current;
    } else {
      throw new Error(
        `Cloudflare Image API error! message: ${data.errors[0].message}`
      );
    }
  } else {
    throw new Error(`Cloudflare Image API HTTP error! status: ${res.status}`);
  }
};

const notifySlack = async (message, slackWebhook) => {
  const data = {
    text: "<@channel> [cloudflare-image] - Alert",
    attachments: [
      {
        color: "#ff275d",
        text: "\n" + `\n- *Message*: ${message}`,
      },
    ],
    markdown: true,
  };
  const res = await fetch(slackWebhook, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Slack webhook HTTP error! status: ${res.status}`);
  }
};

export const handler = async () => {
  try {
    const remainingCapacity = await getRemainingCapacity(accountId, token);
    if (remainingCapacity < alertThreshold) {
      const msg = `Remaining capacity is ${remainingCapacity}, less than ${alertThreshold}`;
      console.log(`${msg}, sending alert...`);
      await notifySlack(msg, slackWebhook);
    } else {
      console.log(
        `Remaining capacity is ${remainingCapacity}, no need to send alert.`
      );
    }
  } catch (error) {
    await notifySlack(error.message, slackWebhook);
  }
};
