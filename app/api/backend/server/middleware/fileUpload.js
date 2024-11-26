// middleware/fileUpload.js
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const crypto = require('crypto');
const path = require('path');

// Create storage engine
const storage = new GridFsStorage({
    url: process.env.MONGODB_URI || 'mongodb+srv://Eclipse_Writers:xOGX1UkwTznrMsvN@cluster0.k0ncz.mongodb.net/myDatabase?retryWrites=true&w=majority&appName=Cluster0',
    options: { useNewUrlParser: true, useUnifiedTopology: true },
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            // Generate random filename
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads',
                    metadata: {
                        originalname: file.originalname,
                        encoding: file.encoding,
                        mimetype: file.mimetype,
                        uploadedBy: req.user?._id,
                        uploadedAt: new Date()
                    }
                };
                resolve(fileInfo);
            });
        });
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/jpg',
        'text/plain'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, Word, Excel, images, and text files are allowed.'), false);
    }
};

// File size limits
const limits = {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per upload
};

// Initialize multer middleware
const upload = multer({
    storage,
    fileFilter,
    limits
});

// Error handler middleware
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 10MB.'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files. Maximum is 5 files per upload.'
            });
        }
    }
    if (err) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next();
};

module.exports = {
    upload,
    handleUploadError
};