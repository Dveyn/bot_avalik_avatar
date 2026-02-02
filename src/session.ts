import type { Context as TelegrafContext } from 'telegraf'

export interface SessionData {
  waitingConsultation?: false | 'topic' | 'duration'
  consultationTopic?: string
  consultationDuration?: string
  /** Для генерации PDF после расчёта */
  birthDay?: number
  birthMonth?: number
  birthYear?: number
  /** Пол пользователя для подбора формулировок и картинок */
  gender?: 'male' | 'female'
}

export type Session = SessionData | undefined

export interface Context extends TelegrafContext {
  session?: SessionData
}

const store = new Map<string, SessionData>()

function getSessionKey(ctx: TelegrafContext): string | null {
  const from = ctx.from?.id
  const chat = ctx.chat?.id
  if (from == null || chat == null) return null
  return `${from}:${chat}`
}

export function sessionMiddleware() {
  return (ctx: TelegrafContext, next: () => Promise<void>) => {
    const key = getSessionKey(ctx)
    if (key) {
      const session = (ctx as Context).session ?? store.get(key) ?? {}
      ;(ctx as Context).session = session
      store.set(key, session)
    }
    return next()
  }
}
