// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html
const steem = require('steem');

module.exports = function (options = {}) { // eslint-disable-line no-unused-vars
  return async context => {
    const {data} = context;
    if(data.steemavatar) {
      data.avatar = data.steemavatar;
    } else {
      data.avatar =  data.avatar?data.avatar:'https://wolfkodi.dyndns.org/wolfing/img/avatarnotfound.png';
    }
    return context;
  };
};
