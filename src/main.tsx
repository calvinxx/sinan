import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { App, AppErrorBoundary } from '@/app/app'
import { Toaster } from '@/components/ui/sonner'
import '@/styles/index.css'

const client = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
})
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={client}>
        <MotionConfig reducedMotion="user">
          <App />
          <Toaster position="bottom-center" closeButton />
        </MotionConfig>
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
