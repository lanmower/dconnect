// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html
const steem = require('steem');

// We need this to create the MD5 hash
const crypto = require('crypto');

// The size query. Our chat needs 60px images
const query = 's=60';

module.exports = function (options = {}) { // eslint-disable-line no-unused-vars
  return async context => {
    
    const userdata = await steem.api.getAccountsAsync([context.data.username.replace('{STEEM}:','')]);
    const profile = (userdata && userdata[0] && userdata[0].json_metadata)?JSON.parse(userdata[0].json_metadata).profile:null;
    context.data.avatar =  profile?profile.profile_image:'https://wolfkodi.dyndns.org/wolfing/img/avatarnotfound.png';

    // Best practise, hooks should always return the context
    return context;
  };
};
