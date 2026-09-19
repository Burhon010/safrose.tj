const TOKEN_KEY = 'safrose-admin-token'
const CACHE_KEY = 'safrose-content'

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export const setToken = (t) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable */
  }
}

export const readCache = () => {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY))
    return c && Array.isArray(c.products) ? c : null
  } catch {
    return null
  }
}

export const writeCache = (c) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c))
  } catch {
    /* storage unavailable */
  }
}

async function call(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {}
  if (body !== undefined) headers['content-type'] = 'application/json'
  if (auth) headers.authorization = `Bearer ${getToken() || ''}`
  const res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  let data = null
  try {
    data = await res.json()
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const err = new Error(data?.error || `http ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

export const fetchContent = () => call('/api/content')
export const saveContent = (content) => call('/api/content', { method: 'PUT', body: content, auth: true })
export const login = (password) => call('/api/login', { method: 'POST', body: { password } })
export const changePassword = (current, next) =>
  call('/api/password', { method: 'POST', body: { current, next }, auth: true })
export const uploadImage = (dataUrl) => call('/api/upload', { method: 'POST', body: { dataUrl }, auth: true })
