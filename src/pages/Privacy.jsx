import { Link } from 'react-router-dom'
import { Logo } from '../components/ui.jsx'

// POPIA section 18: people must be told what is collected, why, and what their rights are.
// Fill in the Information Officer details before going live.
export default function Privacy() {
  return (
    <div className="legal">
      <header className="legal-head">
        <Link to="/" aria-label="TriGuard AI home"><Logo /></Link>
      </header>
      <main className="legal-body">
        <h1>Privacy notice</h1>
        <p className="muted">How TriGuard AI handles personal information under the Protection of Personal Information Act (POPIA).</p>

        <h2>Who we are</h2>
        <p>TriGuard AI helps retail stores check suspicious voice notes and payment requests before money is paid. The store that registers is responsible for the information its staff add to TriGuard.</p>
        <p>Information Officer: <b>[name]</b>, <b>[email address]</b></p>

        <h2>What we collect and why</h2>
        <ul>
          <li><b>Account details</b> (name, work email, store name, password): to give you and your staff access. Passwords are stored only as one-way hashes.</li>
          <li><b>Approved devices</b>: a random device key (stored only as a one-way hash), the browser and system type (for example “Chrome on Windows”), and when the device was approved, last used or blocked. This lets the store owner approve devices and block lost or stolen ones.</li>
          <li><b>Payment PIN</b>: stored only as a one-way hash, with a count of wrong tries so it can lock.</li>
          <li><b>Trusted contacts</b> (name, role, phone number): to call people back on a number you already trust before paying.</li>
          <li><b>Voice notes and messages you check</b>: to look for signs of fraud. Uploaded audio files are deleted after the check; the result and transcript are kept in your history.</li>
          <li><b>Voiceprints</b>: only with the person’s consent, to compare a voice note with their real voice. We keep the voiceprint, not the recording, and it can be deleted at any time.</li>
          <li><b>Your answers about the payment</b>: three yes/no questions (new supplier or changed bank details, bigger than usual, asked to skip approval). We don’t ask for amounts, payee names or bank account numbers.</li>
          <li><b>Call-backs and decisions</b>: who confirmed, released or blocked a payment, and when, so the store has a record.</li>
        </ul>
        <p>We use this information only to prevent payment fraud. We don’t sell it, use it for advertising, or track your location.</p>

        <h2>Who can see it</h2>
        <p>Only people in your store with a TriGuard account. Each store’s information is kept separate. Service providers who host TriGuard process it only on our instructions and must keep it secure.</p>

        <h2>How long we keep it</h2>
        <p>Checks and call-back records are kept for as long as your store needs them as a record of payment decisions, then deleted. Voiceprints are deleted when you remove them or the contact. Uploaded audio files are deleted as soon as the check is done. Device records are deleted when the device or the person is removed.</p>

        <h2>Your rights</h2>
        <p>You can ask to see the personal information we hold about you, have it corrected, or have it deleted, and you can object to it being processed. Contact the Information Officer above. If you’re not satisfied, you can complain to the Information Regulator at <a href="https://inforegulator.org.za" target="_blank" rel="noreferrer">inforegulator.org.za</a>.</p>

        <h2>Data in this browser</h2>
        <p>Your account, trusted contacts and checks are stored in this browser only. Voice notes you check are sent to the TriGuard server, analysed in memory and not stored. You can erase everything with “Delete all data in this browser” under Security.</p>

        <p className="legal-back"><Link to="/">‹ Back to TriGuard</Link></p>
      </main>
    </div>
  )
}
