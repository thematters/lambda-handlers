import crypto from 'crypto'

export const genMD5 = (content: string) =>
  crypto.createHash('md5').update(content).digest('hex')
