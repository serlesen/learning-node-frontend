import { useEffect, useState } from 'react'
import { HttpMethod } from '../../../types/httpMethod.js'
import { Outcome } from '../../../types/outcome.js'
import { toRequestSpec } from '../../../utils/checks.js'
import { SHOP_ORDER, SHOP_TEXTS } from './shopPage.js'
import './ShopPreview.scss'

// What `response.json()` does in the browser: throws when the body isn't JSON.
const readJson = (response) => JSON.parse(response.body)
const answered = (response) => response.outcome === Outcome.Answered

/**
 * The shop page of the last step: does what its `shop.js` says, sending its requests to the student's server
 * through `onSend`. It loads again when `onSend` changes, that is when the server restarts.
 */
export function ShopPreview({ onSend }) {
  const [bricks, setBricks] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    onSend(toRequestSpec(HttpMethod.Get, '/bricks?inStock=true'))
      .then((response) => {
        if (!active || !answered(response)) return
        setBricks([...readJson(response)])
        setMessage('')
      })
      .catch(() => {
        if (!active) return
        setBricks([])
        setMessage(SHOP_TEXTS.loadFailed)
      })
    return () => {
      active = false
    }
  }, [onSend])

  const order = (brick) =>
    onSend(toRequestSpec(HttpMethod.Post, '/orders', { body: { brickId: brick?.id, ...SHOP_ORDER } }))
      .then((response) => answered(response) && setMessage(SHOP_TEXTS.placed(readJson(response))))
      .catch(() => setMessage(SHOP_TEXTS.orderFailed))

  return (
    <div className="shop-page">
      <h1 className="shop-title">{SHOP_TEXTS.title}</h1>
      <ul className="shop-bricks">
        {bricks.map((brick, i) => (
          <li key={i}>
            <b>{String(brick?.name)}</b> {String(brick?.price)} €{' '}
            <button type="button" onClick={() => order(brick)}>
              {SHOP_TEXTS.order}
            </button>
          </li>
        ))}
      </ul>
      {message && <p className="shop-message">{message}</p>}
    </div>
  )
}
