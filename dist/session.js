"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionMiddleware = sessionMiddleware;
const store = new Map();
function getSessionKey(ctx) {
    const from = ctx.from?.id;
    const chat = ctx.chat?.id;
    if (from == null || chat == null)
        return null;
    return `${from}:${chat}`;
}
function sessionMiddleware() {
    return (ctx, next) => {
        const key = getSessionKey(ctx);
        if (key) {
            const session = ctx.session ?? store.get(key) ?? {};
            ctx.session = session;
            store.set(key, session);
        }
        return next();
    };
}
