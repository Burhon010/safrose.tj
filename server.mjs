import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { handle } from './lib/handlers.js'

// Local secrets (not committed): KEY=VALUE lines in .env.local
try {
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]
  }
} catch {
  /* no .env.local */
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist')
const port = Number(process.env.PORT || 4173)
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
}

const readBody = (req) =>
  new Promise((resolve) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size < 6 * 1024 * 1024) chunks.push(c)
    })
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : undefined)
      } catch {
        resolve(undefined)
      }
    })
  })

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x')
    if (url.pathname.startsWith('/api/')) {
      const name = url.pathname.slice(5)
      const body = req.method === 'GET' ? undefined : await readBody(req)
      const out = await handle(name, {
        method: req.method,
        query: Object.fromEntries(url.searchParams),
        body,
        headers: req.headers,
      })
      res.writeHead(out.status, out.headers)
      res.end(out.body)
      return
    }
    let file = path.join(root, decodeURIComponent(url.pathname))
    if (!file.startsWith(root)) file = root
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html')
    res.writeHead(200, {
      'content-type': MIME[path.extname(file)] || 'application/octet-stream',
      'cache-control': file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
    })
    fs.createReadStream(file).pipe(res)
  })
  .listen(port, '0.0.0.0', () => console.log('safrose server on', port))
