const steem = require('steem');
const getMessagesService = require('./messages/messages.service.js');
const users = require('./users/users.service.js');

module.exports = function (app) {
  app.getMessagesService = getMessagesService;
  app.configure(users);
};
