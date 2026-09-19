import fs from 'node:fs'
import path from 'node:path'

const URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
const useRedis = Boolean(URL && TOKEN)

async function redis(cmd) {
  const r = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(cmd),
  })
  const j = await r.json()
  if (j.error) throw new Error(j.error)
  return j.result
}

const FILE = path.join(process.env.SAFROSE_DATA || path.join(process.cwd(), 'data'), 'store.json')
let mem = null

function load() {
  if (mem) return mem
  try {
    mem = JSON.parse(fs.readFileSync(FILE, 'utf8'))
  } catch {
    mem = {}
  }
  return mem
}

function save() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true })
    fs.writeFileSync(FILE, JSON.stringify(mem))
  } catch {
    /* read-only filesystem: keep in memory only */
  }
}

export const store = {
  persistent: useRedis || !process.env.VERCEL,
  async get(key) {
    if (useRedis) return redis(['GET', key])
    return load()[key] ?? null
  },
  async set(key, value) {
    if (useRedis) {
      await redis(['SET', key, value])
      return
    }
    load()[key] = value
    save()
  },
}
