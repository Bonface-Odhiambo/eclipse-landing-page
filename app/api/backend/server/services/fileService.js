const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

class FileService {
    constructor() {
        // Configure AWS
        AWS.config.update({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION
        });

        this.s3 = new AWS.S3();
        this.bucket = process.env.AWS_S3_BUCKET;

        // Allowed file types
        this.allowedFileTypes = {
            documents: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'],
            images: ['.jpg', '.jpeg', '.png', '.gif'],
            assignments: ['.zip', '.rar', '.7z'],
            additional: ['.xlsx', '.xls', '.csv', '.ppt', '.pptx']
        };

        // File size limits (in bytes)
        this.fileSizeLimits = {
            documents: 10 * 1024 * 1024,    // 10MB
            images: 5 * 1024 * 1024,        // 5MB
            assignments: 50 * 1024 * 1024,   // 50MB
            additional: 20 * 1024 * 1024     // 20MB
        };

        // Initialize multer for S3 uploads
        this.upload = multer({
            storage: multerS3({
                s3: this.s3,
                bucket: this.bucket,
                metadata: (req, file, cb) => {
                    cb(null, { fieldName: file.fieldname });
                },
                key: (req, file, cb) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    cb(null, `${req.user.id}/${file.fieldname}/${uniqueSuffix}${path.extname(file.originalname)}`);
                }
            }),
            fileFilter: (req, file, cb) => {
                this.validateFile(file, cb);
            },
            limits: {
                fileSize: 50 * 1024 * 1024 // 50MB max for any file
            }
        });
    }

    validateFile(file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedTypes = [
            ...this.allowedFileTypes.documents,
            ...this.allowedFileTypes.images,
            ...this.allowedFileTypes.assignments,
            ...this.allowedFileTypes.additional
        ];

        if (allowedTypes.includes(ext)) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type'));
    }

    async uploadFile(file, userId, category = 'documents') {
        try {
            const uniqueFileName = `${userId}/${category}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname)}`;
            
            const params = {
                Bucket: this.bucket,
                Key: uniqueFileName,
                Body: file.buffer,
                ContentType: file.mimetype,
                Metadata: {
                    'originalname': file.originalname,
                    'userId': userId,
                    'category': category
                }
            };

            const result = await this.s3.upload(params).promise();

            return {
                url: result.Location,
                key: result.Key,
                fileName: file.originalname,
                fileSize: file.size,
                fileType: file.mimetype
            };
        } catch (error) {
            console.error('File upload error:', error);
            throw new Error('File upload failed');
        }
    }

    async uploadMultipleFiles(files, userId, category = 'documents') {
        try {
            const uploadPromises = files.map(file => this.uploadFile(file, userId, category));
            return await Promise.all(uploadPromises);
        } catch (error) {
            console.error('Multiple files upload error:', error);
            throw new Error('Multiple files upload failed');
        }
    }

    async downloadFile(fileKey) {
        try {
            const params = {
                Bucket: this.bucket,
                Key: fileKey
            };

            const data = await this.s3.getObject(params).promise();
            return data.Body;
        } catch (error) {
            console.error('File download error:', error);
            throw new Error('File download failed');
        }
    }

    async deleteFile(fileKey) {
        try {
            const params = {
                Bucket: this.bucket,
                Key: fileKey
            };

            await this.s3.deleteObject(params).promise();
            return true;
        } catch (error) {
            console.error('File deletion error:', error);
            throw new Error('File deletion failed');
        }
    }

    async getFileMetadata(fileKey) {
        try {
            const params = {
                Bucket: this.bucket,
                Key: fileKey
            };

            const data = await this.s3.headObject(params).promise();
            return {
                contentType: data.ContentType,
                size: data.ContentLength,
                lastModified: data.LastModified,
                metadata: data.Metadata
            };
        } catch (error) {
            console.error('Get file metadata error:', error);
            throw new Error('Failed to get file metadata');
        }
    }

    async listUserFiles(userId, category = null) {
        try {
            const params = {
                Bucket: this.bucket,
                Prefix: userId + (category ? `/${category}` : '')
            };

            const data = await this.s3.listObjectsV2(params).promise();
            return data.Contents.map(item => ({
                key: item.Key,
                size: item.Size,
                lastModified: item.LastModified,
                url: this.getSignedUrl(item.Key)
            }));
        } catch (error) {
            console.error('List files error:', error);
            throw new Error('Failed to list files');
        }
    }

    getSignedUrl(fileKey, expiresIn = 3600) {
        try {
            return this.s3.getSignedUrl('getObject', {
                Bucket: this.bucket,
                Key: fileKey,
                Expires: expiresIn
            });
        } catch (error) {
            console.error('Get signed URL error:', error);
            throw new Error('Failed to generate signed URL');
        }
    }

    // Utility method to check if file exists
    async fileExists(fileKey) {
        try {
            await this.s3.headObject({
                Bucket: this.bucket,
                Key: fileKey
            }).promise();
            return true;
        } catch (error) {
            if (error.code === 'NotFound') {
                return false;
            }
            throw error;
        }
    }

    // Method to move file to another location in bucket
    async moveFile(sourceKey, destinationKey) {
        try {
            // Copy the object to new location
            await this.s3.copyObject({
                Bucket: this.bucket,
                CopySource: `${this.bucket}/${sourceKey}`,
                Key: destinationKey
            }).promise();

            // Delete the original
            await this.deleteFile(sourceKey);
            
            return true;
        } catch (error) {
            console.error('Move file error:', error);
            throw new Error('Failed to move file');
        }
    }

    // Method to get file stats (size, type, etc.)
    async getFileStats(fileKey) {
        try {
            const metadata = await this.getFileMetadata(fileKey);
            const fileExt = path.extname(fileKey).toLowerCase();
            
            let category = 'other';
            for (const [cat, extensions] of Object.entries(this.allowedFileTypes)) {
                if (extensions.includes(fileExt)) {
                    category = cat;
                    break;
                }
            }

            return {
                ...metadata,
                category,
                extension: fileExt
            };
        } catch (error) {
            console.error('Get file stats error:', error);
            throw new Error('Failed to get file stats');
        }
    }
}

module.exports = new FileService();