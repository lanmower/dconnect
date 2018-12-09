const authentication = require('@feathersjs/authentication');
const jwt = require('@feathersjs/authentication-jwt');
const local = require('@feathersjs/authentication-local');

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
        if(username.length != 32 || password.length != 32) {
          done(new Error('Bad username/password'));
          return;
        }
        const response = await this.service.find({
          'query': {
            [usernameField]: username,
            [passwordField]: password,
            '$limit': 1
          }
        });
        const id = response.data[0][this.service.id];
        payload = { [`${this.options.entity}Id`]: id };
        done(null, response.data[0], payload);
        break;
      case 'SIGNIN': 
        console.log(username, password, (await this.service.find()).data);
        const dconnectFind = await this.service.find({
          'query': {
            [usernameField]: username,
            [passwordField]: password,
            '$limit': 1
          }
        });
        if(dconnectFind.data.length) {
          const id = dconnectFind.data[0][this.service.id];
          payload = { [`${this.options.entity}Id`]: id };
          done(null, dconnectFind.data[0], payload);
        } else {
          done(new Error('Invalid username/password'));
        }
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
