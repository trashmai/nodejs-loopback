const UserPermission = require('../models/const/user-permission');
const auth = require('../auth/authorization');

exports.logout = auth(
  /*
  POST /api/v1/logout
   */
  UserPermission.all(),
  (req, res) =>
    new Promise((resolve, reject) => {
      req.session.destroy(error => {
        if (error) {
          return reject(error);
        }
        resolve(res.json({}));
      });
    }),
);

exports.getMyProfile = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/me
   */
  res.json(req.user.dump());
});
