const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const compression = require('compression');
const morgan = require('morgan');

const config = require('./config');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// Trust the first proxy hop (Render/Vercel) so secure cookies and rate-limit
// IP detection work correctly.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize()); // strip $ and . from keys to block NoSQL injection
app.use(hpp()); // guard against HTTP parameter pollution
app.use(compression());
if (!config.isProd) app.use(morgan('dev'));

app.get('/api/health', (_req, res) =>
  res.json({ success: true, status: 'ok', uptime: process.uptime(), env: config.env })
);

app.use('/api', apiLimiter, routes);

// 404 + centralized error handling must be registered last.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
