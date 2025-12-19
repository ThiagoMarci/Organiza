// ==================== CONFIGURAÇÃO GOOGLE CALENDAR ====================
const CLIENT_ID = '588348873658-u9m50e1h3itgnq28f84p9jrq4sq06k4n.apps.googleusercontent.com';
const API_KEY = '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  ';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

let tokenClient;
let gapiInited = false;
let gisInited = false;
let googleConnected = false;

function gapiLoaded() {
  gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
  await gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: [DISCOVERY_DOC],
  });
  gapiInited = true;
  maybeEnableButtons();
}

function gisLoaded() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: () => {},
  });
  gisInited = true;
  maybeEnableButtons();
}

function maybeEnableButtons() {
  if (gapiInited && gisInited) {
    if (localStorage.getItem('googleAccessToken')) {
      gapi.client.setToken({access_token: localStorage.getItem('googleAccessToken')});
      googleConnected = true;
      document.getElementById('connect-google').textContent = 'Google Calendar Conectado ✓';
      document.getElementById('connect-google').disabled = true;
    }
  }
}

function handleAuthClick() {
  tokenClient.callback = async (resp) => {
    if (resp.error) {
      toast('Erro na autenticação: ' + resp.error);
      return;
    }
    localStorage.setItem('googleAccessToken', resp.access_token);
    googleConnected = true;
    document.getElementById('connect-google').textContent = 'Google Calendar Conectado ✓';
    document.getElementById('connect-google').disabled = true;
    toast('Google Calendar conectado com sucesso!');
  };

  if (gapi.client.getToken() === null) {
    tokenClient.requestAccessToken({prompt: 'consent'});
  } else {
    tokenClient.requestAccessToken({prompt: ''});
  }
}

async function addToGoogleCalendar(account) {
  if (!googleConnected) {
    toast('Conecte sua conta Google primeiro!');
    return;
  }

  const event = {
    summary: `Pagar: ${account.name} - R$ ${account.value.toFixed(2)}`,
    description: `Conta/recorrência: ${account.recurrence || 'mensal'}`,
    start: { date: account.dueDate, timeZone: Intl.DateTimeFormat().resolvedOptions.timeZone },
    end: { date: account.dueDate, timeZone: Intl.DateTimeFormat().resolvedOptions.timeZone },
    reminders: {
      useDefault: false,
      overrides: [
        {method: 'email', minutes: 24 * 60},
        {method: 'popup', minutes: 30},
      ],
    },
  };

  try {
    await gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });
    toast(`Evento "${account.name}" adicionado ao Google Calendar!`);
  } catch (err) {
    toast('Erro ao adicionar ao Calendar: ' + err.message);
  }
}

// ==================== LÓGICA DO APP ====================
function updateCurrentDate() {
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  document.getElementById('current-date').textContent = new Date().toLocaleDateString('pt-BR', options);
}
updateCurrentDate();

const toggle = document.getElementById('dark-toggle');
if (localStorage.getItem('dark') === 'on') {
  document.body.classList.add('dark');
  toggle.textContent = 'Modo Claro';
}
toggle.onclick = () => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  toggle.textContent = isDark ? 'Modo Claro' : 'Modo Escuro';
  localStorage.setItem('dark', isDark ? 'on' : 'off');
};

const defaultAccounts = [
  { name: 'Energia Elétrica', value: 178.90, dueDate: '2025-12-20', recurrence: 'mensal', paid: false },
  { name: 'Internet Fibra', value: 99.90, dueDate: '2025-12-10', recurrence: 'mensal', paid: false }
];

let accounts = JSON.parse(localStorage.getItem('accounts')) || defaultAccounts;

function save() {
  localStorage.setItem('accounts', JSON.stringify(accounts));
}

function getStatus(account) {
  if (account.paid) return 'paid';
  const today = new Date();
  today.setHours(0,0,0,0);
  const due = new Date(account.dueDate);
  due.setHours(0,0,0,0);
  const days = Math.ceil((due - today) / 86400000);
  return days < 0 ? 'overdue' : 'pending';
}

function getDaysText(account) {
  if (account.paid) return '✔ Paga';
  const today = new Date();
  today.setHours(0,0,0,0);
  const due = new Date(account.dueDate);
  due.setHours(0,0,0,0);
  const days = Math.ceil((due - today) / 86400000);
  if (days < 0) return `Atrasada há ${-days} dia${-days > 1 ? 's' : ''}`;
  if (days === 0) return 'Vence hoje!';
  return `Vence em ${days} dia${days > 1 ? 's' : ''}`;
}

// ==================== MODAIS ====================
const accountModal = document.getElementById('account-modal');
const deleteModal = document.getElementById('delete-modal');
const modalTitle = document.getElementById('modal-title');
const form = document.getElementById('account-form');
const inputName = document.getElementById('modal-name');
const inputValue = document.getElementById('modal-value');
const inputDate = document.getElementById('modal-due-date');
const deleteAccountName = document.getElementById('delete-account-name');

let editingIndex = null;
let deletingIndex = null;

function openAccountModal(isEdit = false, index = null) {
  editingIndex = isEdit ? index : null;
  modalTitle.textContent = isEdit ? 'Editar Conta' : 'Nova Conta';
  
  if (isEdit) {
    const account = accounts[index];
    inputName.value = account.name;
    inputValue.value = account.value.toFixed(2).replace('.', ',');
    inputDate.value = account.dueDate;
  } else {
    form.reset();
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    inputDate.value = defaultDate.toISOString().split('T')[0];
  }
  
  accountModal.classList.add('show');
  inputName.focus();
}

function closeAccountModal() {
  accountModal.classList.remove('show');
  editingIndex = null;
}

function openDeleteModal(index) {
  deletingIndex = index;
  deleteAccountName.textContent = accounts[index].name;
  deleteModal.classList.add('show');
}

function closeDeleteModal() {
  deleteModal.classList.remove('show');
  deletingIndex = null;
}

// Formatação do valor em reais
inputValue.addEventListener('input', (e) => {
  let value = e.target.value.replace(/\D/g, '');
  value = (value / 100).toFixed(2).replace('.', ',');
  value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  e.target.value = value;
});

// Salvamento do formulário (adicionar/editar)
form.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const name = inputName.value.trim();
  if (!name) { toast('Digite o nome da conta'); return; }
  
  const valueStr = inputValue.value.replace(/\./g, '').replace(',', '.');
  const value = parseFloat(valueStr);
  if (isNaN(value) || value <= 0) { toast('Digite um valor válido'); return; }
  
  const dueDate = inputDate.value;
  if (!dueDate) { toast('Selecione a data de vencimento'); return; }
  
  if (editingIndex === null) {
    accounts.push({ name, value, dueDate, recurrence: 'mensal', paid: false });
    toast('Nova conta adicionada!');
  } else {
    accounts[editingIndex] = { ...accounts[editingIndex], name, value, dueDate };
    toast('Conta atualizada!');
  }
  
  save();
  render();
  closeAccountModal();
});

// Eventos dos botões dos modais
document.getElementById('add-button').onclick = () => openAccountModal(false);
document.getElementById('modal-cancel').onclick = closeAccountModal;
accountModal.onclick = (e) => { if (e.target === accountModal) closeAccountModal(); };

document.getElementById('delete-cancel').onclick = closeDeleteModal;
document.getElementById('delete-confirm').onclick = () => {
  accounts = accounts.filter((_, i) => i !== deletingIndex);
  save();
  render();
  toast('Conta excluída');
  closeDeleteModal();
};
deleteModal.onclick = (e) => { if (e.target === deleteModal) closeDeleteModal(); };

// ==================== RENDER DOS CARDS ====================
function render() {
  accounts.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const list = document.getElementById('accounts-list');
  list.innerHTML = '';
  
  accounts.forEach((account, index) => {
    const card = document.createElement('div');
    card.className = `account-card ${getStatus(account)}`;
    const daysText = getDaysText(account);
    
    card.innerHTML = `
      <div class="account-name">${account.name}</div>
      <div class="account-details">
        R$ ${account.value.toFixed(2).replace('.', ',')} • ${new Date(account.dueDate).toLocaleDateString('pt-BR')}
      </div>
      <div class="days-info">${daysText}</div>
      <div class="main-actions">
        ${account.paid ? `
          <button class="action-btn unpay-button">Desmarcar como Paga</button>
        ` : `
          <button class="action-btn pay-button">Marcar como Paga</button>
          <button class="action-btn calendar-button">+ Calendar</button>
        `}
        <button class="action-btn edit-button">Editar</button>
        <button class="action-btn delete-button">Excluir</button>
      </div>
    `;
    
    // Ações dos botões
    if (account.paid) {
      card.querySelector('.unpay-button').onclick = () => {
        account.paid = false;
        save();
        render();
        toast('Conta desmarcada como paga');
      };
    } else {
      card.querySelector('.pay-button').onclick = () => {
        account.paid = true;
        save();
        render();
        toast('Conta marcada como paga!');
      };
      card.querySelector('.calendar-button').onclick = () => addToGoogleCalendar(account);
    }
    
    card.querySelector('.edit-button').onclick = () => openAccountModal(true, index);
    card.querySelector('.delete-button').onclick = () => openDeleteModal(index);
    
    list.appendChild(card);
  });
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

document.getElementById('connect-google').onclick = handleAuthClick;

render();