import Router from 'koa-router';
import { getRoot } from '../controllers/root';
import ControllerUser from '../controllers/user';

const router = new Router();
// router.get('/', (ctx) => ctx.body = 'hellow');
router.post('/user/login', ControllerUser.login);

export default router.middleware();
