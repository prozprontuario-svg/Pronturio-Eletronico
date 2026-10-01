(() => {
  const DATA = window.__PROZ_SAUDE_DATA;
  if (!DATA) return;

  const STORE = 'proz-saude-patients-v1';
  const fields = {
    'Nome completo *': 'name',
    'Data de nascimento *': 'birthDate',
    'Sexo *': 'sex',
    'CPF ou documento *': 'document',
    'Nome da mãe *': 'motherName',
    'Nome do pai': 'fatherName',
    Telefone: 'phone',
    CEP: 'postalCode',
    Endereço: 'address',
    'Município / UF': 'cityState'
  };
  const labels = {
    name: 'Nome completo', birthDate: 'Data de nascimento', sex: 'Sexo',
    document: 'CPF ou documento', motherName: 'Nome da mãe', fatherName: 'Nome do pai',
    phone: 'Telefone', postalCode: 'CEP', address: 'Endereço', cityState: 'Município / UF'
  };
  const required = ['name', 'birthDate', 'sex', 'document', 'motherName'];
  const emptyForm = () => ({
    name: 'Pessoa de demonstração', birthDate: '01/01/1990', sex: 'Não informado',
    document: 'DEMO-0001', motherName: 'Pessoa fictícia', fatherName: '',
    phone: '', postalCode: '', address: 'Endereço fictício', cityState: 'Município fictício / UF'
  });
  const scene = document.querySelector('.scene');
  const viewport = document.querySelector('.viewport');
  const screenSelect = document.querySelector('#screen');
  const deviceButton = document.querySelector('#device');
  let device = 'Desktop';
  let key = 'inicio';
  let form = emptyForm();
  let patients = [];
  let searchText = '';
  let toastTimer;
  const patientTemplates = new Map(DATA.screens
    .filter((screen) => screen.key === 'pacientes')
    .map((screen) => [screen.device, copy(screen.resolved)]));

  function copy(value) { return JSON.parse(JSON.stringify(value)); }

  try { localStorage.removeItem(STORE); } catch {}

  function find(root, predicate) {
    if (predicate(root)) return root;
    for (const child of root.children || []) {
      const found = find(child, predicate);
      if (found) return found;
    }
    return null;
  }

  function changeText(node, value) {
    node.text = value;
    node._lines = [value];
  }

  function installStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .form-entry { box-sizing:border-box; margin:0; padding:0; border:0; outline:0; background:transparent;
        color:#171A1C; font:14px Arial,sans-serif; line-height:21px; }
      .form-entry::placeholder { color:#667075; opacity:1; }
      select.form-entry { appearance:none; cursor:pointer; }
      .form-entry:focus-visible { outline:2px solid #0B4352; outline-offset:2px; border-radius:3px; }
      .form-entry[aria-invalid="true"] { color:#A6222F; }
      .registration-toast { position:absolute; z-index:20; right:20px; top:16px; max-width:min(420px,calc(100% - 40px));
        box-sizing:border-box; padding:12px 42px 12px 14px; border:1px solid #DDE3E5; border-radius:6px;
        background:#EAF1F3; color:#0B4352; box-shadow:0 3px 12px #07333F22; font:600 13px/1.45 Arial,sans-serif; }
      .registration-toast button { position:absolute; right:8px; top:6px; border:0; background:transparent;
        color:#0B4352; font:20px/24px Arial,sans-serif; cursor:pointer; }
      @media(max-width:520px) { .registration-toast { right:10px; top:10px; max-width:calc(100% - 20px); } }
    `;
    document.head.appendChild(style);
  }

  function control(node, field, context) {
    const isSearch = field === 'search';
    const isSex = field === 'sex';
    const input = document.createElement(isSex ? 'select' : 'input');
    input.className = 'node form-entry';
    input.style.left = (node._x || 0) + 'px';
    input.style.top = (node._y || 0) + 'px';
    input.style.width = node._w + 'px';
    input.style.height = node._h + 'px';
    input.dataset.formKey = field;
    input.autocomplete = 'off';
    input.style.opacity = '1';
    input.style.cursor = 'not-allowed';
    if (isSex) input.disabled = true;
    else input.readOnly = true;
    input.setAttribute('aria-label', isSearch ? 'Buscar paciente por nome, prontuário ou documento' : labels[field]);
    if (isSearch) {
      input.type = 'search';
      input.placeholder = (node._lines || []).join('');
      input.value = searchText;
    } else if (isSex) {
      input.add(new Option('Selecione', ''));
      ['Feminino', 'Masculino', 'Outro', 'Não informado'].forEach((value) => input.add(new Option(value, value)));
      input.value = form.sex;
    } else {
      input.type = 'text';
      input.placeholder = (node._lines || []).join('');
      input.value = form[field] || '';
      if (required.includes(field)) {
        input.required = true;
        input.setAttribute('aria-required', 'true');
      }
      if (field === 'birthDate') { input.inputMode = 'numeric'; input.maxLength = 10; }
      if (field === 'phone') input.inputMode = 'tel';
      if (field === 'postalCode') input.inputMode = 'numeric';
    }
    if (required.includes(field)) {
      input.required = true;
      input.setAttribute('aria-required', 'true');
    }
    return input;
  }

  function fieldContext(name, inherited) {
    if (fields[name]) return fields[name];
    if (name === 'Buscar paciente') return 'search';
    return inherited;
  }

  function renderNode(node, inherited) {
    const field = fieldContext(node.name, inherited);
    if (node.kind === 'text' && node.name === 'Value' && field) return control(node, field, inherited);

    const element = document.createElement('div');
    element.className = 'node';
    element.dataset.name = node.name || '';
    element.style.left = (node._x || 0) + 'px';
    element.style.top = (node._y || 0) + 'px';
    element.style.width = node._w + 'px';
    element.style.height = node._h + 'px';

    if (node.kind === 'text') {
      element.textContent = (node._lines || [node.text || '']).join('\n');
      element.style.cssText += ';white-space:pre-wrap;font-size:' + node.size + 'px;line-height:' + Math.ceil(node.size * 1.45) + 'px;font-weight:' + (node.bold ? 700 : 400) + ';color:' + (DATA.tokens[node.color] || DATA.tokens.text) + ';text-align:' + (node.alignText === 'CENTER' ? 'center' : 'left');
      if ((node.name || '').startsWith('Exibindo') || (node.text || '').startsWith('Exibindo')) element.dataset.role = 'patient-count';
    } else if (node.kind === 'icon') {
      element.innerHTML = '<svg width="' + node._w + '" height="' + node._h + '" viewBox="0 0 24 24" fill="none" stroke="' + DATA.tokens[node.color] + '" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + DATA.icons[node.icon].map(([tag, attrs]) => '<' + tag + ' ' + Object.entries(attrs).map(([name, value]) => name + '="' + value + '"').join(' ') + '/>').join('') + '</svg>';
    } else {
      if (node.bg) element.style.background = DATA.tokens[node.bg];
      if (node.border) element.style.border = '1px solid ' + DATA.tokens[node.border];
      element.style.borderRadius = node.radius + 'px';
      if (node.scroll) element.classList.add('scroll');
      else if (node.clip) element.style.overflow = 'hidden';
      for (const child of node.children || []) {
        if (field === 'cityState' && child.name === 'ChevronDown') continue;
        const childElement = renderNode(child, field);
        if (childElement) element.appendChild(childElement);
      }
    }

    if (node.target && !node.target.startsWith('@')) {
      element.classList.add('hit');
      element.tabIndex = 0;
      element.setAttribute('role', 'button');
      element.setAttribute('aria-label', node.name);
      const activate = (event) => {
        if (event) event.stopPropagation();
        if (node.name === 'Revisar cadastro') return reviewRegistration();
        if (node.name === 'Confirmar cadastro') return confirmRegistration();
        navigate(node.target);
      };
      element.onclick = activate;
      element.onkeydown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(event); }
      };
    }
    return element;
  }

  function validDate(value) {
    let day, month, year;
    const date = value.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) [day, month, year] = date.split('/').map(Number);
    else if (/^\d{8}$/.test(date)) { day = +date.slice(0, 2); month = +date.slice(2, 4); year = +date.slice(4); }
    else return null;
    const parsed = new Date(year, month - 1, day);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (year < 1900 || parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day || parsed > today) return null;
    return String(day).padStart(2, '0') + '/' + String(month).padStart(2, '0') + '/' + String(year);
  }

  function cpfValid(value) {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 11) return true;
    if (/^(\d)\1{10}$/.test(digits)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
    let check = (sum * 10) % 11; if (check === 10) check = 0;
    if (check !== Number(digits[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i);
    check = (sum * 10) % 11; if (check === 10) check = 0;
    return check === Number(digits[10]);
  }

  function collectForm() {
    form = emptyForm();
  }

  function validate() {
    collectForm();
    const errors = {};
    if (form.name.length < 2) errors.name = 'Informe o nome completo.';
    if (!validDate(form.birthDate)) errors.birthDate = 'Informe uma data válida no formato DD/MM/AAAA, sem data futura.';
    if (!form.sex) errors.sex = 'Selecione o sexo.';
    const digits = form.document.replace(/\D/g, '');
    if (form.document.length < 4) errors.document = 'Informe um CPF ou documento com pelo menos 4 caracteres.';
    else if (digits.length === 11 && !cpfValid(form.document)) errors.document = 'Confira o CPF informado.';
    if (form.motherName.length < 2) errors.motherName = 'Informe o nome da mãe.';
    const normalized = form.document.toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]/g, '');
    if (!errors.document && patients.some((patient) => String(patient.document || '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]/g, '') === normalized)) {
      errors.document = 'Já existe um cadastro local com este documento.';
    }
    return errors;
  }

  function showErrors(errors) {
    let first = null;
    for (const name of required) {
      const input = scene.querySelector('[data-form-key="' + name + '"]');
      if (!input) continue;
      const message = errors[name] || '';
      input.setCustomValidity(message);
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
      const parent = input.parentElement;
      if (parent && parent.dataset.name === 'Control') {
        parent.style.borderColor = message ? '#A6222F' : '';
        parent.style.outline = message ? '1px solid #A6222F' : '';
      }
      if (message && !first) first = input;
    }
    if (first) first.reportValidity();
    return !first;
  }

  function reviewRegistration() {
    const errors = validate();
    if (!showErrors(errors)) return;
    const values = {
      Nome: form.name,
      Nascimento: form.birthDate,
      Sexo: form.sex,
      'Nome da mãe': form.motherName,
      Documento: form.document,
      Endereço: [form.address, form.cityState].filter(Boolean).join(' • ') || 'Não informado'
    };
    for (const screen of DATA.screens.filter((item) => item.key === 'revisao-cadastro')) {
      function replaceReviewValues(node) {
        const children = node.children || [];
        for (let index = 0; index < children.length; index++) {
          const label = children[index];
          if (label.kind === 'text' && Object.hasOwn(values, label.text)) {
            const value = children[index + 1];
            if (value && value.kind === 'text') changeText(value, values[label.text]);
          }
          replaceReviewValues(label);
        }
      }
      replaceReviewValues(screen.resolved);
    }
    key = 'revisao-cadastro';
    render();
  }

  function patientId() {
    let max = 126;
    for (const patient of patients) max = Math.max(max, Number(String(patient.id).replace(/\D/g, '')) || 0);
    return 'PS-' + String(max + 1).padStart(5, '0');
  }

  function confirmRegistration() {
    const errors = validate();
    if (Object.keys(errors).length) {
      key = 'cadastro'; render(); showErrors(errors); return;
    }
    const patient = { ...form, id: patientId(), createdAt: new Date().toISOString() };
    patients.unshift(patient);
    form = emptyForm();
    searchText = '';
    preparePatients();
    key = 'pacientes';
    render();
    toast('Simulação concluída com dados fictícios. Nada foi armazenado.');
  }

  function updatePatientRows(template, patient, y) {
    const row = copy(template);
    row._y = y;
    row.target = undefined;
    row.localRecordId = patient.id;
    row.searchText = [patient.name, patient.id, patient.document, patient.birthDate].join(' ');
    const values = {
      Name: patient.name,
      Identity: patient.id + ' • ' + patient.birthDate,
      Sector: 'Cadastro',
      Bed: 'Aguardando atendimento',
      Label: 'Novo',
      Location: 'Cadastro • Aguardando atendimento'
    };
    function visit(node) {
      if (node.kind === 'text' && values[node.name] !== undefined) changeText(node, values[node.name]);
      node.children = (node.children || []).filter((child) => child.name !== 'ChevronRight');
      for (const child of node.children) visit(child);
    }
    visit(row);
    return row;
  }

  function preparePatients() {
    for (const screen of DATA.screens.filter((item) => item.key === 'pacientes')) {
      const templateScreen = patientTemplates.get(screen.device);
      if (!templateScreen) continue;
      screen.resolved = copy(templateScreen);
      const content = find(screen.resolved, (node) => node.name === 'Conteúdo da tela');
      const rows = content && content.children.filter((child) => child.name === 'PatientRow');
      if (!rows || !rows.length) continue;
      const firstY = rows[0]._y;
      const step = rows[0]._h + (screen.device === 'Desktop' ? 24 : 20);
      const shift = patients.length * step;
      for (const child of content.children) if (child._y >= firstY) child._y += shift;
      const inserted = patients.map((patient, index) => updatePatientRows(rows[0], patient, firstY + index * step));
      content.children.splice(content.children.indexOf(rows[0]), 0, ...inserted);
      content._h += shift;
      const note = find(content, (node) => node.kind === 'text' && (node.text || '').startsWith('Exibindo'));
      if (note) changeText(note, 'Pacientes e cadastros desta tela s\u00e3o fict\u00edcios e n\u00e3o s\u00e3o armazenados.');
    }
  }

  function prepareRegistration() {
    for (const screen of DATA.screens.filter((item) => item.key === 'cadastro')) {
      const note = find(screen.resolved, (node) => node.kind === 'text' && node.name === 'O prontuário é gerado automaticamente ao confirmar.');
      if (note) changeText(note, 'Demonstração: campos bloqueados e preenchidos apenas com dados fictícios.');
    }
  }

  function bindInputs() {
    // Os campos desta demonstração são fictícios, bloqueados e não aceitam dados digitados.
  }

  function filterPatients() {
    const input = scene.querySelector('[data-form-key="search"]');
    const query = input ? input.value.toLocaleLowerCase('pt-BR').trim() : '';
    searchText = query;
    const rows = [...scene.querySelectorAll('[data-name="PatientRow"]')];
    let visible = 0;
    rows.forEach((row, index) => {
      const model = DATA.screens.find((screen) => screen.key === 'pacientes' && screen.device === device);
      const patient = patients[index];
      const record = model && patient && find(model.resolved, (node) => node.name === 'PatientRow' && node.localRecordId === patient.id);
      if (record) row.dataset.searchText = record.searchText;
      const text = (row.dataset.searchText || row.textContent).toLocaleLowerCase('pt-BR');
      const match = !query || text.includes(query);
      row.style.display = match ? '' : 'none';
      if (match) visible++;
    });
    const count = scene.querySelector('[data-role="patient-count"]');
    if (count) count.textContent = query ? visible + (visible === 1 ? ' paciente encontrado' : ' pacientes encontrados') : '3 pacientes de demonstração • ' + patients.length + ' cadastro(s) local(is)';
  }

  function toast(message) {
    clearTimeout(toastTimer);
    const box = document.createElement('div');
    box.className = 'registration-toast';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    box.append(document.createTextNode(message));
    const close = document.createElement('button');
    close.type = 'button'; close.setAttribute('aria-label', 'Fechar aviso'); close.textContent = '×';
    close.onclick = () => box.remove();
    box.appendChild(close); scene.appendChild(box);
    toastTimer = setTimeout(() => box.remove(), 9000);
  }

  function navigate(destination) {
    if (destination === 'revisao-cadastro') return reviewRegistration();
    if (destination === 'cadastro' && key !== 'revisao-cadastro') form = emptyForm();
    if (destination === 'pacientes' && key === 'cadastro') form = emptyForm();
    if (destination === 'pacientes') preparePatients();
    key = destination;
    render();
  }

  function render() {
    const screens = DATA.screens.filter((screen) => screen.device === device);
    if (!screens.some((screen) => screen.key === key)) key = 'inicio';
    screenSelect.replaceChildren();
    for (const screen of screens) screenSelect.add(new Option(screen.title + (screen.state ? ' — Estado' : ''), screen.key));
    screenSelect.value = key;
    const screen = screens.find((item) => item.key === key);
    const scale = Math.min(1, (innerWidth - 32) / screen.resolved._w);
    scene.replaceChildren(renderNode(screen.resolved));
    scene.style.width = screen.resolved._w + 'px';
    scene.style.height = screen.resolved._h + 'px';
    scene.style.transform = 'scale(' + scale + ')';
    scene.style.transformOrigin = 'top left';
    viewport.style.width = screen.resolved._w * scale + 'px';
    viewport.style.height = screen.resolved._h * scale + 'px';
    deviceButton.textContent = device === 'Desktop' ? 'Ver celular' : 'Ver computador';
    bindInputs();
    if (key === 'pacientes') filterPatients();
  }

  installStyles();
  screenSelect.onchange = () => navigate(screenSelect.value);
  deviceButton.onclick = () => {
    device = device === 'Desktop' ? 'Mobile' : 'Desktop';
    if (key === 'pacientes') preparePatients();
    render();
  };
  onresize = render;
  preparePatients();
  prepareRegistration();
  render();
})();
