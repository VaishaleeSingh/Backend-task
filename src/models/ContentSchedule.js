const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

class ContentSchedule extends Model {
  static associate(models) {
    this.belongsTo(models.Content, { foreignKey: 'content_id' });
    this.belongsTo(models.ContentSlot, { foreignKey: 'slot_id' });
  }
}

ContentSchedule.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    content_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'contents',
        key: 'id'
      }
    },
    slot_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'content_slots',
        key: 'id'
      }
    },
    rotation_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'The order in which this content appears in the rotation'
    },
    duration: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      comment: 'Duration in minutes for this content in the rotation'
    }
  }, {
    sequelize,
    modelName: 'ContentSchedule',
    tableName: 'content_schedules',
    underscored: true,
  });

module.exports = ContentSchedule;
