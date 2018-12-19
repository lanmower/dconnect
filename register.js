
// Login screen
const registerHTML = `
<form class="login" id="form" action="#">
  <fieldset>
  Username:
  <input type="username" id="pw"/>
  </fieldset>
  <fieldset>
  Password:
  <input type="password" id="pw"/>
  </fieldset>
  <button id="loginbutton" type="button" id="signup" class="mui-btn mui-btn--primary">
    Sign up
  </button>
</form>
`;

showRegister = async () => {
  async function signup(event) {
    try {
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      await login({ username, password });
    } catch (e) {
      console.error(e);
    };
    return false;
  };
  document.getElementById('app').innerHTML = registerHTML;
  document.getElementById('form').onsubmit = signup;
  document.getElementById('loginbutton').onclick = signup;
};
