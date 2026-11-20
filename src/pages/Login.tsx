import { useState, type FormEvent } from 'react'
import type { Go } from '../types'
import { site } from '../data/site'
import { signIn } from '../lib/auth'
import { isSupabaseConfigured } from '../lib/supabase'
import { Icon } from '../components/Icon'
import { Logo } from '../components/Logo'

export function Login({ go }: { go: Go }) {
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signIn(email, password)
      go('admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-visual">
        <img src={site.loginSrc} alt={site.loginAlt}/>
        <div>
          <Logo onClick={() => go('home')}/>
          <blockquote>“Photography is the story I fail to put into words.”</blockquote>
          <span>— Destin Sparks</span>
        </div>
      </div>

      <div className="login-form">
        <button className="back-dark" onClick={() => go('home')}>← Back to portfolio</button>
        <div>
          <span className="eyebrow">Private access</span>
          <h1>Welcome back,<br/><em>{site.firstName}.</em></h1>
          <p>Sign in to manage your photography archive.</p>
          <form onSubmit={submit}>
            <label>Email address
              <input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}/>
            </label>
            <label>Password
              <span className="password">
                <input required type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}/>
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}><Icon name="eye"/></button>
              </span>
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="login-submit" disabled={busy || !isSupabaseConfigured}>
              {busy ? 'Signing in…' : 'Sign in'} <Icon name="arrow"/>
            </button>
          </form>
          {!isSupabaseConfigured && <small>Supabase is not connected yet.</small>}
        </div>
      </div>
    </div>
  )
}
