import { beforeEach, describe, expect, it } from 'vitest'
import { demoRequest, demoSession, resetDemo } from './demo.js'

const post = (path, json) => demoRequest(path, 'POST', json)
const get = path => demoRequest(path, 'GET')
const put = (path, json) => demoRequest(path, 'PUT', json)

// Logs in or registers from the device with key `device`. Returns the user, or { step: 'pending' } on an unapproved device.
async function signIn(path, body, device = 'key-' + (body.email || 'blank')) {
  const r = await post(path, { ...body, device_key: device, device_name: 'Till 1' })
  return r.step === 'done' ? r.user : r
}

async function owner() {
  return signIn('/auth/register', { full_name: 'Thandi Nkosi', company: 'Acme', email: 'thandi@acme.co.za', password: 'strong-pass-1', accept_terms: true })
}

// The owner adds a staff member, who sets up a phone that the owner approves. Each has their own tab (session).
async function approvedStaff() {
  await owner()
  const ownerTab = demoSession.get()
  await post('/team', { full_name: 'Lebo Molefe', email: 'lebo@acme.co.za', password: 'staff-pass-1' })
  demoSession.set(null)
  const pending = await signIn('/auth/login', { email: 'lebo@acme.co.za', password: 'staff-pass-1' }, 'lebo-phone')
  demoSession.set(ownerTab)
  await post(`/devices/${pending.device.id}/approve`)
  demoSession.set(null)
  const staff = await signIn('/auth/login', { email: 'lebo@acme.co.za', password: 'staff-pass-1' }, 'lebo-phone')
  return { staff, ownerTab, staffTab: demoSession.get(), deviceId: pending.device.id }
}

describe('demo mode API', () => {
  beforeEach(() => resetDemo())

  it('protects an existing account with its own password', async () => {
    const u = await owner()
    expect(u).toMatchObject({ role: 'owner', company: 'Acme' })
    await post('/auth/logout')
    await expect(get('/auth/me')).rejects.toMatchObject({ status: 401 })
    await expect(post('/auth/login', { email: 'thandi@acme.co.za', password: 'someone-else' })).rejects.toMatchObject({ status: 401 })
    await expect(post('/auth/register', { email: 'thandi@acme.co.za', password: 'someone-else' })).rejects.toMatchObject({ status: 401 })
    expect(await signIn('/auth/login', { email: 'THANDI@acme.co.za', password: 'strong-pass-1' }, 'key-thandi@acme.co.za')).toMatchObject({ id: u.id })
  })

  it('collects no bank details: anything extra that is sent is ignored and not stored', async () => {
    await owner()
    const check = await post('/checks/text', { text: 'Pay now', amount: 100, payee_name: 'X', account_number: '62004418817' })
    const stored = JSON.stringify(check)
    expect(stored).not.toContain('62004418817')
    expect(check).not.toHaveProperty('amount')
    expect(check).not.toHaveProperty('payee_name')
    expect(check).not.toHaveProperty('account_last4')
  })

  it('raises the risk for each “yes” to the payment questions', async () => {
    await owner()
    const none = await post('/checks/text', { text: 'Please pay the usual supplier.' })
    const one = await post('/checks/text', { text: 'Please pay the usual supplier.', larger_than_usual: true })
    const two = await post('/checks/text', { text: 'Please pay the usual supplier.', larger_than_usual: true, skip_approval: true })
    expect(one.score).toBeGreaterThan(none.score)
    expect(two.score).toBeGreaterThan(one.score)
    expect(two.payment_answers).toEqual({ new_payee_or_bank_change: null, larger_than_usual: true, skip_approval: true })
    expect(none.guards.payment.status).toBe('skipped')
  })

  it('accepts any details: blank registration, and login with a new email creates an account', async () => {
    const blank = await signIn('/auth/register', { full_name: '', company: '', email: '', password: '' })
    expect(blank).toMatchObject({ full_name: 'Demo', company: 'My Store', role: 'owner' })
    await post('/auth/logout')
    const fresh = await signIn('/auth/login', { email: 'jane.doe@x', password: '1' })
    expect(fresh).toMatchObject({ full_name: 'Jane Doe', email: 'jane.doe@x' })
    expect(fresh.id).not.toBe(blank.id)
  })

  it('flags a changed-bank-details payment request as high risk', async () => {
    await owner()
    const sipho = await post('/contacts', { name: 'Sipho', role_title: 'Owner', phone: '+27825550143' })
    const check = await post('/checks/text', {
      text: 'Urgent: our bank details changed, pay the invoice today and keep this confidential.',
      claimed_contact_id: sipho.id, sender_number: '+27615558890', new_payee_or_bank_change: true, skip_approval: true,
    })
    expect(check.level).toBe('high')
    expect(check.signals.map(s => s.id)).toEqual(expect.arrayContaining(['bank_change', 'secrecy', 'number_mismatch', 'new_payee_or_bank_change', 'skip_approval']))
  })

  it('reads yes/no answers sent with a voice note upload', async () => {
    await owner()
    const form = new FormData()
    form.append('file', new Blob(['audio'], { type: 'audio/ogg' }), 'note.ogg')
    form.append('new_payee_or_bank_change', 'true')
    form.append('larger_than_usual', 'false')
    const realFetch = globalThis.fetch
    // The backend's voice check, answering for a genuine-sounding voice.
    globalThis.fetch = async () => Response.json({ model: { available: true, synthetic_probability: 0.1 }, transcript: '' })
    try {
      const check = await demoRequest('/checks/voice', 'POST', undefined, form)
      expect(check.payment_answers).toEqual({ new_payee_or_bank_change: true, larger_than_usual: false, skip_approval: null })
      expect(check.guards.voice_clone.status).toBe('ran')
      expect(check.voice_score).toBe(0.1)
    } finally {
      globalThis.fetch = realFetch
    }
  })

  it('recognises retail scams: head office, airtime and till cash', async () => {
    await owner()
    const check = await post('/checks/text', {
      text: 'Hi, this is head office. Send R2 000 airtime to this number and take R5 000 from the till for the driver. Do not tell the area manager.',
    })
    expect(check.level).toBe('high')
    expect(check.signals.map(s => s.id)).toEqual(expect.arrayContaining(['authority', 'untraceable', 'till_cash', 'secrecy']))
  })

  it('flags a fake executive who offers a video call as proof (the Arup pattern)', async () => {
    await owner()
    const check = await post('/checks/text', {
      text: 'From the CFO: process the confidential transfer today. Let’s confirm on a Teams call: https://teams.microsoft.com/l/meetup-join/abc',
      skip_approval: true,
    })
    expect(check.level).toBe('high')
    expect(check.signals.map(s => s.id)).toEqual(expect.arrayContaining(['meeting_link', 'authority', 'secrecy']))
    expect(check.callback_status).toBe('pending') // the payment stays on hold until a call-back
  })

  it('never releases a payment without a confirmed call-back', async () => {
    await owner()
    const check = await post('/checks/text', { text: 'Please pay R5 000 to the usual supplier.' })
    await expect(post(`/checks/${check.id}/decision`, { action: 'released' })).rejects.toMatchObject({ status: 409 })
    await post(`/checks/${check.id}/callback`, { outcome: 'confirmed', note: 'ok' })
    await put('/auth/pin', { pin: '204871', password: 'strong-pass-1' })
    const done = await post(`/checks/${check.id}/decision`, { action: 'released', pin: '204871' })
    expect(done).toMatchObject({ decision: 'released', decided_by_name: 'Thandi Nkosi' })
    expect((await get('/dashboard')).released_this_month).toBe(1)
  })

  it('saves no result, rather than a misleading "Low risk", when the voice could not be analysed', async () => {
    await owner()
    await expect(demoRequest('/checks/voice', 'POST', undefined, new FormData())).rejects.toMatchObject({ status: 503 })
    expect((await get('/checks')).total).toBe(0)
  })

  it('keeps each store’s data separate', async () => {
    await owner()
    const check = await post('/checks/text', { text: 'Pay now' })
    await post('/auth/logout')
    await signIn('/auth/register', { full_name: 'Other Owner', company: 'Other', email: 'o@other.co.za', password: 'strong-pass-2', accept_terms: true })
    await expect(get(`/checks/${check.id}`)).rejects.toMatchObject({ status: 404 })
    expect((await get('/checks')).total).toBe(0)
  })

  it('approves the owner’s first device, but not a second one until the owner says so', async () => {
    const u = await owner()
    expect(u.device).toMatchObject({ name: 'Till 1', status: 'approved' })
    await post('/auth/logout')
    const elsewhere = await signIn('/auth/login', { email: 'thandi@acme.co.za', password: 'strong-pass-1' }, 'unknown-laptop')
    expect(elsewhere).toMatchObject({ step: 'pending' })
    await expect(get('/auth/me')).rejects.toMatchObject({ status: 401 })
    await expect(post('/auth/login', { email: 'thandi@acme.co.za', password: 'strong-pass-1' })).rejects.toMatchObject({ status: 400 })
  })

  it('lets staff in only on a device the owner approved', async () => {
    await owner()
    const ownerTab = demoSession.get()
    await post('/team', { full_name: 'Lebo Molefe', email: 'lebo@acme.co.za', password: 'staff-pass-1' })
    demoSession.set(null)
    const pending = await signIn('/auth/login', { email: 'lebo@acme.co.za', password: 'staff-pass-1' }, 'lebo-phone')
    expect(pending).toMatchObject({ step: 'pending', device: { status: 'pending' } })
    await expect(get('/auth/me')).rejects.toMatchObject({ status: 401 })
    await expect(post(`/devices/${pending.device.id}/approve`)).rejects.toMatchObject({ status: 401 })
    demoSession.set(ownerTab)
    expect((await get('/auth/me')).pending_devices).toBe(1)
    await post(`/devices/${pending.device.id}/approve`)
    demoSession.set(null)
    expect(await signIn('/auth/login', { email: 'lebo@acme.co.za', password: 'staff-pass-1' }, 'lebo-phone')).toMatchObject({ role: 'staff' })
    await expect(post(`/devices/${pending.device.id}/approve`)).rejects.toMatchObject({ status: 403 })
  })

  it('signs out a lost or stolen device and keeps it out', async () => {
    const { ownerTab, staffTab, deviceId } = await approvedStaff()
    expect(await get('/auth/me')).toMatchObject({ role: 'staff' })
    demoSession.set(ownerTab)
    await post(`/devices/${deviceId}/block`)
    demoSession.set(staffTab)
    await expect(get('/auth/me')).rejects.toMatchObject({ status: 401, message: expect.stringMatching(/blocked/) })
    // Whoever has the phone and knows the password is still refused.
    await expect(signIn('/auth/login', { email: 'lebo@acme.co.za', password: 'staff-pass-1' }, 'lebo-phone')).rejects.toMatchObject({ status: 403 })
  })

  it('won’t block the device you’re using', async () => {
    const u = await owner()
    await expect(post(`/devices/${u.device.id}/block`)).rejects.toMatchObject({ status: 400 })
  })

  it('needs the payment PIN to release a payment, and locks it after 5 wrong tries', async () => {
    await owner()
    const check = await post('/checks/text', { text: 'Please pay the usual supplier.' })
    await post(`/checks/${check.id}/callback`, { outcome: 'confirmed' })
    await expect(post(`/checks/${check.id}/decision`, { action: 'released', pin: '204871' })).rejects.toMatchObject({ status: 403 })
    await expect(put('/auth/pin', { pin: '204871', password: 'wrong' })).rejects.toMatchObject({ status: 403 })
    await expect(put('/auth/pin', { pin: '123456', password: 'strong-pass-1' })).rejects.toMatchObject({ status: 422 })
    expect(await put('/auth/pin', { pin: '204871', password: 'strong-pass-1' })).toMatchObject({ has_pin: true, pin_locked: false })
    for (let i = 4; i >= 1; i--) {
      await expect(post(`/checks/${check.id}/decision`, { action: 'released', pin: '000001' })).rejects.toMatchObject({ message: `Wrong PIN. ${i} ${i === 1 ? 'try' : 'tries'} left.` })
    }
    await expect(post(`/checks/${check.id}/decision`, { action: 'released', pin: '000001' })).rejects.toMatchObject({ message: expect.stringMatching(/locked/) })
    await expect(post(`/checks/${check.id}/decision`, { action: 'released', pin: '204871' })).rejects.toMatchObject({ status: 423 })
    await put('/auth/pin', { pin: '583920', password: 'strong-pass-1' })
    expect(await post(`/checks/${check.id}/decision`, { action: 'released', pin: '583920' })).toMatchObject({ decision: 'released' })
  })

  it('signs out and blocks a removed staff member', async () => {
    const { ownerTab, staffTab, staff } = await approvedStaff()
    demoSession.set(ownerTab)
    await demoRequest(`/team/${staff.id}`, 'DELETE')
    demoSession.set(staffTab)
    await expect(get('/auth/me')).rejects.toMatchObject({ status: 401, message: expect.stringMatching(/removed/) })
  })

  it('lets only the owner change trusted contacts', async () => {
    const { ownerTab, staffTab } = await approvedStaff()
    demoSession.set(ownerTab)
    const sipho = await post('/contacts', { name: 'Sipho', role_title: 'Owner', phone: '+27825550143' })
    demoSession.set(staffTab)
    await put('/auth/password', { current_password: 'staff-pass-1', new_password: 'lebo-own-pass-2' })
    expect(await get('/contacts')).toHaveLength(1)
    await expect(post('/contacts', { name: 'Fake', phone: '+27615558890' })).rejects.toMatchObject({ status: 403 })
    await expect(demoRequest(`/contacts/${sipho.id}`, 'DELETE')).rejects.toMatchObject({ status: 403 })
  })

  it('makes staff replace the temporary password before using TriGuard', async () => {
    await approvedStaff()
    expect(await get('/auth/me')).toMatchObject({ must_change_password: true })
    await expect(get('/checks')).rejects.toMatchObject({ status: 403 })
    await expect(put('/auth/password', { current_password: 'wrong', new_password: 'lebo-own-pass-2' })).rejects.toMatchObject({ status: 403 })
    await expect(put('/auth/password', { current_password: 'staff-pass-1', new_password: 'short' })).rejects.toMatchObject({ status: 422 })
    expect(await put('/auth/password', { current_password: 'staff-pass-1', new_password: 'lebo-own-pass-2' })).toMatchObject({ must_change_password: false })
    expect((await get('/checks')).total).toBe(0)
    // The owner no longer knows it: the old temporary password stops working.
    await post('/auth/logout')
    await expect(signIn('/auth/login', { email: 'lebo@acme.co.za', password: 'staff-pass-1' }, 'lebo-phone')).rejects.toMatchObject({ status: 401 })
    expect(await signIn('/auth/login', { email: 'lebo@acme.co.za', password: 'lebo-own-pass-2' }, 'lebo-phone')).toMatchObject({ role: 'staff' })
  })

  it('lets the owner reset a staff password, which signs the staff member out', async () => {
    const { ownerTab, staffTab, staff } = await approvedStaff()
    demoSession.set(ownerTab)
    await put(`/team/${staff.id}/password`, { password: 'new-temp-pass-3' })
    demoSession.set(staffTab)
    await expect(get('/auth/me')).rejects.toMatchObject({ status: 401, message: expect.stringMatching(/password was changed/) })
    expect(await signIn('/auth/login', { email: 'lebo@acme.co.za', password: 'new-temp-pass-3' }, 'lebo-phone')).toMatchObject({ must_change_password: true })
  })

  it('resets a forgotten owner password with a one-time link', async () => {
    await owner()
    await post('/auth/logout')
    expect(await post('/auth/forgot', { email: 'nobody@x.co.za' })).toEqual({ sent: true })
    const { demo_reset_token: token } = await post('/auth/forgot', { email: 'thandi@acme.co.za' })
    await expect(post('/auth/reset', { token: 'guess', new_password: 'brand-new-pass-4' })).rejects.toMatchObject({ status: 400 })
    await post('/auth/reset', { token, new_password: 'brand-new-pass-4' })
    await expect(post('/auth/reset', { token, new_password: 'another-pass-5' })).rejects.toMatchObject({ status: 400 })
    expect(await signIn('/auth/login', { email: 'thandi@acme.co.za', password: 'brand-new-pass-4' }, 'key-thandi@acme.co.za')).toMatchObject({ role: 'owner' })
  })
})
