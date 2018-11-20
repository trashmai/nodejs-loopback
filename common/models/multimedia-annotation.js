
const Json2csvParser = require('json2csv').Parser;
const uuid = require('uuid');

module.exports = function(MultimediaAnnotation) {
  const addRevision = function(context, user, next) {
    const args_data = context.args.data;
    // console.log(context.args.data);
    const method = context.methodString.split('.').pop();
    console.log(method);

    const revisions = [];
    args_data.forEach(d => {
      let _revision; let make_revision; let _tokens = [];
      _revision = {};
      make_revision = true;
      let modifiedBy;

      switch (method) {
        case 'bulkUpdate':

          try {
            console.log('TRYING');
            const testRequired = d.updateOne.update.$set.tokens[0].data[0].key;
            if (testRequired === undefined) make_revision = false;
            modifiedBy = d.updateOne.update.$set.modifiedBy;
          } catch (e) {
            console.log(['TestRequiredError:', e.message]);
            make_revision = false;
            break;
          }

          _revision.url_md5 = d.updateOne.filter._id;
          _revision.created = d.updateOne.update.$set.modified;
          _tokens = d.updateOne.update.$set.tokens;

          break;
        case 'bulkInsert':
          // console.log(d.insertOne);
          try {
            console.log('Trying to create a data revision.');
            const testRequired = d.insertOne.document.tokens[0].data[0].key;
            if (testRequired === undefined) make_revision = false;
            console.log(testRequired);
            modifiedBy = d.insertOne.document.modifiedBy;
          } catch (e) {
            console.log(['TestRequiredError:', e.message]);
            make_revision = false;
            break;
          }

          _revision.url_md5 = d.insertOne.document._id;
          _revision.created = d.insertOne.document.modified;
          _tokens = d.insertOne.document.tokens;
          break;

        case 'bulkReplace':

          try {
            console.log('TRYING');
            const testRequired = d.replaceOne.replacement.tokens[0].data[0].key;
            if (testRequired === undefined) make_revision = false;
            console.log(testRequired);
            modifiedBy = d.replaceOne.replacement.modifiedBy;
          } catch (e) {
            console.log(['TestRequiredError:', e.message]);
            make_revision = false;
            break;
          }

          _revision.url_md5 = d.replaceOne.filter._id;
          _revision.created = d.replaceOne.replacement.modified;
          _tokens = d.replaceOne.replacement.tokens;
          break;
      }

      if (make_revision) {
        _revision.tokens = _tokens.map(t => {
          let key_val_pair = {};
          let keyCounter = 0;
          t.data.forEach(_d => {
            if (!!_d.key) {
              keyCounter++;
              key_val_pair[_d.key] = _d.value;
            }
          });

          if (keyCounter > 0) {
            return {
              // token_id: t.token_id,
              data: t.data,
              summary: key_val_pair
            }
          }
          
            return false;
          
        });
        _revision.tokens = _revision.tokens.filter(t => t !== false);

        if (_revision.tokens.length) {
          // console.log(_revision);
          const updateOne = {
            updateOne: {
              'filter': {_id: _revision.url_md5},
              'update': {
                $push: {
                  revisions: {
                    $each: [
                      {modifiedBy, created: _revision.created, tokens: _revision.tokens},
                    ],
                    $slice: -5,
                  },
                },
                '$setOnInsert': {
                  _id: _revision.url_md5,
                  url_md5: _revision.url_md5,
                },
              },
              'upsert': true,
            },
          };

          revisions.push(updateOne);
        }
      }
    });

    // console.log(JSON.stringify(revisions, null, 2));
    if (revisions.length > 0) {
      MultimediaAnnotation.getDataSource().connector.connect((err, db) => {
        if (err) return next(err);

        const MAR = db.collection('MultimediaAnnotationRevision');
        // console.log(MAR);

        MAR.bulkWrite(revisions, { ordered: false }, (err, results) => {
          if (err) {
            next(err);
          }
          else {
            console.log(results);
            next();
          }
        });
      });
    } else {
      next();
    }
  };

  MultimediaAnnotation.remoteMethod('basicCalculation', {
    http: { path: '/calculation', verb: 'post' },
    // accepts: { arg: 'data', type: 'string', http: { source: 'body' } },
      accepts: [
        { arg: 'data', type: 'object', http: { source: 'body' } },
        { arg: 'req', type: 'object', http: { source: 'req' } },
    ],
    returns: { arg: 'ret', type: 'object' },
    }
);

  MultimediaAnnotation.basicCalculation = function(data, req, callback) {
    MultimediaAnnotation.getDataSource().connector.connect((err, db) => {
      if (err) return next(err);

      console.log(req.session);

      /*
      {
        "projectTitle": "測試計畫1",
        "site": "臺東處",
        "subSite": "NULL",
        "species": "山羌"
      }
      // */

      const toMatch = {};

      const projectTitle = data.projectTitle;
      if (projectTitle) {
        toMatch.projectTitle = projectTitle;
      } else {
        return callback(new Error());
      }

      const site = data.site;
      if (site) {
        toMatch.site = site;
      } else {
        return callback(new Error());
      }

      const subSite = data.subSite;
      if (subSite) {
        toMatch.subSite = subSite;
      }

      const species = data.species;
      //* 
      if (species) {
        toMatch['tokens.data.key'] = 'species';
        toMatch['tokens.data.value'] = species;
      }
      //* /

      const fullCameraLocationMd5s = data.fullCameraLocationMd5s;
      if (
        Array.isArray(fullCameraLocationMd5s) &&
        fullCameraLocationMd5s.length > 0
      ) {
        toMatch.fullCameraLocationMd5 = { $in: fullCameraLocationMd5s };
      }

      const projection = {
        url: true,
        projectTitle: true,
        site: true,
        subSite: true,
        cameraLocation: true,
        fullCameraLocationMd5: true,
        tokens: false,
        'tokens.data.key': true,
        'tokens.data.value': true,
        //* 
        tokens: {
          $elemMatch: {
            'data.key': 'species',
            'data.value': species,
          },
        },

        //* /
        corrected_date_time: true,
        date_time_corrected_timestamp: true,
      };

      const prjMdl = db.collection('Project');
      // 取得計畫啟用的自訂欄位
      prjMdl.findOne(
        { projectTitle: projectTitle },
        { projection: { dataFieldEnabled: true } },
        function(err, res) {
          if (err) {
            callback(err);
          } else if (res) {
            let mdl = db.collection("MultimediaAnnotation");
            let requiredFields = res.dataFieldEnabled || [];
            requiredFields = ['species'].concat(requiredFields);
            console.log(requiredFields);

            mdl.find(toMatch, {projection: projection, sort: [['cameraLocation', 1], ['date_time_corrected_timestamp', 1], ['uploaded_file_name', 1]]}).toArray(function(err, results) {
              if (err) {
                callback(err);
              }
              else {

                let csvTemplate = {};
                requiredFields.forEach(function(f){
                  csvTemplate[f] = "NA";
                });

                const keys = Object.keys(csvTemplate); //.sort((a,b) => b>a);
                let fields = ['projectTitle', 'site', 'subSite', 'cameraLocation', 'filename', 'date_time'];
                fields = fields.concat(keys);
                const opts = { fields };
                const parser = new Json2csvParser(opts);

                let csvRecords = [];

                let csv = '';

                results.forEach(function(annotation){
                  annotation.tokens.forEach(function(token){
                    let csvRecord = {};
                    Object.assign(csvRecord, csvTemplate);
                    token.data.forEach(function(d){
                      if (csvRecord[d.key]) {
                        csvRecord[d.key] = d.value || 'NA';
                      }
                    });
                    //csvRecordArr = keys.map(key => csvRecord[key]);
                    csvRecord.filename = annotation.url.split("/").pop();
                    csvRecord.date_time = annotation.corrected_date_time;
                    csvRecord.projectTitle = projectTitle,
                    csvRecord.site = annotation.site;
                    csvRecord.subSite = annotation.subSite;
                    csvRecord.cameraLocation = annotation.cameraLocation;
                    csvRecords.push(csvRecord);
                  });

                });

                csv = parser.parse(csvRecords);
                // TODO: write to S3
                let AWS = MultimediaAnnotation.app.aws;
                console.log('Before getting credentials')

                function uploadToS3 (params) {
                  let s3 = new AWS.S3();
                  s3.upload(params, {},
                    function(err, data) {
                      if (err) {
                        console.log('ERROR!');
                        callback(err);
                      }
                      else {
                        console.log('OK');
                        callback(null, csv);
                      }
                    });
                }

                let fileToBeAnalyzed = uuid() + ".csv";
                let params = {
                  Bucket: 'taibif-s3-mount-bucket', 
                  Key: "data_for_calculation/" + fileToBeAnalyzed, 
                  Body: csv, 
                  ContentType: "text/csv",
                  ACL: 'public-read'
                };

                uploadToS3(params);

                /*
                AWS.config.credentials.get(function(err){
                  if (err) {return callback(err)}
                  uploadToS3(params);
                });
                //*/

                //callback(null, results);
              }
            });
          }
          else {
            callback(null, null);
          }
        }
      );

    });
  };

  MultimediaAnnotation.afterRemote('bulkInsert', addRevision); // tested
  MultimediaAnnotation.afterRemote('bulkReplace', addRevision); // tested
  MultimediaAnnotation.afterRemote('bulkUpdate', addRevision); // tested

  MultimediaAnnotation.disableRemoteMethodByName('upsert'); // disables PATCH /MultimediaAnnotation
  MultimediaAnnotation.disableRemoteMethodByName('find'); // disables GET /MultimediaAnnotation
  MultimediaAnnotation.disableRemoteMethodByName('replaceOrCreate'); // disables PUT /MultimediaAnnotation
  MultimediaAnnotation.disableRemoteMethodByName('create'); // disables POST /MultimediaAnnotation

  MultimediaAnnotation.disableRemoteMethodByName('prototype.updateAttributes'); // disables PATCH /MultimediaAnnotation/{id}
  // MultimediaAnnotation.disableRemoteMethodByName("findById");                             // disables GET /MultimediaAnnotation/{id}
  MultimediaAnnotation.disableRemoteMethodByName('exists'); // disables HEAD /MultimediaAnnotation/{id}
  MultimediaAnnotation.disableRemoteMethodByName('replaceById'); // disables PUT /MultimediaAnnotation/{id}
  MultimediaAnnotation.disableRemoteMethodByName('deleteById'); // disables DELETE /MultimediaAnnotation/{id}

  MultimediaAnnotation.disableRemoteMethodByName(
    'prototype.__get__accessTokens',
  ); // disable GET /MultimediaAnnotation/{id}/accessTokens
  MultimediaAnnotation.disableRemoteMethodByName(
    'prototype.__create__accessTokens',
  ); // disable POST /MultimediaAnnotation/{id}/accessTokens
  MultimediaAnnotation.disableRemoteMethodByName(
    'prototype.__delete__accessTokens',
  ); // disable DELETE /MultimediaAnnotation/{id}/accessTokens

  MultimediaAnnotation.disableRemoteMethodByName(
    'prototype.__findById__accessTokens',
  ); // disable GET /MultimediaAnnotation/{id}/accessTokens/{fk}
  MultimediaAnnotation.disableRemoteMethodByName(
    'prototype.__updateById__accessTokens',
  ); // disable PUT /MultimediaAnnotation/{id}/accessTokens/{fk}
  MultimediaAnnotation.disableRemoteMethodByName(
    'prototype.__destroyById__accessTokens',
  ); // disable DELETE /MultimediaAnnotation/{id}/accessTokens/{fk}

  MultimediaAnnotation.disableRemoteMethodByName(
    'prototype.__count__accessTokens',
  ); // disable  GET /MultimediaAnnotation/{id}/accessTokens/count

  MultimediaAnnotation.disableRemoteMethodByName('prototype.verify'); // disable POST /MultimediaAnnotation/{id}/verify
  MultimediaAnnotation.disableRemoteMethodByName('changePassword'); // disable POST /MultimediaAnnotation/change-password
  MultimediaAnnotation.disableRemoteMethodByName('createChangeStream'); // disable GET and POST /MultimediaAnnotation/change-stream

  MultimediaAnnotation.disableRemoteMethodByName('confirm'); // disables GET /MultimediaAnnotation/confirm
  MultimediaAnnotation.disableRemoteMethodByName('count'); // disables GET /MultimediaAnnotation/count
  MultimediaAnnotation.disableRemoteMethodByName('findOne'); // disables GET /MultimediaAnnotation/findOne

  MultimediaAnnotation.disableRemoteMethodByName('login'); // disables POST /MultimediaAnnotation/login
  MultimediaAnnotation.disableRemoteMethodByName('logout'); // disables POST /MultimediaAnnotation/logout

  MultimediaAnnotation.disableRemoteMethodByName('resetPassword'); // disables POST /MultimediaAnnotation/reset
  MultimediaAnnotation.disableRemoteMethodByName('setPassword'); // disables POST /MultimediaAnnotation/reset-password
  MultimediaAnnotation.disableRemoteMethodByName('update'); // disables POST /MultimediaAnnotation/update
  MultimediaAnnotation.disableRemoteMethodByName('upsertWithWhere'); // disables POST /MultimediaAnnotation/upsertWithWhere
};
