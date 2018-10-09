'use strict';

let uuid = require('uuid');
module.exports = function(Uploadsessions) {

  Uploadsessions.beforeRemote('bulkInsert', function( ctx, instance, next) {
    let id = uuid();
    ctx.args.data.upload_session_id = id;
    next();
  });

  Uploadsessions.beforeRemote('bulkReplace', function( ctx, instance, next) {
    if (!ctx.args.data.upload_session_id) {
      let id = uuid();
      ctx.args.data.upload_session_id = id;
    }
    next();
  });


};
