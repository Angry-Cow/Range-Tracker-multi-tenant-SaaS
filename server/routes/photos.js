const express = require('express');
const router = express.Router({ mergeParams: true });
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { loadConfig } = require('../lib/config');
const { requireTenantAuth } = require('../lib/auth');

router.use(requireTenantAuth);

function getUploadDir(tenantSlug) {
  const config = loadConfig();
  const dir = path.join(__dirname, '..', config.uploadDir, tenantSlug);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    cb(null, getUploadDir(req.tenantSlug));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

router.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const config = loadConfig();
  const publicUrl = `/uploads/${req.tenantSlug}/${req.file.filename}`;
  res.json({ url: publicUrl, error: null });
});

module.exports = router;
