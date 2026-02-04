import 'dotenv/config'
import * as path from 'path'
import * as http from 'http'
import { Markup, Telegraf } from 'telegraf'
import { sessionMiddleware, type Context } from './session'
import { calculateAvatarData } from './utils/avatarCalculator'
import {
  TALENTS_TEXTS,
  MONEY_TEXTS,
  LESSONS_TEXTS,
  CHARACTER_BLOCK_INTRO,
  COMFORT_BLOCK_INTRO,
} from './utils/avatarData'
import { buildAvatarPdfBuffer } from './utils/pdfReport'

const bot = new Telegraf(process.env.BOT_TOKEN!)

type NotifyBody = {
  text?: string
  chatId?: number | string
  parse_mode?: 'HTML' | 'MarkdownV2' | 'Markdown'
}

const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN
const BOT_ADMIN_CHAT_IDS = (process.env.BOT_ADMIN_CHAT_IDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => Number(s))
  .filter((n) => Number.isFinite(n))

function safeJson(res: http.ServerResponse, status: number, payload: any) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function startInternalApiServer() {
  const port = Number(process.env.INTERNAL_API_PORT ?? process.env.PORT ?? 3105)

  const server = http.createServer(async (req, res) => {
    try {
      if (req.method !== 'POST' || req.url !== '/internal/notify') {
        return safeJson(res, 404, { ok: false, error: 'not_found' })
      }

      if (!INTERNAL_API_TOKEN) {
        return safeJson(res, 500, { ok: false, error: 'internal_api_token_missing' })
      }

      const token = String(req.headers['x-internal-token'] ?? '')
      if (token !== INTERNAL_API_TOKEN) {
        return safeJson(res, 401, { ok: false, error: 'unauthorized' })
      }

      const chunks: Buffer[] = []
      for await (const chunk of req) chunks.push(Buffer.from(chunk))
      const raw = Buffer.concat(chunks).toString('utf8')
      const body = (raw ? JSON.parse(raw) : {}) as NotifyBody

      const text = (body.text ?? '').toString()
      if (!text.trim()) {
        return safeJson(res, 400, { ok: false, error: 'text_required' })
      }

      const parse_mode = body.parse_mode ?? 'HTML'

      const targets =
        body.chatId != null
          ? [Number(body.chatId)]
          : BOT_ADMIN_CHAT_IDS.length > 0
            ? BOT_ADMIN_CHAT_IDS
            : []

      if (targets.length === 0) {
        return safeJson(res, 400, { ok: false, error: 'no_targets', hint: 'Set BOT_ADMIN_CHAT_IDS or pass chatId' })
      }

      const results = await Promise.allSettled(
        targets.map((chatId) => bot.telegram.sendMessage(chatId, text, { parse_mode }))
      )

      const ok = results.every((r) => r.status === 'fulfilled')
      return safeJson(res, ok ? 200 : 207, {
        ok,
        targets,
        results: results.map((r, idx) =>
          r.status === 'fulfilled'
            ? { chatId: targets[idx], ok: true }
            : { chatId: targets[idx], ok: false, error: String(r.reason?.message ?? r.reason ?? 'unknown') }
        ),
      })
    } catch (e: any) {
      return safeJson(res, 500, { ok: false, error: 'internal_error', message: String(e?.message ?? e) })
    }
  })

  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[internal-api] listening on :${port}`)
  })
}

// Меню под полем ввода (всегда видно)
const mainMenu = Markup.keyboard([
  ['📅 Ввести дату рождения'],
  ['📞 Хочу консультацию'],
]).resize().persistent()

// Сессия для сценария «Хочу консультацию»
bot.use(sessionMiddleware())

// ═══════════════════════════════════════════════════════════════
// Тексты
// ═══════════════════════════════════════════════════════════════
const TEXTS = {
  welcome: `Привет 
Я - бот метода «Аватар личности»
Здесь ты можешь бесплатно получить первичную расшифровку своих Аватаров по дате рождения.
Это не гадание и не случайный расчёт.
Это способ понять себя и свои жизненные сценарии.
Метод Аватаров – инструмент самопознания, основанный на дате рождения. Он сочетает психологические принципы, типирование личности, архетипы, IFS-терапию и коучинг.`,
  requestBirthDate: `📅 ЗАПРОС ДАТЫ РОЖДЕНИЯ

Введи дату рождения в формате:
День.Месяц.Год

Например: 15.03.1990

После ввода я покажу твои Аватары.`,

  invalidDate: `Не получилось распознать дату.

Введи в формате: День.Месяц.Год
Пример: 25.12.2000`,

  requestGender: `Пожалуйста, выбери свой пол:`,
  genderButtons: ['Мужской ♂️', 'Женский ♀️'],

  whatYouGet: `🔍 ЧТО ТЫ ПОЛУЧИШЬ ПОСЛЕ ВВОДА ДАТЫ И ВЫБОРА ПОЛА

После расчёта ты увидишь ключевые точки твоих Аватаров, которые сильнее всего влияют на жизнь здесь и сейчас:`,

  important: `ВАЖНО ЗНАТЬ

Этот бот даёт базовое понимание твоих Аватаров, твоей сути, чтобы ты:
• увидел(а) себя со стороны
• понял(а), почему в жизни всё складывается именно так
• получил(а) первые точки опоры

👉 Это не вся система, а её ключевая часть.
Глубинные причины, прогнозы, периоды, отношения и персональный план действий разбираются на консультациях.`,

  whatCanChange: `ЧТО МОЖЕТ ИЗМЕНИТЬСЯ ПОСЛЕ ЭТОГО РАЗБОРА

✔ станет больше ясности
✔ уменьшится внутреннее напряжение
✔ появится понимание, где ты идёшь против себя
✔ станет проще принимать решения
✔ уйдёт ощущение «со мной что-то не так»`,

  finalBlock: `Ты получил базовую расшифровку твоих ключевых Аватаров.
Этого достаточно, чтобы увидеть главное.

Если ты чувствуешь, что:
• хочешь глубже понять себя
• связать характер, таланты и деньги
• получить чёткий план действий
• разобрать конкретную ситуацию

👉 у тебя есть два варианта:

📋 Получить полный аватар личности (глубокий разбор всех точек + рекомендации)
👉 https://avalik-avatar.ru

📞 Записаться на личную консультацию (разбор твоей ситуации + стратегия на 3–6 месяцев)
👉 https://avalik-avatar.ru

Я рядом, чтобы помочь тебе понять себя, а не переделывать.`,
}

// Проверка даты: ДД.ММ.ГГГГ или ДД/ММ/ГГГГ
function parseBirthDate(text: string): Date | null {
  const trimmed = text.trim()
  const match = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/)
  if (!match) return null
  const [, day, month, year] = match
  const d = parseInt(day, 10)
  const m = parseInt(month, 10) - 1
  const y = parseInt(year, 10)
  if (d < 1 || d > 31 || m < 0 || m > 11) return null
  const date = new Date(y, m, d)
  if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) return null
  if (date.getTime() > Date.now()) return null
  return date
}

// Расчёт Аватаров по дате рождения (калькулятор метода)
function formatAvatarDecoding(
  birthDate: Date,
  day: number,
  month: number,
  year: number,
  gender: 'male' | 'female'
): string {
  const result = calculateAvatarData(day, month, year, gender)
  if (!result) {
    return 'Не удалось выполнить расчёт. Проверь дату рождения.'
  }
  // Подробный текстовый блок с описанием был удалён как неактуальный.
  // Пока возвращаем пустую строку, так как результат функции далее не используется.
  return ''
}

// ═══════════════════════════════════════════════════════════════
// /start
// ═══════════════════════════════════════════════════════════════
bot.start(async (ctx) => {
  await ctx.reply(TEXTS.welcome)
  await ctx.reply(TEXTS.requestBirthDate, mainMenu)
})

// ═══════════════════════════════════════════════════════════════
// Ввод даты рождения и выбор пола
// ═══════════════════════════════════════════════════════════════
bot.on('text', async (ctx) => {
  const session = (ctx as Context).session
  const text = (ctx.message as any).text

  // Кнопка «Ввести дату рождения» — повторный запрос даты
  if (text?.includes('Ввести дату рождения') || text === '📅 Ввести дату рождения') {
    if (session) {
      session.birthDay = undefined
      session.birthMonth = undefined
      session.birthYear = undefined
      session.gender = undefined
    }
    return ctx.reply(TEXTS.requestBirthDate, mainMenu)
  }

  if (text?.includes('Хочу консультацию') || text === '📞 Хочу консультацию') {
    return ctx.reply(
      'Запись и полный разбор доступны на сайте 👇',
      Markup.inlineKeyboard([
        [Markup.button.url('Перейти на сайт', 'https://avalik-avatar.ru')],
      ])
    )
  }

  // Перезапуск: снова запрос даты
  if (text === '/start') {
    if (session) {
      session.birthDay = undefined
      session.birthMonth = undefined
      session.birthYear = undefined
      session.gender = undefined
    }
    return
  }

  // Если дата рождения ещё не задана, пытаемся распознать дату
  if (!session?.birthDay || !session?.birthMonth || !session?.birthYear) {
    const birthDate = parseBirthDate(text)
    if (!birthDate) {
      return ctx.reply(TEXTS.invalidDate, mainMenu)
    }
    if (session) {
      session.birthDay = birthDate.getDate()
      session.birthMonth = birthDate.getMonth() + 1
      session.birthYear = birthDate.getFullYear()
      session.gender = undefined
    }
    // Запрос пола после даты
    return ctx.reply(
      TEXTS.requestGender,
      Markup.inlineKeyboard([
        [Markup.button.callback(TEXTS.genderButtons[0], 'gender_male')],
        [Markup.button.callback(TEXTS.genderButtons[1], 'gender_female')],
      ])
    )
  }

  // Если дата есть, но пол не выбран, ждем выбора пола через кнопки
  if (session && session.birthDay && session.birthMonth && session.birthYear && !session.gender) {
    return ctx.reply('Пожалуйста, выбери пол с помощью кнопок ниже.')
  }

  // Если дата и пол есть, игнорируем текст, т.к. пользователь уже получил результат
})

async function sendPdfReport(ctx: any) {
  const s = (ctx as Context).session
  const day = s?.birthDay
  const month = s?.birthMonth
  const year = s?.birthYear
  const gender = s?.gender ?? 'female'
  if (day == null || month == null || year == null) {
    return ctx.reply('Введи дату рождения ещё раз, затем нажми «Скачать PDF отчёт».', mainMenu)
  }
  const result = calculateAvatarData(day, month, year, gender)
  if (!result) {
    return ctx.reply('Не удалось сформировать отчёт. Введи дату заново.', mainMenu)
  }
  try {
    const dateStr = `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`
    const avatarImagesDir = path.join(process.cwd(), 'public', 'avatar')
    const buffer = await buildAvatarPdfBuffer({
      dateStr,
      result,
      gender,
      avatarImagesDir,
    })
    const filename = `avatar-report-${dateStr.replace(/\./g, '-')}.pdf`
    await ctx.replyWithDocument({ source: buffer, filename }, { caption: 'Твой отчёт по Аватарам личности 🌱' })
  } catch {
    await ctx.reply('Генерация PDF временно недоступна. Попробуй позже.', mainMenu)
  }
}

// Обработка выбора пола
bot.action(/gender_(male|female)/, async (ctx) => {
  await ctx.answerCbQuery()
  const session = (ctx as Context).session
  if (!session || !session.birthDay || !session.birthMonth || !session.birthYear) {
    return ctx.reply('Сначала введи дату рождения.', mainMenu)
  }
  const genderKey = ctx.match[1] as 'male' | 'female'
  session.gender = genderKey

  const day = session.birthDay
  const month = session.birthMonth
  const year = session.birthYear
  const decoding = formatAvatarDecoding(new Date(year, month - 1, day), day, month, year, genderKey)
  const part1 = [TEXTS.whatYouGet, '', decoding, TEXTS.important, TEXTS.whatCanChange].join('\n\n')

  await ctx.reply(`
🔍 ЧТО ТЫ ПОЛУЧИШЬ ПОСЛЕ ВВОДА ДАТЫ И ВЫБОРА ПОЛА
 
После расчёта ты увидишь ключевые точки твоих Аватаров, которые сильнее всего влияют на жизнь здесь и сейчас.
 
ВАЖНО ЗНАТЬ
 
Этот бот даёт базовое понимание твоих Аватаров, твоей сути, чтобы ты:
• увидел(а) себя со стороны
• понял(а), почему в жизни всё складывается именно так
• получил(а) первые точки опоры
 
👉 Это не вся система, а её ключевая часть.
Глубинные причины, прогнозы, периоды, отношения и персональный план действий разбираются на консультациях.
 
ЧТО МОЖЕТ ИЗМЕНИТЬСЯ ПОСЛЕ ЭТОГО РАЗБОРА
 
Ты получишь базовую расшифровку твоих ключевых Аватаров.
Этого достаточно, чтобы увидеть главное.
 
Если ты чувствуешь, что:
• хочешь глубже понять себя
• связать характер, таланты и деньги
• получить чёткий план действий
• разобрать конкретную ситуацию
 
👉 у тебя есть два варианта:
 
📋 Получить полный аватар личности (глубокий разбор всех точек + рекомендации)
👉 https://avalik-avatar.ru
 
📞 Записаться на личную консультацию (разбор твоей ситуации + стратегия на 3–6 месяцев)
👉 https://avalik-avatar.ru
 
Я рядом, чтобы помочь тебе понять себя, а не переделывать.
    `)
  await sendPdfReport(ctx)
})

// После расшифровки — финальный блок (по кнопке «Дальше» или отдельной команде)
bot.hears(/^(Дальше|дальше|Показать варианты)$/i, async (ctx) => {
  await sendPdfReport(ctx)
})

// Меню команд в Telegram (кнопка «Меню» слева от поля ввода)
async function setBotMenu() {
  await bot.telegram.setMyCommands([
    { command: 'start', description: 'Начать / получить расшифровку Аватаров' },
  ])
}

bot.launch().then(() => setBotMenu())

startInternalApiServer()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
