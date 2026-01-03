import { body, param, query, validationResult } from 'express-validator';

/**
 * Validation result handler
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * Login validation
 */
export const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
];

/**
 * User creation validation
 */
export const createUserValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'worker', 'accountant']).withMessage('Invalid role'),
  validate
];

/**
 * Client creation validation
 */
export const createClientValidation = [
  body('name').trim().notEmpty().withMessage('Client name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  validate
];

/**
 * Task creation validation
 */
export const createTaskValidation = [
  body('title').trim().notEmpty().withMessage('Task title is required'),
  body('description').trim().notEmpty().withMessage('Task description is required'),
  body('client').isMongoId().withMessage('Valid client ID is required'),
  body('branch').isMongoId().withMessage('Valid branch ID is required'),
  body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
  validate
];

/**
 * Inventory creation validation
 */
export const createInventoryValidation = [
  body('name').trim().notEmpty().withMessage('Item name is required'),
  body('unit').isIn(['kg', 'liter', 'piece', 'bag', 'box', 'meter']).withMessage('Invalid unit'),
  body('branch').isMongoId().withMessage('Valid branch ID is required'),
  body('quantity.current').isNumeric().withMessage('Current quantity must be a number'),
  body('quantity.minimum').isNumeric().withMessage('Minimum quantity must be a number'),
  validate
];

/**
 * MongoDB ID validation
 */
export const mongoIdValidation = [
  param('id').isMongoId().withMessage('Invalid ID format'),
  validate
];

