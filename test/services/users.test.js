const assert = require('assert');
const app = require('../../src/app');

describe('\'users\' service', () => {
  it('registered the service', () => {
    const service = app.service('users');

    assert.ok(service, 'Registered the service');
  });

  it('creates a user, encrypts password and adds gravatar', async () => {
    const user = await app.service('users').create({
      username: 'lanmower',
      password: 'secret'
    });

    // Verify Gravatar has been set to what we'd expect
    assert.equal(user.avatar, 'https://cdn0.iconfinder.com/data/icons/computer-hardware-glyph-1/100/1-48-256.png');
  });
});
