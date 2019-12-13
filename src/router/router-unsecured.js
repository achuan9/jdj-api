
import Router from 'koa-router';
import { getRoot } from '../controllers/root';
import { getAuth } from '../controllers/auth';

const router = new Router();
router.get('/', getRoot);
router.get('/auth', getAuth);  
export default router.middleware();


