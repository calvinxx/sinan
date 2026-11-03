import { useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Brand } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel, FieldError } from '@/components/ui/field'
import { accountEmail, captchaSiteKey, supabase } from '@/lib/supabase'
import { Turnstile } from './turnstile'

export function Login() {
  const [pin, setPin] = useState('')
  const [visible, setVisible] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState('')
  const [attempt, setAttempt] = useState(0)
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (pending || !supabase) return
    if (!/^\d{8,64}$/.test(pin)) {
      setError('请输入至少 8 位数字 PIN')
      return
    }
    setPending(true)
    setError('')
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: accountEmail,
        password: pin,
        options: { captchaToken: token || undefined },
      })
      if (authError) throw authError
      setPin('')
    } catch (e) {
      const status = (e as { status?: number }).status
      setError(
        status === 429
          ? '尝试次数过多，请稍后再试'
          : !navigator.onLine
            ? '网络已断开，请联网后重试'
            : '未能登录，请检查 PIN 或稍后重试',
      )
      setToken('')
      setAttempt((v) => v + 1)
    } finally {
      setPending(false)
    }
  }
  return (
    <main className="login-page">
      <div className="login-card">
        <Brand />
        <form onSubmit={submit} className="editor-form">
          <FieldGroup>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="pin">PIN</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="pin"
                  autoFocus
                  type={visible ? 'text' : 'password'}
                  inputMode="numeric"
                  autoComplete="current-password"
                  maxLength={64}
                  value={pin}
                  aria-invalid={!!error}
                  onChange={(e) => setPin(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={visible ? '隐藏 PIN' : '显示 PIN'}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </Field>
          </FieldGroup>
          {captchaSiteKey ? (
            <Turnstile key={attempt} siteKey={captchaSiteKey} onToken={setToken} />
          ) : null}
          {error ? <FieldError>{error}</FieldError> : null}
          <Button type="submit" disabled={pending || (Boolean(captchaSiteKey) && !token)}>
            {pending ? '正在进入…' : '进入司南'}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </form>
      </div>
    </main>
  )
}
