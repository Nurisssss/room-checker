import './style.css'
import { evaluateRequest } from './src/contract.js'
import { explainAvailability, validateOutput, MAX_NOTE_LENGTH, fallbackText } from './src/explain.js'
import { createRequestGuard } from './src/requestGuard.js'

const ROOM = 'B-204 (Seminar room)'
const NOW = 540 // 09:00
const MIN = 60000 // minutes -> ms, availability.js works with ms
const ROOM_ID = 'B-204'
const EXISTING_BOOKINGS = [{ id: 'B1', roomId: ROOM_ID, start: 10 * 60 * MIN, end: 11 * 60 * MIN }]

const fmt = (m) => {
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

const nowLabel = fmt(NOW)
const bookingLabels = EXISTING_BOOKINGS.map((b) => `${fmt(b.start / MIN)}–${fmt(b.end / MIN)}`)

const toMinutes = (t) => {
  if (!/^\d{1,2}:\d{2}$/.test(t)) return null
  const [h, m] = t.split(':').map(Number)
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return h * 60 + m
}

document.querySelector('#app').innerHTML = `
  <main class="page">
    <header class="hero">
      <h1>Smart Campus Room Availability Checker</h1>
      <p class="sub">Choose a start time and a duration, from 09:00.</p>
    </header>

    <section class="card room-card">
      <div class="room-head">
        <span class="room-icon" aria-hidden="true">📍</span>
        <div>
          <h2 id="roomName">${ROOM}</h2>
          <p class="now">Current time: <strong>${fmt(NOW)}</strong></p>
        </div>
      </div>

      <div class="bookings">
        <h3>Existing bookings today</h3>
        <ul id="bookingList"></ul>
      </div>

      <label class="block-toggle">
        <input type="checkbox" id="blocked" />
        <span>Room is blocked</span>
      </label>
    </section>

    <section class="card form-card">
      <h3>Check a time slot</h3>
      <form id="checkForm" novalidate>
        <div class="fields">
          <label class="field">
            <span>Start time</span>
            <input type="time" id="startInput" required />
          </label>
          <label class="field">
            <span>Duration (minutes)</span>
            <input type="number" id="durationInput" min="1" max="120" step="1" required />
          </label>
        </div>
        <button type="submit" id="checkBtn">Check availability</button>
      </form>

      <div id="result" class="result" hidden></div>
      <ul id="errors" class="errors" hidden></ul>

      <div id="explainControls" class="explain-controls" hidden>
        <button type="button" id="explainBtn">Explain availability</button>
        <label class="field">
          <span>Optional note (max 140 characters)</span>
          <input type="text" id="noteInput" maxlength="140" />
        </label>
        <label class="field">
          <span>Simulate failure</span>
          <select id="failMode">
            <option value="ok">None</option>
            <option value="error">Error</option>
            <option value="timeout">Timeout</option>
          </select>
        </label>
      </div>

      <div id="explainBox" class="explain-box" hidden>
        <p class="explain-label">AI-generated explanation (mock) – not a confirmed booking status</p>
        <p id="explainText"></p>
      </div>
    </section>

    <footer class="foot">Times run from 00:00 to 24:00. Endpoint-touching slots do not overlap.</footer>
  </main>
`

document.getElementById('bookingList').innerHTML =
  EXISTING_BOOKINGS.map((b) => `<li><span>${fmt(b.start / MIN)} – ${fmt(b.end / MIN)}</span></li>`).join('')

const form = document.getElementById('checkForm')
const startInput = document.getElementById('startInput')
const durationInput = document.getElementById('durationInput')
const blockedInput = document.getElementById('blocked')
const result = document.getElementById('result')
const errors = document.getElementById('errors')
const explainControls = document.getElementById('explainControls')
const explainBtn = document.getElementById('explainBtn')
const noteInput = document.getElementById('noteInput')
const failMode = document.getElementById('failMode')
const explainBox = document.getElementById('explainBox')
const explainText = document.getElementById('explainText')

const showErrors = (msgs) => {
  errors.hidden = false
  errors.innerHTML = msgs.map((m) => `<li>${m}</li>`).join('')
}
const showResult = (available, msg) => {
  result.hidden = false
  result.className = `result ${available ? 'ok' : 'no'}`
  result.innerHTML = `<strong>${available ? 'Available' : 'Unavailable'}</strong><p>${msg}</p>`
}
const clearOutput = () => {
  result.hidden = true
  errors.hidden = true
  explainControls.hidden = true
  explainBox.hidden = true
}

const setExplainBusy = (busy) => {
  explainBtn.disabled = busy
  explainBtn.textContent = busy ? 'Explaining…' : 'Explain availability'
}

const showFallback = (isAvailable, reasonCode) => {
  explainText.textContent = fallbackText({ isAvailable, reasonCode, ctx: { nowLabel, bookingLabels } })
  explainBox.className = 'explain-box fallback'
  explainBox.hidden = false
}

explainBtn.addEventListener('click', () => {
  if (!lastCheck) return
  const token = explainGuard.next()
  const note = noteInput.value
  if (note.length > MAX_NOTE_LENGTH) {
    if (!explainGuard.isCurrent(token)) return
    explainText.textContent = 'Note must be at most 140 characters.'
    explainBox.className = 'explain-box fallback'
    explainBox.hidden = false
    return
  }
  setExplainBusy(true)
  explainAvailability(
    { ...lastCheck.input, userNote: note },
    { mode: failMode.value }
  )
    .then(({ explanation }) => {
      if (!explainGuard.isCurrent(token)) return
      const err = validateOutput(explanation)
      if (err) {
        showFallback(lastCheck.isAvailable, lastCheck.reasonCode)
        return
      }
      explainText.textContent = explanation
      explainBox.className = 'explain-box'
      explainBox.hidden = false
    })
    .catch(() => {
      if (!explainGuard.isCurrent(token)) return
      showFallback(lastCheck.isAvailable, lastCheck.reasonCode)
    })
    .finally(() => {
      if (explainGuard.isCurrent(token)) setExplainBusy(false)
    })
})

let lastCheck = null
const explainGuard = createRequestGuard()

form.addEventListener('submit', (event) => {
  event.preventDefault()
  explainGuard.invalidate()
  lastCheck = null
  explainBox.hidden = true
  explainControls.hidden = true
  errors.hidden = true

  const rawDuration = durationInput.value.trim()
  const duration = rawDuration === '' ? NaN : Number(rawDuration)
  // decision and messages come from the pure contract layer
  const outcome = evaluateRequest(
    { startTime: startInput.value, durationMinutes: duration, blocked: blockedInput.checked },
    EXISTING_BOOKINGS,
    NOW
  )

  if (!outcome.valid) {
    // validation errors are clearly distinct from an Unavailable decision
    showErrors([outcome.message])
    return
  }

  // start already passed contract validation; parse for display only
  const [sh, sm] = startInput.value.split(':').map(Number)
  const start = sh * 60 + sm
  const end = start + outcome.durationMinutes

  explainBox.hidden = true
  explainControls.hidden = false
  lastCheck = {
    isAvailable: outcome.available,
    reasonCode: outcome.reasonCode,
    input: {
      roomLabel: ROOM,
      start: startInput.value,
      end: fmt(end),
      isAvailable: outcome.available,
      reasonCode: outcome.reasonCode,
    },
  }

  if (outcome.available) {
    showResult(true, `${fmt(start)}–${fmt(end)} is free to use.`)
    return
  }
  showResult(false, outcome.message)
})
