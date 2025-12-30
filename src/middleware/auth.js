import { verifyToken } from '../utils/jwt.js';
import User from '../models/User.js';
import Client from '../models/Client.js';

/**
 * ✅ UNIFIED: Protect routes - verify JWT token for ALL user types
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = verifyToken(token);

      // ✅ UNIFIED APPROACH: Check role to determine user type
      if (decoded.role === 'client') {
        // Client authentication
        const client = await Client.findById(decoded.id);
        
        if (!client) {
          return res.status(401).json({
            success: false,
            message: 'Client not found'
          });
        }

        if (client.status !== 'active') {
          return res.status(401).json({
            success: false,
            message: 'Client account is not active'
          });
        }

        // ✅ Set req.user with role='client' (UNIFIED)
        req.user = {
          id: client._id.toString(),
          role: 'client',
          email: client.email,
          name: client.name,
          _clientData: client // Full client data if needed
        };

      } else {
        // Admin/Worker authentication
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'User not found'
          });
        }

        if (!user.isActive) {
          return res.status(401).json({
            success: false,
            message: 'User account is deactivated'
          });
        }

        // ✅ Set req.user (standard)
        req.user = {
          id: user._id.toString(),
          role: user.role,
          email: user.email,
          name: user.name,
          _userData: user // Full user data if needed
        };
      }

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

/**
 * ✅ UNIFIED: Authorize specific roles
 * @param {...String} roles - Allowed roles (e.g., 'admin', 'worker', 'client')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = verifyToken(token);
        
        if (decoded.role === 'client') {
          const client = await Client.findById(decoded.id);
          if (client && client.status === 'active') {
            req.user = {
              id: client._id.toString(),
              role: 'client',
              email: client.email,
              name: client.name
            };
          }
        } else {
          const user = await User.findById(decoded.id).select('-password');
          if (user && user.isActive) {
            req.user = {
              id: user._id.toString(),
              role: user.role,
              email: user.email,
              name: user.name
            };
          }
        }
      } catch (error) {
        // Token invalid, but continue anyway
        console.log('Optional auth: Invalid token, continuing without auth');
      }
    }

    next();
  } catch (error) {
    next();
  }
};

/**
 * Accountant & Admin middleware - ensures only accountants or admins can access
 * Allows admins to view financial stats while maintaining primary accountant access
 */
export const accountantOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  if (req.user.role !== 'accountant' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access restricted to accountants and admins only'
    });
  }

  next();
};
