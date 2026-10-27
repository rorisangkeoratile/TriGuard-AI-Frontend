import { memo, useEffect, useState } from 'react'
import { startSimulator } from './simulator/simulator.js'

// Elements with ids are filled and updated by the simulator, so the components that hold them
// are memoized and never re-render after mount. Switching sections only changes data-section on the wrapper.

const ICONS = {
  shield: <><path d="M12 2.5l8 3v6.2c0 5-3.4 8.6-8 9.8-4.6-1.2-8-4.8-8-9.8V5.5z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>,
  play: <><circle cx="12" cy="12" r="9" /><path d="M10 8.5v7l5.5-3.5z" /></>,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>,
  people: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><circle cx="17" cy="9" r="2.5" /><path d="M15.5 14.6A5 5 0 0 1 21 19.5" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  reset: <><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4h4" /></>,
  chat: <><path d="M4 20l1.5-4A8 8 0 1 1 9 19.5z" /><path d="M9 10.5c.5 1.5 2 3 3.5 3.5l1-1 2 1-.5 1.5c-3 0-6.5-3.5-6.5-6.5L10 8.5l1 2z" /></>,
  inbox: <><path d="M3 13l3-8h12l3 8v6H3z" /><path d="M3 13h5l1 2h6l1-2h5" /></>,
}

function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>
  )
}

const SECTIONS = [
  {
    id: 'scenarios', label: 'Scenarios', icon: 'play', title: 'Run a scenario',
    lede: 'Each button sends an event to the phone. The Scam and Real labels are for the presenter. The phone has to work it out by itself.',
  },
  {
    id: 'custom', label: 'Custom event', icon: 'edit', title: 'Send a custom event',
    lede: 'Type in your own number, message or email to see how TriGuard reacts.',
  },
  {
    id: 'accounts', label: 'Accounts', icon: 'people', title: 'Accounts and fake-account protection',
    lede: 'Try to cheat sign-up the way a scammer would. The phone shows what stops each attempt.',
  },
  {
    id: 'whatsapp', label: 'WhatsApp bot', icon: 'chat', title: 'TriGuard on WhatsApp',
    lede: 'For people who won’t install another app: forward a suspicious message to TriGuard’s WhatsApp number and get a verdict back. Same engine, no app needed.',
  },
  {
    id: 'review', label: 'Review queue', icon: 'inbox', title: 'Review queue',
    lede: 'When users say “TriGuard got this wrong”, it lands here. A person decides who is right, and confirmed mistakes become test cases so the rules improve.',
  },
]

const LanguagePicker = memo(function LanguagePicker() {
  return (
    <div className="sb-lang">
      <label className="sb-h" htmlFor="deskLang"><Icon name="globe" size={14} />App language</label>
      <select id="deskLang" />
      <p className="sb-note">
        South Africa’s 11 official languages. Menus, buttons, risk levels and key warnings are translated; detailed
        reasons and AI explanations stay in English for now. Translations are drafts and must be checked by native speakers.
      </p>
    </div>
  )
})

function Sidebar({ section, onSelect }) {
  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <Icon name="shield" size={30} />
        <b>Tri<span>Guard</span> AI</b>
        <small>Phone app simulator</small>
      </div>
      <nav className="sb-nav" aria-label="Demo desk">
        <p className="sb-h">Demo desk</p>
        {SECTIONS.map(s => (
          <button key={s.id} type="button" className={`sb-item${section === s.id ? ' on' : ''}`}
            aria-current={section === s.id ? 'page' : undefined} onClick={() => onSelect(s.id)}>
            <Icon name={s.icon} />{s.label}
          </button>
        ))}
      </nav>
      <LanguagePicker />
      <div className="sb-foot">
        <span className="tag"><i />Real logic: number lists, message checks, warnings</span>
        <span className="tag sim"><i />Simulated: incoming events, voice &amp; face scores</span>
        <button className="sb-item" type="button" data-act="reset"><Icon name="reset" />Reset simulation</button>
      </div>
    </aside>
  )
}

const DeskPanels = memo(function DeskPanels() {
  return (
    <>
      <section className="card" data-sec="scenarios" aria-label="Scenarios">
        <div className="scn-groups" id="scenarios" />
      </section>

      <section className="card" data-sec="custom" aria-label="Custom event">
        <form className="form" id="customForm" noValidate>
          <div className="field">
            <label htmlFor="cChannel">Channel</label>
            <select id="cChannel" defaultValue="sms">
              <option value="sms">SMS</option>
              <option value="call">Voice call</option>
              <option value="video">Video call</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="cFrom" id="cFromLab">From number</label>
            <input id="cFrom" defaultValue="072 555 3108" autoComplete="off" />
          </div>
          <div className="field" data-for="email">
            <label htmlFor="cName">Sender name</label>
            <input id="cName" defaultValue="Ubuntu Bank" autoComplete="off" />
          </div>
          <div className="field" data-for="email">
            <label htmlFor="cReply">Reply-to address (optional)</label>
            <input id="cReply" placeholder="someone@gmail.com" autoComplete="off" />
          </div>
          <div className="field full" data-for="email">
            <label htmlFor="cSubject">Subject</label>
            <input id="cSubject" defaultValue="Action needed on your account" autoComplete="off" />
          </div>
          <div className="field full">
            <label htmlFor="cText" id="cTextLab">Message</label>
            <textarea id="cText" defaultValue="Congratulations! You won R10,000 in the Spring Draw. Reply with your ID number and the OTP we send to claim today." />
          </div>
          <div className="field" data-for="email">
            <label htmlFor="cAttach">Attachment name (optional)</label>
            <input id="cAttach" placeholder="Statement.html" autoComplete="off" />
          </div>
          <div className="field" data-for="email" style={{ alignContent: 'end' }}>
            <label className="check"><input type="checkbox" id="cAuthFail" /> Sender checks fail (SPF/DMARC)</label>
          </div>
          <div className="field full" data-for="phone">
            <label className="check"><input type="checkbox" id="cSimSwap" /> The mobile network reports a recent SIM swap on this number</label>
          </div>
          <div className="field full" data-for="voice">
            <label htmlFor="cScore" id="cScoreLab">Simulated AI voice score: <span id="cScoreVal" className="mono">75%</span></label>
            <input type="range" id="cScore" min="0" max="100" defaultValue="75" />
          </div>
          <div className="full row-btns">
            <button className="btn" type="submit">Send to phone</button>
            <p className="err" id="cErr" role="alert" />
          </div>
        </form>
      </section>

      <section className="card" data-sec="accounts" aria-label="Accounts">
        <p className="acct-line" id="acctLine" />
        <div className="row-btns">
          <button className="btn" type="button" data-act="demo-login">Use demo account</button>
          <button className="btn ghost" type="button" data-act="logout">Log out</button>
        </div>
        <div className="scn-grid" id="attacks" />
        <h3 className="sub-h">Protection log</h3>
        <div id="protLog" />
      </section>

      <section className="card" data-sec="whatsapp" aria-label="WhatsApp bot">
        <div className="wa">
          <div className="wa-head">
            <span className="wa-av"><Icon name="shield" size={20} /></span>
            <span><b>TriGuard</b><small>WhatsApp chatbot · simulated</small></span>
          </div>
          <div className="wa-thread" id="botThread" aria-live="polite" />
          <div className="wa-samples" id="botSamples" />
          <form className="wa-form" id="botForm">
            <input id="botInput" placeholder="Paste or forward a message" autoComplete="off" aria-label="Message to check" />
            <button className="btn" type="submit">Send</button>
          </form>
        </div>
        <p className="lede" style={{ margin: 0 }}>
          In production this runs on the WhatsApp Business API: messages forwarded to TriGuard’s number go to the backend,
          which runs the same engine and replies. An SMS short code can do the same for basic phones.
        </p>
      </section>

      <section className="card" data-sec="review" aria-label="Review queue">
        <div id="reviewList" />
      </section>

      <section className="card" aria-label="Detection engine">
        <h2>What the detection engine saw</h2>
        <p className="lede">The signals behind the last event, with the points each one adds.</p>
        <div className="engine" id="engine" />
        <div className="scale"><span>0–29 Low</span><span>30–59 Medium</span><span>60–100 High</span><span>Never “Safe”</span></div>
      </section>
    </>
  )
})

const Phone = memo(function Phone() {
  return (
    <div className="phone-col">
      <div className="phone">
        <div className="screen" id="screen">
          <div className="notch" />
          <div className="sbar"><span id="clock" className="mono">20:41</span><span className="r">5G <span className="bat" /></span></div>
          <div className="appbody" id="appbody" />
          <nav className="tabbar" id="tabbar" />
          <div className="layer" id="callLayer" hidden />
          <button className="notif" id="notif" type="button" data-act="notif" aria-live="polite" />
          <div className="layer" id="sheetLayer" hidden />
          <div className="toast" id="toast" role="status" />
        </div>
      </div>
    </div>
  )
})

export default function App() {
  const [section, setSection] = useState('scenarios')
  const active = SECTIONS.find(s => s.id === section)

  useEffect(() => startSimulator(), [])

  return (
    <div className="shell">
      <Sidebar section={section} onSelect={setSection} />
      <main className="main">
        <header className="page-head">
          <h1>{active.title}</h1>
          <p>{active.lede}</p>
        </header>
        <div className="layout">
          <div className="desk" data-section={section}>
            <DeskPanels />
          </div>
          <Phone />
        </div>
      </main>
    </div>
  )
}
