import { useEffect, useMemo, useState } from 'react'
import Petals from './Petals.jsx'
import HeroSlider from './HeroSlider.jsx'
import { AdminPanel, LoginModal, hasToken } from './Admin.jsx'
import { fetchContent, readCache, setToken, writeCache } from './api.js'
import { DEFAULT_CONTENT } from './content.default.js'
import { T } from './i18n.js'
import './App.css'

const LOCK = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2.5" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
)
const INSTA_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.3" cy="6.7" r="0.6" />
  </svg>
)

const ICONS = {
  flower: (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="3" />
      <path d="M16 13c-3-4-3-8 0-10 3 2 3 6 0 10zM16 19c3 4 3 8 0 10-3-2-3-6 0-10zM13 16c-4-3-8-3-10 0 2 3 6 3 10 0zM19 16c4 3 8 3 10 0-2-3-6-3-10 0z" />
    </svg>
  ),
  leaf: (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 26C6 12 14 5 27 5c0 13-7 21-21 21zM6 26L18 14" />
    </svg>
  ),
  bottle: (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M13 3h6v4l3 4v16a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V11l3-4zM10 17h12M10 22h12" />
    </svg>
  ),
}

function useReveal(dep) {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal:not(.in)')
    if (!('IntersectionObserver' in window)) {
      els.forEach((e) => e.classList.add('in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('in')
            io.unobserve(en.target)
          }
        }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [dep])
}

function initialLang() {
  try {
    const s = localStorage.getItem('lang')
    if (s === 'ru' || s === 'tj') return s
  } catch {
    /* storage unavailable */
  }
  return 'ru'
}

function ProductCard({ p, i, t, hl }) {
  const [open, setOpen] = useState(false)
  return (
    <article id={`p-${p.key}`} className={`card card--${p.tone} reveal`} data-hl={hl === p.key ? '1' : undefined} style={{ '--d': `${(i % 3) * 0.1}s` }}>
      <div className="card__img">
        {p.img ? (
          <img src={p.img} alt={`${p.name} — ${p.en} 250 ml`} loading="lazy" />
        ) : (
          <div className="card__noimg">{ICONS.leaf}</div>
        )}
        <span className="badge">{t.ml}</span>
      </div>
      <div className="card__body">
        <h3>{p.name}</h3>
        {p.alt && p.alt !== p.name && <p className="card__tj">{p.alt}</p>}
        <p className="card__text">{p.text}</p>
        {p.info && (
          <>
            <button
              type="button"
              className={`info__btn ${open ? 'open' : ''}`}
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
              {t.infoBtn}
            </button>
            <div className={`info ${open ? 'open' : ''}`}>
              <div className="info__in">
                <ul className="info__tags">
                  {p.info.tags.map((g, n) => (
                    <li key={n}>{g}</li>
                  ))}
                </ul>
                {p.info.head && <h4>{p.info.head}</h4>}
                {p.info.body
                  .split('\n\n')
                  .filter(Boolean)
                  .map((para, n) => (
                    <p key={n}>{para}</p>
                  ))}
                {p.info.contra && (
                  <>
                    <h5>{t.infoContra}</h5>
                    <p>{p.info.contra}</p>
                  </>
                )}
                {p.info.usage && (
                  <>
                    <h5>{t.infoUsage}</h5>
                    <p>{p.info.usage}</p>
                  </>
                )}
              </div>
            </div>
          </>
        )}
        <a className="link" href="#contacts">
          {t.order} <span>→</span>
        </a>
      </div>
    </article>
  )
}

export default function App() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [lang, setLang] = useState(initialLang)
  const [hl, setHl] = useState(null)
  const [admin, setAdmin] = useState(null)
  const [content, setContent] = useState(() => readCache() || DEFAULT_CONTENT)
  const t = T[lang]
  useReveal(content)

  useEffect(() => {
    let alive = true
    fetchContent()
      .then((c) => {
        if (alive && c && Array.isArray(c.products)) {
          setContent(c)
          writeCache(c)
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const openAdmin = () => {
    setOpen(false)
    setAdmin(hasToken() ? 'panel' : 'login')
  }

  useEffect(() => {
    const check = () => {
      if (window.location.hash === '#admin') {
        setAdmin(hasToken() ? 'panel' : 'login')
        history.replaceState(null, '', window.location.pathname)
      }
    }
    check()
    window.addEventListener('hashchange', check)
    return () => window.removeEventListener('hashchange', check)
  }, [])

  const products = useMemo(
    () =>
      content.products
        .filter((p) => !p.hidden)
        .map((p) => {
          const me = p[lang]
          const other = p[lang === 'ru' ? 'tj' : 'ru']
          const pick2 = (f) => me.info?.[f] || other.info?.[f] || ''
          const tags = me.info?.tags?.length ? me.info.tags : other.info?.tags || []
          const info = { tags, head: pick2('head'), body: pick2('body'), contra: pick2('contra'), usage: pick2('usage') }
          const hasInfo = tags.length || info.head || info.body || info.contra || info.usage
          return {
            key: p.id,
            img: p.img,
            tone: p.tone || 'new',
            en: p.en,
            name: me.name || other.name,
            alt: other.name,
            text: me.text || other.text,
            info: hasInfo ? info : null,
          }
        }),
    [content, lang],
  )

  const contacts = content.contacts || {}
  const phone = contacts.phone || ''
  const phoneHref = phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : '#contacts'
  const instaUrl = contacts.instagram || ''
  const instaHandle = (/instagram\.com\/([^/?#]+)/.exec(instaUrl) || [])[1]
  const address = contacts.address?.[lang] || contacts.address?.[lang === 'ru' ? 'tj' : 'ru'] || ''

  useEffect(() => {
    document.documentElement.lang = lang === 'tj' ? 'tg' : 'ru'
    document.title = t.title
    try {
      localStorage.setItem('lang', lang)
    } catch {
      /* storage unavailable */
    }
  }, [lang, t.title])

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  const pick = (key) => {
    const el = document.getElementById(`p-${key}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHl(null)
    setTimeout(() => setHl(key), 350)
    setTimeout(() => setHl(null), 2600)
  }

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
  }, [open])

  return (
    <>
      <Petals />

      <header className={`header ${scrolled ? 'header--solid' : ''}`}>
        <div className="container header__in">
          <a href="#top" className="brand" aria-label="Safrose">
            <img src="/images/logo.png" alt="Safrose — Natural Rose Products" />
          </a>
          <nav className={`nav ${open ? 'nav--open' : ''}`}>
            {t.nav.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setOpen(false)}>
                {label}
              </a>
            ))}
            <a className="btn btn--sm nav__cta" href={phoneHref}>
              {t.call}
            </a>
            <button type="button" className="nav__admin" onClick={openAdmin}>
              {LOCK}
              {t.admin}
            </button>
          </nav>
          <div className="header__right">
            <div className={`lang lang--${lang}`} role="group" aria-label="Language">
              <span className="lang__thumb" />
              <button className={lang === 'ru' ? 'on' : ''} onClick={() => setLang('ru')} aria-pressed={lang === 'ru'}>
                RU
              </button>
              <button className={lang === 'tj' ? 'on' : ''} onClick={() => setLang('tj')} aria-pressed={lang === 'tj'}>
                TJ
              </button>
            </div>
            <button type="button" className="lock" onClick={openAdmin} aria-label={t.admin} title={t.admin}>
              {LOCK}
            </button>
            <button
              className={`burger ${open ? 'burger--open' : ''}`}
              onClick={() => setOpen((v) => !v)}
              aria-label={t.menu}
              aria-expanded={open}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero__glow hero__glow--a" />
          <div className="hero__glow hero__glow--b" />
          <div className="container hero__in">
            <div className="hero__text">
              <p className="eyebrow reveal">safrose.tj</p>
              <h1 className="reveal" style={{ '--d': '.08s' }}>
                {t.heroTitle[0]}
                <em>{t.heroTitle[1]}</em>
              </h1>
              <p className="lead reveal" style={{ '--d': '.16s' }}>
                {t.lead}
              </p>
              <ul className="chips reveal" style={{ '--d': '.24s' }}>
                {t.chips
                  .filter(([, key]) => products.some((p) => p.key === key))
                  .map(([label, key]) => (
                    <li key={key}>
                      <button type="button" onClick={() => pick(key)}>
                        {label}
                      </button>
                    </li>
                  ))}
              </ul>
              <div className="hero__btns reveal" style={{ '--d': '.32s' }}>
                <a className="btn" href="#catalog">
                  {t.btnCatalog}
                </a>
                <a className="btn btn--ghost" href="#contacts">
                  {t.btnContact}
                </a>
              </div>
            </div>
            <div className="hero__visual reveal" style={{ '--d': '.2s' }}>
              <div className="arch">
                <HeroSlider />
              </div>
              <span className="ring ring--1" />
              <span className="ring ring--2" />
            </div>
          </div>
          <a href="#catalog" className="scroll" aria-label="↓">
            <span />
          </a>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marquee__track">
            {[0, 1].map((k) => (
              <div key={k} className="marquee__row">
                {[...t.marquee, ...t.marquee].map((w, n) => (
                  <span key={n}>
                    {w} <i>✿</i>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <section id="catalog" className="section section--tint">
          <div className="container">
            <div className="section__head reveal">
              <p className="eyebrow">{t.catalogEyebrow}</p>
              <h2>
                {t.catalogTitle[0]}
                <em>{t.catalogTitle[1]}</em>
              </h2>
            </div>
            <div className="grid">
              {products.map((p, i) => (
                <ProductCard key={p.key} p={p} i={i} t={t} hl={hl} />
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="section">
          <div className="container about">
            <div className="about__head reveal">
              <p className="eyebrow">{t.aboutEyebrow}</p>
              <h2>
                {t.aboutTitle[0]}
                <em>{t.aboutTitle[1]}</em>
              </h2>
            </div>
            <div className="about__body">
              <p className="reveal">{t.aboutText}</p>
              <div className="feats">
                {t.feats.map(([i, title, d], n) => (
                  <div key={n} className="feat reveal" style={{ '--d': `${n * 0.1}s` }}>
                    <span className="feat__i">{ICONS[i]}</span>
                    <h3>{title}</h3>
                    <p>{d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="process" className="section">
          <div className="container">
            <div className="section__head reveal">
              <p className="eyebrow">{t.processEyebrow}</p>
              <h2>
                {t.processTitle[0]}
                <em>{t.processTitle[1]}</em>
              </h2>
            </div>
            <div className="steps">
              {t.steps.map(([n, title, d], i) => (
                <div key={n} className="step reveal" style={{ '--d': `${i * 0.12}s` }}>
                  <span className="step__n">{n}</span>
                  <h3>{title}</h3>
                  <p>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contacts" className="section contacts">
          <div className="container contacts__in reveal">
            <p className="eyebrow eyebrow--light">{t.contactsEyebrow}</p>
            <h2>
              {t.contactsTitle[0]}
              <em>{t.contactsTitle[1]}</em>
            </h2>
            <p className="contacts__p">{t.contactsText}</p>
            {phone && (
              <a className="phone" href={phoneHref}>
                {phone}
              </a>
            )}
            {instaUrl && (
              <a className="insta" href={instaUrl} target="_blank" rel="noopener noreferrer">
                {INSTA_ICON}
                <span>
                  {t.insta}
                  {instaHandle ? ` · @${instaHandle}` : ''}
                </span>
              </a>
            )}
            {address && (
              <p className="contacts__addr">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
                  <circle cx="12" cy="9.5" r="2.5" />
                </svg>
                {address}
              </p>
            )}
            <div className="contacts__meta">
              <span>safrose.tj</span>
              <span>{t.country}</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer__in">
          <img src="/images/logo.png" alt="Safrose" />
          {instaUrl && (
            <a className="footer__insta" href={instaUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              {INSTA_ICON}
            </a>
          )}
          <p>
            © {new Date().getFullYear()} SAFROSE. {t.footer}
          </p>
        </div>
      </footer>

      {admin === 'login' && <LoginModal onClose={() => setAdmin(null)} onSuccess={() => setAdmin('panel')} />}
      {admin === 'panel' && (
        <AdminPanel
          content={content}
          onSaved={(c) => {
            setContent(c)
            writeCache(c)
          }}
          onClose={() => setAdmin(null)}
          onAuthLost={() => {
            setToken(null)
            setAdmin('login')
          }}
        />
      )}
    </>
  )
}
