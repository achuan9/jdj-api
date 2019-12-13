
// const spec = require('../spec');
/**
 * @swagger
 * /:
 *   get:
 *     tags:
 *     - root
 *     summary: 根路由.
 *     operationId: getRoot
 *     responses:
 *       '200':
 *         x-summary: OK
 *         description: OK
 *         content:
 *           application/json:
 *             example:
 *               authentication: '‘GET /auth?username=<un>&password=<pw>’ to obtain JSON Web Token; subsequent requests require JWT auth'
 *               resources: 
 *                  auth: 
 *                    _uri: '/auth'
 *                  members: 
 *                    _uri: '/members'
 *                  teams: 
 *                    _uri: '/teams'
 *               
 */
export const getRoot = ctx => {
    // 根元素仅返回uri的主要资源（首选格式）
    const resources = { auth: { _uri: '/auth' }, members: { _uri: '/members' }, teams: { _uri: '/teams' } };
    const authentication = '‘GET /auth?username=admin@user.com&password=admin’ to obtain JSON Web Token; subsequent requests require JWT auth';
    ctx.response.body = { resources: resources, authentication: authentication };
    ctx.response.body.root = 'api';
};

