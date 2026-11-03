import { describe, expect, it } from 'vitest'
import { bookmarkSchema, normalizeUrl, todoSchema } from './validation'

describe('网址与表单边界', () => {
  it('补全 HTTPS 并规范化重复网址', () => {
    expect(normalizeUrl(' github.com ')).toBe('https://github.com/')
    expect(normalizeUrl('https://GITHUB.COM')).toBe('https://github.com/')
  })
  it('拒绝脚本协议、数据协议和内嵌密码', () => {
    // 本地域名仅用于拒绝非法协议和内嵌密码的测试。
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,hello',
      'ftp://localhost',
      'https://me:secret@localhost',
      'hello world',
    ]) {
      expect(() => normalizeUrl(url)).toThrow()
    }
  })
  it('拒绝空标题和过长详情', () => {
    expect(
      bookmarkSchema.safeParse({ title: '  ', url: 'github.com', group_id: null, is_pinned: false })
        .success,
    ).toBe(false)
    expect(
      todoSchema.safeParse({
        title: '任务',
        details: 'a'.repeat(10001),
        status: 'todo',
        due_at: null,
      }).success,
    ).toBe(false)
  })
})
