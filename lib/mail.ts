import { MailDataRequired } from "@sendgrid/helpers/classes/mail";
import sgMail from "@sendgrid/mail";

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
    if (bcc) {
      params.personalizations = (params.personalizations as any).map(
        (i: any) => ({
          bcc,
          ...i,
        })
      );
    }
    console.log(params);
    await this.mail.send({
      mailSettings: {
        bypassListManagement: { enable: true },
      },
      ...params,
    });
  };
}
