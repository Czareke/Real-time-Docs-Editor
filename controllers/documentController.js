const Document = require('../Models/Document');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.getAllDocuments = catchAsync(async (req, res, next) => {
  const documents = await Document.find({
    $or: [
      { owner: req.user.id },
      { collaborators: req.user.id }
    ]
  }).populate('owner', 'name email');

  res.status(200).json({
    status: 'success',
    results: documents.length,
    data: {
      documents
    }
  });
});

exports.getDocument = catchAsync(async (req, res, next) => {
  const document = await Document.findById(req.params.id)
    .populate('owner', 'name email')
    .populate('collaborators', 'name email')
    .populate('versions.author', 'name email');

  if (!document) {
    return next(new AppError('No document found with that ID', 404));
  }

  // Check if user has access to the document
  if (
    document.owner.id !== req.user.id &&
    !document.collaborators.some(collab => collab.id === req.user.id)
  ) {
    return next(new AppError('You do not have permission to access this document', 403));
  }

  res.status(200).json({
    status: 'success',
    data: {
      document
    }
  });
});

exports.createDocument = catchAsync(async (req, res, next) => {
  const document = await Document.create({
    title: req.body.title,
    content: req.body.content,
    owner: req.user.id,
    versions: [{
      content: req.body.content || '',
      author: req.user.id
    }]
  });

  res.status(201).json({
    status: 'success',
    data: {
      document
    }
  });
});

exports.updateDocument = catchAsync(async (req, res, next) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    return next(new AppError('No document found with that ID', 404));
  }

  // Check if user has permission to update
  if (
    document.owner.toString() !== req.user.id &&
    !document.collaborators.some(collab => collab.toString() === req.user.id)
  ) {
    return next(new AppError('You do not have permission to update this document', 403));
  }

  // Add new version if content is being updated
  if (req.body.content && req.body.content !== document.content) {
    document.versions.push({
      content: req.body.content,
      author: req.user.id
    });
  }

  // Update document fields
  document.title = req.body.title || document.title;
  document.content = req.body.content || document.content;

  await document.save();

  res.status(200).json({
    status: 'success',
    data: {
      document
    }
  });
});

exports.deleteDocument = catchAsync(async (req, res, next) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    return next(new AppError('No document found with that ID', 404));
  }

  // Only owner can delete document
  if (document.owner.toString() !== req.user.id) {
    return next(new AppError('Only the owner can delete this document', 403));
  }

  await document.deleteOne();

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.addCollaborator = catchAsync(async (req, res, next) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    return next(new AppError('No document found with that ID', 404));
  }

  // Only owner can add collaborators
  if (document.owner.toString() !== req.user.id) {
    return next(new AppError('Only the owner can add collaborators', 403));
  }

  // Check if user exists
  const collaborator = await User.findById(req.body.userId);
  if (!collaborator) {
    return next(new AppError('No user found with that ID', 404));
  }

  // Check if user is already a collaborator
  if (document.collaborators.includes(req.body.userId)) {
    return next(new AppError('User is already a collaborator', 400));
  }

  document.collaborators.push(req.body.userId);
  await document.save();

  res.status(200).json({
    status: 'success',
    data: {
      document
    }
  });
});

exports.removeCollaborator = catchAsync(async (req, res, next) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    return next(new AppError('No document found with that ID', 404));
  }

  // Only owner can remove collaborators
  if (document.owner.toString() !== req.user.id) {
    return next(new AppError('Only the owner can remove collaborators', 403));
  }

  document.collaborators = document.collaborators.filter(
    collab => collab.toString() !== req.params.userId
  );

  await document.save();

  res.status(200).json({
    status: 'success',
    data: {
      document
    }
  });
});

exports.getDocumentVersions = catchAsync(async (req, res, next) => {
  const document = await Document.findById(req.params.id)
    .populate('versions.author', 'name email');

  if (!document) {
    return next(new AppError('No document found with that ID', 404));
  }

  // Check if user has access to the document
  if (
    document.owner.toString() !== req.user.id &&
    !document.collaborators.some(collab => collab.toString() === req.user.id)
  ) {
    return next(new AppError('You do not have permission to access this document', 403));
  }

  res.status(200).json({
    status: 'success',
    data: {
      versions: document.versions
    }
  });
});