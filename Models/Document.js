const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Version content is required']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Version must have an author']
  }
});

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Document must have a title']
  },
  content: {
    type: String,
    default: ''
  },
  versions: [versionSchema],
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Document must have an owner']
  },
  collaborators: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

const Document = mongoose.model('Document', documentSchema);
module.exports = Document;