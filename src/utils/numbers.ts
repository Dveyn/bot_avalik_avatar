/**
 * Сводит число к одной цифре (нумерологическое сокращение).
 * Пример: 38 → 3+8=11 → 1+1=2
 * Используется там, где нужны именно 1–9.
 */
export function reduceToSingleDigit(n: number): number {
  if (n === 0) return 0
  const sum = String(n)
    .split('')
    .reduce((acc, d) => acc + parseInt(d, 10), 0)
  return sum <= 9 ? sum : reduceToSingleDigit(sum)
}

/**
 * Сводит число к диапазону 1–22 для Аватаров.
 *
 * Пример:
 *  - 29 → 2+9 = 11 (останавливаемся, т.к. 11 ≤ 22)
 *  - 123 → 1+2+3 = 6
 *  - 999 → 9+9+9 = 27 → 2+7 = 9
 */
export function reduceToAvatarNumber(number: number): number {
  while (number > 22) {
    number = number.toString().split('').reduce((sum, digit) => sum + parseInt(digit), 0);
}
return number;
}
