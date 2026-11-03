import { secureGet, secureSet, secureRemove } from './coach-secrets.js'
import { MOBILE } from './mobile.js'
import legacyIds from './workoutx-legacy.json'

const KEY = 'workoutx.apiKey'
const PREF = 'opengym.workoutx.enabled'
const known = new Set(legacyIds)
const links = new Map()
const pending = new Map()
const listeners = new Set()
let sessionKey = null
let generation = 0
export const subscribeWorkoutX = cb => { listeners.add(cb); return () => listeners.delete(cb) }
export const workoutXRevision = () => generation
export const workoutXEnabled = () => { try { return localStorage.getItem(PREF) === '1' } catch { return false } }
export const workoutXKey = () => MOBILE ? secureGet(KEY) : Promise.resolve(sessionKey)
export async function configureWorkoutX(key, enabled) {
  if (key?.trim()) { if (MOBILE) await secureSet(KEY, key); else sessionKey = key.trim() }
  if (enabled && !await workoutXKey()) throw new Error('Cadastre sua chave WorkoutX primeiro.')
  localStorage.setItem(PREF, enabled ? '1' : '0')
  generation++; links.clear(); pending.clear()
  listeners.forEach(cb => cb())
}
export async function forgetWorkoutX() {
  await configureWorkoutX('', false)
  sessionKey = null
  if (MOBILE) await secureRemove(KEY)
}
export async function requestWorkoutX(path, key, signal) {
  const res = await fetch('https://api.workoutxapp.com/v2/' + path, {
    headers: { 'X-WorkoutX-Key': key }, signal, cache: 'no-store', credentials: 'omit',
  })
  if (!res.ok) throw new Error(({401:'Chave WorkoutX inválida.',403:'Este recurso exige outro plano WorkoutX.',429:'Limite de uso da WorkoutX atingido.'})[res.status] || 'WorkoutX indisponível (HTTP ' + res.status + ').')
  return res.json()
}
export async function testWorkoutX(key) {
  const c = new AbortController()
  const timer = setTimeout(() => c.abort(), 12000)
  try { return await requestWorkoutX('exercises?limit=1', key, c.signal) }
  finally { clearTimeout(timer) }
}
export function safeMedia(media) {
  try {
    const url = new URL(media?.mp4)
    return url.protocol === 'https:' && !url.username && !url.password ? media : null
  } catch { return null }
}
// Only original ExerciseDB ids belong to WorkoutX's legacy namespace. Never map newer
// openGym numeric ids automatically: the same number could name another movement.
export async function resolveWorkoutX(ex, figure = 'male', force = false) {
  if (!known.has(ex.id)) return null
  const cacheKey = ex.id + ':' + figure
  const cached = links.get(cacheKey)
  if (!force && cached && cached.until > Date.now()) return cached.value
  if (pending.has(cacheKey)) return pending.get(cacheKey)
  const gen = generation
  const task = (async () => {
    const key = await workoutXKey()
    if (!key) throw new Error('Cadastre sua chave WorkoutX nas configurações.')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    try {
      const match = await requestWorkoutX('exercises/legacy/' + encodeURIComponent(ex.id), key, controller.signal)
      if (!['exact', 'equivalent'].includes(match.match)) {
        if (generation === gen) links.set(cacheKey, {value:null, until:Date.now()+3600000})
        return null
      }
      let exercise = match.exercise
      if (exercise?.model !== figure && exercise?.counterpartId) {
        exercise = await requestWorkoutX('exercises/' + encodeURIComponent(exercise.counterpartId), key, controller.signal)
      }
      const media = safeMedia(exercise?.media)
      if (!media) return null
      const result = { media, id: exercise.id, watermarked: !!media.watermarked }
      const until = Math.min(Date.parse(media.expiresAt) || Date.now()+300000, Date.now()+86400000)-60000
      if (generation === gen) links.set(cacheKey, {value:result, until})
      return result
    } finally { clearTimeout(timeout) }
  })()
  pending.set(cacheKey, task)
  try { return await task } finally { if (pending.get(cacheKey) === task) pending.delete(cacheKey) }
}
