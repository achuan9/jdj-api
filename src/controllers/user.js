import jwt from 'jsonwebtoken';
import Scrypt from 'scrypt-kdf';
import castBoolean from '../utils/cast-boolean';
import Response from '../utils/response';
import User from '../models/user.js';
/**
 * @apiDefine admin 管理员
 * 只能是管理员角色调用.
 */
class ControllerUser {
    /**
   *
   * @api {post} user/login 登录
   * @apiGroup  User
   * @apiDescription 根据用户名与密码登录，其它需要授权的接口，需要把本接口获取到 token 设置为 Bearer Authorization HTTP 请求头的值
   *
   * @apiParam {String} userName                  用户名
   * @apiParam {String} password                  密码
   *
   * @apiSuccess {String} data             token
   * @apiSuccess {String} message          返回信息
   * @apiSuccess {String} status           状态: ['success', 'fail', 'error']
   */
    static async login(ctx) {
        const { userName, password } = ctx.request.body;
        if (!userName || !password) ctx.throw(401, 'Username/password not supplied');
        let [ user ] = await User.getBy('Email', userName);

        // 始终调用verify（）（无论是否找到电子邮件）以减轻对身份验证功能的计时攻击
        const passwordHash = user ? user.Password : '0123456789abcdef'.repeat(8);
        let passwordMatch = null;
        try {
            passwordMatch = await Scrypt.verify(Buffer.from(passwordHash, 'base64'), password);
        } catch (e) {
            if (e instanceof RangeError) user = null; // "Invalid key"
            if (!(e instanceof RangeError)) throw e;
        }

        if (!user || !passwordMatch) ctx.throw(404, 'Username/password not found');

        const payload = {
            id:   user.UserId, // to get user details
            role: user.Role.slice(0, 1).toLowerCase(), // make role available without db query
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: '24h' });
        ctx.response.body = Response.ok(ctx, { data: token });
    }

    /**
   *
   * @api {post} user/add 新增用户
   * @apiGroup User
   * @apiPermission admin
   *
   * @apiHeader  Authorization             用户登录获得的Token
   * @apiHeader  Content-Type              application/json
   *
   * @apiParam  {String} userName 用户名
   * @apiParam  {String} password 密码
   * @apiParam  {String} phone 手机号码
   * @apiParam  {String} role  角色。管理员：admin。普通用户：guest
   *
   * @apiSuccess {String} data             token
   * @apiSuccess {String} message          返回信息
   * @apiSuccess {String} status           状态: ['success', 'fail', 'error']
   *
   * @apiSampleRequest http://api.localhost:3000/user/add
   */
    static async add(ctx) {
        if (ctx.state.auth.Role != 'admin') ctx.throw(403, '需要管理员身份');
        const { userName, password, role, phone } = ctx.request.body;
        if (!userName || !password || !role || !phone) ctx.throw(401, '参数不全');
        ctx.request.body = await castBoolean.fromStrings(
            'User',
            ctx.request.body,
        );
        const id = await User.insert(ctx.request.body);
        
        ctx.body = Response.ok(ctx, { data: id });
        ctx.body.root = 'User';
        ctx.set('Location', '/user/'+id);
        ctx.status = 201;
    }

    static async delete(ctx) {
        const { id } = ctx.request.body;
        if (!id) ctx.throw(401, '参数不全');
        const result = await User.delete(id);
        if (!result) ctx.throw(500, '删除失败');
        ctx.body = Response.ok(ctx, { data: result });
    }
    static update(ctx) {}
    static query(ctx) {}
}

export default ControllerUser;
