
// Login screen
const registerHTML = `
<form class="login" id="form" action="#">
  <p>Select a secure password:</p>
  <fieldset>
  <input id="pw"/>
  </fieldset>
  <button id="loginbutton" type="button" id="signup" class="mui-btn mui-btn--primary">
    Sign up
  </button>
</form>
`;

showRegister = async () => {
  async function signup(event) {
    try {
      const password = document.getElementById('pw').value;
      const time = new Date().getTime().toString();
      const username = md5(time);
      const hash = md5([username,'asterisk',password].join(':'));
      const keys = nacl.sign.keyPair.fromSeed(nacl.util.decodeUTF8(md5(hash)));
      
      credentials = {
        username:'CREATE:'+username,
        password:nacl.util.encodeBase64(keys.publicKey)
      };
      console.log(credentials);
      await login(credentials);
      localStorage.setItem('pubKey', nacl.util.encodeBase64(keys.publicKey));
    } catch (e) {
      console.error(e);
    };
    return false;
  };
  document.getElementById('app').innerHTML = registerHTML;
  document.getElementById('form').onsubmit = signup;
  document.getElementById('loginbutton').onclick = signup;
};
