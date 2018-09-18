/**
 * Microtween
 * ----------
 * A super simple tween function. Give it your starting
 * and ending properties, time in milliseconds, and
 * a callback to fire on each frame.
 */

;(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.microtween = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  /**
   * https://github.com/gre/bezier-easing
   * BezierEasing - use bezier curve for transition easing function
   * by Gaëtan Renaudeau 2014 - 2015 – MIT License
   *
   * --- Modified by Tony McCoy for Microtween
   * --- included for customizable curves
   */

  const NEWTON_ITERATIONS = 4
  const NEWTON_MIN_SLOPE = 0.001
  const SUBDIVISION_PRECISION = 0.0000001
  const SUBDIVISION_MAX_ITERATIONS = 10

  const kSplineTableSize = 11
  const kSampleStepSize = 1.0 / (kSplineTableSize - 1.0)

  const float32ArraySupported = typeof Float32Array === 'function'

  function A (aA1, aA2) { return 1.0 - 3.0 * aA2 + 3.0 * aA1 }
  function B (aA1, aA2) { return 3.0 * aA2 - 6.0 * aA1 }
  function C (aA1) { return 3.0 * aA1 }
  function calcBezier (aT, aA1, aA2) { return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT }
  function getSlope (aT, aA1, aA2) { return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1) }
  
  function binarySubdivide (aX, aA, aB, mX1, mX2) {
    let currentX
    let currentT
    let i = 0
    do {
      currentT = aA + (aB - aA) / 2.0
      currentX = calcBezier(currentT, mX1, mX2) - aX
      if (currentX > 0.0) {
        aB = currentT
      } else {
        aA = currentT
      }
    } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS)
    return currentT
  }

  function newtonRaphsonIterate (aX, aGuessT, mX1, mX2) {
    for (let i = 0; i < NEWTON_ITERATIONS; ++i) {
      const currentSlope = getSlope(aGuessT, mX1, mX2)
      if (currentSlope === 0.0) {
        return aGuessT
      }
      const currentX = calcBezier(aGuessT, mX1, mX2) - aX
      aGuessT -= currentX / currentSlope
    }
    return aGuessT
  }

  function CubicBezier ([mX1, mY1, mX2, mY2]) {
    if (!(mX1 >= 0 && mX1 <= 1 && mX2 >= 0 && mX2 <= 1)) {
      throw new Error('bezier x values must be in [0, 1] range')
    }

    // Precompute samples table
    const sampleValues = float32ArraySupported ? new Float32Array(kSplineTableSize) : new Array(kSplineTableSize)
    if (mX1 !== mY1 || mX2 !== mY2) {
      for (let i = 0; i < kSplineTableSize; ++i) {
        sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2)
      }
    }

    function getTForX (aX) {
      let intervalStart = 0.0
      let currentSample = 1
      const lastSample = kSplineTableSize - 1

      for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
        intervalStart += kSampleStepSize
      }
      --currentSample

      // Interpolate to provide an initial guess for t
      const dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample])
      const guessForT = intervalStart + dist * kSampleStepSize

      const initialSlope = getSlope(guessForT, mX1, mX2)
      if (initialSlope >= NEWTON_MIN_SLOPE) {
        return newtonRaphsonIterate(aX, guessForT, mX1, mX2)
      } else if (initialSlope === 0.0) {
        return guessForT
      } else {
        return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2)
      }
    }

    return function BezierEasing (x) {
      if (mX1 === mY1 && mX2 === mY2) {
        return x
      }
      if (x === 0) {
        return 0
      }
      if (x === 1) {
        return 1
      }
      return calcBezier(getTForX(x), mY1, mY2)
    }
  }

  //---------- Microtween Proper -----------//

  const easings = {
    default: CubicBezier([0.25, 0.12, 0.31, 1]), // A nice, smooth and general ease.
    linear: CubicBezier([0, 0, 1, 1]),
    easeOut: CubicBezier([0, 0, 0.58, 1]),
    circular: CubicBezier([0, 0.6, 0.4, 1]),
    elastic: CubicBezier([0.53, 1, 0.15, 1.2]),
    elasticStrong: CubicBezier([0.75, -0.5, 0, 1.75]),
    expo: CubicBezier([0.19, 0.85, 0.64, 1.01])
  }

  function microtween ({ from, to, time, update, easing }) {
    if (from == null || to == null || time == null) {
      throw new Error('One or more required properties weren\'t passed. Please pass at at least: \'from\' (object), \'to\' (object), \'time\' (number - milliseconds)')
    }

    if (typeof from !== typeof to) {
      throw new Error('"from" and "to" must be of the same type')
    }

    const length = Math.round(time / 16.6666) // length in frames

    if (typeof easing === 'string' && easings[easing]) {
      easing = easings[easing]
    } else if (easing instanceof Array && easing.length === 4) {
      easing = CubicBezier(easing)
    } else if (typeof easing === 'object' &&
             easing.hasOwnProperty('_p1') &&
             easing.hasOwnProperty('_p2') &&
             easing.hasOwnProperty('_p3') &&
             typeof easing.getRatio === 'function') {
      // TODO: Use TweenLite ease objects natively.
      console.warn('TweenLite ease objects are not yet natively supported.')
      easing = easings.default
    } else {
      easing = easings.default
    }

    let stop = false
    let _resolve

    // Create a promise to be resolved later.
    const promise = new Promise((resolve) => { _resolve = resolve })

    function loop (update, from, to, easing, frame, length) {
      if (stop) return

      // Apply easing based on frame progress.
      const current = {}
      for (const key in from) {
        current[key] = from[key] + (to[key] - from[key]) * easing(frame / length)
      }

      if (update) update(current)

      if (frame < length) {
        return window.requestAnimationFrame(() => loop(update, from, to, easing, frame + 1, length))
      } else {
        if (update) update(to)
        return _resolve(to)
      }
    }

    loop(update, from, to, easing, 0, length)

    promise.cancel = function () {
      stop = true
      return _resolve(to)
    }
    return promise
  }

  microtween.ease = easings

  return microtween
}));