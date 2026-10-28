import { describe, expect, it } from 'vitest'
import { isPhone, normalisePhone, passwordProblem, pinProblem } from './format.js'

describe('normalisePhone', () => {
  it('turns local South African numbers into +27 format', () => {
    expect(normalisePhone('082 555 0143')).toBe('+27825550143')
    expect(normalisePhone('+27 82 555 0143')).toBe('+27825550143')
    expect(normalisePhone('0027825550143')).toBe('+27825550143')
    expect(normalisePhone('27825550143')).toBe('+27825550143')
  })
  it('rejects things that are not phone numbers', () => {
    expect(isPhone('12345')).toBe(false)
    expect(isPhone('hello')).toBe(false)
    expect(isPhone('082 555 0143')).toBe(true)
  })
})

describe('passwordProblem', () => {
  it('asks for length and a mix of characters', () => {
    expect(passwordProblem('short1')).toMatch(/10 characters/)
    expect(passwordProblem('onlyletterslong')).toMatch(/Mix/)
    expect(passwordProblem('letters-and-9')).toBe('')
  })
})

describe('pinProblem', () => {
  it('needs 6 digits that are hard to guess', () => {
    expect(pinProblem('1234')).toMatch(/6 digits/)
    expect(pinProblem('12a456')).toMatch(/6 digits/)
    expect(pinProblem('111111')).toMatch(/easy/)
    expect(pinProblem('123456')).toMatch(/easy/)
    expect(pinProblem('654321')).toMatch(/easy/)
    expect(pinProblem('204871')).toBe('')
  })
})
