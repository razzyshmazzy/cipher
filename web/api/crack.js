// Vercel serverless function: GET /api/crack?message=... or POST {"message": "..."}.
import { crack } from "../lib/solver.js";

export default function handler(req, res) {
  let message;
  if (req.method === "GET") {
    message = req.query.message ?? "";
  } else if (req.method === "POST") {
    message = (req.body && req.body.message) ?? "";
  } else {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  if (typeof message !== "string") {
    res.status(400).json({ error: "message must be a string" });
    return;
  }

  res.status(200).json(crack(message));
}
