/**
 * 用 MongoDB 收集日志
 *
 * 与诸如Bunyan之类的文件系统日志记录相比，记录到db的好处是：它更适合Heroku slug方法（仅具有临时本地存储），并且便于过滤。
 * MongoDB 固定集合（Capped Collections）接近将日志信息直接写入文件系统的速度
 *
 */

import useragent from 'useragent';

import Db from './mongodb.js';
import Mail from './mail.js';

class Log {
    /**
   * 记录访问到 log-access capped collection.
   *
   * @param {Object} ctx - Koa context (response status is expected to be in ctx.response.status).
   * @param {number} time - duration of the request.
   */
    static async access(ctx, time) {
    // don't log development environment [to test logging, check referer=mocha]
        if (ctx.app.env == 'development') return;
        ctx.app.proxy = true; // support x-forwarded-host / x-forwarded-for for e.g. Heroku

        const request = {
            method:   ctx.request.method,
            host:     ctx.request.host,
            url:      ctx.request.url,
            ip:       ctx.request.ip,
            referrer: ctx.request.headers.referer,
            status:   ctx.response.status,
            ms:       Math.ceil(time),
        };

        const ua = useragent.parse(ctx.request.headers['user-agent']);
        request.ua = Object.assign({}, ua, { os: ua.os }); // trigger on-demand parsing of os

        if (ctx.response.header.location) {
            request.redir = ctx.response.header.location;
        }

        // logging uses capped collection log-access (size: 1000×1e3, max: 1000)
        const logCollection = await Db.collection('log-access');
        await logCollection.insertOne(request);
    }

    /**
   * 记录错误日志到 log-error capped collection.
   *
   * @param {Object} ctx - Koa context (response status is expected to be in ctx.response.status).
   * @param {Object} err - the Error object.
   */
    static async error(ctx, err) {
    // don't log development environment (but display status 500 errors)
        if (ctx.app.env == 'development') {
            if (ctx.response.status == 500) console.error(err);
            return;
        }

        const request = {
            method: ctx.request.method,
            host:   ctx.request.host,
            url:    ctx.request.url,
            ip:     ctx.request.ip,
            status: ctx.response.status,
        };

        const ua = useragent.parse(ctx.request.headers['user-agent']);
        request.ua = Object.assign({}, ua, { os: ua.os }); // trigger on-demand parsing of os

        if (ctx.response.status == 500) {
            request.stack = err.stack;
        }

        // logging uses capped collection log-error (size: 1000×4e3, max: 1000)
        const logCollection = await Db.collection('log-error');
        await logCollection.insertOne(request);

        // 邮件通知
        try {
            const to = '309522304@qq.com'; // could be from env var
            if (ctx.response.status == 500)
            {await Mail.sendText(to, 'JDJ API 500 error', err.stack, ctx);}
        } catch (e) {
            console.error('log', e);
        }
    }

    /**
   * 记录未处理异常 e.g. from within models.
   *
   * @param {string} method - module/method exception was raised within
   * @param {Object} err
   */
    static exception(method, err) {
    // could eg save to log file or e-mail developer
        console.error(
            'UNHANDLED EXCEPTION',
            method,
            err.stack === undefined ? err.message : err.stack,
        );
    }
}

export default Log;
