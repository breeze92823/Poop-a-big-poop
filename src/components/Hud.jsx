import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { authState, isAvailable, login, showMenu, toggleCustomizer } from '../systems/bloxity.js'
import { settings } from '../systems/settingsState.js'
import { useAuth, useSettings } from '../systems/bloxityHooks.js'
import { getMoney, subscribeMoney } from '../systems/poop.js'

function FpsMeter() {
  const [fps, setFps] = useState(0)
  const frames = useRef(0)
  useEffect(() => {
    let raf
    let last = performance.now()
    const tick = (now) => {
      frames.current += 1
      if (now - last >= 500) {
        setFps(Math.round((frames.current * 1000) / (now - last)))
        frames.current = 0
        last = now
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <div className="hud-fps">{fps} FPS</div>
}

const LogoIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
    <rect x="4" y="15" width="16" height="5" rx="2.5" fill="#fff" />
    <rect x="6.5" y="10" width="11" height="5" rx="2.5" fill="#fff" />
    <rect x="9" y="5" width="6" height="5" rx="2.5" fill="#fff" />
  </svg>
)

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
    <path d="M4 6.5h16M4 12h16M4 17.5h16" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
    <path d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-7l-4.5 3.5v-3.5H5A1.5 1.5 0 0 1 3.5 15V6A1.5 1.5 0 0 1 5 4.5Z" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M7.5 9h9M7.5 12h6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

const BackpackIcon = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
    <path d="M9 5.5V4a3 3 0 0 1 6 0v1.5" fill="none" stroke="#b9c3c6" strokeWidth="1.7" />
    <rect x="5.5" y="5.5" width="13" height="15.5" rx="4" fill="none" stroke="#b9c3c6" strokeWidth="1.7" />
    <rect x="8.5" y="13" width="7" height="5" rx="1.5" fill="none" stroke="#b9c3c6" strokeWidth="1.7" />
    <path d="M8.5 10h7" stroke="#b9c3c6" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
)

function useMoney() {
  return useSyncExternalStore(subscribeMoney, getMoney)
}

// DOM overlay laid out like the reference: a top-left button cluster (logo,
// menu + chat pill, backpack), the tutorial banner floating on a dark cloud
// at the top centre and the cash counter bottom-left. Everything is
// pointer-events:none except the buttons, so taps reach the canvas.
export default function Hud() {
  useAuth()
  useSettings()
  const money = useMoney()
  const [chatOpen, setChatOpen] = useState(false)
  const [unread, setUnread] = useState(1)
  const sdkOn = isAvailable()
  const signedIn = !!authState.user

  const toggleChat = () => {
    setChatOpen((o) => !o)
    setUnread(0)
  }
  const openBackpack = () => {
    if (!sdkOn) return
    if (signedIn) toggleCustomizer()
    else login()
  }

  return (
    <div className="hud" style={{ '--hud-alpha': settings.background_transparency }}>
      <div className="hud-topbar">
        <button className="hud-btn hud-btn-round" aria-label="Home" onClick={showMenu}>
          <LogoIcon />
        </button>
        <div className="hud-pill">
          <button className="hud-btn" aria-label="Menu" onClick={showMenu}>
            <MenuIcon />
          </button>
          <button className="hud-btn" aria-label="Chat" onClick={toggleChat}>
            <ChatIcon />
            {unread > 0 && <span className="hud-badge">{unread}</span>}
          </button>
        </div>
        <button className="hud-btn hud-btn-round hud-btn-pack" aria-label="Backpack" onClick={openBackpack}>
          <BackpackIcon />
        </button>
      </div>

      {chatOpen && (
        <div className="hud-chat">
          <b>[System]</b> Welcome to the island! Tap anywhere to poop 💩
        </div>
      )}

      {settings.show_fps && <FpsMeter />}

      <div className="hud-banner">
        <span>Tutorial: Tap To Poop</span> <i aria-hidden>💩</i>
      </div>

      <div className="hud-money" key={money}>
        ${money.toFixed(2)}
      </div>
    </div>
  )
}
