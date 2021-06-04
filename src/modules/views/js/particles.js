new SuperParticles({
    maxFPS: 30,
    useJquery: true,
    debug: {
      showFps: false
    },
    particles: {
      amount: window.outerWidth / 13,
      velocity: 10,
      color: "0xdce0ff",
    },
    lines: {
      minDistance: 0
    },
    container: {
      backgroundCssRule: null
    }
  })
