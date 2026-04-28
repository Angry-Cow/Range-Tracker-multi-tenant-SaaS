const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { loadConfig } = require('./lib/config');

const config = loadConfig();
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static(path.join(__dirname, config.uploadDir)));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', generalLimiter);
app.use('/api/admin/login', authLimiter);
app.use('/api/register', authLimiter);

app.use('/api/admin', require('./routes/admin'));
app.use('/api/register', require('./routes/register'));

app.use('/api/t/:tenantSlug/shooters', (req, _res, next) => {
  req.tenantSlug = req.params.tenantSlug;
  next();
}, require('./routes/shooters'));

app.use('/api/t/:tenantSlug/settings', (req, _res, next) => {
  req.tenantSlug = req.params.tenantSlug;
  next();
}, require('./routes/settings'));

app.use('/api/t/:tenantSlug/records', (req, _res, next) => {
  req.tenantSlug = req.params.tenantSlug;
  next();
}, require('./routes/records'));

app.use('/api/t/:tenantSlug/photos', (req, _res, next) => {
  req.tenantSlug = req.params.tenantSlug;
  next();
}, require('./routes/photos'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(config.port, () => {
  console.log(`Range Tracker API running on port ${config.port}`);
});
