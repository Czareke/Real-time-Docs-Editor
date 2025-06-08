const express = require('express');
const documentController = require('../controllers/documentController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Document routes
router.get('/', documentController.getAllDocuments);
router.post('/', documentController.createDocument);
router.get('/:id', documentController.getDocument);
router.patch('/:id', documentController.updateDocument);
router.delete('/:id', documentController.deleteDocument);

// Collaborator management
router.post('/:id/collaborators', documentController.addCollaborator);
router.delete('/:id/collaborators/:userId', documentController.removeCollaborator);

// Version history
router.get('/:id/versions', documentController.getDocumentVersions);

module.exports = router;