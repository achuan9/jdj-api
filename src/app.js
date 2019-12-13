import Koa from 'koa';
import body from 'koa-body';
import compress from 'koa-compress';
import session from 'koa-session';
import Debug from 'debug';
import xmlify from 'xmlify'; // 将js对象转为XML
import yaml   from 'js-yaml';  // 将js对象转为yaml
import Log from './lib/log.js';
import Middleware from './lib/middleware.js';
import RouterUnsecured from './router/router-unsecured.js';
import RouterAuth from './router/router-auth.js';

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


// 内容协商：API将使用json，xml或yaml进行响应
app.use(async function contentNegotiation(ctx, next) {
    await next();

    if (!ctx.response.body) return; // no content to return

    // 检查接受标头以获取首选响应类型
    const type = ctx.request.accepts('json', 'xml', 'yaml', 'text');

    switch (type) {
        case 'json':
        default:
            delete ctx.response.body.root; // xml 根元素
            break;
        case 'xml':
            ctx.response.type = type;
            const root = ctx.response.body.root; // xml 根元素
            delete ctx.response.body.root;
            ctx.response.body = xmlify(ctx.response.body, root);
            break;
        case 'yaml':
        case 'text':
            delete ctx.response.body.root; // xml 根元素
            ctx.response.type = 'yaml';
            ctx.response.body = yaml.dump(ctx.response.body);
            break;
        case false:
            ctx.throw(406); // “不可接受”-无法提供任何要求
            break;
    }
});


// 处理任何地方的抛出或未捕获的异常
app.use(async function handleErrors(ctx, next) {
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
                if (app.env != 'production') ctx.response.body.stack = err.stack;
                // ctx.app.emit('error', err, ctx); // github.com/koajs/koa/wiki/Error-Handling
                break;
        }
        await Log.error(ctx, err);
    }
});



// 强制使用 SSL (重定向 http 到 https)
app.use(Middleware.ssl({ trustProxy: true }));


// 公共（无抵押）模块优先
app.use(RouterUnsecured);

// 其余路由需要JWT auth（从 /auth获得，并在承载授权标头中提供）

app.use(Middleware.verifyJwtApi());
app.use(RouterAuth);
/**
 * 创建服务
 */

app.listen(process.env.PORT || 3000);
console.info(
    `${process.version} listening on port ${process.env.PORT || 3000} (${
        app.env
    })`,
);

export default app;
