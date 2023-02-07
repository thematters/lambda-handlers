import { sql } from "../db.js";

export const markUserState = async (
  userId: string,
  state: "NORMAL" | "ALERT" | "INACTIVE"
) => {
  await sql`INSERT INTO user_retention_history (user_id, state) VALUES (${userId}, ${state});`;
};
