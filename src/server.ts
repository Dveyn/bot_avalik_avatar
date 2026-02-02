import 'dotenv/config'
import * as path from 'path'
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
  welcome: `Привет 👋

Я — бот метода «Аватар личности».

Здесь ты можешь бесплатно получить первичную расшифровку своих Аватаров по дате рождения.

Это не гадание и не случайный расчёт.
Это способ понять себя и свои жизненные сценарии.

Метод Аватаров – инструмент самопознания, основанный на дате рождения. Он сочетает психологические принципы, типирование личности, архетипы, IFS-терапию и коучинг.

Кто такие Аватары – это твоё альтер эго, твой друг.

Как в игре, когда у Героя есть доступ к ресурсам и скиллам, артефактам и пр., у тебя есть круглосуточный доступ к твоим Аватарам — и они каждый со своими сильными и слабыми сторонами, плюсами и минусами, ресурсной и теневой сторонами.

Если ты будешь знать, какие именно у тебя Аватары и их характеристики, ты сможешь использовать их для достижения своих целей и их ресурсы!`,

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

  finalBlock: `Ты получил(а) базовую расшифровку твоих ключевых Аватаров.
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

  const dateStr = `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`
  const talentsText = TALENTS_TEXTS[result.B] ?? '—'
  const moneyText = MONEY_TEXTS[result.V] ?? '—'
  const lessonsText = LESSONS_TEXTS[result.G] ?? '—'
  const blockD = result.date['D'];
  const lines = [
    `📅 Дата рождения: ${dateStr}`,
    '',
    '🧠 Характер:',
    CHARACTER_BLOCK_INTRO,
    '',
    `${result.date['A'].title}`,
    result.date['A'].description,
    '',
    '💡 Рекомендации по характеру:',
    result.date['A'] && Array.isArray(result.date['A'].recommendations) && result.date['A'].recommendations.length
      ? result.date['A'].recommendations.map((r: string) => `• ${r}`).join('\n')
      : '—',
    '',
    '🏡 Зона комфорта:',
    COMFORT_BLOCK_INTRO,
    '',
    blockD ? blockD.title : '—',
    blockD ? blockD.description : '',
    '',
    'Рекомендации по зоне комфорта:',
    blockD && Array.isArray(blockD.recommendations) && blockD.recommendations.length
      ? blockD.recommendations.map((r: any) => `• ${r}`).join('\n')
      : '—',
    '',
    '🎯 Таланты:',
    talentsText[gender],
    '',
    '💰 Деньги:',
    moneyText[gender],
    '',
    '📖 Уроки в падении:',
    lessonsText[gender],
    '',
  ]
  return lines.join('\n')
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

  await ctx.reply(part1)
  return ctx.reply(TEXTS.finalBlock, Markup.inlineKeyboard([
    [Markup.button.callback('📄 Скачать PDF отчёт', 'pdf_report')],
    [Markup.button.url('📞 Хочу консультацию', 'https://avalik-avatar.ru')],
  ]))
})

// Inline-кнопка «Скачать PDF отчёт»
bot.action('pdf_report', async (ctx) => {
  await ctx.answerCbQuery()
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
})

// После расшифровки — финальный блок (по кнопке «Дальше» или отдельной команде)
bot.hears(/^(Дальше|дальше|Показать варианты)$/i, (ctx) => {
  return ctx.reply(TEXTS.finalBlock, Markup.inlineKeyboard([
    [Markup.button.callback('📄 Скачать PDF отчёт', 'pdf_report')],
    [Markup.button.url('📞 Хочу консультацию', 'https://avalik-avatar.ru')],
  ]))
})

// Меню команд в Telegram (кнопка «Меню» слева от поля ввода)
async function setBotMenu() {
  await bot.telegram.setMyCommands([
    { command: 'start', description: 'Начать / получить расшифровку Аватаров' },
  ])
}

bot.launch().then(() => setBotMenu())

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
