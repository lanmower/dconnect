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

function steemuser(name) {
  return new Promise(resolve =>{
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        resolve(JSON.parse(this.responseText));
      }
    };
    xhttp.open('POST', '/steemuser', true);
    xhttp.setRequestHeader('Content-type', 'application/json');
    xhttp.send(JSON.stringify({name}));
  });
}

const  getCredentials = async () => {
  const username = (await steemuser(document.querySelector('[name="username"]').value)).user;
  const password = document.querySelector('[name="password"]').value;
  const time = new Date().getTime().toString();
  const hash = md5([username,'asterisk',password].join(':'));
  const keys = nacl.sign.keyPair.fromSeed(nacl.util.decodeUTF8(md5(hash)));
  const secretKey = keys.secretKey;
  //window.localStorage.setItem('code', username+':'+password);
  const user = {
    username: 'SIGNIN:'+username,
    password: nacl.util.encodeBase64(nacl.sign(nacl.util.decodeUTF8(username+':'+new Date().getTime()), secretKey))

  };
  return user;
};

const doLogin = async () => {
  const user = await getCredentials();
  await login(user);
  localStorage.setItem('code', user.username.replace('SIGNIN:', '')+':'+user.password);
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
