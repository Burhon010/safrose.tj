import { useEffect, useRef, useState } from 'react'
import { changePassword, getToken, login, saveContent, setToken, uploadImage } from './api.js'
import './Admin.css'

export function PasswordInput({ value, onChange, placeholder, autoFocus, autoComplete }) {
  const [show, setShow] = useState(false)
  return (
    <div className="pw">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        spellCheck="false"
      />
      <button type="button" className="pw__eye" onClick={() => setShow((v) => !v)} aria-pressed={show}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {show && <path d="M3 3l18 18" />}
        </svg>
        {show ? 'Скрыть' : 'Показать'}
      </button>
    </div>
  )
}

export function LoginModal({ onClose, onSuccess }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const submit = async (e) => {
    e.preventDefault()
    if (!pw || busy) return
    setBusy(true)
    setErr('')
    try {
      const { token } = await login(pw)
      setToken(token)
      onSuccess()
    } catch (ex) {
      setErr(ex.status === 401 ? 'Неверный пароль' : 'Не удалось войти. Попробуйте позже')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal__box" onSubmit={submit}>
        <button type="button" className="modal__x" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
        <h2>Вход для администратора</h2>
        <p className="modal__sub">Введите пароль, чтобы редактировать сайт</p>
        <PasswordInput value={pw} onChange={setPw} placeholder="Пароль" autoFocus autoComplete="current-password" />
        {err && <p className="err">{err}</p>}
        <button className="btn" disabled={busy || !pw}>
          {busy ? 'Проверяем…' : 'Войти'}
        </button>
      </form>
    </div>
  )
}

const NO_DB = 'На сервере не подключена база данных, изменения сохранить нельзя. Обратитесь к разработчику.'
const lines = (s) => s.split('\n')
const EMPTY_PART = () => ({ name: '', text: '', info: { tags: [], head: '', body: '', contra: '', usage: '' } })

function compress(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const max = 1000
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k)
      c.height = Math.round(img.height * k)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('bad image'))
    }
    img.src = url
  })
}

function Field({ label, children, hint }) {
  return (
    <label className="fld">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  )
}

function LangFields({ title, part, onChange }) {
  const set = (patch) => onChange({ ...part, ...patch })
  const setInfo = (patch) => onChange({ ...part, info: { ...part.info, ...patch } })
  return (
    <fieldset className="lang-box">
      <legend>{title}</legend>
      <Field label="Название">
        <input value={part.name} onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <Field label="Короткое описание на карточке">
        <textarea rows="2" value={part.text} onChange={(e) => set({ text: e.target.value })} />
      </Field>
      <div className="info-title">Польза и способ применения</div>
      <Field label="Теги" hint="Каждый тег с новой строки">
        <textarea rows="4" value={part.info.tags.join('\n')} onChange={(e) => setInfo({ tags: lines(e.target.value) })} />
      </Field>
      <Field label="Заголовок">
        <input value={part.info.head} onChange={(e) => setInfo({ head: e.target.value })} />
      </Field>
      <Field label="Описание" hint="Абзацы разделяйте пустой строкой">
        <textarea rows="6" value={part.info.body} onChange={(e) => setInfo({ body: e.target.value })} />
      </Field>
      <Field label="Противопоказания">
        <input value={part.info.contra} onChange={(e) => setInfo({ contra: e.target.value })} />
      </Field>
      <Field label="Способ применения">
        <input value={part.info.usage} onChange={(e) => setInfo({ usage: e.target.value })} />
      </Field>
    </fieldset>
  )
}

function ProductEditor({ product, onChange, onDone, onAuthLost }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const fileRef = useRef(null)
  const set = (patch) => onChange({ ...product, ...patch })

  const pick = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    setMsg('')
    try {
      const dataUrl = await compress(f)
      const { url } = await uploadImage(dataUrl)
      set({ img: url })
    } catch (ex) {
      if (ex.status === 401) onAuthLost()
      else setMsg(ex.status === 503 ? NO_DB : 'Не удалось загрузить фото')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="editor">
      <div className="editor__top">
        <button type="button" className="ghost" onClick={onDone}>
          ← К списку
        </button>
      </div>
      <div className="editor__photo">
        <div className="thumb thumb--lg">{product.img ? <img src={product.img} alt="" /> : <span>Нет фото</span>}</div>
        <div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
          <button type="button" className="ghost" disabled={busy} onClick={() => fileRef.current.click()}>
            {busy ? 'Загрузка…' : product.img ? 'Заменить фото' : 'Загрузить фото'}
          </button>
          {msg && <p className="err">{msg}</p>}
          <small className="muted">Лучше вертикальное фото, формат 4:5. Оно автоматически уменьшается.</small>
        </div>
      </div>
      <Field label="Название на английском (для подписи под фото)">
        <input value={product.en} onChange={(e) => set({ en: e.target.value })} />
      </Field>
      <label className="check">
        <input type="checkbox" checked={!product.hidden} onChange={(e) => set({ hidden: !e.target.checked })} />
        Показывать на сайте
      </label>
      <div className="two">
        <LangFields title="Русский (RU)" part={product.ru} onChange={(ru) => set({ ru })} />
        <LangFields title="Таджикский (TJ)" part={product.tj} onChange={(tj) => set({ tj })} />
      </div>
    </div>
  )
}

function Products({ draft, setDraft, onAuthLost }) {
  const [editing, setEditing] = useState(null)
  const list = draft.products
  const update = (products) => setDraft({ ...draft, products })
  const move = (i, d) => {
    const j = i + d
    if (j < 0 || j >= list.length) return
    const next = [...list]
    ;[next[i], next[j]] = [next[j], next[i]]
    update(next)
  }
  const add = () => {
    const id = 'p' + Date.now().toString(36)
    update([...list, { id, hidden: false, img: '', tone: 'new', en: '', ru: EMPTY_PART(), tj: EMPTY_PART() }])
    setEditing(id)
  }
  const remove = (p) => {
    if (window.confirm(`Удалить «${p.ru.name || p.tj.name || 'продукт'}»?`)) update(list.filter((x) => x.id !== p.id))
  }

  const cur = list.find((p) => p.id === editing)
  if (cur) {
    return (
      <ProductEditor
        product={cur}
        onChange={(np) => update(list.map((x) => (x.id === np.id ? np : x)))}
        onDone={() => setEditing(null)}
        onAuthLost={onAuthLost}
      />
    )
  }

  return (
    <div>
      <ul className="plist">
        {list.map((p, i) => (
          <li key={p.id} className={p.hidden ? 'is-hidden' : ''}>
            <div className="thumb">{p.img ? <img src={p.img} alt="" /> : <span>—</span>}</div>
            <div className="plist__name">
              <b>{p.ru.name || p.tj.name || 'Без названия'}</b>
              <small>{p.hidden ? 'Скрыт на сайте' : 'Виден на сайте'}</small>
            </div>
            <div className="plist__btns">
              <button type="button" className="arrow" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Выше">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 15l6-6 6 6" />
                </svg>
              </button>
              <button type="button" className="arrow" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Ниже">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <button type="button" onClick={() => update(list.map((x) => (x.id === p.id ? { ...x, hidden: !x.hidden } : x)))}>
                {p.hidden ? 'Показать' : 'Скрыть'}
              </button>
              <button type="button" className="main" onClick={() => setEditing(p.id)}>
                Изменить
              </button>
              <button type="button" className="danger" onClick={() => remove(p)}>
                Удалить
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className="ghost add" onClick={add}>
        + Добавить продукт
      </button>
    </div>
  )
}

function Contacts({ draft, setDraft }) {
  const c = draft.contacts
  const set = (patch) => setDraft({ ...draft, contacts: { ...c, ...patch } })
  return (
    <div className="form">
      <Field label="Телефон" hint="Как показывать на сайте, например 000-00-73-74">
        <input value={c.phone} onChange={(e) => set({ phone: e.target.value })} />
      </Field>
      <Field label="Ссылка на Instagram">
        <input value={c.instagram} onChange={(e) => set({ instagram: e.target.value })} />
      </Field>
      <Field label="Адрес (русский)">
        <input value={c.address.ru} onChange={(e) => set({ address: { ...c.address, ru: e.target.value } })} />
      </Field>
      <Field label="Адрес (таджикский)">
        <input value={c.address.tj} onChange={(e) => set({ address: { ...c.address, tj: e.target.value } })} />
      </Field>
    </div>
  )
}

function Password({ onAuthLost }) {
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [rep, setRep] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setMsg(null)
    if (next.length < 6) return setMsg({ bad: true, t: 'Новый пароль должен быть не короче 6 символов' })
    if (next !== rep) return setMsg({ bad: true, t: 'Пароли не совпадают' })
    setBusy(true)
    try {
      const { token } = await changePassword(cur, next)
      setToken(token)
      setCur('')
      setNext('')
      setRep('')
      setMsg({ t: 'Пароль изменён. Запомните его: старый больше не подходит.' })
    } catch (ex) {
      if (ex.status === 401) onAuthLost()
      else if (ex.status === 403) setMsg({ bad: true, t: 'Текущий пароль неверный' })
      else if (ex.status === 503) setMsg({ bad: true, t: NO_DB })
      else setMsg({ bad: true, t: 'Не удалось изменить пароль' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <Field label="Текущий пароль">
        <PasswordInput value={cur} onChange={setCur} autoComplete="current-password" />
      </Field>
      <Field label="Новый пароль" hint="Не короче 6 символов">
        <PasswordInput value={next} onChange={setNext} autoComplete="new-password" />
      </Field>
      <Field label="Повторите новый пароль">
        <PasswordInput value={rep} onChange={setRep} autoComplete="new-password" />
      </Field>
      {msg && <p className={msg.bad ? 'err' : 'ok'}>{msg.t}</p>}
      <button className="btn" disabled={busy || !cur || !next}>
        {busy ? 'Сохраняем…' : 'Изменить пароль'}
      </button>
    </form>
  )
}

export function AdminPanel({ content, onSaved, onClose, onAuthLost }) {
  const [draft, setDraft] = useState(() => structuredClone(content))
  const [tab, setTab] = useState('products')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const dirty = JSON.stringify(draft) !== JSON.stringify(content)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    if (!dirty) return
    const h = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const save = async () => {
    setSaving(true)
    setStatus(null)
    try {
      const saved = await saveContent(draft)
      onSaved(saved)
      setDraft(structuredClone(saved))
      setStatus({ t: 'Сохранено. Изменения уже на сайте.' })
    } catch (ex) {
      if (ex.status === 401) onAuthLost()
      else setStatus({ bad: true, t: ex.status === 503 ? NO_DB : 'Не удалось сохранить. Проверьте интернет и попробуйте ещё раз.' })
    } finally {
      setSaving(false)
    }
  }

  const close = () => {
    if (!dirty || window.confirm('Есть несохранённые изменения. Закрыть без сохранения?')) onClose()
  }

  const logout = () => {
    if (!dirty || window.confirm('Есть несохранённые изменения. Выйти без сохранения?')) {
      setToken(null)
      onClose()
    }
  }

  return (
    <div className="admin">
      <header className="admin__bar">
        <div className="admin__title">Админка SAFROSE</div>
        <div className="admin__actions">
          <button type="button" className="ghost" onClick={logout}>
            Выйти
          </button>
          <button type="button" className="ghost" onClick={close}>
            Закрыть
          </button>
        </div>
      </header>
      <nav className="admin__tabs">
        {[
          ['products', 'Продукты'],
          ['contacts', 'Контакты'],
          ['password', 'Пароль'],
        ].map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </nav>
      <main className="admin__body">
        {tab === 'products' && <Products draft={draft} setDraft={setDraft} onAuthLost={onAuthLost} />}
        {tab === 'contacts' && <Contacts draft={draft} setDraft={setDraft} />}
        {tab === 'password' && <Password onAuthLost={onAuthLost} />}
      </main>
      {tab !== 'password' && (
        <footer className="admin__save">
          <span className={status?.bad ? 'err' : dirty ? 'warn' : 'ok'}>
            {status ? status.t : dirty ? 'Есть несохранённые изменения' : 'Все изменения сохранены'}
          </span>
          <button className="btn" onClick={save} disabled={saving || !dirty}>
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </footer>
      )}
    </div>
  )
}

export const hasToken = () => Boolean(getToken())
