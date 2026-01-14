import User from '../models/User.js';
import Branch from '../models/Branch.js';
import { deleteUploadedFile } from '../middleware/upload.js';

/**
 * @desc    Get all users
 * @route   GET /api/v1/users
 * @access  Private/Admin
 */
export const getUsers = async (req, res) => {
  try {
    const { role, branch, isActive, search, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    
    let query = {};
    
    if (role) query.role = role;
    if (branch) query.branch = branch;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .populate('branch', 'name code')
      .select('-password')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get single user
 * @route   GET /api/v1/users/:id
 * @access  Private/Admin
 */
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('branch', 'name code address')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Create new user
 * @route   POST /api/v1/users
 * @access  Private/Admin
 */
export const createUser = async (req, res) => {
  try {
    // ✅ Handle File Uploads (Worker Profile)
    if (req.files) {
      // Profile Picture
      if (req.files.profilePicture && req.files.profilePicture[0]) {
        const file = req.files.profilePicture[0];
        req.body.profilePicture = file.url;
        req.body.profilePictureProvider = file.provider;
      }

      // Contract PDF
      if (req.files.contractPdf && req.files.contractPdf[0]) {
        const file = req.files.contractPdf[0];
        req.body.contractPdf = file.url;
        req.body.contractPdfProvider = file.provider;
      }

      // Initialize documents object
      req.body.documents = req.body.documents || {};
      
      // Single fields (residence, license, identity)
      if (req.files.residencePhoto && req.files.residencePhoto[0]) {
        req.body.documents.residence = req.files.residencePhoto[0].url;
      }
      if (req.files.licensePhoto && req.files.licensePhoto[0]) {
        req.body.documents.license = req.files.licensePhoto[0].url;
      }
      if (req.files.idPhoto && req.files.idPhoto[0]) {
        req.body.documents.identity = req.files.idPhoto[0].url;
      }
      
      // Multiple files (otherFiles)
      if (req.files.otherFiles) {
        req.body.documents.files = req.files.otherFiles.map(file => ({
          name: file.originalname,
          url: file.url,
          provider: file.provider
        }));
      }
    }

    const user = await User.create(req.body);

    // Update branch worker count if worker
    if (user.role === 'worker' && user.branch) {
      await Branch.findByIdAndUpdate(user.branch, {
        $inc: { totalWorkers: 1 }
      });
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user.getPublicProfile()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/v1/users/:id
 * @access  Private/Admin
 */
export const updateUser = async (req, res) => {
  try {
    // Don't allow password update through this route
    delete req.body.password;

    // ✅ Handle File Uploads (Worker Profile)
    const updateOperations = { ...req.body };
    // Remove complex fields from direct set if handled separately
    delete updateOperations.documents; 

    // Initialize $set for specific document fields
    const setOperations = {};

    // ✅ Handle File Removals (Explicit flags) - Single fields
    // Place this BEFORE file uploads so uploads can overwrite "null" if replacing
    if (req.body.remove_profilePicture === 'true') setOperations.profilePicture = null;
    if (req.body.remove_contractPdf === 'true') setOperations.contractPdf = null;
    if (req.body.remove_residencePhoto === 'true') setOperations['documents.residence'] = null;
    if (req.body.remove_licensePhoto === 'true') setOperations['documents.license'] = null;
    if (req.body.remove_idPhoto === 'true') setOperations['documents.identity'] = null;

    if (req.files) {
      // Find the existing user to get old file IDs for deletion
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Profile Picture
      if (req.files.profilePicture && req.files.profilePicture[0]) {
        // Delete old picture if it exists
        if (user.profilePicture) {
          const oldPublicId = user.profilePicture.split(`${process.env.LOCAL_UPLOAD_PATH || 'uploads'}/`)[1] || user.profilePicture.split('upload/')[1]?.split('.')[0];
          if (oldPublicId) deleteUploadedFile(oldPublicId, 'image').catch(err => console.error('Deletion error:', err));
        }

        const file = req.files.profilePicture[0];
        setOperations.profilePicture = file.url;
        setOperations.profilePictureProvider = file.provider;
      }

      // Contract PDF
      if (req.files.contractPdf && req.files.contractPdf[0]) {
        // Delete old contract if it exists
        if (user.contractPdf) {
          const oldPublicId = user.contractPdf.split(`${process.env.LOCAL_UPLOAD_PATH || 'uploads'}/`)[1] || user.contractPdf.split('upload/')[1]?.split('.')[0];
          if (oldPublicId) deleteUploadedFile(oldPublicId, 'raw').catch(err => console.error('Deletion error:', err));
        }

        const file = req.files.contractPdf[0];
        setOperations.contractPdf = file.url;
        setOperations.contractPdfProvider = file.provider;
      }
      
      // Single fields (residence, license, identity)
      if (req.files.residencePhoto && req.files.residencePhoto[0]) {
        if (user.documents?.residence) {
          const oldPublicId = user.documents.residence.split(`${process.env.LOCAL_UPLOAD_PATH || 'uploads'}/`)[1];
          if (oldPublicId) deleteUploadedFile(oldPublicId, 'image').catch(err => console.error('Deletion error:', err));
        }
        setOperations['documents.residence'] = req.files.residencePhoto[0].url;
      }
      
      if (req.files.licensePhoto && req.files.licensePhoto[0]) {
        if (user.documents?.license) {
          const oldPublicId = user.documents.license.split(`${process.env.LOCAL_UPLOAD_PATH || 'uploads'}/`)[1];
          if (oldPublicId) deleteUploadedFile(oldPublicId, 'image').catch(err => console.error('Deletion error:', err));
        }
        setOperations['documents.license'] = req.files.licensePhoto[0].url;
      }

      if (req.files.idPhoto && req.files.idPhoto[0]) {
        if (user.documents?.identity) {
          const oldPublicId = user.documents.identity.split(`${process.env.LOCAL_UPLOAD_PATH || 'uploads'}/`)[1];
          if (oldPublicId) deleteUploadedFile(oldPublicId, 'image').catch(err => console.error('Deletion error:', err));
        }
        setOperations['documents.identity'] = req.files.idPhoto[0].url;
      }
      
      // Handle Multiple Files (Append)
      if (req.files.otherFiles) {
        const newFiles = req.files.otherFiles.map(file => ({
          name: file.originalname,
          url: file.url,
          provider: file.provider
        }));
        
        // Use $push to add new files
        updateOperations['$push'] = { 'documents.files': { $each: newFiles } };
      }
    }

    // ✅ Handle Explicit Removals (flags)
    const userForRemoval = await User.findById(req.params.id);
    if (userForRemoval) {
      if (req.body.remove_profilePicture === 'true' && userForRemoval.profilePicture) {
        const oldPublicId = userForRemoval.profilePicture.split(`${process.env.LOCAL_UPLOAD_PATH || 'uploads'}/`)[1];
        if (oldPublicId) deleteUploadedFile(oldPublicId, 'image').catch(err => console.error('Deletion error:', err));
      }
      if (req.body.remove_contractPdf === 'true' && userForRemoval.contractPdf) {
        const oldPublicId = userForRemoval.contractPdf.split(`${process.env.LOCAL_UPLOAD_PATH || 'uploads'}/`)[1];
        if (oldPublicId) deleteUploadedFile(oldPublicId, 'raw').catch(err => console.error('Deletion error:', err));
      }
      // ... (can add more for residence, license etc)
    }

    // ✅ Handle Additional Files Removal (Pull from array)
    if (req.body.remove_otherFiles) {
        let filesToRemove = req.body.remove_otherFiles;
        if (!Array.isArray(filesToRemove)) {
            filesToRemove = [filesToRemove];
        }
        
        // Execute Pull separately to avoid conflict with $push on same path ('documents.files')
        if (filesToRemove.length > 0) {
            await User.findByIdAndUpdate(req.params.id, {
                $pull: { 'documents.files': { url: { $in: filesToRemove } } }
            });
        }
    }


    // Merge setOperations into updateOperations direct keys (which are $set in Mongoose default, 
    // BUT since we are mixing with $push, we must be careful. 
    // findByIdAndUpdate(id, update, ...) -> if update has $ keys, non-$ keys are ignored or need to be inside $set?
    // Mongoose: if top level has $-keys, then non-$ keys are strictly ignored or throw?
    // Actually, usually you wrap everything in $set if you use any $ operator.
    
    // Let's safe-guard:
    // 1. Move original req.body fields (text) to $set
    updateOperations['$set'] = {};
    Object.keys(req.body).forEach(key => {
        if (key !== 'documents' && key !== 'password' && !key.startsWith('remove_')) {
            updateOperations['$set'][key] = req.body[key];
        }
    });

    // 2. Overlay setOperations (Files) - This ensures files take precedence over req.body text
    Object.assign(updateOperations['$set'], setOperations);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateOperations,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/v1/users/:id
 * @access  Private/Admin
 */
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update branch worker count if worker
    if (user.role === 'worker' && user.branch) {
      await Branch.findByIdAndUpdate(user.branch, {
        $inc: { totalWorkers: -1 }
      });
    }

    // Delete all associated files from storage
    const filesToDelete = [];
    if (user.profilePicture) filesToDelete.push({ id: user.profilePicture, type: 'image' });
    if (user.contractPdf) filesToDelete.push({ id: user.contractPdf, type: 'raw' });
    if (user.documents?.residence) filesToDelete.push({ id: user.documents.residence, type: 'image' });
    if (user.documents?.license) filesToDelete.push({ id: user.documents.license, type: 'image' });
    if (user.documents?.identity) filesToDelete.push({ id: user.documents.identity, type: 'image' });
    if (user.documents?.files) {
      user.documents.files.forEach(f => filesToDelete.push({ id: f.url, type: 'raw' }));
    }

    filesToDelete.forEach(file => {
      const publicId = file.id.split(`${process.env.LOCAL_UPLOAD_PATH || 'uploads'}/`)[1];
      if (publicId) deleteUploadedFile(publicId, file.type).catch(err => console.error('Deletion error:', err));
    });

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get workers
 * @route   GET /api/v1/users/workers
 * @access  Private
 */
export const getWorkers = async (req, res) => {
  try {
    const { branch, page = 1, limit = 20, sort = '-workerDetails.rating' } = req.query;
    
    let query = { role: 'worker', isActive: true };
    if (branch) query.branch = branch;

    const workers = await User.find(query)
      .populate('branch', 'name code')
      .select('-password')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: workers.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: workers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


/**
 * @desc    Get get Worker Details
 * @route   GET /api/v1/users/:id/details
 * @access  Private
 */
export const getWorkerDetails = async (req, res) => {
  try {
    const worker = await User.findById(req.params.id)
      .populate("branch", "name code")
      .select("-password")
      .lean();

    if (!worker || worker.role !== "worker") {
      return res
        .status(404)
        .json({ success: false, message: "Worker not found" });
    }

    res.status(200).json({
      success: true,
      data: worker,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * @desc    Toggle User Status (Activate/Deactivate)
 * @route   PUT /api/v1/users/:id/toggle-status
 * @access  Private/Admin
 */
export const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Toggle between active and inactive
    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: user.getPublicProfile ? user.getPublicProfile() : user
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle user status',
      error: error.message
    });
  }
};