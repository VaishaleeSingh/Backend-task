const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

class ContentSlot extends Model {
  static associate(models) {
    this.hasMany(models.ContentSchedule, { foreignKey: 'slot_id' });
  }
}

ContentSlot.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'maths, science, etc.'
    },
    teacher_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'ContentSlot',
    tableName: 'content_slots',
    underscored: true,
  });

module.exports = ContentSlot;
