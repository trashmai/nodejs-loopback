const errors = require('../models/errors');
const UserPermission = require('../models/const/user-permission');

module.exports = (permissions = [], func) =>
  /*
  Authorization function.
  example:
    handler = authorization(['basic'], (req, res, next) => {...});
  @param permissions {Array<string>} What permissions allowed to execute the func.
  @param func {function} The handler method.
  @returns {function}
   */
  function(req, res, next) {
    if (
      req.user.permission !== UserPermission.administrator &&
      permissions.indexOf(req.user.permission) < 0
    ) {
      // req.user isn't administrator and not in the white list.
      next(new errors.Http403());
    } else {
      // eslint-disable-next-line prefer-rest-params
      func.apply(this, arguments);
    }
  };
