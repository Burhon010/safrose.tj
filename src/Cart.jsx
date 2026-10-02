import { useEffect, useState } from 'react'
import { placeOrder } from './api.js'

const CART_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="9" cy="20" r="1.4" />
    <circle cx="18" cy="20" r="1.4" />
    <path d="M2.5 3h2.2l2 12.2a2 2 0 0 0 2 1.7h8.8a2 2 0 0 0 2-1.6L21 8H6" />
  </svg>
)

export function CartButton({ count, onClick }) {
  if (!count) return null
  return (
    <button type="button" className="cart-btn" onClick={onClick} aria-label="Корзина">
      {CART_ICON}
      <span className="cart-btn__count">{count}</span>
    </button>
  )
}

export function CartDrawer({ items, total, currency, t, onQty, onRemove, onClear, onClose, onOrdered }) {
  const [step, setStep] = useState('cart')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [comment, setComment] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) {
      setErr(t.cartNeedFields)
      return
    }
    setErr('')
    setStep('sending')
    try {
      await placeOrder({
        items: items.map((i) => ({ id: i.key, qty: i.qty })),
        name: name.trim(),
        phone: phone.trim(),
        comment: comment.trim(),
      })
      setStep('done')
      onOrdered()
    } catch {
      setStep('error')
    }
  }

  return (
    <div className="cart-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cart-box">
        <button type="button" className="cart-box__x" onClick={onClose} aria-label={t.cartClose}>
          ×
        </button>
        <h2>{t.cartTitle}</h2>

        {step === 'done' ? (
          <div className="cart-done">
            <p>{t.cartSuccess}</p>
            <button type="button" className="btn" onClick={onClose}>
              {t.cartClose}
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="cart-empty">{t.cartEmpty}</p>
        ) : (
          <>
            <ul className="cart-list">
              {items.map((it) => (
                <li key={it.key} className="cart-row">
                  <div className="cart-row__thumb">
                    {it.img ? <img src={it.img} alt="" /> : null}
                  </div>
                  <div className="cart-row__info">
                    <b>{it.name}</b>
                    <span>
                      {it.price} {currency}
                    </span>
                  </div>
                  <div className="cart-qty">
                    <button type="button" onClick={() => onQty(it.key, it.qty - 1)} aria-label="−">
                      −
                    </button>
                    <span>{it.qty}</span>
                    <button type="button" onClick={() => onQty(it.key, it.qty + 1)} aria-label="+">
                      +
                    </button>
                  </div>
                  <button type="button" className="cart-row__remove" onClick={() => onRemove(it.key)} aria-label="Удалить">
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className="cart-total">
              <span>{t.cartTotal}</span>
              <b>
                {total} {currency}
              </b>
            </div>
            <form className="cart-form" onSubmit={submit}>
              <input placeholder={t.cartName} value={name} onChange={(e) => setName(e.target.value)} />
              <input placeholder={t.cartPhone} value={phone} onChange={(e) => setPhone(e.target.value)} />
              <textarea
                placeholder={t.cartComment}
                rows="2"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              {err && <p className="err">{err}</p>}
              {step === 'error' && <p className="err">{t.cartError}</p>}
              <div className="cart-form__btns">
                <button type="button" className="btn btn--ghost" onClick={onClear}>
                  {t.cartClear}
                </button>
                <button className="btn" disabled={step === 'sending'}>
                  {step === 'sending' ? t.cartSending : t.cartSubmit}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
