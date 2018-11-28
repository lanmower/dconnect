/* global document, window, feathers, moment, io */


// Login screen
const loginHTML = `<main class="login container">
  <div class="row">
    <div class="col-12 col-6-tablet push-3-tablet text-center heading">
      <h1 class="font-100">Log in</h1>
    </div>
  </div>
  <div class="row">
    <div class="col-12 col-6-tablet push-3-tablet col-4-desktop push-4-desktop">
      <form class="form">
        <fieldset>
          <input class="block" type="username" name="username" placeholder="username">
        </fieldset>

        <fieldset>
          <input class="block" type="password" name="password" placeholder="password">
        </fieldset>

        <button type="button" id="login" class="button button-primary block signup">
          Log in
        </button>
      </form>
    </div>
  </div>
</main>`;

// Chat base HTML (without user list and messages)
const appHTML = `<main class="flex flex-column">

  <div class="flex flex-row flex-1 clear" id="frame" style="position:relative;">
    <aside style="width:50px; padding:0px" class="flex flex-column col col-1">
      <main class="flex flex-column flex-1 clear" id="dapps-menu">
      </main>
    </aside>
  </>
</main>`;


// Show the login page
const showLogin = (error = {}) => {
  if(document.querySelectorAll('.login').length) {
    document.querySelector('.heading').insertAdjacentHTML('beforeend', `<p>There was an error: ${error.message}</p>`);
  } else {
    document.getElementById('app').innerHTML = loginHTML;
  }
};

const showApp = async () => {
  document.getElementById('app').innerHTML = appHTML;
  updateList('dapps-menu');
};

document.addEventListener('click', async ev => {
  switch(ev.target.id) {
  case 'login': {
    const user = await getCredentials();

    await login(user);
    
    break;
  }
  case 'logout': {
    dapp.logout();
    break;
  }
  }
});

login();
