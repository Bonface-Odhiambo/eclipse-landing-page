const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        trim: true
    },
    role: {
        type: String,
        enum: ['writer', 'employer', 'editor', 'admin'],
        required: true
    },
    privateEmployers: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    meta: {
        lastUpdated: {
            type: Date,
            default: Date.now
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        lastLogin: Date
    },
    // Writer-specific fields
    writerProfile: {
        specialties: [{
            type: String,
            trim: true
        }],
        bio: {
            type: String,
            trim: true
        },
        hourlyRate: {
            type: Number,
            min: 0
        },
        availability: {
            type: Boolean,
            default: true
        }
    },
    // Employer-specific fields
    employerProfile: {
        company: {
            type: String,
            trim: true
        },
        preferredCategories: [{
            type: String,
            trim: true
        }],
        privateWritersCount: {
            type: Number,
            default: 0
        }
    },
    // Editor-specific fields
    editorProfile: {
        specialties: [{
            type: String,
            trim: true
        }],
        availability: {
            type: Boolean,
            default: true
        }
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            delete ret.password;
            return ret;
        }
    }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'writerProfile.specialties': 1 });
userSchema.index({ 'editorProfile.specialties': 1 });
userSchema.index({ privateEmployers: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;