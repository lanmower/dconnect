const createService = require('feathers-nedb');
const createModel = require('../../models/messages.model');
const hooks = require('./messages.hooks');
 
const names = [];
module.exports = (name) => {
  return function (app) {
    const Model = createModel(app, name);
    const paginate = app.get('paginate');

    const options = {
      name: 'messages',
      Model,
      paginate
    };
    // Initialize our service with any options it requires
    app.use('/dapp.'+name+'.messages', createService(options));
    const service = app.service('dapp.'+name+'.messages');
    service.hooks(hooks); 
  };
};
