"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateAvatarData = calculateAvatarData;
const numbers_1 = require("./numbers");
function calculateAvatarData(day, month, year, selectedGender, personalities) {
    const dayNum = day;
    const monthNum = month;
    const yearNum = year;
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || !yearNum) {
        return null;
    }
    const A = (0, numbers_1.reduceToSingleDigit)(dayNum);
    const B = (0, numbers_1.reduceToSingleDigit)(monthNum);
    const V = (0, numbers_1.reduceToSingleDigit)(String(yearNum)
        .split('')
        .reduce((sum, digit) => sum + parseInt(digit, 10), 0));
    const G = (0, numbers_1.reduceToSingleDigit)(A + B + V);
    const D = (0, numbers_1.reduceToSingleDigit)(A + B + V + G);
    const K = (0, numbers_1.reduceToSingleDigit)(D + G);
    const L = (0, numbers_1.reduceToSingleDigit)(D + V);
    const M = (0, numbers_1.reduceToSingleDigit)(K + L);
    const N = (0, numbers_1.reduceToSingleDigit)(K + M);
    const B2 = (0, numbers_1.reduceToSingleDigit)(B + D);
    const personality = personalities[A - 1];
    if (!personality)
        return null;
    const isMale = selectedGender === 'man';
    const resources = isMale
        ? (personality.resources?.maleResources ?? [])
        : (personality.resources?.femaleResources ?? []);
    const shadows = isMale
        ? (personality.shadow?.maleShadow ?? [])
        : (personality.shadow?.femaleShadow ?? []);
    const recommendations = isMale
        ? (personality.recommendations?.maleRecommendations ?? 'Рекомендации отсутствуют')
        : (personality.recommendations?.femaleRecommendations ?? 'Рекомендации отсутствуют');
    const title = isMale
        ? (personality.part.maleTitle ?? 'Неизвестно')
        : (personality.part.femaleTitle ?? 'Неизвестно');
    const description = isMale
        ? (personality.part.maleDescription ?? 'Описание отсутствует')
        : (personality.part.femaleDescription ?? 'Описание отсутствует');
    return {
        resources: Array.isArray(resources) ? resources : [],
        shadows: Array.isArray(shadows) ? shadows : [],
        recommendations: typeof recommendations === 'string' ? recommendations : 'Рекомендации отсутствуют',
        title: typeof title === 'string' ? title : 'Неизвестно',
        description: typeof description === 'string' ? description : 'Описание отсутствует',
        A,
        B,
        V,
        G,
        D,
        K,
        L,
        M,
        N,
        B2,
    };
}
