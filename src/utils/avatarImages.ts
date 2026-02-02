/**
 * Соответствие точек Аватаров (1–22) файлам картинок в public/avatar/.
 * Имена файлов должны совпадать с файлами в папке.
 */
import type { Gender } from './avatarCalculator'

/** Имя файла картинки для точки 1–22.
 * Сейчас для всех точек используются единые файлы без разделения по полу.
 */
export function getAvatarImageFilename(point: number, gender: Gender): string  {
  switch (point) {
    case 1:
      return 'Маг.png'
    case 2:
      return 'Дипломат.png'
    case 3:
      return 'Императрица.png'
    case 4:
      return 'Император.png'
    case 5:
      return 'Учитель.png'
    case 6:
      return 'Романтик.png'
    case 7:
      return 'Лидер.png'
    case 8:
      return 'Судья.png'
    case 9:
      return 'Мудрец.png'
    case 10:
      return 'Фортуна.png'
    case 11:
      return 'Силач.png'
    case 12:
      return 'Спасатель.png'
    case 13:
      return 'Трансформатор.png'
    case 14:
      return 'Духовный исцелить.png'
    case 15:
      return 'Дьявол.png'
    case 16:
      return 'Башня.png'
    case 17:
      return 'Звезда.png'
    case 18:
      return 'Мистик.png'
    case 19:
      return 'Солнце.png'
    case 20:
      return 'Родовой страж.png'
    case 21:
      return 'Миротворец.png'
    case 22:
      return 'Путешественник.png'
    default:
      return 'Маг.png'
  }
}
