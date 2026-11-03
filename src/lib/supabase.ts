import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
export const accountEmail = import.meta.env.VITE_ACCOUNT_EMAIL?.trim() ?? ''
const anyConfig = !!(url || key || accountEmail)
export const demoMode =
  import.meta.env.VITE_DEMO_MODE === 'true' ||
  (import.meta.env.VITE_DEMO_MODE === undefined && import.meta.env.DEV && !anyConfig)
export const captchaSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? ''
function configureClient() {
  if (demoMode) return { client: null, error: null }
  if (!url || !key || !accountEmail)
    return { client: null, error: '请配置 Supabase 项目地址、publishable key 和个人账号邮箱。' }
  try {
    const parsed = new URL(url)
    if (
      !['https:', 'http:'].includes(parsed.protocol) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail)
    )
      throw new Error('invalid config')
    if (key.startsWith('sb_secret_'))
      return { client: null, error: '前端必须使用 publishable key，请更正项目配置。' }
    return {
      client: createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      }),
      error: null,
    }
  } catch {
    return {
      client: null,
      error: 'Supabase 配置格式有误，请检查项目地址、publishable key 和账号邮箱。',
    }
  }
}
const config = configureClient()
export const configError = config.error
export const supabase = config.client
