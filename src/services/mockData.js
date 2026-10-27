// Demo-only data the mock detector answers from. In API mode the backend provides all of this.
// Everything here is fictional except well-known website addresses of real organisations.

// Link reputation: hosts the demo treats as known scam sites (a real backend uses Safe Browsing, PhishTank, URLhaus).
export const DEMO_BLOCKLIST = ['ubuntubank-verify.com', 'sars-efiling-refund.co', 'swiftparcel-za.delivery-fee.co']

// Scams going around this week (a real backend groups recent community reports by scam type).
export const DEMO_WAVES = [
  { id: 'sassa', name: 'Fake SASSA grant SMS', reports: 412, days: 3, pattern: 'sassa|srd grant|r370 grant', tip: 'SASSA never asks you to update details through a link in an SMS.' },
  { id: 'fine', name: 'Fake traffic-fine SMS', reports: 268, days: 5, pattern: '(traffic|toll) fine|aarto|outstanding fine', tip: 'Check fines only on the official site you type in yourself.' },
]
export const DEMO_NEW_WAVE = { id: 'power', name: 'Fake load-shedding refund SMS', reports: 57, days: 0, pattern: 'load.?shedding (refund|compensation)|electricity refund', tip: 'Power utilities and municipalities don’t pay refunds through SMS links.' }

// Bank account verification: accounts the demo "bank" knows (a real backend uses the banks' account verification service).
export const DEMO_ACCOUNTS = { 'karoo supplies (pty) ltd': '62001234567' }

// Data breaches the demo email appears in (a real backend uses a breach-notification API).
export const DEMO_BREACHES = {
  'naledi.d@example.com': [
    { name: 'QuickCart Online', date: '2024-08', data: ['Email', 'Phone number', 'Name', 'Delivery address'] },
    { name: 'FitLife Gym', date: '2023-02', data: ['Email', 'Password'] },
  ],
}
