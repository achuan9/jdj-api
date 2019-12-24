/**
 * 
 * @api {get} / 用户的登录行为
 * @apiGroup User
 * @apiVersion  0.0.1       
 * 
 * @apiParam  {String} username 登录用到用户名
 * 
 * @apiSuccess (200) {type} name description
 * 
 * @apiParamExample  {type} Request-Example:
 * {
 *     property : value
 * }
 * 
 * 
 * @apiSuccessExample {type} Success-Response:
 * {
 *     property : value
 * }
 * 
 * 
 */

export const getRoot = ctx => {
    // 根元素仅返回uri的主要资源（首选格式）
    const resources = {
        auth:    { _uri: '/auth' },
        members: { _uri: '/members' },
        teams:   { _uri: '/teams' },
    };
    const authentication =
    '‘GET /auth?username=admin@user.com&password=admin’ to obtain JSON Web Token; subsequent requests require JWT auth';
    ctx.response.body = { resources: resources, authentication: authentication };
    ctx.response.body.root = 'api';
};
