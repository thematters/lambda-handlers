import { WebClient } from '@slack/web-api'

const mattersEnv = process.env.MATTERS_ENV || ''
const slackToken = process.env.MATTERS_SLACK_TOKEN || ''
const slackStripeAlertChannel =
  process.env.MATTERS_SLACK_STRIPE_ALERT_CHANNEL || ''

export enum SLACK_MESSAGE_STATE {
  canceled = 'canceled',
  failed = 'failed',
  successful = 'successful',
}

export class Slack {
  client: WebClient

  constructor() {
    this.client = new WebClient(slackToken)
  }

  sendStripeAlert = async ({
    data,
    message,
    state = SLACK_MESSAGE_STATE.failed,
  }: {
    data?: Record<string, any> | null
    message: string
    state?: SLACK_MESSAGE_STATE
  }) => {
    await this.client.chat.postMessage({
      channel: slackStripeAlertChannel,
      text: `[${mattersEnv}] - Alert`,
      attachments: [
        {
          color: this.getMessageColor(state),
          text:
            '\n' +
            `\n- *Message*: ${message}` +
            `\n- *Data*: ${JSON.stringify(data || {})}`,
        },
      ],
      markdownn: true,
    })
  }

  private getMessageColor = (state: SLACK_MESSAGE_STATE) => {
    switch (state) {
      case SLACK_MESSAGE_STATE.successful:
        return '#27ffc9'
      case SLACK_MESSAGE_STATE.failed:
        return '#ff275d'
      default:
        return '#ffc927'
    }
  }
}
