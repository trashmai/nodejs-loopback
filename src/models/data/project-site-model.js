const { Schema } = require('mongoose');
const utils = require('../../common/utils');

const db = utils.getDatabaseConnection();
const model = db.model(
  'ProjectSiteModel',
  utils.generateSchema(
    {
      project: {
        type: Schema.ObjectId,
        ref: 'ProjectModel',
        required: true,
        index: {
          name: 'Project',
        },
      },
      title: {
        // 樣區名稱
        'zh-TW': {
          // 繁體中文
          type: String,
        },
      },
      parent: {
        // 子樣區的話會有上層的 id
        type: Schema.ObjectId,
        ref: 'ProjectSiteModel',
      },
    },
    {
      collection: 'ProjectSites',
    },
  ),
);

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    title: this.title,
  };
};

module.exports = model;
