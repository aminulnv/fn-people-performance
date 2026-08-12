import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { layoutConfig } from '@/config/layout'
import { ApiError } from '@/lib/apiClient'
import { useAuth } from '@/lib/auth'
import { publicUrl } from '@/lib/publicUrl'
import '@/styles/layout-login.css'

function GoogleMark() {
  return (
    <svg
      className="pd-login__google-mark"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
      />
    </svg>
  )
}

function oauthErrorMessage(code: string | null): string | null {
  if (!code) return null
  switch (code) {
    case 'missing_code':
      return 'Google did not return an authorization code. Try again.'
    case 'invalid_state':
      return 'Sign-in expired or was interrupted. Try again.'
    case 'no_id_token':
      return 'Google did not return an ID token. Try again.'
    case 'no_email':
      return 'Google account has no email address.'
    case 'domain_not_allowed':
      return 'Only @nextventures.io accounts can sign in to this app.'
    case 'not_an_employee':
      return 'No People Performance account found for this email. Ask an admin to add you.'
    case 'inactive':
      return 'This account is inactive.'
    case 'auth_failed':
      return 'Google sign-in failed. Try again.'
    default:
      return 'Sign-in failed. Try again.'
  }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { status, signInWithGoogle, signInWithEmailPassword } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const oauthError = useMemo(
    () => oauthErrorMessage(params.get('error')),
    [params],
  )

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = publicUrl('images/login-f1-bg.avif')
    link.type = 'image/avif'
    document.head.appendChild(link)
    return () => {
      document.head.removeChild(link)
    }
  }, [])

  if (status === 'loading') {
    return (
      <div className="pd-route-fallback" aria-busy="true" aria-live="polite" />
    )
  }

  if (status === 'authenticated') {
    return <Navigate to="/" replace />
  }

  const handleGoogleSignIn = async () => {
    setBusy(true)
    setError(null)
    try {
      await signInWithGoogle()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.')
      setBusy(false)
    }
  }

  const handleEmailSignIn = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signInWithEmailPassword(username, password)
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { error?: string } | null
        setError(body?.error ?? 'Invalid username or password.')
      } else {
        setError(err instanceof Error ? err.message : 'Sign-in failed.')
      }
      setBusy(false)
    }
  }

  return (
    <div className="pd-login">
      <img
        src={publicUrl('images/FN Logo.svg')}
        alt="FundedNext"
        className="pd-login__corner-logo"
        width={86}
        height={44}
        decoding="async"
      />

      <div className="pd-login__card">
        <div className="pd-login__brand">
          {layoutConfig.brand.logoUrl ? (
            <div className="pd-app-logo pd-login__brand-logo">
              <img
                src={layoutConfig.brand.logoUrl}
                alt=""
                width={48}
                height={48}
                decoding="async"
              />
            </div>
          ) : null}
          <h1 className="pd-login__title">{layoutConfig.brand.name}</h1>
        </div>

        <div className="pd-login__actions">
          <p className="pd-login__subtitle">Sign in to continue</p>

          <form className="pd-login__form" onSubmit={(e) => void handleEmailSignIn(e)}>
            <label className="pd-login__field">
              <span className="pd-sr-only">Username</span>
              <div className="pd-login__username">
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  required
                  placeholder="username"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.replace(/@.*$/, ''))
                  }
                  className="pd-login__input pd-login__input--username"
                  disabled={busy}
                  spellCheck={false}
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                <span className="pd-login__domain" aria-hidden>
                  @nextventures.io
                </span>
              </div>
            </label>
            <label className="pd-login__field">
              <span className="pd-sr-only">Password</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pd-login__input"
                disabled={busy}
              />
            </label>
            <button
              type="submit"
              className="pd-login__submit"
              disabled={busy}
              aria-busy={busy || undefined}
            >
              Sign in with email
            </button>
          </form>

          <div className="pd-login__divider" aria-hidden>
            <span>or</span>
          </div>

          <button
            type="button"
            className="pd-login__google"
            disabled={busy}
            aria-busy={busy || undefined}
            onClick={() => void handleGoogleSignIn()}
          >
            <GoogleMark />
            Continue with Google
          </button>

          {error || oauthError ? (
            <p className="pd-login__error">{error ?? oauthError}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
