/* global beforeAll, test, expect */

const microtween = require('./microtween')
const createMockRaf = require('mock-raf')

beforeAll(() => {
  const mockRaf = createMockRaf()
  window.requestAnimationFrame = mockRaf.raf
})

test('microtween should tween', () => {
  let times = 0

  microtween({
    from: { thing: 1 },
    to: { thing: 2 },
    time: 1000,
    update (current) {
      times += 1
    }
  }).then(current => {
    expect(times).toBe(60)
    expect(current.thing).toBe(2)
  })
})

test('easing works', () => {
  let last
  microtween({
    from: { thing: 5 },
    to: { thing: 10 },
    time: 1000,
    easing: 'ease',
    update (current) {
      if (last) {
        expect(current.thing).toBeGreaterThan(last)
      }
      last = current.thing
    }
  }).then(current => {
    expect(current.thing).toBe(10)
  })
})

test('tween is cancelable', () => {
  let start = Date.now()
  const tween = microtween({
    from: { test: 1 },
    to: { test: 2 },
    time: 1000,
    update: () => {}
  })

  tween.then(() => {
    expect(Date.now() - start).toBeLessThan(1000)
  })

  expect(typeof tween.cancel).toBe('function')
  tween.cancel()
})

test('easings are accessible on microtween object', () => {
  expect(typeof microtween.ease).toBe('object')
})