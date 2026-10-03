// Every word Ricky shows, in each language the `language` option offers.

export type Language = 'en' | 'zh'

export type Strings = {
  spinnerWords: string[]
  turnDone: (elapsed: string) => string
  commandDescription: string
  commandReply: string
  tasks: string
  subagents: string
  running: (n: number) => string
  calls: (n: number) => string
  recent: string
  filesChanged: string
  newFile: string
  edits: (n: number) => string
}

const EN: Strings = {
  spinnerWords: ['Ricky is casting', 'Ricky is stargazing', 'Ricky is chasing the moon', 'Ricky is weaving dreams', 'Ricky is reading the stars'],
  turnDone: elapsed => `✦ Ricky cast with you for ${elapsed}`,
  commandDescription: "Open Ricky's pixel pane",
  commandReply: 'Ricky is here ✦',
  tasks: '✦ Tasks',
  subagents: '✦ Subagents',
  running: n => `${n} running`,
  calls: n => `${n} call${n === 1 ? '' : 's'}`,
  recent: '✦ Recent',
  filesChanged: '✦ Files changed',
  newFile: 'new',
  edits: n => `${n} edit${n === 1 ? '' : 's'}`,
}

const ZH: Strings = {
  spinnerWords: ['Ricky 施法中', 'Ricky 摘星中', 'Ricky 追月中', 'Ricky 织梦中', 'Ricky 占星中'],
  turnDone: elapsed => `✦ Ricky 陪你施法了 ${elapsed}`,
  commandDescription: '打开 Ricky 的像素面板',
  commandReply: 'Ricky 来啦 ✦',
  tasks: '✦ 任务',
  subagents: '✦ 子 agent',
  running: n => `${n} 个运行中`,
  calls: n => `${n} 次调用`,
  recent: '✦ 最近动作',
  filesChanged: '✦ 改动文件',
  newFile: '新建',
  edits: n => `改 ${n} 次`,
}

export function stringsFor(language: unknown): Strings {
  return language === 'zh' ? ZH : EN
}
