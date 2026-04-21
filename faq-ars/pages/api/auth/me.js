// pages/api/auth/me.js
import { getUserFromRequest } from "../../../lib/auth";
export default function handler(req, res) {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  return res.status(200).json({ user: { id: user.id, email: user.email, name: user.name } });
}
