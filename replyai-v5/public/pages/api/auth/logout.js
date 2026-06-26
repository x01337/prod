import { clearTokenCookie } from "../../../lib/auth";
export default function handler(req, res) {
  res.setHeader("Set-Cookie", clearTokenCookie());
  res.status(200).json({ ok: true });
}
