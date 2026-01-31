import express from 'express';

const app = express();
const PORT = 8000;

// Middleware to parse JSON
app.use(express.json());

// GET route
app.get('/', (req, res) => {
    res.json({ message: 'Hello from Express server!' });
});

// Start server and log URL
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
