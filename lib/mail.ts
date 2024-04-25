import { MailDataRequired } from '@sendgrid/helpers/classes/mail'
import sgMail from '@sendgrid/mail'

const isTest = process.env.MATTERS_ENV === 'test'
const isDev = process.env.MATTERS_ENV === 'develop'
const bcc = process.env.MATTERS_SENDGRID_BCC_MAIL_ADDRESS
const sgKey = process.env.MATTERS_SENDGRID_API_KEY || ''

const TEST_EMAIL_ADDRESS = 'developer@matters.town'

export class Mail {
  mail: typeof sgMail

  constructor() {
    this.mail = this.__setup(sgKey)
  }

  __setup = (apiKey: string) => {
    sgMail.setApiKey(apiKey)
    return sgMail
  }

  send = async (params: MailDataRequired) => {
    if (isTest) {
      console.dir(params, { depth: null })
      return
    }
    if (isDev) {
      params.personalizations = (params.personalizations as any).map(
        (i: any) => ({
          ...i,
          to: TEST_EMAIL_ADDRESS,
        })
      )
    }
    if (bcc) {
      params.personalizations = (params.personalizations as any).map(
        (i: any) => ({
          bcc,
          ...i,
        })
      )
    }
    await this.mail.send({
      mailSettings: {
        bypassListManagement: { enable: true },
      },
      ...params,
    })
  }
}
