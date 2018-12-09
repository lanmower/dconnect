const { authenticate } = require('@feathersjs/authentication').hooks;

const { hashPassword, protect } = require('@feathersjs/authentication-local').hooks;
const { disallow } = require('feathers-hooks-common');
const avatar = require('../../hooks/avatar');
const hooks = require('feathers-authentication-hooks');
module.exports = { 
  before: {
    all: [ authenticate('jwt') ],
    find: [ ],
    get: [ ],
    create: [ disallow('external') ],
    update: [ disallow('external') ],
    patch: [ hooks.restrictToOwner({ idField: '_id', ownerField: '_id' }) ],
    remove: [ disallow('external') ]
  },

  after: {
    all: [  
      protect('password')
    ],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [ ],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
