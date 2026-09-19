import crypto from 'node:crypto'
import { store } from './store.js'
import { DEFAULT_CONTENT } from '../src/content.default.js'

const TTL = 7 * 24 * 3600 * 1000
const MAX_IMG = 900 * 1024

const json = (status, obj) => ({
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  body: JSON.stringify(obj),
})
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getSecret() {
  let s = await store.get('secret')
  if (!s) {
    s = crypto.randomBytes(32).toString('hex')
    await store.set('secret', s)
  }
  return s
}

const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex')

// The first admin password comes from the ADMIN_PASSWORD environment variable.
// It is hashed and stored on first use; after that the admin panel manages it.
// Without a stored hash and without the variable nobody can log in.
async function passRecord() {
  const raw = await store.get('pass')
  if (raw) return JSON.parse(raw)
  const initial = process.env.ADMIN_PASSWORD?.trim()
  if (!initial) return null
  const salt = crypto.randomBytes(16).toString('hex')
  const rec = { salt, hash: hashPw(initial, salt) }
  await store.set('pass', JSON.stringify(rec))
  return rec
}

async function checkPassword(pw) {
  if (typeof pw !== 'string' || pw.length > 200) return false
  const rec = await passRecord()
  if (!rec) return false
  const a = Buffer.from(hashPw(pw, rec.salt), 'hex')
  const b = Buffer.from(rec.hash, 'hex')
  return crypto.timingSafeEqual(a, b)
}

async function sign(exp) {
  const secret = await getSecret()
  return `${exp}.${crypto.createHmac('sha256', secret).update(String(exp)).digest('base64url')}`
}

async function isAuthed(headers) {
  const h = headers?.authorization || headers?.Authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : ''
  const [exp] = token.split('.')
  if (!exp || Number(exp) < Date.now()) return false
  const good = await sign(exp)
  const a = Buffer.from(token)
  const b = Buffer.from(good)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '')

function sanitizeInfo(i = {}) {
  return {
    tags: Array.isArray(i.tags) ? i.tags.map((t) => str(t, 200).trim()).filter(Boolean).slice(0, 12) : [],
    head: str(i.head, 200),
    body: str(i.body, 8000),
    contra: str(i.contra, 1000),
    usage: str(i.usage, 1000),
  }
}

function sanitizePart(p = {}) {
  return { name: str(p.name, 200), text: str(p.text, 600), info: sanitizeInfo(p.info) }
}

function sanitizeContent(c) {
  if (!c || !Array.isArray(c.products)) return null
  const seen = new Set()
  const products = []
  for (const p of c.products.slice(0, 40)) {
    let id = str(p.id, 40).replace(/[^a-zA-Z0-9_-]/g, '')
    if (!id || seen.has(id)) id = 'p' + crypto.randomBytes(4).toString('hex')
    seen.add(id)
    products.push({
      id,
      hidden: Boolean(p.hidden),
      img: str(p.img, 300),
      tone: str(p.tone, 20).replace(/[^a-z]/g, '') || 'new',
      en: str(p.en, 200),
      ru: sanitizePart(p.ru),
      tj: sanitizePart(p.tj),
    })
  }
  const ct = c.contacts || {}
  return {
    contacts: {
      phone: str(ct.phone, 40),
      instagram: str(ct.instagram, 300),
      address: { ru: str(ct.address?.ru, 300), tj: str(ct.address?.tj, 300) },
    },
    products,
  }
}

async function getContent() {
  const raw = await store.get('content')
  if (raw) {
    try {
      return JSON.parse(raw)
    } catch {
      /* fall through to default */
    }
  }
  return DEFAULT_CONTENT
}

export async function handle(name, { method, query = {}, body, headers = {} }) {
  try {
    if (name === 'content') {
      if (method === 'GET') {
        return { ...json(200, await getContent()), headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-cache' } }
      }
      if (method === 'PUT') {
        if (!(await isAuthed(headers))) return json(401, { error: 'unauthorized' })
        if (!store.persistent) return json(503, { error: 'no storage' })
        const clean = sanitizeContent(body)
        if (!clean) return json(400, { error: 'bad content' })
        await store.set('content', JSON.stringify(clean))
        return json(200, clean)
      }
    }

    if (name === 'login' && method === 'POST') {
      if (await checkPassword(body?.password)) {
        return json(200, { token: await sign(Date.now() + TTL) })
      }
      await sleep(700)
      return json(401, { error: 'wrong password' })
    }

    if (name === 'password' && method === 'POST') {
      if (!(await isAuthed(headers))) return json(401, { error: 'unauthorized' })
      if (!store.persistent) return json(503, { error: 'no storage' })
      if (!(await checkPassword(body?.current))) {
        await sleep(700)
        return json(403, { error: 'wrong current' })
      }
      const next = body?.next
      if (typeof next !== 'string' || next.length < 6 || next.length > 100) {
        return json(400, { error: 'weak password' })
      }
      const salt = crypto.randomBytes(16).toString('hex')
      await store.set('pass', JSON.stringify({ salt, hash: hashPw(next, salt) }))
      await store.set('secret', crypto.randomBytes(32).toString('hex'))
      return json(200, { token: await sign(Date.now() + TTL) })
    }

    if (name === 'upload' && method === 'POST') {
      if (!(await isAuthed(headers))) return json(401, { error: 'unauthorized' })
      if (!store.persistent) return json(503, { error: 'no storage' })
      const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(body?.dataUrl || '')
      if (!m) return json(400, { error: 'bad image' })
      if (Buffer.byteLength(m[2], 'base64') > MAX_IMG) return json(413, { error: 'image too large' })
      const id = crypto.randomBytes(8).toString('hex')
      await store.set('img:' + id, JSON.stringify({ type: m[1], b64: m[2] }))
      return json(200, { url: `/api/img?id=${id}` })
    }

    if (name === 'img' && method === 'GET') {
      const id = String(query.id || '').replace(/[^a-f0-9]/g, '')
      const raw = id && (await store.get('img:' + id))
      if (!raw) return json(404, { error: 'not found' })
      const { type, b64 } = JSON.parse(raw)
      return {
        status: 200,
        headers: { 'content-type': type, 'cache-control': 'public, max-age=31536000, immutable' },
        body: Buffer.from(b64, 'base64'),
      }
    }

    return json(404, { error: 'not found' })
  } catch (e) {
    return json(500, { error: 'server error', detail: String(e?.message || e) })
  }
}
