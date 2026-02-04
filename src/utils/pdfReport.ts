/**
 * Генерация PDF-отчёта по результатам расчёта Аватаров.
 * Картинки — public/avatar/; тексты — avatarData; кириллица — шрифты public/Manrope.ttf и public/Manrope-Bold.ttf
 */
import * as fs from 'fs'
import * as path from 'path'
import type { AvatarResult, Gender } from './avatarCalculator'
import {
  CHARACTER_BLOCK_INTRO,
  COMFORT_BLOCK_INTRO,
  MONEY_BLOCK_INTRO,
  TALENTS_BLOCK_INTRO,
  LESSONS_BLOCK_INTRO,
} from './avatarData'

/** Пути к шрифтам для кириллицы: .env FONT_PATH / FONT_BOLD_PATH или public/Manrope.ttf / public/Manrope-Bold.ttf */
const FONT_PATH =
  process.env.FONT_PATH ||
  path.join(process.cwd(), 'public', 'Manrope.ttf')

const FONT_NAME = 'Manrope'

const BOLD_FONT_PATH =
  process.env.FONT_BOLD_PATH ||
  path.join(process.cwd(), 'public', 'Manrope-Bold.ttf')

const BOLD_FONT_NAME = 'Manrope-Bold'

type Doc = {
  addPage(): unknown
  fontSize: (n: number) => Doc
  font: (s: string) => Doc
  text: (s: string, o?: object) => Doc
  moveDown: (n?: number) => Doc
  image: (
    src: string | Buffer,
    x?: number,
    y?: number,
    opts?: {
      width?: number
      height?: number
      fit?: [number, number]
      align?: 'left' | 'center' | 'right'
    }
  ) => Doc
  registerFont: (name: string, src: string, family?: string) => Doc
  x: number
  y: number
  page: { width: number; height: number }
}

function getFont(doc: Doc): string {
  return fs.existsSync(FONT_PATH) ? FONT_NAME : 'Helvetica'
}

function getFontBold(doc: Doc): string {
  if (fs.existsSync(BOLD_FONT_PATH)) {
    return BOLD_FONT_NAME
  }
  if (fs.existsSync(FONT_PATH)) {
    return FONT_NAME
  }
  return 'Helvetica-Bold'
}

function addSection(doc: Doc, title: string, 
  intro: string,
  titleAvatar: string,
  body: string | string[], 
  opts: { fontSize?: number; margin?: number; titleFontSize?: number } = {}, 
  img: {avatarImagesDir:string | undefined, linkImg:string | undefined}) {
  const fontSize = opts.fontSize ?? 10
  const margin = opts.margin ?? 6
  const titleFontSize = opts.titleFontSize ?? 14


  doc.moveDown(0.5) 
  doc.fontSize(titleFontSize).font(getFontBold(doc)).text(title)
  doc.moveDown(0.3)

  const text = Array.isArray(body) ? body.join('\n') : body
  doc
  .fontSize(fontSize)
  .font(getFont(doc))
  .text(intro, {
    align: 'left',
    lineGap: 1,
  })
  doc.moveDown(0.5)

  doc
  .fontSize(fontSize)
  .font(getFont(doc))
  .text(titleAvatar, {
    align: 'left',
    lineGap: 1,
  })
  doc.moveDown(0.3)
  if (img.avatarImagesDir && img.linkImg) {
    addAvatarImageIfExists(doc as Doc, img.avatarImagesDir, img.linkImg);
    doc.moveDown(0.3)
  }
  doc
    .fontSize(fontSize)
    .font(getFont(doc))
    .text(text, {
      align: 'left',
      lineGap: 1,
    })

  doc.moveDown(margin / 10)
}

function addBullets(doc: Doc, items: string[], fontSize = 10) {
  doc.fontSize(fontSize).font(getFont(doc))

  items.forEach((item) => {
    doc.text(`• ${item}`, {
      indent: 12,
      lineGap: 1,
    })
  })

  doc.moveDown(0.6)
}

const AVATAR_IMAGE_WIDTH = 120

/** Вставляет картинку аватара, если файл есть. Курсор смещается вниз после картинки. */
function addAvatarImageIfExists(doc: Doc, avatarImagesDir: string, filename: string) {
  if (!filename) return;

  const fullPath = path.join(avatarImagesDir, filename);
  if (!fs.existsSync(fullPath)) return;

  try {
    const imageHeight = AVATAR_IMAGE_WIDTH; // высота картинки (мы используем квадрат)
    const bottomMargin = 50; // отступ от низа страницы

    // Проверяем, поместится ли картинка
    if (doc.y + imageHeight + bottomMargin > doc.page.height) {
      doc.addPage(); // если не помещается — новая страница
    }

    const startY = doc.y;

    doc.image(
      fullPath,
      undefined,
      undefined,
      {
        fit: [AVATAR_IMAGE_WIDTH, AVATAR_IMAGE_WIDTH],
        align: 'center',
      }
    );

    doc.y = startY + imageHeight + 10; // смещение вниз после картинки
  } catch {
    // ignore
  }
}

export interface PdfReportInput {
  dateStr: string
  result: AvatarResult
  gender?: Gender
  avatarImagesDir?: string
}

export function buildAvatarPdfBuffer(input: PdfReportInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 50, size: 'A4', autoFirstPage: true });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { dateStr, result, gender = 'female', avatarImagesDir } = input;

      if (fs.existsSync(FONT_PATH)) {
        doc.registerFont(FONT_NAME, FONT_PATH);
      }
      if (fs.existsSync(BOLD_FONT_PATH)) {
        doc.registerFont(BOLD_FONT_NAME, BOLD_FONT_PATH);
      }
      const font = getFont(doc as Doc);
      const fontBold = getFontBold(doc as Doc);

      doc.fontSize(16).font(fontBold).text('Расшифровка Аватаров личности', { align: 'center' });
      doc.moveDown(1);
      doc.fontSize(10).font(font).text(`Дата рождения: ${dateStr}`, { align: 'center' });

      const sections = [
        { title: 'Характер', point: { data: result.date['A'], key: 'A', intro: CHARACTER_BLOCK_INTRO, recommendations: result.date['A'].recommendations } },
        result.date['D'] ? { title: 'Зона комфорта', point: { data: result.date['D'], key: 'D', intro: COMFORT_BLOCK_INTRO, recommendations: result.date['D'].recommendations } } : null,
        result.date['B'] ? { title: 'Таланты', point: { data:  result.date['B'] , key: 'B', intro: TALENTS_BLOCK_INTRO ?? '—', recommendations:  result.date['B'] .recommendations } } : null,
        result.date['V']  ? { title: 'Деньги', point: { data:  result.date['V'], key: 'V', intro: MONEY_BLOCK_INTRO ?? '—', recommendations:  result.date['V'].recommendations } } : null,
        result.date['G'] ? { title: 'Уроки в падении', point: { data: result.date['G'], key: 'G', intro: LESSONS_BLOCK_INTRO ?? '—', recommendations: result.date['G'].recommendations } } : null,
      ].filter(Boolean);

      sections.forEach((sectionObj) => {
        const { title, point } = sectionObj!;
        doc.moveDown(0.8);
        const linkImg = point.data.image;
        const titleAvatar = point!.data.title;
        const intro = point!.intro[gender];
        addSection(doc as Doc, 
          title, 
          intro,
          titleAvatar,
          [
          '',
          '',
          point!.data.description ?? '',
        ], { margin: 10 }, {avatarImagesDir, linkImg});

        if (point!.recommendations?.length) {
          doc.fontSize(11).font(fontBold).text(`Рекомендации по ${title.toLowerCase()}`, { continued: false });
          doc.moveDown(0.3);
          addBullets(doc as Doc, point!.recommendations, 10);
        }
      });

      doc.fontSize(9).font(font).text('—', { align: 'center' });
      doc.text('Метод «Аватар личности». Полный разбор: avalik-avatar.ru', { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
