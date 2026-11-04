import { useEffect, useRef, useState } from 'react'
import { FieldError } from '@/components/ui/field'
import { Button } from '@/components/ui/button'

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  remove: (id: string) => void
}
declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}
let scriptPromise: Promise<TurnstileApi> | undefined
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (!scriptPromise)
    scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.onload = () => {
        if (window.turnstile) resolve(window.turnstile)
        else {
          scriptPromise = undefined
          script.remove()
          reject(new Error('验证组件未就绪'))
        }
      }
      script.onerror = () => {
        scriptPromise = undefined
        script.remove()
        reject(new Error('无法加载验证组件，请检查网络并重试'))
      }
      document.head.append(script)
    })
  return scriptPromise
}
export function Turnstile({
  siteKey,
  onToken,
}: {
  siteKey: string
  onToken: (value: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    let widget: string | undefined
    let api: TurnstileApi | undefined
    onToken('')
    void loadTurnstile()
      .then((loaded) => {
        if (!active || !ref.current) return
        api = loaded
        widget = api.render(ref.current, {
          sitekey: siteKey,
          theme: 'light',
          size: 'flexible',
          callback: (token: string) => {
            if (!active) return
            setError('')
            onToken(token)
          },
          'expired-callback': () => {
            if (active) onToken('')
          },
          'timeout-callback': () => {
            if (!active) return
            onToken('')
            setError('验证已超时，请重试')
          },
          'error-callback': () => {
            if (active) {
              onToken('')
              setError('验证未完成，请重试')
            }
            return true
          },
        })
      })
      .catch((e) => {
        if (active) setError(e.message)
      })
    return () => {
      active = false
      if (api && widget !== undefined) api.remove(widget)
    }
  }, [siteKey, onToken, retry])
  return (
    <div>
      <div ref={ref} />
      {error ? (
        <>
          <FieldError>{error}</FieldError>
          <Button
            type="button"
            size="sm"
            variant="link"
            onClick={() => {
              setError('')
              onToken('')
              setRetry((value) => value + 1)
            }}
          >
            重新验证
          </Button>
        </>
      ) : null}
    </div>
  )
}
