new SuperParticles({
    maxFPS: 30,
    useJquery: true,
    debug: {
      showFps: true
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
