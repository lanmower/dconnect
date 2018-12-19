// Chat base HTML (without user list and messages)
const appHTML = `
<div id="dapps-menu" class="mui--no-user-select">
</div>
<div id="content-wrapper">
  <div id="frame"></div>
  <div id="edit" style="display:none"></div>
  <div id="meet"></div>
</div>
`;

const showApp = async () => {
  document.getElementById('app').innerHTML = appHTML;
  updateList('dapps-menu');
};
