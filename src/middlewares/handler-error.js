import Log from '../lib/log.js';
export default async function handleErrors(ctx, next) {
    try {

        await next();

    } catch (err) {
        ctx.response.status = err.status || 500;
        switch (ctx.response.status) {
            case 204: // 无内容
                break;
            case 401: // 未授权 
                ctx.response.set('WWW-Authenticate', 'Basic');
                break;
            case 403: // 不可用
            case 404: // 找不到
            case 406: // 不能接受
            case 409: // 冲突
                ctx.response.body = { message: err.message, root: 'error' };
                break;
            default:
            case 500: // 内部服务器错误（针对未捕获或编程错误）
                console.error(ctx.response.status, err.message);
                ctx.response.body = { message: err.message, root: 'error' };
                if (ctx.app.env != 'production') ctx.response.body.stack = err.stack;
                // ctx.app.emit('error', err, ctx); // github.com/koajs/koa/wiki/Error-Handling
                break;
        }
        await Log.error(ctx, err);
    }
}