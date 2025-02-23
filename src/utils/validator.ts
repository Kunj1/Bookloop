import Joi from 'joi';

// Validate User Registration
export const validateRegistration = Joi.object({
    fullName: Joi.string().min(3).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    state: Joi.string().required(),
    address: Joi.string().required(),
    phoneNumber: Joi.string().pattern(/^[6-9]\d{9}$/).required(), // Indian phone number validation
    profilePicture: Joi.string().uri().optional(),
    role: Joi.string().valid('donator/receiver', 'courier_partner', 'courses_partner').default('donator/receiver'),
});

// Validate User Login
export const validateLogin = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

// Validate User Profile Update
export const validateUser = Joi.object({
    fullName: Joi.string().min(3).max(50).optional(),
    state: Joi.string().optional(),
    address: Joi.string().optional(),
    phoneNumber: Joi.string().pattern(/^[6-9]\d{9}$/).optional(),
    profilePicture: Joi.string().uri().optional(),
    role: Joi.string().valid('donator/receiver', 'courier_partner', 'courses_partner').optional(),
});

// Validate Password Change
export const validatePasswordChange = Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required(),
});

// Validate Book Creation
export const validateBook = Joi.object({
    name: Joi.string().min(3).required(),
    authors: Joi.array().items(Joi.string().required()).min(1).required(),
    imageUrls: Joi.array().items(Joi.string().uri()).optional(),
    language: Joi.string().valid('hindi', 'english', 'bengali', 'others').required(),
    genre: Joi.string().valid('fiction', 'novel', 'mystery', 'non-fiction', 'others').required(),
    price: Joi.number().min(0).required(),
    sold: Joi.boolean().optional(),
    editionYear: Joi.number().min(1000).max(new Date().getFullYear()).required(),
    description: Joi.string().optional(),
});

/* Validate Website Review
export const validateWebsiteReview = Joi.object({
    rating: Joi.number().integer().min(0).max(5).required(),
    review: Joi.string().min(5).max(500).optional(),
});*/
