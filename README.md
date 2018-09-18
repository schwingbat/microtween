# microtween

microtween is a tiny tweening library based on cubic bezier curves. It's a tweening API built on a slightly modified version of [gre/bezier-easing](https://github.com/gre/bezier-easing).

```js
const tween = microtween({
  from: { x: 0,   y: 100 },
  to:   { x: 100, y: 0   },
  time: 3000,
  update: props => {
    element.style.transform = `translate(${props.x}px, ${props.y}px)`
  }
}).then(props => {
  // Do something at the end
})
```

The `update` function is called within `requestAnimationFrame`, so you're free to update styles and DOM elements without causing major performance issues.

You can use the default easing, specify a built in easing, or define your own on the fly:

```js
// By reference
microtween({
  // ...
  easing: microtween.ease.elastic
})

// By name
microtween({
  // ...
  easing: 'circular'
})

// By value
microtween({
  // ...
  easing: [0.53, 1, 0.15, 1.2]
})
```

## Included Curves

These are the included curves:

- default (`0.25`, `0.12`, `0.31`, `1`)
- linear (`0`, `0`, `1`, `1`)
- easeOut (`0`, `0`, `0.58`, `1`)
- circular (`0`, `0.6`, `0.4`, `1`)
- elastic (`0.53`, `1`, `0.15`, `1.2`)
- elasticStrong (`0.75`, `-0.5`, `0`, `1.75`)
- expo (`0.19`, `0.85`, `0.64`, `1.01`)

[cubic-bezier.com](http://cubic-bezier.com) is an awesome tool to check out if you're interested in creating your own.

## Project Status

microtween is currently not actively developed, but it is in active use in a few of my projects.