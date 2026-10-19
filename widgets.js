const dateFormats = {long:{weekday:'long',month:'long',day:'numeric'}, short:{weekday:'short',month:'short',day:'numeric'}, numeric:{year:'numeric',month:'2-digit',day:'2-digit'}};
function zoneName(zone) {
  return zone.split('/').pop().replaceAll('_', ' ');
}
function updateClock() {
  const date = new Date(), time = document.querySelector('#clock-time');
  const timeOptions = {hour:'2-digit', minute:'2-digit', hour12:!galacticSettings.clock24};
  if (galacticSettings.clockSeconds) timeOptions.second = '2-digit';
  time.textContent = date.toLocaleTimeString([], timeOptions);
  time.dateTime = date.toISOString();
  const day = document.querySelector('#clock-date');
  day.hidden = galacticSettings.dateFormat === 'none';
  if (!day.hidden) day.textContent = date.toLocaleDateString([], dateFormats[galacticSettings.dateFormat]);
  const zone = document.querySelector('#clock-zone');
  zone.hidden = !galacticSettings.zone2;
  if (galacticSettings.zone2) {
    const there = date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:!galacticSettings.clock24, timeZone:galacticSettings.zone2});
    const weekday = date.toLocaleDateString([], {weekday:'short', timeZone:galacticSettings.zone2});
    zone.textContent = `${zoneName(galacticSettings.zone2)} · ${there}${weekday === date.toLocaleDateString([], {weekday:'short'}) ? '' : ` ${weekday}`}`;
  }
  updateGreeting(date);
}
function updateGreeting(date = new Date()) {
  const hour = date.getHours();
  const part = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 22 ? 'Good evening' : 'Good night';
  const name = galacticSettings.name.trim();
  document.querySelector('#greeting').textContent = name ? `${part}, ${name}` : part;
}

const todoList = document.querySelector('#todo-list');
const todoInput = document.querySelector('#todo-input');
const todoClear = document.querySelector('#todo-clear');
function renderTodos() {
  const items = galacticSettings.todos.map(todo => {
    const item = document.createElement('li'); item.classList.toggle('done', todo.done);
    const label = document.createElement('label');
    const check = document.createElement('input'); check.type = 'checkbox'; check.checked = todo.done;
    check.addEventListener('change', () => changeTodos(() => { todo.done = check.checked; }));
    const text = document.createElement('span'); text.textContent = todo.text;
    label.append(check, text);
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '✕';
    remove.setAttribute('aria-label', `Delete task: ${todo.text}`);
    remove.addEventListener('click', () => changeTodos(() => { galacticSettings.todos = galacticSettings.todos.filter(other => other !== todo); }, true));
    item.append(label, remove);
    return item;
  });
  todoList.replaceChildren(...items);
  const done = galacticSettings.todos.filter(todo => todo.done).length;
  todoClear.hidden = !done;
  todoClear.textContent = `Clear ${done} completed`;
  todoInput.disabled = galacticSettings.todos.length >= 100;
  todoInput.placeholder = todoInput.disabled ? 'The list is full (100 tasks)' : 'Add a task…';
}
function changeTodos(change, refocus = false) {
  change(); renderTodos(); saveSettings();
  if (refocus) todoInput.focus();
}
document.querySelector('#todo-form').addEventListener('submit', event => {
  event.preventDefault();
  const text = todoInput.value.trim();
  if (!text || galacticSettings.todos.length >= 100) return;
  changeTodos(() => { galacticSettings.todos.push({id:crypto.randomUUID(), text:text.slice(0,200), done:false}); });
  todoInput.value = '';
});
todoClear.addEventListener('click', () => changeTodos(() => { galacticSettings.todos = galacticSettings.todos.filter(todo => !todo.done); }, true));
