import { sql } from "../../lib/db.js";

export const sendmail= async(userId: String, lastSeen: Date, type: 'NEWUSER'|'ACTIVE') => {
  console.log({userId})
}
