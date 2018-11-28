const authentication = require('@feathersjs/authentication');
const jwt = require('@feathersjs/authentication-jwt');
const local = require('@feathersjs/authentication-local');
const steem = require('steem');
const nacl = require('tweetnacl'); 
nacl.util = require('tweetnacl-util'); 
const {SPUB, NONCE, RSECRET} = process.env;
global.decrypt = (message) => {
  const spub = nacl.util.decodeBase64(SPUB);
  const rsecret = nacl.util.decodeBase64(RSECRET);
  const bytes = nacl.box.open(nacl.util.decodeBase64(message), nacl.util.decodeBase64(NONCE), spub, rsecret);
  const utf8 = nacl.util.encodeUTF8(bytes);
  return JSON.parse(utf8);
};

class Verifier {
  constructor (app, options = {}) {
    this.app = app;
    this.options = options;
    this.service = typeof options.service === 'string' ? app.service(options.service) : options.service;
    this._comparePassword = this._comparePassword.bind(this);
    this.verify = this.verify.bind(this);
  } 

  _comparePassword (entity, password) {
    // select entity password field - take entityPasswordField over passwordField
    const passwordField = this.options.entityPasswordField || this.options.passwordField;

    // find password in entity, this allows for dot notation
    const hash = get(entity, passwordField);
    if (!hash) {
      return Promise.reject(new Error(`'${this.options.entity}' record in the database is missing a '${passwordField}'`));
    }

    return new Promise((resolve, reject) => {
      bcrypt.compare(password, hash, function (error, result) {
        // Handle 500 server error.
        if (error) {
          return reject(error);
        }

        if (!result) {
          return reject(false); // eslint-disable-line
        }

        return resolve(entity);
      });
    });
  }


  verify (req, username, password, done) {

    const usernameField = this.options.entityUsernameField || this.options.usernameField;
    var nick;
    steem.api.getAccountHistoryAsync('dconnect', -1, 10000).then((hist)=>{
      var users = hist.filter(block=>{
        const transferOp = block[1].op;
        if(transferOp[0] != 'transfer') return false;
        if(transferOp[1].to != 'dconnect') return false;
        if(!transferOp[1].memo.startsWith('CONNECT:')) return false;
        if(transferOp[1].memo.split(':')[1] != username) return false;
        if(parseFloat(transferOp[1].amount.split(' ')[0]) < 0.001) return false;
        const name = transferOp[1].memo.split(':')[1];
        nick = '{STEEM}:'+transferOp[1].from;
        if(transferOp[1].memo.split(':').length == 3) {
          const key = transferOp[1].memo.split(':')[2];
          console.log(decrypt(key), password);
          if(password == decrypt(key)) return true;
        }
        if(transferOp[1].memo.split(':').length ==  4) {
          const key = transferOp[1].memo.split(':')[3];
          if(nacl.sign.detached.verify(nacl.util.decodeUTF8(username), nacl.util.decodeBase64(password), nacl.util.decodeBase64(key))) {
            return true;
          }
        }
      });
      
      if(!users.length)throw new Error('no users found');
      steem.api.getAccountsAsync([users.pop()[1].op[1].from]).then((users)=>{
        this.service.find({
          'query': {
            [usernameField]: nick,
            '$limit': 1
          }
        }).then(response => {
          let entity;
          const results = response.data || response;
          if (!results.length) {
            this.service.create({[usernameField]:nick}).then(()=>{
              this.service.find({
                'query': {
                  [usernameField]: nick,
                  '$limit': 1
                }
              }).then(response => {
                entity = response.data[0];
                const id = entity[this.service.id];
                const payload = { [`${this.options.entity}Id`]: id };
                done(null, entity, payload);
              });
            });
          } else {
            entity = results[0];
            const id = entity[this.service.id];
            const payload = { [`${this.options.entity}Id`]: id };
            done(null, entity, payload);
          }
        });
      });
      
    }).catch(console.error);
  }
}

module.exports = function (app) {
  const config = app.get('authentication');

  // Set up authentication with the secret
  app.configure(authentication(config));
  app.configure(jwt());
  app.configure(local({Verifier}));

  // The `authentication` service is used to create a JWT.
  // The before `create` hook registers strategies that can be used
  // to create a new valid JWT (e.g. local or oauth2)
  app.service('authentication').hooks({
    before: {
      create: [
        authentication.hooks.authenticate(config.strategies)
      ],
      remove: [
        authentication.hooks.authenticate('jwt')
      ]
    }
  });
};
