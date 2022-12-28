import { MailDataRequired } from "@sendgrid/helpers/classes/mail";
import sgMail from "@sendgrid/mail";

export class Mail {
  mail: typeof sgMail;

  constructor(apiKey: string) {
    this.mail = this.__setup(apiKey);
  }

  __setup = (apiKey: string) => {
    sgMail.setApiKey(apiKey);
    return sgMail;
  };

  send = async (params: MailDataRequired) => {
    // @ts-ignore
    console.log(params.personalizations[0].dynamic_template_data)
    await this.mail.send({
      mailSettings: {
        bypassListManagement: { enable: true },
      },
      ...params,
    });
  };
}
