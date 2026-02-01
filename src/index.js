import express from 'express';
import { matchRouter } from './routes/matches.js';
import { commentaryRouter } from './routes/commentary.js';
import { createServer } from 'http';
import { attachWebSocketServer } from './ws/server.js';

const app = express();
const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || '0.0.0.0'

const server = createServer(app);

// Middleware to parse JSON
app.use(express.json());

// Use the match router
app.use('/matches', matchRouter);
app.use('/matches/:id', commentaryRouter);

// GET route
app.get('/', (req, res) => {
    res.json({ message: 'Hello from Express server!' });
});

const { broadcastMatchCreated } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

// Start server and log URL
server.listen(PORT, HOST, () => {
    const baseUrl = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
    console.log(`Server is running at ${baseUrl}`);
    console.log(`WebSocket server is running at ${baseUrl.replace('http', 'ws')}/ws`);
});
