import { handle } from './handlers.js'

export const vercelHandler = (name) => async (req, res) => {
  const out = await handle(name, { method: req.method, query: req.query || {}, body: req.body, headers: req.headers })
  res.status(out.status)
  for (const [k, v] of Object.entries(out.headers || {})) res.setHeader(k, v)
  res.end(out.body)
}
