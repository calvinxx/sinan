import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Brand } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { EmptyList, ListSkeleton } from '@/components/feedback'
import { Login } from '@/features/auth/login'
import { configError, demoMode, supabase } from '@/lib/supabase'
import { clearDraft } from '@/hooks/use-editor'

const Workbench = lazy(() => import('./workbench'))
export function App() {
  const client = useQueryClient()
  const [owner, setOwner] = useState<string | null>(demoMode ? 'demo' : null)
  const [checking, setChecking] = useState(!demoMode && !configError)
  const [sessionError, setSessionError] = useState(false)
  useEffect(() => {
    if (!supabase) return
    let active = true
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setOwner(session?.user.id ?? null)
      setChecking(false)
      setSessionError(false)
      if (!session) client.clear()
    })
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return
        setOwner(data.session?.user.id ?? null)
        setSessionError(Boolean(error))
        setChecking(false)
      })
      .catch(() => {
        if (active) {
          setSessionError(true)
          setChecking(false)
        }
      })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [client])
  async function signOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) {
      toast.error('退出失败，请稍后重试')
      return
    }
    if (owner) clearDraft(owner)
    client.clear()
    setOwner(null)
  }
  if (configError)
    return (
      <main className="setup-page">
        <Brand />
        <EmptyList title="司南还差最后一步配置" detail={configError} />
        <p>
          请按项目 README 配置环境变量并重新构建。若仅体验界面，可显式设置 VITE_DEMO_MODE=true。
        </p>
      </main>
    )
  if (checking)
    return (
      <main className="setup-page">
        <Brand />
        <ListSkeleton />
      </main>
    )
  if (sessionError)
    return (
      <main className="setup-page">
        <Brand />
        <EmptyList title="暂时无法确认登录状态" detail="请检查网络，再重新加载。" />
        <Button onClick={() => window.location.reload()}>重新加载</Button>
      </main>
    )
  if (!owner) return <Login />
  return (
    <Suspense
      fallback={
        <main className="setup-page">
          <Brand />
          <ListSkeleton />
        </main>
      }
    >
      <Workbench key={owner} ownerId={owner} onSignOut={() => void signOut()} />
    </Suspense>
  )
}
export class AppErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError() {
    return { error: true }
  }
  render() {
    return this.state.error ? (
      <main className="setup-page">
        <Brand />
        <EmptyList title="页面遇到了一点问题" detail="已保存的数据不会受影响，请重新加载后再试。" />
        <Button onClick={() => window.location.reload()}>重新加载</Button>
      </main>
    ) : (
      this.props.children
    )
  }
}
