const NeDB = require('nedb');
const path = require('path');

module.exports = function (app, name) {
  const dbPath = app.get('nedb');
  const Model = new NeDB({
    filename: path.join(dbPath, 'messages.'+name+'.db'),
    autoload: true
  });

  return Model;
};
