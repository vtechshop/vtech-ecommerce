const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // SECURITY: Sanitize original filename to prevent path traversal
    const sanitizedOriginalName = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
      .replace(/\.{2,}/g, '_') // Prevent .. directory traversal
      .replace(/^\.+/, '') // Remove leading dots
      .substring(0, 100); // Limit length to prevent long filename attacks

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(sanitizedOriginalName).toLowerCase();

    // SECURITY: Whitelist allowed extensions
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt'];
    const finalExt = allowedExts.includes(ext) ? ext : '.bin';

    cb(null, file.fieldname + '-' + uniqueSuffix + finalExt);
  }
});

// SECURITY: Enhanced file filter with MIME type verification
const fileFilter = (req, file, cb) => {
  // Check both extension and MIME type to prevent spoofing
  const allowedMimes = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt']
  };

  const ext = path.extname(file.originalname).toLowerCase();
  const expectedExts = allowedMimes[file.mimetype];

  // SECURITY: Both MIME type and extension must match
  if (expectedExts && (expectedExts.includes(ext) || ext === '')) {
    return cb(null, true);
  } else {
    cb(new Error(`Invalid file type. MIME type (${file.mimetype}) and extension (${ext}) must match. Only images and documents are allowed.`));
  }
};

// Single file upload middleware
const uploadMiddleware = (fieldName) => {
  return multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    }
  }).single(fieldName);
};

// Multiple files upload middleware
const uploadMultipleMiddleware = (fields) => {
  // Support both array of field names and multer fields format
  if (Array.isArray(fields) && typeof fields[0] === 'string') {
    // Convert array of field names to multer fields format
    const fieldConfigs = fields.map(name => ({ name, maxCount: name === 'images' ? 5 : 1 }));
    return multer({
      storage: storage,
      fileFilter: fileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit per file
        files: 10
      }
    }).fields(fieldConfigs);
  } else {
    // Legacy support for single field name
    const fieldName = fields;
    const maxCount = 5;
    return multer({
      storage: storage,
      fileFilter: fileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit per file
        files: maxCount
      }
    }).array(fieldName, maxCount);
  }
};

module.exports = {
  uploadMiddleware,
  uploadMultipleMiddleware
};
