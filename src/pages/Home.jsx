import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { Logo } from '../components/ui.jsx'

const STEPS = [
  ['Forward', 'A voice note or message asks for a payment. Forward it to TriGuard before you do anything.'],
  ['Check', 'TriGuard checks the voice, the words and the file, and asks you three quick questions about the payment.'],
  ['Understand', 'You get a clear risk level, the reasons in plain language, and what to do next.'],
  ['Call back', 'Call the person on the number already saved in TriGuard. No call-back, no payment.'],
]

const ICON = {
  voice: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  words: 'M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4V5a1 1 0 0 1 1-1zM8 9h8M8 12.5h5',
  payment: 'M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18',
  file: 'M12 2.5l8 3v6.2c0 5-3.4 8.6-8 9.8-4.6-1.2-8-4.8-8-9.8V5.5zM8.5 12l2.5 2.5 4.5-5',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  consent: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM16 11l2 2 4-4',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  check: 'M5 12l5 5 9-10',
}

const Icon = ({ d, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)

const GUARDS = [
  ['voice', 'Voice guard', 'Detects AI-generated voices, and compares the voice with the real person’s saved voiceprint (with their consent).'],
  ['words', 'Words guard', 'Transcribes the voice note and spots the scam script: urgency, secrecy, “new bank details”, “head office says”, “send airtime”.'],
  ['payment', 'Payment questions', 'Three quick yes/no questions: new supplier or changed bank details, a bigger amount than usual, or being told to skip approval. Each “yes” raises the risk.'],
  ['file', 'File safety', 'Every upload is checked for its real file type and scanned for malware, then deleted after checking.'],
]

const PRIVACY = [
  ['trash', 'Deleted after checking', 'Uploaded voice notes are removed as soon as the check is done.'],
  ['consent', 'Consent for voiceprints', 'A voiceprint is only saved when the person agrees, and can be deleted any time.'],
  ['lock', 'Only what’s needed', 'No bank account numbers, amounts or payee names are collected, and every decision is logged.'],
]

const PROMISES = ['Checks voice notes for AI cloning', 'Spots the payment-fraud script', 'No call-back, no payment']

export default function Home() {
  const { status } = useAuth()
  const signedIn = status === 'in'

  const primaryCta = signedIn
    ? <Link className="btn btn-accent btn-lg" to="/app/check">Check a voice note</Link>
    : <Link className="btn btn-accent btn-lg" to="/register">Explore</Link>

  return (
    <div className="home">
      <header className="home-nav">
        <div className="wrap nav-row">
          <Link to="/" aria-label="TriGuard AI home"><Logo light /></Link>
          <nav className="nav-actions">
            {signedIn ? (
              <Link className="btn btn-accent" to="/app">Go to dashboard</Link>
            ) : (
              <>
                <Link className="btn btn-ghost-light" to="/login">Log in</Link>
                <Link className="btn btn-accent" to="/register">Register</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="wrap hero-inner">
          <h1>Verify the voice <span>before you pay.</span></h1>
          <p className="hero-lede">
            Scammers clone the voice of the store owner, head office or a supplier and send an urgent request: pay for a stock delivery, buy airtime and vouchers, or send cash from the till.
            TriGuard checks the voice note for AI cloning, then makes sure someone confirms it on a number the scammer can’t control.
          </p>
          <div className="hero-actions">{primaryCta}</div>
          <ul className="hero-promises">
            {PROMISES.map(p => <li key={p}><Icon d={ICON.check} size={18} />{p}</li>)}
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <p className="section-kicker">How it works</p>
          <h2 className="section-title">Four steps between a voice note and a payment</h2>
          <ol className="timeline">
            {STEPS.map(([title, text], i) => (
              <li key={title} className={i === STEPS.length - 1 ? 'tl-step tl-key' : 'tl-step'}>
                <span className="tl-n">{i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section-alt">
        <div className="wrap">
          <p className="section-kicker">What gets checked</p>
          <h2 className="section-title">Four checks on every request</h2>
          <div className="guards-grid">
            {GUARDS.map(([icon, title, text]) => (
              <div key={title} className="guard-card">
                <span className="guard-icon"><Icon d={ICON[icon]} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="statement">
        <div className="wrap statement-inner">
          <p className="statement-quote">“No call-back, no payment.”</p>
          <p className="statement-text">
            Detection is never perfect, so TriGuard never marks anything as “safe”. The final check is always a call-back to a number you saved before any scam happened.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <p className="section-kicker">Privacy</p>
          <h2 className="section-title">Built with POPIA in mind</h2>
          <div className="privacy-grid">
            {PRIVACY.map(([icon, title, text]) => (
              <div key={title} className="privacy-card">
                <span className="privacy-icon"><Icon d={ICON[icon]} /></span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="section-note">Read the full <Link to="/privacy">privacy notice</Link>.</p>
        </div>
      </section>

      <section className="cta-band">
        <div className="wrap cta-inner">
          <h2>Check before your store pays.</h2>
          <div className="hero-actions">{primaryCta}</div>
        </div>
      </section>

      <footer className="home-footer">
        <div className="wrap footer-row">
          <Logo light />
          <span>© {new Date().getFullYear()} TriGuard AI · HackSecure 2026 · <Link to="/privacy">Privacy notice</Link></span>
        </div>
      </footer>
    </div>
  )
}
