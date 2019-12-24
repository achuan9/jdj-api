import Koa from 'koa';
import body from 'koa-body';
import compress from 'koa-compress';
import session from 'koa-session';
import server from 'koa-static';
import Debug from 'debug';
import { resolve } from 'path';
import xmlify from 'xmlify'; // 将js对象转为XML
import yaml   from 'js-yaml';  // 将js对象转为yaml
import Log from './lib/log.js';
import Middleware from './lib/middleware.js';
import RouterUnsecured from './router/router-unsecured.js';
import RouterAuth from './router/router-auth.js';
import handleErrors from './middlewares/handler-error'; 
import cors from './middlewares/cors';
const app = new Koa();
const debug = Debug('app:req');

// 通过 【X-Response-Time】 响应头返回响应时间
app.use(async function responseTime(ctx, next) {
    const t1 = Date.now();
    await next();
    const t2 = Date.now();
    ctx.response.set('X-Response-Time', Math.ceil(t2 - t1) + 'ms');
});

// 压缩
app.use(compress({}));

// 解析请求体
// - multipart allows parsing of enctype=multipart/form-data
app.use(body({ multipart: true }));

// 为 JWT cookie & session cookie 设置签名 keys
app.keys = [ 'jdj-api' ];

//  即时消息会话（使用签名的会话cookie，没有服务器存储）
app.use(session(app));

// 记录请求到 mongodb capped collection
app.use(async function logAccess(ctx, next) {
    debug(ctx.request.method.padEnd(4) + ' ' + ctx.request.url);
    const t1 = Date.now();
    await next();
    const t2 = Date.now();
    await Log.access(ctx, t2 - t1);
});

// 处理任何地方的抛出或未捕获的异常
app.use(handleErrors);

app.use(cors({
    origins:       'http://localhost:8002',
    allowMethods:  [ 'GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH' ],
    allowHeaders:  [ 'Content-Type', 'Authorization' ],
    exposeHeaders: [ 'Content-Length', 'Date', 'X-Request-Id' ],
}));

// 强制使用 SSL (重定向 http 到 https)
app.use(Middleware.ssl({ trustProxy: true }));


// 公共（无抵押）模块优先
app.use(RouterUnsecured);

app.use(server(resolve(__dirname, '../public/')));

// 其余路由需要JWT auth（从 /auth获得，并在承载授权标头中提供）

// app.use(Middleware.verifyJwtApi());
app.use(RouterAuth);


/**
 * 创建服务
 */

app.listen(process.env.PORT || 9999);
console.info(
    `${process.version} listening on http://localhost:${process.env.PORT || 9999} (${
        app.env
    })`,
);

export default app;
