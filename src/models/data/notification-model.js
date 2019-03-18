const { Schema } = require('mongoose');
const utils = require('../../common/utils');
const NotificationType = require('../const/notification-type');

const db = utils.getDatabaseConnection();
const model = db.model(
  'NotificationModel',
  utils.generateSchema(
    {
      user: {
        // recipient
        type: Schema.ObjectId,
        ref: 'UserModel',
        required: true,
        index: {
          name: 'User',
        },
      },
      type: {
        type: String,
        required: true,
        enum: NotificationType.all(),
      },
      isRead: {
        type: Boolean,
        default: false,
      },
      dataField: {
        type: Schema.ObjectId,
        ref: 'DataFieldModel',
      },
      expiredTime: {
        // 超過時間後不顯示，用於系統公告
        type: Date,
        index: {
          name: 'ExpiredTime',
        },
      },
    },
    {
      collection: 'Notifications',
    },
  ),
);

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    type: this.type,
    isRead: this.isRead,
    dataField:
      this.dataField && typeof this.dataField.dump === 'function'
        ? this.dataField.dump()
        : this.dataField,
    createTime: this.createTime,
  };
};

module.exports = model;