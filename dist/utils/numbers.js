"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reduceToSingleDigit = reduceToSingleDigit;
/**
 * Сводит число к одной цифре (нумерологическое сокращение).
 * Пример: 38 → 3+8=11 → 1+1=2
 */
function reduceToSingleDigit(n) {
    if (n === 0)
        return 0;
    const sum = String(n)
        .split('')
        .reduce((acc, d) => acc + parseInt(d, 10), 0);
    return sum <= 9 ? sum : reduceToSingleDigit(sum);
}
