import { reduceToAvatarNumber } from './numbers'
import { personalities } from './personalities'
import { CHARACTER_TEXTS, TALENTS_TEXTS, MONEY_TEXTS, LESSONS_TEXTS, } from './avatarData'
import { getAvatarImageFilename } from './avatarImages'
export type Gender = 'male' | 'female'

export interface AvatarResult {
  date: {
    [key: string]: {
      title: string
      image: string
      description: string
      recommendations?: string[]
    }
  }
  A: number
  B: number
  V: number
  G: number
  D: number
}

export function calculateAvatarData(
  day: number,
  month: number,
  year: number,
  selectedGender: Gender
): AvatarResult | null {
  const dayNum = day
  const monthNum = month
  const yearNum = year

  if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || !yearNum) {
    return null
  }

  const A = reduceToAvatarNumber(dayNum)
  const B = reduceToAvatarNumber(monthNum)
  const V = reduceToAvatarNumber(
    String(yearNum)
      .split('')
      .reduce((sum, digit) => sum + parseInt(digit, 10), 0)
  )
  const G = reduceToAvatarNumber(A + B + V)
  const D = reduceToAvatarNumber(A + B + V + G)

  const date = {
    'A': {
      title: personalities[A - 1].title,
      image: getAvatarImageFilename(A, selectedGender),
      description: CHARACTER_TEXTS[A][selectedGender],
      recommendations: CHARACTER_TEXTS[A].recommendations[selectedGender]
    },
    'B': {
      title: personalities[B - 1].title,
      image: getAvatarImageFilename(B, selectedGender),
      description: TALENTS_TEXTS[B][selectedGender],
    },
    'V': {
      title: personalities[V - 1].title,
      image: getAvatarImageFilename(V, selectedGender),
      description: MONEY_TEXTS[V][selectedGender],
    },
    'G': {
      title: personalities[G - 1].title,
      image: getAvatarImageFilename(G, selectedGender),
      description: LESSONS_TEXTS[G][selectedGender],
    },
    'D': {
      title: personalities[D - 1].title,
      image: getAvatarImageFilename(D, selectedGender),
      description: LESSONS_TEXTS[D][selectedGender],
      recommendations: CHARACTER_TEXTS[D].recommendations[selectedGender]
    }
  }

  return {
    date,
    A,
    B,
    V,
    G,
    D,
  }
}
