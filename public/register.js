
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
      const pw = document.getElementById('pw').value;
      const acc = String.valueOf()(new Date().getTime());
      const id = MD5.hexdigest(String.valueOf()(new Date().getTime()));
      const hash = MD5.hexdigest(MD5.hexdigest(acc)+':asterisk:'+pw);
      credentials = {
        username:'CREATE:'+id,
        password:hash
      };
      await login(credentials);
      window.localStorage.setItem('code', id+':'+hash);
      const user = (await client.service('users').find({query:{username:localStorage.getItem('id')}})).data.pop();
    } catch (e) {
      console.error(e);
    };
    return false;
  };
  document.getElementById('app').innerHTML = registerHTML;
  document.getElementById('form').onsubmit = signup;
  document.getElementById('loginbutton').onclick = signup;
};

