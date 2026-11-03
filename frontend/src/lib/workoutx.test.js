// @vitest-environment happy-dom
import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('./mobile.js', () => ({ MOBILE: true }))
const secret = vi.hoisted(() => ({ value: null }))
vi.mock('./coach-secrets.js', () => ({ secureGet: async () => secret.value, secureSet: async (_,v) => { secret.value=v }, secureRemove: async () => { secret.value=null } }))
import { configureWorkoutX, resolveWorkoutX, safeMedia, forgetWorkoutX } from './workoutx.js'
const media={mp4:'https://media.example/bench.mp4?token=abc',expiresAt:new Date(Date.now()+3600000).toISOString()}
const reply=body=>({ok:true,json:async()=>body})
beforeEach(async()=>{ vi.restoreAllMocks(); localStorage.clear(); await forgetWorkoutX(); await configureWorkoutX('wx_test',true) })
it('authenticates in headers, streams confirmed matches and reuses unexpired links',async()=>{
  const f=vi.fn().mockResolvedValue(reply({match:'exact',exercise:{id:'ex_bench',model:'male',media}})); vi.stubGlobal('fetch',f)
  expect((await resolveWorkoutX({id:'0025'})).media).toEqual(media)
  const [url,opts]=f.mock.calls[0]
  expect(url).toBe('https://api.workoutxapp.com/v2/exercises/legacy/0025')
  expect(opts.headers).toEqual({'X-WorkoutX-Key':'wx_test'})
  expect(opts.cache).toBe('no-store')
  await resolveWorkoutX({id:'0025'})
  expect(f).toHaveBeenCalledTimes(1)
  expect(localStorage.getItem('workoutx.apiKey')).toBeNull()
})
it.each(['alternative','closest','none'])('keeps original media for %s matches',async match=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(reply({match,exercise:{id:'ex_wrong',media}})))
  expect(await resolveWorkoutX({id:'0025'})).toBeNull()
})
it('does not map unknown catalogue ids',async()=>{
  const f=vi.fn(); vi.stubGlobal('fetch',f)
  expect(await resolveWorkoutX({id:'99999'})).toBeNull(); expect(f).not.toHaveBeenCalled()
})
it('uses the same-movement counterpart for female models',async()=>{
  const f=vi.fn().mockResolvedValueOnce(reply({match:'equivalent',exercise:{id:'ex_m',model:'male',counterpartId:'ex_f',media}})).mockResolvedValueOnce(reply({id:'ex_f',model:'female',media})); vi.stubGlobal('fetch',f)
  expect((await resolveWorkoutX({id:'0025'},'female')).id).toBe('ex_f')
  expect(f.mock.calls[1][0]).toContain('/exercises/ex_f')
})
it('rejects insecure media and reports quota errors',async()=>{
  expect(safeMedia({mp4:'http://media.example/test.mp4'})).toBeNull()
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:429}))
  await expect(resolveWorkoutX({id:'0025'})).rejects.toThrow('Limite de uso')
})
