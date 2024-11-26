const Joi = require('joi');
const mongoose = require('mongoose');

// Common validation schemas
const commonSchemas = {
    id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    email: Joi.string().email(),
    phone: Joi.string().pattern(/^(?:\+254|0)[17]\d{8}$/),
    password: Joi.string().min(8).max(30),
    amount: Joi.number().min(0),
    date: Joi.date().iso(),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    status: Joi.string(),
    file: Joi.object({
        fieldname: Joi.string().required(),
        originalname: Joi.string().required(),
        encoding: Joi.string().required(),
        mimetype: Joi.string().required(),
        size: Joi.number().max(30 * 1024 * 1024), // 30MB max
        buffer: Joi.binary()
    })
};

// Order validation schemas
const orderSchemas = {
    create: Joi.object({
        title: Joi.string().required().min(10).max(200),
        description: Joi.string().required().min(50).max(5000),
        subject: Joi.string().required(),
        pages: Joi.number().integer().min(1).required(),
        deadline: Joi.date().iso().greater('now').required(),
        price: Joi.number().min(100).required(),
        isPrivate: Joi.boolean(),
        preferredWriter: commonSchemas.id,
        files: Joi.array().items(commonSchemas.file),
        requirements: Joi.array().items(Joi.string())
    }),

    update: Joi.object({
        title: Joi.string().min(10).max(200),
        description: Joi.string().min(50).max(5000),
        subject: Joi.string(),
        pages: Joi.number().integer().min(1),
        deadline: Joi.date().iso().greater('now'),
        price: Joi.number().min(100),
        status: Joi.string().valid('in_progress', 'completed', 'cancelled'),
        files: Joi.array().items(commonSchemas.file),
        requirements: Joi.array().items(Joi.string())
    }),

    query: Joi.object({
        status: Joi.string(),
        subject: Joi.string(),
        page: commonSchemas.page.default(1),
        limit: commonSchemas.limit.default(10),
        sort: Joi.string().valid('createdAt', 'deadline', 'price').default('createdAt'),
        order: Joi.string().valid('asc', 'desc').default('desc')
    })
};

// Payment validation schemas
const paymentSchemas = {
    withdrawal: Joi.object({
        amount: Joi.number().min(1000).required(),
        phone: commonSchemas.phone.required(),
        withdrawalMethod: Joi.string().valid('mpesa').default('mpesa')
    }),

    subscription: Joi.object({
        phone: commonSchemas.phone.required(),
        plan: Joi.string().valid('monthly', 'fortnight').required()
    }),

    query: Joi.object({
        type: Joi.string().valid('withdrawal', 'subscription', 'order', 'bonus'),
        status: Joi.string().valid('pending', 'completed', 'failed'),
        page: commonSchemas.page.default(1),
        limit: commonSchemas.limit.default(10),
        startDate: commonSchemas.date,
        endDate: commonSchemas.date
    })
};

// File validation schemas
const fileSchemas = {
    upload: Joi.object({
        orderId: commonSchemas.id.required(),
        type: Joi.string().valid('final', 'sample', 'revision').required(),
        file: commonSchemas.file.required()
    }),

    delete: Joi.object({
        orderId: commonSchemas.id.required(),
        type: Joi.string().valid('final', 'sample', 'revision').required(),
        filename: Joi.string().required()
    })
};

// Validation functions
const validateOrder = async (order, type = 'create') => {
    try {
        const schema = orderSchemas[type];
        if (!schema) throw new Error('Invalid validation type');
        
        await schema.validateAsync(order, { abortEarly: false });
        return { valid: true };
    } catch (error) {
        return {
            valid: false,
            errors: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))
        };
    }
};

const validatePayment = async (payment, type = 'withdrawal') => {
    try {
        const schema = paymentSchemas[type];
        if (!schema) throw new Error('Invalid validation type');

        await schema.validateAsync(payment, { abortEarly: false });
        return { valid: true };
    } catch (error) {
        return {
            valid: false,
            errors: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))
        };
    }
};

const validateFile = async (fileData, type = 'upload') => {
    try {
        const schema = fileSchemas[type];
        if (!schema) throw new Error('Invalid validation type');

        await schema.validateAsync(fileData, { abortEarly: false });
        return { valid: true };
    } catch (error) {
        return {
            valid: false,
            errors: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))
        };
    }
};

// Middleware functions
const validateObjectId = (paramName = 'id') => {
    return (req, res, next) => {
        if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ID format'
            });
        }
        next();
    };
};

const validateQueryParams = (schema) => {
    return async (req, res, next) => {
        try {
            const validated = await schema.validateAsync(req.query);
            req.query = validated;
            next();
        } catch (error) {
            res.status(400).json({
                success: false,
                message: 'Invalid query parameters',
                errors: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }))
            });
        }
    };
};

const validateRequestBody = (schema) => {
    return async (req, res, next) => {
        try {
            const validated = await schema.validateAsync(req.body);
            req.body = validated;
            next();
        } catch (error) {
            res.status(400).json({
                success: false,
                message: 'Invalid request body',
                errors: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }))
            });
        }
    };
};

// Helper functions
const sanitizeFilename = (filename) => {
    return filename
        .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace invalid chars with underscore
        .replace(/_{2,}/g, '_'); // Replace multiple consecutive underscores with one
};

const validateFileType = (mimetype, allowedTypes) => {
    return allowedTypes.includes(mimetype);
};

const validateFileSize = (size, maxSize = 30 * 1024 * 1024) => { // 30MB default
    return size <= maxSize;
};

module.exports = {
    validateOrder,
    validatePayment,
    validateFile,
    validateObjectId,
    validateQueryParams,
    validateRequestBody,
    orderSchemas,
    paymentSchemas,
    fileSchemas,
    sanitizeFilename,
    validateFileType,
    validateFileSize
};