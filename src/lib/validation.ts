import { z } from 'zod'

export function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed || /\s/.test(trimmed)) throw new Error('请输入有效的网址，网址中不能包含空格')
  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed)
  const url = new URL(hasScheme ? trimmed : `https://${trimmed}`)
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !url.hostname ||
    url.username ||
    url.password
  ) {
    throw new Error('仅支持不包含账号密码的 HTTP 或 HTTPS 网址')
  }
  return url.href
}

export const bookmarkSchema = z.object({
  title: z.string().trim().min(1, '请填写书签名称').max(200, '名称最多 200 个字符'),
  url: z.string().transform((value, ctx) => {
    try {
      return normalizeUrl(value)
    } catch {
      ctx.addIssue({ code: 'custom', message: '请输入有效的 HTTP 或 HTTPS 网址' })
      return z.NEVER
    }
  }),
  group_id: z.string({ error: '请选择分组' }).trim().min(1, '请选择分组'),
  is_pinned: z.boolean(),
})
export const todoSchema = z.object({
  title: z.string().trim().min(1, '写下要做的事').max(200, '标题最多 200 个字符'),
  details: z.string().max(10000, '详情最多 10000 个字符'),
  status: z.enum(['todo', 'doing', 'done']),
  due_at: z.iso.datetime({ offset: true }).nullable(),
})
export const groupNameSchema = z
  .string()
  .trim()
  .min(1, '请填写分组名称')
  .max(30, '分组名称最多 30 个字符')
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return '操作未完成，请检查网络后重试'
}
