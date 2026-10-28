# TriGuard API contract (what the frontend expects)

The React app calls these endpoints. All paths start with `/api`. In development, Vite forwards `/api` to `VITE_API_URL` (default `http://localhost:8000`), so the browser treats the backend as the same origin.

## Conventions

- **Session:** log in and register set an **httpOnly cookie** (suggested: `SameSite=Strict`, `Secure` in production). The frontend never reads a token. A missing or expired session returns `401` on any endpoint.
- **CSRF:** every request sends the header `X-Requested-With: TriGuard`. Reject state-changing requests (`POST`, `PUT`, `DELETE`) without it.
- **JSON** in and out, except the two audio uploads (`multipart/form-data`).
- **Errors:** `{"detail": "Message shown to the user"}`, or FastAPI's validation shape `{"detail": [{"loc": ["body", "email"], "msg": "..."}]}`. The frontend shows `detail` as-is, and maps validation errors onto form fields by the last item in `loc`, so write messages for end users.
- **Dates:** ISO 8601 strings. **Money:** rand, as a number. **Phone numbers:** the frontend sends `+27…` format (`082 555 0143` becomes `+27825550143`).
- **Risk levels:** `low | medium | high`. Never return "safe".

## Objects

```jsonc
// User
{ "id": 1, "full_name": "Thandi Nkosi", "email": "thandi@acme.co.za", "role": "owner", "company": "Mzansi Corner Store", "created_at": "..." }
// role: "owner" | "staff"

// Contact (trusted person, number saved before any scam)
{ "id": 3, "name": "Sipho Dlamini", "role_title": "Owner", "phone": "+27825550143", "has_voiceprint": true, "created_at": "..." }

// Signal (one reason behind the risk level). points 0 = a note shown separately, not a warning.
{ "id": "voice_ai_high", "points": 45, "text": "The voice shows strong signs of being AI-generated (87%).", "guard": "voice" }
// guard: "voice" | "words" | "payment" | "file"

// Guard status (one per guard, so the user sees what actually ran)
{ "status": "ran", "detail": "AI-voice probability 87%." }
// status: "ran" | "skipped" | "unavailable" | "error"

// Check (full result)
{
  "id": 42,
  "kind": "voice",                       // "voice" | "text"
  "claimed_contact": Contact | null,     // who it says it's from
  "sender_number": "+27615558890",       // "" if not given
  "content": "Transcript or message text",
  "language": "English",                 // "" if unknown
  "payment_answers": {                  // the three yes/no questions; null = not answered
    "new_payee_or_bank_change": true, "larger_than_usual": false, "skip_approval": null
  },
  "level": "high", "score": 85,
  "signals": [Signal],                   // most serious first
  "guards": {                            // keys the UI names: voice_clone, voice_match, transcription, words, payment, file_safety
    "voice_clone": GuardStatus, "voice_match": GuardStatus, "transcription": GuardStatus,
    "words": GuardStatus, "payment": GuardStatus, "file_safety": GuardStatus
  },
  "voice_score": 0.87, "speaker_similarity": 0.12,   // null when not run
  "explanation": "Plain-language explanation (Claude Haiku or a template).",
  "callback_status": "pending",          // "pending" | "confirmed" | "denied" | "no_answer"
  "callback_note": "", "callback_at": null, "callback_by_name": null,
  "decision": "none",                    // "none" | "released" | "blocked"
  "decided_at": null, "decided_by_name": null,
  "created_by_name": "Thandi Nkosi", "created_at": "..."
}

// CheckSummary (lists)
{ "id": 42, "kind": "voice", "sender": "Sipho Dlamini", "level": "high", "score": 85,
  "headline": "Short line: transcript start or top reason",
  "callback_status": "pending", "decision": "none", "created_at": "..." }
```

## Endpoints

### Auth and team
| Method & path | Body | Returns |
|---|---|---|
| `POST /auth/register` | `{full_name, company, email, password, accept_terms: true, device_key, device_name}` | `201` **LoginResult** (below). Creates the store (`company` is the store name); the user is its `owner`. `409` if the email exists. |
| `POST /auth/login` | `{email, password, device_key, device_name}` | **LoginResult**. `401` on a wrong email or password (same message for both). `403` if this device is blocked. `429` after repeated failures. |
| `POST /auth/login/otp` | `{challenge, code}` | **LoginResult**. The second step when the account has sign-in codes on (see below). `401` wrong code (say how many tries are left) or expired challenge; `429` after 5 wrong codes, and the challenge is deleted. |
| `POST /auth/totp/setup` | `{password}` | `{secret, otpauth_url}`: a new TOTP secret (RFC 6238, SHA-1, 6 digits, 30 s), kept as *pending* until enabled. `403` wrong password. |
| `POST /auth/totp/enable` | `{code}` | Me with `has_totp: true`. `422` if the code doesn't match the pending secret, so a mis-scanned app can't lock the user out. `409` if no set-up was started. |
| `POST /auth/totp/disable` | `{password}` | Me with `has_totp: false`. `403` wrong password. |
| `PUT /auth/pin` | `{pin, password}` | Me. Sets or changes the payment PIN, and unlocks a locked one. `403` wrong password, `422` weak PIN. |
| `PUT /auth/password` | `{current_password, new_password}` | Me. `403` wrong current password, `422` weak or unchanged. Ends the user's other sessions. Clears `must_change_password`. |
| `POST /auth/forgot` | `{email}` | Always `{"sent": true}`, whether or not the email exists. For an active **owner**, email a one-time reset link (`/reset-password?token=…`), valid 30 minutes; store only a hash of the token. Staff get no link: their owner resets them. Rate-limit it. |
| `POST /auth/reset` | `{token, new_password}` | `{"ok": true}`. `400` if the token is wrong, used or expired; `422` weak password. Ends all the user's sessions. |
| `POST /auth/logout` | none | `204`, clears the cookie |
| `GET /auth/me` | none | **Me**, or `401`. Also `401` once the session's device is no longer approved: put the reason in `detail`, the login page shows it. |
| `GET /team` | none | `[User]`: active people in the user's store |
| `POST /team` | `{full_name, email, password}` | `201` User (role `staff`). Owner only (`403` otherwise). `password` is temporary: set `must_change_password: true`. |
| `PUT /team/{id}/password` | `{password}` | User. Owner only, staff only. Sets a new temporary password, sets `must_change_password`, and ends that person's sessions. |
| `DELETE /team/{id}` | none | `204`. Owner only. Should deactivate, not delete, so the history of their checks stays. |

Password rules the frontend already checks: at least 10 characters, not only letters or only digits.

**Sign-in codes (two-step sign-in):** when the user has TOTP on, a correct password returns `{"step": "otp", "challenge": "<random token>"}` and **no session**. The challenge lives 5 minutes and is bound to that user and device. `POST /auth/login/otp` checks the code against the current 30-second step ±1, refuses any step at or before the last one used (no replays), then continues exactly like a normal login (device approval and so on). Store the TOTP secret encrypted at rest; it can't be hashed because the server needs it to compute codes. `PUT /team/{id}/password` also turns off that staff member's sign-in codes (lost phone), and they set them up again. Use an authenticator app, not SMS: SMS codes can be stolen with a SIM swap.

**Session timeouts:** end a session after **15 minutes without activity** and **8 hours after login** in any case, and return `401` with the reason in `detail` ("You were signed out after 15 minutes without activity…" / "Your session ended after 8 hours…"). Any request counts as activity except the app's background re-check of `GET /auth/me`, which it sends every few seconds; it adds `?active=1` only when the person used the page since the last check. Use an HttpOnly, Secure, SameSite=Strict session cookie (never readable by JavaScript), and a session cookie with no expiry date, so closing the browser ends it.

**Temporary passwords:** while `must_change_password` is true, every endpoint except `GET /auth/me`, `PUT /auth/password` and `POST /auth/logout` returns `403` ("Change your temporary password first."). The frontend shows only the change-password screen until then.

### Approved devices and stolen devices
Each browser creates a random `device_key` (32 bytes, base64url) once and sends it with log in and register, plus a `device_name` like "Chrome on Windows". Store only a hash of the key.

```jsonc
// LoginResult
{ "step": "done", "user": Me }           // approved device: set the session cookie
{ "step": "pending", "device": Device }  // new or unapproved device: NO session; the owner must approve it first
{ "step": "otp", "challenge": "…" }      // sign-in codes on: NO session yet; send the code to POST /auth/login/otp

// Me = User plus:
{ "device": Device, "has_pin": true, "has_totp": true, "pin_locked": false, "pending_devices": 2, "must_change_password": false }   // pending_devices: owners only, else 0

// Device
{ "id": 9, "name": "Chrome on Windows", "status": "approved", "user_id": 4, "user_name": "Lebo Molefe",
  "current": false, "created_at": "...", "approved_at": "...", "last_used_at": "...", "blocked_at": null }
// status: "pending" | "approved" | "blocked"; current = the device making this request
```

Server rules:
- **New devices:** a key not seen before for this user becomes a new device. A store owner's **first** device is approved at once; every other device is `pending` until the owner approves it.
- **Only approved devices get a session.** Every endpoint returns `401` unless the session's device is `approved`.
- **Remote sign-out:** blocking a device ends every session on it at once, and a blocked device's key gets `403` at login even with the right password. The frontend re-checks `/auth/me` every 5 seconds and on focus, so a stolen device is signed out within seconds. Removing a staff member blocks all their devices.
- A device key in the browser can be copied by malicious code on the page, so in production also set a long-lived httpOnly `device` cookie and require both.

| Method & path | Body | Returns |
|---|---|---|
| `GET /devices` | none | `[Device]`: the owner sees every device in the store, staff only their own. Pending first. |
| `POST /devices/{id}/approve` | none | Device. Owner only. `409` unless pending. |
| `POST /devices/{id}/block` | none | Device, now `blocked`, its sessions ended. Owner: any device in the store; staff: their own. `400` for the device making the request. Can't be undone. |

### Payment PIN
A 6-digit PIN each user sets under Security (not one repeated digit, not 123456 or 654321). Hash it like a password (Argon2 or bcrypt). It's required to **release** a payment (see `/checks/{id}/decision`). After **5 wrong tries** it locks (`423`) until the user sets a new one with their password.

### Trusted contacts
| Method & path | Body | Returns |
|---|---|---|
| `GET /contacts` | none | `[Contact]` |
| `POST /contacts` | `{name, role_title, phone}` | `201` Contact. **Owner only** (`403` for staff), as for every change below: call-backs only protect the store if staff can't swap a number. Staff can list contacts. |
| `DELETE /contacts/{id}` | none | `204` |
| `POST /contacts/{id}/voiceprint` | multipart: `file` (audio), `consent` = `"true"` | Contact with `has_voiceprint: true`. Keep only the ECAPA embedding; delete the recording. |
| `DELETE /contacts/{id}/voiceprint` | none | `204` |

### Checks
| Method & path | Body | Returns |
|---|---|---|
| `POST /checks/voice` | multipart: `file` (audio, max 15 MB), optional `claimed_contact_id`, `sender_number`, `new_payee_or_bank_change`, `larger_than_usual`, `skip_approval` (each `"true"`/`"false"`, or left out if not answered) | `201` Check |
| `POST /checks/text` | JSON: `{text, claimed_contact_id, sender_number, new_payee_or_bank_change, larger_than_usual, skip_approval}` (answers are `true`/`false`/`null`; all but `text` may be null/empty) | `201` Check |
| `GET /checks?level=&callback=&limit=20&offset=0` | none | `{"items": [CheckSummary], "total": 57}`, newest first |
| `GET /checks/{id}` | none | Check (`404` if it belongs to another store) |
| `POST /checks/{id}/callback` | `{outcome: "confirmed" \| "denied" \| "no_answer", note}` | updated Check (records who and when) |
| `POST /checks/{id}/decision` | `{action: "released" \| "blocked", pin}` | updated Check. **`409` for `released` unless `callback_status` is `confirmed`** ("no call-back, no payment" must be enforced on the server, not only in the UI). For `released`, `pin` is required: `403` if no PIN is set or it's wrong (`detail`: "Wrong PIN. 3 tries left."), `423` once locked. |

Audio the frontend lets users pick: WhatsApp voice notes (OGG/Opus), MP3, M4A, WAV, WebM, FLAC. Check the real type from the file's bytes and scan it with ClamAV before decoding.

### Dashboard
`GET /dashboard` returns:
```json
{ "checks_this_month": 12, "high_risk_this_month": 3, "awaiting_callback": 2,
  "released_this_month": 7, "blocked_this_month": 2, "recent": [CheckSummary] }
```
`recent`: the latest 5 checks.

## Payment check (POPIA minimality)
The payment check is three yes/no questions answered by staff. Each `true` raises the risk (suggested weights: new supplier or changed bank details +30, bigger than usual +15, asked to skip approval +25; the first and third together are High on their own). It needs no company data. **Don't collect amounts, payee names, bank account numbers or payment history**: TriGuard doesn't need them (POPIA section 10), and the frontend no longer sends them. Ignore those fields if a client sends them.

## Data scope
Every query must be limited to the logged-in user's store. A user must never see another store's contacts, checks or team, even by guessing IDs.
