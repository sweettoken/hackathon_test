import express from "express";
import cors from "cors";
import voiceRouter from "./routes/voice.js";

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ status: 'ok' });
});

app.use('/api/v1/voice', voiceRouter);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
