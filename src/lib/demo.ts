import type { DataSet, Entity, TodoStatus } from './types'
import { offsetDate } from './dates'

const now = new Date()
const entity = (index: number): Entity => ({
  id: `demo-${index}`,
  owner_id: 'demo',
  created_at: new Date(now.getTime() - index * 60000).toISOString(),
  updated_at: now.toISOString(),
})
const sites: [string, string, number][] = [
  ['GitHub', 'https://github.com', 0],
  ['Figma', 'https://figma.com', 1],
  ['Notion', 'https://notion.so', 3],
  ['Gmail', 'https://mail.google.com', 3],
  ['Supabase', 'https://supabase.com', 0],
  ['Vercel', 'https://vercel.com', 0],
  ['MDN Web Docs', 'https://developer.mozilla.org/zh-CN', 0],
  ['shadcn/ui', 'https://ui.shadcn.com', 0],
  ['React', 'https://react.dev', 0],
  ['Tailwind CSS', 'https://tailwindcss.com', 0],
  ['Mobbin', 'https://mobbin.com', 1],
  ['Are.na', 'https://are.na', 1],
  ['Dribbble', 'https://dribbble.com', 1],
  ['Awwwards', 'https://awwwards.com', 1],
  ['少数派', 'https://sspai.com', 2],
  ['Hacker News', 'https://news.ycombinator.com', 2],
  ['阮一峰的网络日志', 'https://ruanyifeng.com/blog', 2],
  ['Readwise Reader', 'https://read.readwise.io', 2],
  ['Excalidraw', 'https://excalidraw.com', 3],
  ['DeepL', 'https://deepl.com', 3],
]
const tasks: [string, string, TodoStatus, number | null, string][] = [
  ['整理本周收藏的设计参考', '挑出值得回看的页面，放进设计分组。', 'todo', -1, '18:00'],
  ['让司南有一个自己的样子', '暖灰背景、苔绿点缀，一个安静又顺手的工作台。', 'doing', 0, '18:00'],
  ['梳理书签分组', '按开发、设计、阅读、工具整理常用入口。', 'todo', 0, '20:00'],
  ['读完那篇关于留白的文章', '记录三个可以用在自己项目里的细节。', 'todo', 1, '20:00'],
  ['给个人项目写一份 README', '写清楚它解决什么问题，以及如何开始。', 'todo', 2, '18:00'],
  ['留点时间，走走看看', '带上相机，去附近的公园。', 'todo', 4, '16:00'],
  ['试试新的手冲配方', '水温 92°C，粉水比 1:15。', 'todo', null, '18:00'],
  ['整理想读的书', '', 'todo', null, '18:00'],
  ['确定项目名称：司南', '指引方向。', 'done', -2, '18:00'],
  ['选定暖灰视觉方向', '', 'done', -1, '18:00'],
]
export function createDemoData(): DataSet {
  return {
    bookmark_groups: ['开发', '设计', '阅读', '工具'].map((name, i) => ({
      ...entity(i),
      name,
      sort_order: i,
    })),
    bookmarks: sites.map(([title, url, group], i) => ({
      ...entity(i + 100),
      title,
      url,
      group_id: `demo-${group}`,
      is_pinned: i < 4,
      sort_order: i,
      pinned_order: i < 4 ? i : null,
    })),
    todos: tasks.map(([title, details, status, days, time], i) => ({
      ...entity(i + 200),
      title,
      details,
      status,
      due_at: days === null ? null : offsetDate(now, days, time),
      completed_at: status === 'done' ? now.toISOString() : null,
    })),
  }
}
