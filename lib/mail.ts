import { MailDataRequired } from "@sendgrid/helpers/classes/mail";
import sgMail from "@sendgrid/mail";

const isTest = process.env.MATTERS_ENV === "test";
const bcc = process.env.MATTERS_SENDGRID_BCC_MAIL_ADDRESS;
const sgKey = process.env.MATTERS_SENDGRID_API_KEY || "";

export class Mail {
  mail: typeof sgMail;

  constructor() {
    this.mail = this.__setup(sgKey);
  }

  __setup = (apiKey: string) => {
    sgMail.setApiKey(apiKey);
    return sgMail;
  };

  send = async (params: MailDataRequired) => {
    if (isTest) {
      console.dir(params, {depth: null});
      return;
    }
    if (bcc) {
      params.personalizations = (params.personalizations as any).map(
        (i: any) => ({
          bcc,
          ...i,
        })
      );
    }
    await this.mail.send({
      mailSettings: {
        bypassListManagement: { enable: true },
      },
      ...params,
    });
  };
}
