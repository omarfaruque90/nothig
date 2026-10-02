// বিনিয়োগ খাতা — সব ডেটা ফোনের ব্রাউজারেই (localStorage) সংরক্ষিত থাকে
const STORAGE_KEY = 'biniyog_khata_entries_v1';

const $ = (id) => document.getElementById(id);
const entriesList = $('entriesList');
const emptyState = $('emptyState');
const modal = $('modal');
const entryForm = $('entryForm');
const modalTitle = $('modalTitle');

let entries = loadEntries();
let editingId = null;

const bnDigits = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
function toBn(s) {
  return String(s).replace(/[0-9]/g, d => bnDigits[+d]);
}
function fmtTaka(n) {
  return '৳' + toBn(Number(n).toLocaleString('en-US'));
}
function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${toBn(d)}/${toBn(m)}/${toBn(y)}`;
}

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch { return []; }
}
function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function render() {
  const q = ($('searchInput').value || '').trim().toLowerCase();
  const filtered = entries.filter(e =>
    !q ||
    (e.place || '').toLowerCase().includes(q) ||
    (e.category || '').toLowerCase().includes(q) ||
    (e.note || '').toLowerCase().includes(q)
  ).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const total = entries.reduce((s, e) => s + (+e.amount || 0), 0);
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthTotal = entries
    .filter(e => (e.date || '').startsWith(thisMonth))
    .reduce((s, e) => s + (+e.amount || 0), 0);

  $('totalAmount').textContent = fmtTaka(total);
  $('monthAmount').textContent = fmtTaka(monthTotal);
  $('entryCount').textContent = toBn(entries.length);

  // ক্যাটাগরি চার্ট
  const byCat = {};
  entries.forEach(e => {
    const c = e.category || 'অন্যান্য';
    byCat[c] = (byCat[c] || 0) + (+e.amount || 0);
  });
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const max = cats.length ? cats[0][1] : 0;
  const chart = $('categoryChart');
  chart.innerHTML = '';
  if (!cats.length) {
    chart.innerHTML = '<p class="empty">এখনো কোনো হিসাব নেই।</p>';
  } else {
    cats.forEach(([cat, amt]) => {
      const row = document.createElement('div');
      row.className = 'chart-row';
      const pct = max ? Math.round((amt / max) * 100) : 0;
      row.innerHTML = `<span class="cat">${escapeHtml(cat)}</span>
        <span class="bar-wrap"><span class="bar" style="width:${pct}%"></span></span>
        <span class="amt">${fmtTaka(amt)}</span>`;
      chart.appendChild(row);
    });
  }

  // এন্ট্রি তালিকা
  entriesList.innerHTML = '';
  emptyState.style.display = filtered.length ? 'none' : 'block';
  filtered.forEach(e => {
    const div = document.createElement('div');
    div.className = 'entry';
    div.innerHTML = `
      <div class="entry-top">
        <span class="entry-place">${escapeHtml(e.place)}</span>
        <span class="entry-amount">${fmtTaka(e.amount)}</span>
      </div>
      <div class="entry-meta">${fmtDate(e.date)} · ${escapeHtml(e.category || 'অন্যান্য')}</div>
      ${e.note ? `<div class="entry-note">${escapeHtml(e.note)}</div>` : ''}
      <div class="entry-actions">
        <button class="btn secondary" data-edit="${e.id}">✏ এডিট</button>
        <button class="btn danger" data-del="${e.id}">🗑 মুছুন</button>
      </div>`;
    entriesList.appendChild(div);
  });
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function openModal(entry) {
  editingId = entry ? entry.id : null;
  modalTitle.textContent = entry ? 'এন্ট্রি এডিট করুন' : 'নতুন এন্ট্রি';
  $('place').value = entry ? entry.place : '';
  $('amount').value = entry ? entry.amount : '';
  $('date').value = entry ? entry.date : new Date().toISOString().slice(0, 10);
  $('category').value = entry ? entry.category : 'সঞ্চয়';
  $('note').value = entry ? entry.note : '';
  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
  entryForm.reset();
  editingId = null;
}

entryForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const data = {
    place: $('place').value.trim(),
    amount: parseFloat($('amount').value) || 0,
    date: $('date').value,
    category: $('category').value,
    note: $('note').value.trim(),
  };
  if (!data.place || !data.date) return;
  if (editingId) {
    const i = entries.findIndex(e => e.id === editingId);
    if (i >= 0) entries[i] = { ...entries[i], ...data };
  } else {
    entries.push({ id: 'e' + Date.now().toString(36), ...data });
  }
  saveEntries();
  render();
  closeModal();
});

entriesList.addEventListener('click', (ev) => {
  const editBtn = ev.target.closest('[data-edit]');
  const delBtn = ev.target.closest('[data-del]');
  if (editBtn) {
    const e = entries.find(x => x.id === editBtn.dataset.edit);
    if (e) openModal(e);
  } else if (delBtn) {
    if (confirm('এই এন্ট্রিটি মুছে ফেলতে চাও?')) {
      entries = entries.filter(x => x.id !== delBtn.dataset.del);
      saveEntries();
      render();
    }
  }
});

$('addBtn').addEventListener('click', () => openModal(null));
$('fabBtn').addEventListener('click', () => openModal(null));
$('cancelBtn').addEventListener('click', closeModal);
modal.addEventListener('click', (ev) => { if (ev.target === modal) closeModal(); });
$('searchInput').addEventListener('input', render);

$('csvBtn').addEventListener('click', () => {
  if (!entries.length) { alert('ডাউনলোড করার মতো কোনো এন্ট্রি নেই।'); return; }
  const header = ['জায়গা', 'টাকা', 'তারিখ', 'ক্যাটাগরি', 'নোট'];
  const rows = entries.map(e =>
    [e.place, e.amount, e.date, e.category, (e.note || '').replace(/\n/g, ' ')]
      .map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')
  );
  const csv = '﻿' + header.join(',') + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'biniyog-khata.csv';
  a.click();
  URL.revokeObjectURL(a.href);
});

render();
