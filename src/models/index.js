'use strict';

const User = require('./User');
const Content = require('./Content');
const AuditLog = require('./AuditLog');

// ─── User <-> Content (Teacher owns content) ────────────────────────────────
User.hasMany(Content, {
  foreignKey: 'teacher_id',
  as: 'uploadedContent',
});
Content.belongsTo(User, {
  foreignKey: 'teacher_id',
  as: 'teacher',
});

// ─── User <-> Content (Principal reviews content) ───────────────────────────
User.hasMany(Content, {
  foreignKey: 'reviewed_by',
  as: 'reviewedContent',
});
Content.belongsTo(User, {
  foreignKey: 'reviewed_by',
  as: 'reviewer',
});

// ─── User <-> AuditLog ──────────────────────────────────────────────────────
User.hasMany(AuditLog, {
  foreignKey: 'actor_id',
  as: 'auditLogs',
});
AuditLog.belongsTo(User, {
  foreignKey: 'actor_id',
  as: 'actor',
});

module.exports = { User, Content, AuditLog };
