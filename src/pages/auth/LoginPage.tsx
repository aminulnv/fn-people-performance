import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { layoutConfig } from '@/config/layout'
import { useAuth } from '@/lib/auth'
import { DEMO_ACCOUNTS } from '@/lib/demoAccounts'
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

export default function LoginPage() {
  const navigate = useNavigate()
  const { status, signInWithGoogle, signInWithDemoAccount } = useAuth()
  const [busy, setBusy] = useState<'google' | string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // CSS backgrounds are invisible to the preload scanner — hint the AVIF early.
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = publicUrl('images/login-f1-bg.avif')
    link.type = 'image/avif'
    document.head.appendChild(link)
    return () => {
      link.remove()
    }
  }, [])

  if (status === 'authenticated') {
    return <Navigate to="/" replace />
  }

  const finishSignIn = () => navigate('/', { replace: true })

  const handleGoogleSignIn = async () => {
    setBusy('google')
    setError(null)
    try {
      await signInWithGoogle()
      finishSignIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.')
      setBusy(null)
    }
  }

  const handleSelectAccount = async (email: string) => {
    setBusy(email)
    setError(null)
    try {
      await signInWithDemoAccount(email)
      finishSignIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.')
      setBusy(null)
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
          <p className="pd-login__subtitle">
            Sign in with your NEXT Ventures account to continue.
          </p>

          <button
            type="button"
            className="pd-login__google"
            disabled={busy !== null}
            aria-busy={busy === 'google' || undefined}
            onClick={() => void handleGoogleSignIn()}
          >
            <GoogleMark />
            Continue with Google
          </button>

          <div className="pd-login__divider" role="separator">
            <span>Or use a demo account</span>
          </div>

          <div className="pd-login__accounts" aria-label="Demo accounts">
            {DEMO_ACCOUNTS.map((account) => {
              const isBusy = busy === account.email
              return (
                <button
                  key={account.email}
                  type="button"
                  className="pd-login__account"
                  disabled={busy !== null}
                  title={account.email}
                  aria-label={`Sign in as ${account.roleLabel} (${account.email})`}
                  aria-busy={isBusy || undefined}
                  onClick={() => void handleSelectAccount(account.email)}
                >
                  <span
                    className="pd-login__account-avatar"
                    style={{
                      background: `hsl(${account.avatarHue} 55% 42%)`,
                    }}
                    aria-hidden
                  >
                    {account.name
                      .split(/\s+/)
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)}
                  </span>
                  <span className="pd-login__account-role">
                    {account.roleLabel}
                  </span>
                </button>
              )
            })}
          </div>

          {error ? <p className="pd-login__error">{error}</p> : null}
          <p className="pd-login__hint">Authorized members only.</p>
        </div>
      </div>
    </div>
  )
}
