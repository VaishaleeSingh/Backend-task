'use strict';

const User = require('./User');
const Content = require('./Content');
const AuditLog = require('./AuditLog');
const ContentSlot = require('./ContentSlot');
const ContentSchedule = require('./ContentSchedule');

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

// ─── Content <-> ContentSchedule ───────────────────────────────────────────
Content.hasMany(ContentSchedule, { foreignKey: 'content_id' });
ContentSchedule.belongsTo(Content, { foreignKey: 'content_id' });

// ─── ContentSlot <-> ContentSchedule ───────────────────────────────────────
ContentSlot.hasMany(ContentSchedule, { foreignKey: 'slot_id' });
ContentSchedule.belongsTo(ContentSlot, { foreignKey: 'slot_id' });

// ─── User <-> ContentSlot (Teacher owns slots) ─────────────────────────────
User.hasMany(ContentSlot, { foreignKey: 'teacher_id', as: 'slots' });
ContentSlot.belongsTo(User, { foreignKey: 'teacher_id', as: 'teacher' });

module.exports = { User, Content, AuditLog, ContentSlot, ContentSchedule };
