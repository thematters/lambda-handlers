import { Mail } from "../lib/mail.js";

const sgKey = process.env.SENDGRID_API_KEY || "";

const mail = new Mail(sgKey)

export const handler = async (
  event: any,
) => {
  console.log(event)
};
