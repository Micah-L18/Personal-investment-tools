import express from 'express';
import cors from 'cors';
import apiRouter from './api/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', apiRouter);
app.use('/public',express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), 'public')));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get('/', (req, res) => {
    // re route to /home
    res.redirect('/home');
});

app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, './public/index.html'));
});

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});