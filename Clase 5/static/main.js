const API = '/api/patentes';

const $ = (id) => document.getElementById(id);
const busqueda = $('busqueda');
const lista = $('lista');
const vacio = $('vacio');
const resumen = $('resumen');
const form = $('form-carga');
const estado = $('estado');
const guardar = $('guardar');

let patentes = [];

const normalizar = (s) => s.replace(/[\s-]/g, '').toLowerCase();

const setEstado = (msg, type = '') => {
  estado.textContent = msg;
  estado.dataset.type = type;
};

// textContent (no innerHTML) para evitar inyección de HTML desde la descripción
const render = () => {
  const q = busqueda.value.trim().toLowerCase();
  const qDom = normalizar(q);
  const filtradas = q
    ? patentes.filter((p) => p.dominio.toLowerCase().includes(qDom) || p.descripcion.toLowerCase().includes(q))
    : patentes;

  lista.replaceChildren(
    ...filtradas.map((p) => {
      const li = document.createElement('li');
      const dom = document.createElement('span');
      dom.className = 'dominio';
      dom.textContent = p.dominio;
      const desc = document.createElement('span');
      desc.className = 'desc';
      desc.textContent = p.descripcion;
      li.append(dom, desc);
      return li;
    })
  );

  if (filtradas.length === 0) {
    vacio.hidden = false;
    vacio.textContent = q
      ? `No hay patentes que coincidan con "${busqueda.value.trim()}". Probá con otro dominio o cargala abajo.`
      : 'Todavía no hay patentes cargadas. Cargá la primera con el formulario de abajo.';
  } else {
    vacio.hidden = true;
  }
  resumen.textContent = patentes.length ? `${filtradas.length} de ${patentes.length} patentes` : '';
};

const cargarLista = async () => {
  try {
    const res = await fetch(API);
    if (!res.ok) throw new Error();
    patentes = await res.json();
    render();
  } catch {
    vacio.hidden = false;
    vacio.textContent = 'No pudimos cargar las patentes. Revisá tu conexión y recargá la página.';
  }
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const dominio = form.dominio.value.trim();
  const descripcion = form.descripcion.value.trim();

  form.dominio.removeAttribute('aria-invalid');
  form.descripcion.removeAttribute('aria-invalid');

  if (!dominio || !descripcion) {
    const campo = dominio ? form.descripcion : form.dominio;
    campo.setAttribute('aria-invalid', 'true');
    campo.focus();
    setEstado('Completá el dominio y la descripción para guardar.', 'error');
    return;
  }

  guardar.disabled = true;
  guardar.textContent = 'Guardando...';
  setEstado('');
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dominio, descripcion }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      form.dominio.setAttribute('aria-invalid', 'true');
      form.dominio.focus();
      setEstado(data.error || 'No pudimos guardar la patente. Intentá de nuevo.', 'error');
      return;
    }
    patentes = [data, ...patentes];
    form.reset();
    form.dominio.focus();
    setEstado(`Patente ${data.dominio} guardada.`, 'ok');
    render();
  } catch {
    setEstado('No hay conexión con el servidor. Intentá de nuevo en un momento.', 'error');
  } finally {
    guardar.disabled = false;
    guardar.textContent = 'Guardar patente';
  }
});

busqueda.addEventListener('input', render);
cargarLista();
