import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'mern-turbo-server' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`[server] running on http://localhost:${PORT}`));
