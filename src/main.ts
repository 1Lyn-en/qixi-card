import './style.css'

type Point = { x: number; y: number }
type Shape = 'heart' | 'infinity' | 'scatter' | 'ring' | 'collapse'

const params = new URLSearchParams(window.location.search)
const recipient = params.get('to')?.trim() || '亲爱的你'
const sender = params.get('from')?.trim() || '在乎你的人'
const customMessage = params.get('message')?.trim()

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }
    return entities[character]
  })
}

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <canvas id="particle-canvas" aria-hidden="true"></canvas>

  <section class="intro" id="intro" aria-labelledby="intro-title">
    <header class="intro-header">
      <span>PERSONAL NOTE</span>
      <span>NO. 07 / 07</span>
    </header>

    <div class="letter-stage">
      <p class="intro-kicker">有一封未读来信</p>
      <h1 id="intro-title">今晚，有些话<br>想慢一点告诉你</h1>
      <div class="envelope" aria-hidden="true">
        <div class="envelope-back"></div>
        <div class="letter-paper"><span>TO ${escapeHtml(recipient)}</span></div>
        <div class="envelope-front"></div>
        <div class="envelope-flap"></div>
        <div class="wax-seal">启</div>
      </div>
      <button class="open-button" id="open-letter" type="button">
        <span>拆开这封信</span><span aria-hidden="true">→</span>
      </button>
      <p class="intro-footnote">请在一个安静的地方打开 · 建议开启声音</p>
    </div>
  </section>

  <div class="threshold" id="threshold" aria-hidden="true">
    <span></span>
    <p>有些心意<br>要等星光到齐</p>
    <span></span>
  </div>

  <div class="impact-flash" aria-hidden="true"></div>

  <main class="card-shell" id="card-shell" aria-hidden="true">
    <div class="particle-heart" id="particle-heart" aria-hidden="true"></div>

    <header class="topbar">
      <span class="festival-mark">今夜 · 星河有信</span>
      <button class="icon-button" id="sound-toggle" type="button" aria-label="开启声音" title="开启声音">
        <span aria-hidden="true">♪</span>
      </button>
    </header>

    <div class="performance-copy" id="performance-copy" aria-live="polite">
      <span class="performance-index">01</span>
      <p>正在收集今晚的星光</p>
    </div>

    <div class="star-core" id="star-core">
      <button id="charge-core" type="button" aria-label="长按或连续轻触，为星核蓄能">
        <span class="core-symbol" aria-hidden="true">✦</span>
      </button>
      <p>长按，或连续轻触</p>
      <span class="charge-label">点亮星核</span>
    </div>

    <section class="greeting" aria-live="polite">
      <p class="recipient">致 ${escapeHtml(recipient)}</p>
      <h2><span>星河滚烫</span><span>你是人间理想</span></h2>
      <p class="message">${escapeHtml(customMessage || '愿往后的每一个朝夕，都有你在身旁。')}</p>
    </section>

    <footer class="actions">
      <p class="signature">— ${escapeHtml(sender)}</p>
      <div class="action-row">
        <button class="text-button" id="replay" type="button"><span aria-hidden="true">↻</span> 再看一次</button>
        <button class="share-button" id="share" type="button">分享这份心意 <span aria-hidden="true">↗</span></button>
      </div>
      <p class="hint">轻触星空，会有心意回应</p>
    </footer>

    <div class="toast" id="toast" role="status" aria-live="polite"></div>
  </main>
`

const fallbackHeart = document.querySelector<HTMLDivElement>('#particle-heart')!
fallbackHeart.innerHTML = Array.from({ length: 150 }, (_, index) => {
  const outlineCount = 76
  const isOutline = index < outlineCount
  const sampleIndex = isOutline ? index : (index * 43) % (150 - outlineCount)
  const sampleCount = isOutline ? outlineCount : 150 - outlineCount
  const t = (sampleIndex / sampleCount) * Math.PI * 2
  const fill = isOutline ? 1 : Math.sqrt(((index * 47) % 73) / 73)
  const x = 16 * Math.sin(t) ** 3
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
  const left = 50 + x * 2.35 * fill
  const top = 51 - y * 2.65 * fill
  const size = 1 + (index % 4) * 0.55
  return `<i style="--x:${left.toFixed(2)}%;--y:${top.toFixed(2)}%;--s:${size}px;--d:${(
    (index % 17) * -0.18
  ).toFixed(2)}s"></i>`
}).join('')

const canvas = document.querySelector<HTMLCanvasElement>('#particle-canvas')!
const context = canvas.getContext('2d')!
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const intro = document.querySelector<HTMLElement>('#intro')!
const threshold = document.querySelector<HTMLElement>('#threshold')!
const cardShell = document.querySelector<HTMLElement>('#card-shell')!
const openButton = document.querySelector<HTMLButtonElement>('#open-letter')!
const performanceCopy = document.querySelector<HTMLElement>('#performance-copy')!
const performanceIndex = performanceCopy.querySelector<HTMLElement>('.performance-index')!
const performanceText = performanceCopy.querySelector<HTMLParagraphElement>('p')!
const starCore = document.querySelector<HTMLElement>('#star-core')!
const chargeButton = document.querySelector<HTMLButtonElement>('#charge-core')!
const chargeLabel = starCore.querySelector<HTMLElement>('.charge-label')!
const greeting = document.querySelector<HTMLElement>('.greeting')!
const actions = document.querySelector<HTMLElement>('.actions')!
const replayButton = document.querySelector<HTMLButtonElement>('#replay')!
const shareButton = document.querySelector<HTMLButtonElement>('#share')!
const soundButton = document.querySelector<HTMLButtonElement>('#sound-toggle')!
const toast = document.querySelector<HTMLDivElement>('#toast')!

let width = 0
let height = 0
let dpr = 1
let animationFrame = 0
let soundEnabled = false
let audioContext: AudioContext | null = null
let bgmGain: GainNode | null = null
let bgmTimer = 0
let bgmStep = 0
let toastTimer = 0
let started = false
let sequenceTimers: number[] = []
let chargeProgress = 0
let chargeFrame = 0
let chargeLastTime = 0
let charging = false
let interactionReady = false
let climaxTriggered = false

class Particle {
  x = 0
  y = 0
  targetX = 0
  targetY = 0
  vx = 0
  vy = 0
  size = 1
  alpha = 1
  hue = 344
  twinkle = Math.random() * Math.PI * 2

  constructor() {
    this.reset()
  }

  reset() {
    this.x = Math.random() * width
    this.y = Math.random() * height
    this.targetX = this.x
    this.targetY = this.y
    this.size = 1 + Math.random() * 1.8
    this.alpha = 0.5 + Math.random() * 0.5
    this.hue = Math.random() > 0.22 ? 346 + Math.random() * 20 : 39 + Math.random() * 12
  }

  update() {
    this.vx += (this.targetX - this.x) * 0.014
    this.vy += (this.targetY - this.y) * 0.014
    if (interactionReady && chargeProgress > 0) {
      this.vx += (width / 2 - this.x) * chargeProgress * 0.00045
      this.vy += (height * 0.42 - this.y) * chargeProgress * 0.00045
    }
    this.vx *= 0.88
    this.vy *= 0.88
    this.x += this.vx
    this.y += this.vy
    this.twinkle += 0.035
  }

  draw() {
    const shimmer = 0.72 + Math.sin(this.twinkle) * 0.28
    context.beginPath()
    const chargeScale = interactionReady ? 1 + chargeProgress * 0.65 : 1
    context.arc(this.x, this.y, this.size * shimmer * chargeScale, 0, Math.PI * 2)
    const isGold = this.hue < 100
    context.fillStyle = isGold
      ? `rgba(244, 202, 142, ${this.alpha * shimmer})`
      : `rgba(255, 111, 148, ${this.alpha * shimmer})`
    context.fill()
  }
}

const particles: Particle[] = []
const backgroundStars: Point[] = []

function resize() {
  width = window.innerWidth
  height = window.innerHeight
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  context.setTransform(dpr, 0, 0, dpr, 0, 0)

  const targetCount = Math.min(760, Math.max(360, Math.round((width * height) / 1500)))
  while (particles.length < targetCount) particles.push(new Particle())
  if (particles.length > targetCount) particles.length = targetCount

  backgroundStars.length = 0
  const starCount = Math.min(120, Math.round((width * height) / 9000))
  for (let i = 0; i < starCount; i += 1) {
    backgroundStars.push({ x: Math.random() * width, y: Math.random() * height })
  }

  if (!started) {
    setTargets('scatter')
    particles.forEach((particle) => {
      particle.x = particle.targetX
      particle.y = particle.targetY
    })
  }
}

function heartEquation(x: number, y: number) {
  return (x * x + y * y - 1) ** 3 - x * x * y ** 3
}

function halton(index: number, base: number) {
  let result = 0
  let fraction = 1 / base
  let value = index
  while (value > 0) {
    result += fraction * (value % base)
    value = Math.floor(value / base)
    fraction /= base
  }
  return result
}

function heartBoundary(angle: number): Point {
  let low = 0
  let high = 2
  for (let iteration = 0; iteration < 18; iteration += 1) {
    const radius = (low + high) / 2
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (heartEquation(x, y) <= 0) low = radius
    else high = radius
  }
  return { x: Math.cos(angle) * low, y: Math.sin(angle) * low }
}

function buildHeartTargets(total: number): Point[] {
  const targets: Point[] = []
  const outlineCount = Math.floor(total * 0.4)
  const scale = Math.min(width, height) * 0.265
  const centerY = height * 0.36

  for (let index = 0; index < outlineCount; index += 1) {
    const normalized = heartBoundary((index / outlineCount) * Math.PI * 2)
    targets.push({
      x: width / 2 + normalized.x * scale,
      y: centerY - normalized.y * scale,
    })
  }

  let candidate = 1
  while (targets.length < total) {
    const x = -1.2 + halton(candidate, 2) * 2.4
    const y = -1.05 + halton(candidate, 3) * 2.35
    candidate += 1
    if (heartEquation(x, y) > 0) continue
    targets.push({
      x: width / 2 + x * scale,
      y: centerY - y * scale,
    })
  }

  return targets
}

function infinityPoint(index: number, total: number): Point {
  const t = (index / total) * Math.PI * 2
  const scale = Math.min(width * 0.24, height * 0.17)
  const denominator = 1 + Math.sin(t) ** 2
  return {
    x: width / 2 + (scale * Math.cos(t)) / denominator,
    y: height * 0.42 + (scale * Math.sin(t) * Math.cos(t)) / denominator,
  }
}

function setTargets(shape: Shape) {
  const total = particles.length
  const heartTargets = shape === 'heart' ? buildHeartTargets(total) : null
  particles.forEach((particle, index) => {
    let point: Point
    if (shape === 'heart') {
      point = heartTargets![index]
    } else if (shape === 'infinity') {
      point = infinityPoint(index, total)
      const thickness = (Math.random() - 0.5) * 18
      point.x += thickness
      point.y += thickness * 0.45
    } else if (shape === 'ring') {
      const angle = (index / total) * Math.PI * 2
      const radius = Math.min(width, height) * (0.19 + Math.random() * 0.03)
      point = {
        x: width / 2 + Math.cos(angle) * radius,
        y: height * 0.42 + Math.sin(angle) * radius,
      }
    } else if (shape === 'collapse') {
      const angle = (index / total) * Math.PI * 12
      const radius = 4 + (index % 7)
      point = {
        x: width / 2 + Math.cos(angle) * radius,
        y: height * 0.42 + Math.sin(angle) * radius,
      }
    } else {
      point = { x: Math.random() * width, y: Math.random() * height }
    }
    particle.targetX = point.x
    particle.targetY = point.y
  })
}

function drawBackground(time: number) {
  const background = context.createRadialGradient(
    width * 0.5,
    height * 0.38,
    20,
    width * 0.5,
    height * 0.38,
    Math.max(width, height) * 0.78,
  )
  background.addColorStop(0, '#391725')
  background.addColorStop(0.45, '#170b16')
  background.addColorStop(1, '#08070c')
  context.fillStyle = background
  context.fillRect(0, 0, width, height)

  backgroundStars.forEach((star, index) => {
    const alpha = 0.18 + Math.sin(time * 0.0008 + index) * 0.12
    context.fillStyle = `rgba(255, 225, 209, ${alpha})`
    context.fillRect(star.x, star.y, index % 5 === 0 ? 1.5 : 1, index % 5 === 0 ? 1.5 : 1)
  })

  const horizon = context.createLinearGradient(0, height * 0.55, 0, height)
  horizon.addColorStop(0, 'rgba(133, 36, 69, 0)')
  horizon.addColorStop(1, 'rgba(105, 18, 50, 0.24)')
  context.fillStyle = horizon
  context.fillRect(0, height * 0.55, width, height * 0.45)
}

function drawScene(time: number, updateParticles = true) {
  drawBackground(time)
  particles.forEach((particle) => {
    if (updateParticles) particle.update()
    particle.draw()
  })
}

function animate(time: number) {
  drawScene(time)
  animationFrame = requestAnimationFrame(animate)
}

function schedule(delay: number, callback: () => void) {
  sequenceTimers.push(window.setTimeout(callback, reducedMotion ? Math.min(delay, 450) : delay))
}

function updatePerformance(index: string, text: string) {
  performanceCopy.classList.remove('refresh')
  void performanceCopy.offsetWidth
  performanceIndex.textContent = index
  performanceText.textContent = text
  performanceCopy.classList.add('refresh')
}

function updateChargeVisual() {
  starCore.style.setProperty('--charge', `${chargeProgress * 360}deg`)
  chargeLabel.textContent =
    chargeProgress > 0.72 ? '再坚持一下' : chargeProgress > 0.28 ? '星光正在回应' : '点亮星核'
}

function chargeLoop(time: number) {
  if (!interactionReady) return
  const elapsed = Math.min(50, chargeLastTime ? time - chargeLastTime : 16)
  chargeLastTime = time
  chargeProgress += charging ? elapsed / 1450 : -elapsed / 6500
  chargeProgress = Math.max(0, Math.min(1, chargeProgress))
  updateChargeVisual()

  if (chargeProgress >= 1) {
    triggerClimax()
    return
  }
  chargeFrame = requestAnimationFrame(chargeLoop)
}

function prepareInteraction() {
  interactionReady = true
  chargeProgress = 0
  chargeLastTime = 0
  charging = false
  starCore.classList.add('visible')
  chargeButton.disabled = false
  updatePerformance('03', '最后一点星光，交给你')
  updateChargeVisual()
  cancelAnimationFrame(chargeFrame)
  chargeFrame = requestAnimationFrame(chargeLoop)
}

function triggerClimax() {
  if (climaxTriggered) return
  climaxTriggered = true
  interactionReady = false
  charging = false
  cancelAnimationFrame(chargeFrame)
  chargeButton.disabled = true
  starCore.classList.add('complete')
  navigator.vibrate?.([35, 40, 90])
  updatePerformance('04', '心意已抵达')
  setTargets('collapse')
  playChime(392)

  schedule(1100, () => {
    starCore.classList.remove('visible', 'complete')
    performanceCopy.classList.add('hidden')
    explodeFromCenter()
    playChime(784)
  })
  schedule(1450, () => {
    setTargets('heart')
    playChime(659)
  })
  schedule(2600, () => {
    if (reducedMotion) fallbackHeart.classList.add('visible')
  })
  schedule(3700, () => {
    greeting.classList.add('visible')
    playChime(880)
  })
  schedule(5500, () => {
    replayButton.disabled = false
    replayButton.innerHTML = '<span aria-hidden="true">↻</span> 再看一次'
    actions.classList.add('visible')
  })
}

function explodeFromCenter() {
  particles.forEach((particle, index) => {
    const angle = (index / particles.length) * Math.PI * 2 + Math.random() * 0.18
    const force = 9 + Math.random() * 18
    particle.x = width / 2
    particle.y = height * 0.42
    particle.vx = Math.cos(angle) * force
    particle.vy = Math.sin(angle) * force
  })
  document.body.classList.remove('impact')
  void document.body.offsetWidth
  document.body.classList.add('impact')
  window.setTimeout(() => document.body.classList.remove('impact'), 900)
}

function runSequence() {
  sequenceTimers.forEach((timer) => window.clearTimeout(timer))
  sequenceTimers = []
  cancelAnimationFrame(chargeFrame)
  interactionReady = false
  climaxTriggered = false
  charging = false
  chargeProgress = 0
  starCore.classList.remove('visible', 'complete')
  starCore.style.setProperty('--charge', '0deg')
  replayButton.disabled = true
  replayButton.innerHTML = '<span aria-hidden="true">···</span> 播放中'
  greeting.classList.remove('visible')
  actions.classList.remove('visible')
  fallbackHeart.classList.remove('visible')
  performanceCopy.classList.remove('hidden')
  updatePerformance('01', '正在收集今晚的星光')
  setTargets('scatter')

  schedule(1000, () => {
    setTargets('ring')
    playChime(440)
  })
  schedule(2800, () => {
    updatePerformance('02', '把相遇写成无尽的轨迹')
    setTargets('infinity')
    playChime(554)
  })
  schedule(5000, prepareInteraction)
}

function beginExperience() {
  if (started) return
  started = true
  soundEnabled = true
  soundButton.classList.add('active')
  soundButton.setAttribute('aria-label', '关闭声音')
  soundButton.setAttribute('title', '关闭声音')
  playChime(330)
  startBgm()
  intro.classList.add('opening')
  threshold.classList.add('visible')
  openButton.disabled = true
  cardShell.setAttribute('aria-hidden', 'false')

  window.setTimeout(
    () => {
      document.body.classList.add('experience-started')
      intro.remove()
      cardShell.classList.add('active')
      window.setTimeout(() => {
        threshold.classList.remove('visible')
        window.setTimeout(() => threshold.remove(), reducedMotion ? 20 : 800)
        runSequence()
      }, reducedMotion ? 40 : 1500)
    },
    reducedMotion ? 80 : 1050,
  )
}

function burst(x: number, y: number) {
  if (!started) return
  const affected = particles
    .map((particle) => ({ particle, distance: Math.hypot(particle.x - x, particle.y - y) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 90)

  affected.forEach(({ particle }, index) => {
    const angle = (index / affected.length) * Math.PI * 2 + Math.random() * 0.3
    const force = 4 + Math.random() * 9
    particle.x = x
    particle.y = y
    particle.vx = Math.cos(angle) * force
    particle.vy = Math.sin(angle) * force
  })
  playChime(660)
}

function playChime(frequency = 523) {
  if (!soundEnabled) return
  const audio = getAudioContext()
  void audio.resume()
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, audio.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.5, audio.currentTime + 0.35)
  gain.gain.setValueAtTime(0.0001, audio.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.07, audio.currentTime + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.55)
  oscillator.connect(gain).connect(audio.destination)
  oscillator.start()
  oscillator.stop(audio.currentTime + 0.6)
}

function getAudioContext() {
  audioContext ??= new AudioContext()
  return audioContext
}

const bgmChords = [
  [261.63, 329.63, 392],
  [196, 246.94, 293.66],
  [220, 261.63, 329.63],
  [174.61, 220, 261.63],
]

function playBgmStep() {
  if (!soundEnabled || !bgmGain) return
  const audio = getAudioContext()
  const chordIndex = Math.floor(bgmStep / 8) % bgmChords.length
  const noteIndex = [0, 1, 2, 1, 2, 1, 0, 2][bgmStep % 8]
  const frequency = bgmChords[chordIndex][noteIndex]
  const now = audio.currentTime

  const bell = audio.createOscillator()
  const bellGain = audio.createGain()
  bell.type = 'triangle'
  bell.frequency.setValueAtTime(frequency * 2, now)
  bellGain.gain.setValueAtTime(0.0001, now)
  bellGain.gain.exponentialRampToValueAtTime(0.065, now + 0.025)
  bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.62)
  bell.connect(bellGain).connect(bgmGain)
  bell.start(now)
  bell.stop(now + 0.68)

  if (bgmStep % 2 === 1) {
    const sparkle = audio.createOscillator()
    const sparkleGain = audio.createGain()
    sparkle.type = 'sine'
    sparkle.frequency.setValueAtTime(frequency * 4, now)
    sparkleGain.gain.setValueAtTime(0.0001, now)
    sparkleGain.gain.exponentialRampToValueAtTime(0.018, now + 0.02)
    sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32)
    sparkle.connect(sparkleGain).connect(bgmGain)
    sparkle.start(now)
    sparkle.stop(now + 0.36)
  }

  if (bgmStep % 8 === 0) {
    bgmChords[chordIndex].forEach((note, index) => {
      const pad = audio.createOscillator()
      const padGain = audio.createGain()
      pad.type = index === 0 ? 'sine' : 'triangle'
      pad.frequency.setValueAtTime(note / 2, now)
      padGain.gain.setValueAtTime(0.0001, now)
      padGain.gain.exponentialRampToValueAtTime(0.026, now + 0.38)
      padGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.35)
      pad.connect(padGain).connect(bgmGain!)
      pad.start(now)
      pad.stop(now + 3.45)
    })
  }

  if (bgmStep % 4 === 0) {
    const bass = audio.createOscillator()
    const bassGain = audio.createGain()
    bass.type = 'sine'
    bass.frequency.setValueAtTime(bgmChords[chordIndex][0] / 2, now)
    bassGain.gain.setValueAtTime(0.0001, now)
    bassGain.gain.exponentialRampToValueAtTime(0.055, now + 0.035)
    bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72)
    bass.connect(bassGain).connect(bgmGain)
    bass.start(now)
    bass.stop(now + 0.78)
  }
  bgmStep += 1
}

function startBgm() {
  if (!soundEnabled || bgmTimer) return
  const audio = getAudioContext()
  void audio.resume()
  if (!bgmGain) {
    bgmGain = audio.createGain()
    bgmGain.gain.setValueAtTime(0.0001, audio.currentTime)
    bgmGain.connect(audio.destination)
  }
  const now = audio.currentTime
  bgmGain.gain.cancelScheduledValues(now)
  bgmGain.gain.setValueAtTime(Math.max(0.0001, Math.min(0.16, bgmGain.gain.value)), now)
  bgmGain.gain.exponentialRampToValueAtTime(0.15, now + 1.6)
  playBgmStep()
  bgmTimer = window.setInterval(playBgmStep, 440)
}

function stopBgm() {
  window.clearInterval(bgmTimer)
  bgmTimer = 0
  if (!audioContext || !bgmGain) return
  const now = audioContext.currentTime
  bgmGain.gain.cancelScheduledValues(now)
  bgmGain.gain.setValueAtTime(Math.max(0.0001, bgmGain.gain.value), now)
  bgmGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65)
}

function showToast(message: string) {
  window.clearTimeout(toastTimer)
  toast.textContent = message
  toast.classList.add('visible')
  toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 2200)
}

openButton.addEventListener('click', beginExperience)

chargeButton.addEventListener('pointerdown', (event) => {
  if (!interactionReady) return
  event.preventDefault()
  chargeButton.setPointerCapture(event.pointerId)
  charging = true
  starCore.classList.add('charging')
  navigator.vibrate?.(18)
  playChime(440 + chargeProgress * 220)
})

function stopCharging() {
  charging = false
  starCore.classList.remove('charging')
}

chargeButton.addEventListener('pointerup', stopCharging)
chargeButton.addEventListener('pointercancel', stopCharging)
chargeButton.addEventListener('lostpointercapture', stopCharging)
chargeButton.addEventListener('click', (event) => {
  if (!interactionReady) return
  chargeProgress = Math.min(1, chargeProgress + (event.detail === 0 ? 1 : 0.18))
  playChime(480 + chargeProgress * 260)
  updateChargeVisual()
  if (chargeProgress >= 1) triggerClimax()
})

cardShell.addEventListener('click', (event) => {
  if ((event.target as HTMLElement).closest('button, .actions, .topbar')) return
  burst(event.clientX, event.clientY)
})

replayButton.addEventListener('click', () => {
  if (replayButton.disabled) return
  runSequence()
  playChime(523)
})

soundButton.addEventListener('click', () => {
  soundEnabled = !soundEnabled
  soundButton.classList.toggle('active', soundEnabled)
  soundButton.setAttribute('aria-label', soundEnabled ? '关闭声音' : '开启声音')
  soundButton.setAttribute('title', soundEnabled ? '关闭声音' : '开启声音')
  if (soundEnabled) {
    playChime()
    startBgm()
  } else {
    stopBgm()
  }
})

shareButton.addEventListener('click', async () => {
  const shareData = {
    title: `${recipient}，有一封信想给你`,
    text: customMessage || '有些话，想慢一点告诉你。',
    url: window.location.href,
  }

  try {
    if (navigator.share) {
      await navigator.share(shareData)
      return
    }
    await navigator.clipboard.writeText(window.location.href)
    showToast('链接已复制，去微信粘贴分享吧')
  } catch (error) {
    if ((error as DOMException).name !== 'AbortError') showToast('长按浏览器地址栏复制链接')
  }
})

window.addEventListener('resize', resize)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(animationFrame)
    drawScene(performance.now(), false)
    stopBgm()
  } else {
    animationFrame = requestAnimationFrame(animate)
    if (started && soundEnabled) startBgm()
  }
})

resize()
drawScene(performance.now(), false)
animationFrame = requestAnimationFrame(animate)

if (import.meta.env.DEV && params.get('preview') === 'auto') {
  window.setTimeout(beginExperience, 120)
}
