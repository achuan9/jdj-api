/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* 中间件                                                                                     */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import jwt from 'jsonwebtoken';


class Middleware {

    /**
     * 强制SSL；如果协议是http，而NODE_ENV是生产，则重定向到相同的url使用https。
     *
     * 请注意，如果app.proxy为true，则ctx.request.secure将遵循X-Forwarded-Proto，因此隐含opt.trustProxy。
     *
     * qv github.com/jclem/koa-ssl, github.com/turboMaCk/koa-sslify
     *
     * @param {boolean} options.disabled = NODE_ENV != 'production' - 为true则所有请求通过
     * @param {boolean} options.trustProxy = false - 为 true 则信任 x-forwarded-proto 消息头; qv devcenter.heroku.com/articles/http-routing#heroku-headers.
     */
    static ssl(options) {
        const defaults = { disabled: process.env.NODE_ENV != 'production', trustProxy: false };
        const opt = { ...defaults, ...options };

        return async function sslMiddleware(ctx, next) {
            if (opt.disabled) {
                await next();
                return;
            }

            const xfp = ctx.request.get('x-forwarded-proto');
            const isSecure = ctx.request.secure || (opt.trustProxy && xfp=='https');

            if (isSecure) {
                await next();
                return;
            }

            if (ctx.request.method=='GET' || ctx.request.method=='HEAD') { // 重定向到 https
                ctx.response.status = 301; // 永久重定向
                ctx.response.redirect(ctx.request.href.replace(/^http/, 'https'));
                return;
            }

            ctx.response.status = 403; // 拒绝访问
        };
    }


    /**
     * 验证（签名）Cookie中提供的 JWT 令牌身份验证
     *
     * 如果令牌验证通过，则将有效负载记录在ctx.state.user中：UserId保留在ctx.state.user.id中。
     *
     * 发行的令牌具有24小时有效期。
     * 如果cookie包含过期的令牌，并且用户使用 “记住我” 选项登录，则发出替换的24小时令牌，并将cookie续签7天。闲置7天后，“记住我”功能将失效。
     */
    static verifyJwt() {
        return async function verifyJwtMiddleware(ctx, next) {
            const secretKey = process.env.JWT_SECRET_KEY;
            if (!secretKey) throw new Error('No JWT secret key available');

            // JWT cookie针对顶级域保留，以实现子域之间的登录互操作性
            const domain = ctx.request.hostname.replace(/^admin\.|^assessment\./, '');
            const options = { signed: true, domain: domain };
            const token = ctx.cookies.get('koa:jwt', options);

            if (token) {
                try {
                    const payload = jwt.verify(token, secretKey);
                    ctx.state.user = authDetails(payload, token);
                } catch (err) {
                    // 验证失败-使用“忽略过期”选项重试
                    try {
                        const payload = jwt.verify(token, secretKey, { ignoreExpiration: true });
                        // 有效令牌（exp除外）：接受它...
                        ctx.state.user = authDetails(payload, token);
                        // ... 并在接下来的24小时内重新发行替换令牌
                        delete payload.exp;
                        const replacementToken = jwt.sign(payload, secretKey, { expiresIn: '24h' });
                        if (payload.remember) options.expires = new Date(Date.now() + 1000*60*60*24*7); // 7天的 “记住我”
                        ctx.cookies.set('koa:jwt', replacementToken, options);
                    } catch (e) {
                        if ([ 'invalid token', 'invalid signature', 'jwt malformed' ].includes(e.message)) {
                            // 删除包含 JWT 的cookie
                            ctx.cookies.set('koa:jwt', null, options);
                            ctx.throw(401, 'Invalid authentication');
                        }
                        ctx.throw(e.status || 500, e.message); // 服务器错误
                    }
                }
            }

            // 如果我们拥有有效的令牌，则现在将用户设置为登录用户，并在ctx.state.user中提供详细信息
            await next();
        };
    }


    /**
     * 验证在Bearer Authorization头中提供的JWT身份验证，以进行API调用。
     *
     * 如果验证通过，则将有效负载记录在ctx.state.auth中
     */
    static verifyJwtApi() {
        return async function verifyJwtMiddleware(ctx, next) {
            const secretKey = process.env.JWT_SECRET_KEY;
            if (!secretKey) ctx.throw(401, 'No JWT Secret Key available');
            ctx.request.header.authorization = ctx.request.header.authorization || process.env.JWT;
            if (!ctx.request.header.authorization) ctx.throw(401, 'Authorisation required');

            const [ scheme, token ] = ctx.request.header.authorization.split(' ');
            if (scheme != 'Bearer') ctx.throw(401, 'Invalid authorisation');

            if (token) {
                try {
                    const payload = jwt.verify(token, secretKey);
                    ctx.state.auth = authDetails(payload);
                } catch (err) {
                    if ([ 'invalid token', 'invalid signature', 'jwt malformed', 'jwt expired' ].includes(err.message)) {
                        ctx.throw(401, 'Invalid authentication');
                    }
                    ctx.throw(err.status || 500, err.message);
                }
            }
            await next();
        };
    }

}


/**
 * 复制有效负载，将JWT令牌中的加密缩写角色扩展为完整版本，并保留JWT令牌的副本。
 */
function authDetails(jwtPayload, token) {
    const roles = { g: 'guest', a: 'admin', s: 'su' };

    const details = { ...jwtPayload };     // 用于用户ID来查找用户详细信息（使用有效内容副本不改变原始内容）
    details.Role = roles[jwtPayload.role]; // 扩展缩写角色以进行授权检查
    details.jwt = token;                   // 为了 ajax 到 api 的调用

    return details;
}
export default Middleware;
