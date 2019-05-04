const auth = require('../auth/authorization');
const errors = require('../models/errors');
// const PageList = require('../models/page-list');
const utils = require('../common/utils');
const Mail = require('../common/mail');
const UserPermission = require('../models/const/user-permission');
const IssueForm = require('../forms/issue/issue-form');
const IssueModel = require('../models/data/issue-model');

exports.addIssue = auth(UserPermission.all(), (req, res) => {
  /*
    GET /api/v1/issues
    聯絡我們, 讓使用者上傳附件
  */
  const form = new IssueForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  return new Promise(() => {
    const issue = new IssueModel({
      ...form,
    });
    issue.save();
    const mail = new Mail();
    mail.sendIssueToUser(issue).catch(error => {
      utils.logError(error, { issue: issue.dump() });
    });
    mail.sendIssueToSystemAdmin(issue).catch(error => {
      utils.logError(error, { issue: issue.dump() });
    });
    return res.json(issue.dump());
  });
});