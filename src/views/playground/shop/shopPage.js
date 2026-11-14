import { HOST } from '../../../utils/host.js'

/**
 * The shop page of the last step, the student's material like the code: it stays in English. `SHOP_SCRIPT` is the
 * `shop.js` the student reads; `ShopPreview` does exactly what it says, with the texts below.
 */
export const SHOP_TEXTS = Object.freeze({
  title: 'Brick Shop',
  address: `${HOST}/shop.html`,
  order: 'Order 1',
  loadFailed: 'The bricks could not be loaded',
  orderFailed: 'The order failed',
  placed: (order) => `Order #${order?.id} is ${order?.status}`,
})

export const SHOP_ORDER = Object.freeze({ quantity: 1, customer: 'Ana' })

export const SHOP_SCRIPT = `const list = document.querySelector('#bricks')
const message = document.querySelector('#message')

fetch('/bricks?inStock=true')
  .then((response) => response.json())
  .then((bricks) => {
    for (const brick of bricks) {
      const card = document.createElement('li')
      card.innerHTML = \`<b>\${brick.name}</b> \${brick.price} € <button>${SHOP_TEXTS.order}</button>\`
      card.querySelector('button').addEventListener('click', () => order(brick))
      list.append(card)
    }
  })
  .catch(() => {
    message.textContent = '${SHOP_TEXTS.loadFailed}'
  })

function order(brick) {
  fetch('/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brickId: brick.id, quantity: ${SHOP_ORDER.quantity}, customer: '${SHOP_ORDER.customer}' }),
  })
    .then((response) => response.json())
    .then((order) => {
      message.textContent = \`Order #\${order.id} is \${order.status}\`
    })
    .catch(() => {
      message.textContent = '${SHOP_TEXTS.orderFailed}'
    })
}
`
