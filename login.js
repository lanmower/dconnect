// Login screen
const loginHTML = `
<form class="form login" action="#" onsubmit="doLogin();return false;">
  <h4 class="heading font-100">Sign in</h4>
  <fieldset>
    <input class="block" type="username" name="username" placeholder="username">
  </fieldset>

  <fieldset>
    <input class="block" type="password" name="password" placeholder="password">
  </fieldset>

  <button type="button" id="login" class="mui-btn mui-btn--primary">
    Sign in
  </button>
  <input type="submit" style="visibility: hidden;"></input>
  <button type="button" id="register" class="mui-btn mui-btn--primary">
    Register
  </button>
</form>
`;

// Show the login page
const showLogin = (error = {}) => {
  if(document.querySelectorAll('.login').length) {
    document.querySelector('.heading').insertAdjacentHTML('beforeend', `<p>${error.message}</p>`);
  } else {
    document.getElementById('app').innerHTML = loginHTML;
  }
};


const  getCredentials = async () => {
  const username = document.querySelector('[name="username"]').value;
  const password = document.querySelector('[name="password"]').value;
  return {username,password};
};

const doLogin = async () => {
  const user = await getCredentials();
  await login(user);
};

document.addEventListener('click', async ev => {
  switch(ev.target.id) {
    case 'login': {
      await doLogin();
      break;
    }
    case 'register': {
      await showRegister();
      break;
    }
  }
});
