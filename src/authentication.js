const authentication = require('@feathersjs/authentication');
const jwt = require('@feathersjs/authentication-jwt');
const local = require('@feathersjs/authentication-local');
const nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');

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

  async verify (req, userinfo, password, done) {
    try {
      const usernameField = this.options.entityUsernameField || this.options.usernameField;
      const passwordField = this.options.entityPasswordField || this.options.passwordField;
      const splitinfo = userinfo.split(':');

      if(splitinfo.length != 2) {
        new Error('No network selected');
      }

      const username = splitinfo[1];
      const option = splitinfo[0];
      var payload;
      switch(option){
      case 'CREATE':
        await this.service.create({[usernameField]:username, [passwordField]: password});
        const response = await this.service.find({
          'query': {
            [usernameField]: username,
            [passwordField]: password,
            '$limit': 1
          }
        });
        const id = response.data[0][this.service.id];
        payload = { [`${this.options.entity}Id`]: response.data[0][this.service.id]  };
        done(null, response.data[0], payload);
        break;
      case 'SIGNIN':
        const dconnectFind = await this.service.find({
          'query': {
            [usernameField]: username,
            '$limit': 1
          }
        });
        if(!dconnectFind.data.length) {
          done(new Error('User not found'));
          return;
        }
        const verify = nacl.sign.open(nacl.util.decodeBase64(password), nacl.util.decodeBase64(dconnectFind.data[0].password));
        if(!verify) {
          done(new Error('Invalid credentials'));
          return;
        }
        const decrypted = nacl.util.encodeUTF8(verify);
        payload = { [`${this.options.entity}Id`]: dconnectFind.data[0][this.service.id] };
        done(null, dconnectFind.data[0], payload);
        break;
      }
    } catch (e) {
      console.error(e);
      done(e);
      return false;
    }
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
