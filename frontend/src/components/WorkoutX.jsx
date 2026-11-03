import { useEffect, useState, useSyncExternalStore } from 'react'
import { useStore } from '../store/useStore.js'
import { figureOf } from '../lib/exercises.js'
import { MOBILE } from '../lib/mobile.js'
import { workoutXKey, workoutXRevision, configureWorkoutX, forgetWorkoutX, testWorkoutX, resolveWorkoutX, subscribeWorkoutX, workoutXEnabled } from '../lib/workoutx.js'
import { Section, Row, Button, Switch } from './ui.jsx'

export function WorkoutXSettings() {
  const enabled = useSyncExternalStore(subscribeWorkoutX, workoutXEnabled)
  const [key, setKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => { workoutXKey().then(v => setSaved(!!v)) }, [])
  const save = async () => {
    setBusy(true); setMessage('Verificando conexão…')
    try {
      const value = key.trim() || await workoutXKey()
      if (!value) throw new Error('Informe sua chave da WorkoutX.')
      await testWorkoutX(value)
      await configureWorkoutX(value, true)
      setSaved(true); setKey(''); setMessage('WorkoutX conectada. A qualidade depende do seu plano.')
    } catch (e) { setMessage(e.name === 'AbortError' ? 'Tempo de conexão esgotado.' : e.message) }
    finally { setBusy(false) }
  }
  return <Section title="Animações WorkoutX" footer="Requer internet. O plano gratuito fornece prévias com marca-d’água; 720p/30 fps exige plano pago. Apenas correspondências confirmadas substituem as animações originais.">
    <Row title="Usar WorkoutX" subtitle={saved ? 'Chave cadastrada neste aparelho' : 'Cadastre sua própria chave abaixo'}>
      <Switch checked={enabled} disabled={!saved || busy} onChange={async v => { try { await configureWorkoutX('', v) } catch (e) { setMessage(e.message) } }} />
    </Row>
    <div style={{padding:16}}>
      <label htmlFor="workoutx-key">Chave da API WorkoutX</label>
      <input id="workoutx-key" type="password" autoComplete="off" placeholder={saved ? 'Chave cadastrada; digite para trocar' : 'wx_…'} value={key} onChange={e => setKey(e.target.value)} style={{width:'100%', margin:'12px 0'}} />
      <p className="dim">{MOBILE ? 'A chave usa o armazenamento protegido do aparelho quando disponível; se indisponível, fica apenas nesta sessão.' : 'No navegador, a chave fica apenas nesta sessão.'} Nunca entra no backup dos treinos.</p>
      <Button disabled={busy} onClick={save}>Conectar e ativar</Button>
      {saved && <Button variant="danger" disabled={busy} onClick={async () => { await forgetWorkoutX(); setSaved(false); setKey(''); setMessage('Chave removida.') }}>Remover chave</Button>}
      <p role="status">{message}</p>
      <a href="https://workoutxapp.com/" target="_blank" rel="noreferrer">Obter chave na WorkoutX</a>
    </div>
  </Section>
}

export function WorkoutXMedia({ ex, minimizable, compact, id, fallback }) {
  const enabled = useSyncExternalStore(subscribeWorkoutX, workoutXEnabled)
  const revision = useSyncExternalStore(subscribeWorkoutX, workoutXRevision)
  const figure = useStore(s => figureOf(s.S))
  const size = useStore(s => s.S.gifSize)
  const update = useStore(s => s.update)
  const [state, setState] = useState(null)
  const [retry, setRetry] = useState({key:'',count:0})
  const identity = ex.id + ':' + figure + ':' + revision
  const refresh = retry.key === identity ? retry.count : 0
  const hidden = minimizable && size === 'off'
  const token = identity + ':' + enabled + ':' + refresh
  useEffect(() => {
    if (!enabled || hidden) return
    let alive = true
    resolveWorkoutX(ex, figure, refresh > 0).then(value => {
      if (alive) setState({ token, value })
    }, () => { if (alive) setState({ token, value: null }) })
    return () => { alive = false }
  }, [token, hidden])
  if (hidden) return null
  const result = enabled && state?.token === token ? state.value : null
  if (!result) return fallback
  // Direct streaming: never send provider clips through the built-in blob/offline cache.
  return <div className={'exmedia' + (compact ? ' compact' : '') + (minimizable && size === 'mini' ? ' mini' : '')} id={id}>
    <video key={result.media.mp4} className="catvid" src={result.media.mp4} autoPlay muted loop playsInline controls preload="metadata"
      aria-label={ex.n} onError={() => {
        if (refresh === 0) setRetry({key:identity,count:1})
        else setState({token, value:null})
      }} />
    {minimizable && <button className="giftoggle" onClick={() => update(s => { s.gifSize = size === 'mini' ? 'full' : 'mini' })}>{size === 'mini' ? 'Ampliar' : 'Reduzir'}</button>}
    <span className="gifhint" style={{pointerEvents:'none'}}>WorkoutX{result.watermarked ? ' · prévia' : ''}</span>
  </div>
}
