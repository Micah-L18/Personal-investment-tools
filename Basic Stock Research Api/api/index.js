import { Router } from 'express';
import stockRouter from './stock.js';

const router = Router();

router.use('/',stockRouter);

export default router;