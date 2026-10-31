// ═══════════════════════════════════════════════════════════
// EMPLOYEE ADMIN MODULE — REGI MINA FARM LAMPUNG
// Self-contained: auto-inject tab + panel + modal + logic
// Firebase project: regi-mina-farm-panel (terpisah dari storefront)
// ═══════════════════════════════════════════════════════════

import { initializeApp as initEmpApp, deleteApp as empDeleteApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth as empGetAuth,
  signInWithEmailAndPassword as empSignIn,
  signOut as empSignOut,
  onAuthStateChanged as empAuthWatch,
  createUserWithEmailAndPassword as empCreateUser,
  setPersistence as empSetPersistence,
  browserLocalPersistence as empBrowserLocal
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore as empGetFirestore,
  collection as empCol,
  doc as empDoc,
  getDoc as empGetDoc,
  getDocs as empGetDocs,
  setDoc as empSetDoc,
  addDoc as empAddDoc,
  updateDoc as empUpdateDoc,
  deleteDoc as empDeleteDoc,
  query as empQuery,
  where as empWhere,
  orderBy as empOrderBy,
  serverTimestamp as empServerTs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const EMP_FIREBASE = {
  apiKey: "AIzaSyCKXM49RG724HX8uVT_CEnLSAvANCvPAZI",
  authDomain: "regi-mina-farm-panel.firebaseapp.com",
  projectId: "regi-mina-farm-panel",
  storageBucket: "regi-mina-farm-panel.firebasestorage.app",
  messagingSenderId: "3643147074",
  appId: "1:3643147074:web:8631e4197011f3527dbedb"
};

let empApp = null, empAuth = null, empDB = null;
let empConnected = false;
let empAuthWatcherSetup = false;

// ─────────────────────────────────────────────────────────────
// 1. INJECT HTML (tab + panel + modal)
// ─────────────────────────────────────────────────────────────
function injectHTML() {
  // Tab button
  const tabsContainer = document.querySelector('.admin-tabs-app');
  if (tabsContainer && !document.querySelector('[data-atab="employees"]')) {
    const tab = document.createElement('button');
    tab.className = 'admin-tab-app';
    tab.dataset.atab = 'employees';
    tab.innerHTML = '<i class="fas fa-users"></i> Karyawan';
    tabsContainer.appendChild(tab);
  }

  // Panel
  const dashView = document.getElementById('adminDashView');
  if (dashView && !document.getElementById('apanel-employees')) {
    const panel = document.createElement('div');
    panel.className = 'admin-panel-app';
    panel.id = 'apanel-employees';
    panel.innerHTML = `
      <div id="empAuthStatus" style="padding:14px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.4);border-radius:14px;margin-bottom:14px;text-align:center;font-size:.78rem;">
        🔴 <strong>BELUM TERHUBUNG</strong><br><span style="font-size:.65rem;color:var(--text-secondary);">Login dengan akun admin Firebase yang sudah dibuat</span>
      </div>

      <div id="empLoginBox" style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:14px;">
        <div style="font-size:.82rem;font-weight:700;color:var(--accent-light);margin-bottom:12px;">
          <i class="fas fa-key"></i> Login Admin Firebase
        </div>
        <div class="form-group">
          <label class="form-label">Email Admin Firebase</label>
          <input type="email" class="form-input" id="empAdminEmail" placeholder="admin@regimina.farm" autocomplete="username">
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="password" class="form-input" id="empAdminPass" placeholder="••••••••" autocomplete="current-password">
        </div>
        <button class="btn-submit-app" id="empConnectBtn" style="margin-top:0;">
          <i class="fas fa-sign-in-alt"></i> Hubungkan
        </button>
        <div style="font-size:.65rem;color:var(--text-secondary);margin-top:10px;padding:8px;background:rgba(0,180,216,.05);border-radius:8px;line-height:1.5;">
          <i class="fas fa-info-circle" style="color:var(--accent);"></i> Pakai akun admin yang <strong>sudah Anda buat</strong> di Firebase Console (project <code>regi-mina-farm-panel</code>). Login sekali → sesi diingat Firebase.
        </div>
      </div>

      <div id="empDashboard" style="display:none;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px;text-align:center;">
            <div style="font-size:1.4rem;font-weight:900;color:var(--accent);" id="empStatTotal">0</div>
            <div style="font-size:.65rem;color:var(--text-secondary);">Total Karyawan</div>
          </div>
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px;text-align:center;">
            <div style="font-size:1.4rem;font-weight:900;color:var(--green);" id="empStatHadir">0</div>
            <div style="font-size:.65rem;color:var(--text-secondary);">Hadir Hari Ini</div>
          </div>
        </div>

        <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;">
          <button class="chip active" data-emp-sub="list">👥 Karyawan</button>
          <button class="chip" data-emp-sub="tasks">📋 Tugas</button>
          <button class="chip" data-emp-sub="attendance">🕐 Absensi</button>
          <button class="chip" data-emp-sub="reports">📄 Laporan</button>
          <button class="chip" data-emp-sub="announce">📢 Pengumuman</button>
        </div>

        <div id="empSub-list" class="emp-subpanel" style="display:block;">
          <button class="btn-add-app" id="empAddBtn"><i class="fas fa-user-plus"></i> Tambah Karyawan</button>
          <div id="empListContainer"></div>
        </div>
        <div id="empSub-tasks" class="emp-subpanel" style="display:none;">
          <button class="btn-add-app" id="empAddTaskBtn"><i class="fas fa-plus"></i> Buat Tugas Baru</button>
          <div id="empTasksContainer"></div>
        </div>
        <div id="empSub-attendance" class="emp-subpanel" style="display:none;">
          <div id="empAttendanceContainer"></div>
        </div>
        <div id="empSub-reports" class="emp-subpanel" style="display:none;">
          <div id="empReportsContainer"></div>
        </div>
        <div id="empSub-announce" class="emp-subpanel" style="display:none;">
          <button class="btn-add-app" id="empAddAnnBtn"><i class="fas fa-bullhorn"></i> Buat Pengumuman</button>
          <div id="empAnnounceContainer"></div>
        </div>

        <button id="empOpenPortalBtn" style="width:100%;margin-top:14px;padding:12px;background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;border:none;border-radius:12px;font-size:.82rem;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;">
          <i class="fas fa-external-link-alt"></i> Buka Website Karyawan (staff.html)
        </button>
        <button id="empLogoutBtn" style="width:100%;margin-top:8px;padding:10px;background:rgba(239,68,68,.1);color:var(--red);border:1px solid rgba(239,68,68,.3);border-radius:12px;font-size:.75rem;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif;">
          <i class="fas fa-sign-out-alt"></i> Logout Firebase
        </button>
      </div>
    `;
    dashView.appendChild(panel);
  }

  // Modal
  if (!document.getElementById('empEditModal')) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'empEditModal';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <div class="modal-title" id="empEditTitle"><i class="fas fa-edit"></i> Edit</div>
          <button class="modal-close" id="empEditClose"><i class="fas fa-times"></i></button>
        </div>
        <div id="empEditFields"></div>
        <button class="btn-submit-app" id="empEditSaveBtn"><i class="fas fa-save"></i> Simpan</button>
      </div>
    `;
    document.body.appendChild(modal);
  }
}

// ─────────────────────────────────────────────────────────────
// 2. INIT FIREBASE
// ─────────────────────────────────────────────────────────────
function ensureFirebase() {
  if (!empApp) {
    empApp = initEmpApp(EMP_FIREBASE, 'empAdminApp');
    empAuth = empGetAuth(empApp);
    empDB = empGetFirestore(empApp);
    empSetPersistence(empAuth, empBrowserLocal).catch(e => console.warn('Persistence:', e));
  }
}

// ─────────────────────────────────────────────────────────────
// 3. HELPERS — reuse global from main script
// ─────────────────────────────────────────────────────────────
const toast = (msg, type) => window.showToast ? window.showToast(msg, type) : console.log(msg);
const openModal = (id) => window.openModal ? window.openModal(id) : document.getElementById(id)?.classList.add('active');
const closeModal = (id) => window.closeModal ? window.closeModal(id) : document.getElementById(id)?.classList.remove('active');

// ─────────────────────────────────────────────────────────────
// 4. EmployeeAdmin object — main logic
// ─────────────────────────────────────────────────────────────
window.EmployeeAdmin = {

  async connect() {
    ensureFirebase();
    const email = document.getElementById('empAdminEmail').value.trim();
    const pass = document.getElementById('empAdminPass').value;
    if (!email || !pass) { toast('Email & password wajib', 'error'); return; }
    try {
      await empSignIn(empAuth, email, pass);
      localStorage.setItem('rmf_emp_admin_email', email);
      document.getElementById('empAdminPass').value = '';
      toast('✅ Terhubung ke Firebase Karyawan', 'success');
    } catch (e) {
      const msg = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(e.code)
        ? 'Email atau password salah' : e.message;
      toast('❌ ' + msg, 'error');
    }
  },

  async disconnect() {
    ensureFirebase();
    if (!confirm('Logout dari Firebase Karyawan?')) return;
    try { await empSignOut(empAuth); toast('Logout berhasil', 'info'); }
    catch (e) { toast('Gagal logout: ' + e.message, 'error'); }
  },

  onTabOpen() {
    ensureFirebase();
    const savedEmail = localStorage.getItem('rmf_emp_admin_email');
    if (savedEmail) document.getElementById('empAdminEmail').value = savedEmail;

    if (!empAuthWatcherSetup) {
      empAuthWatcherSetup = true;
      empAuthWatch(empAuth, user => {
        empConnected = !!user;
        this.updateStatus();
        if (user) this.loadAll();
      });
    } else {
      empConnected = !!empAuth.currentUser;
      this.updateStatus();
      if (empConnected) this.loadAll();
    }
  },

  updateStatus() {
    const el = document.getElementById('empAuthStatus');
    const login = document.getElementById('empLoginBox');
    const dash = document.getElementById('empDashboard');
    if (!el) return;
    if (empConnected) {
      el.innerHTML = '🟢 <strong style="color:var(--green);">TERHUBUNG</strong> — ' + (empAuth.currentUser?.email || '');
      el.style.background = 'rgba(34,197,94,.08)';
      el.style.borderColor = 'rgba(34,197,94,.4)';
      login.style.display = 'none';
      dash.style.display = 'block';
    } else {
      el.innerHTML = '🔴 <strong>BELUM TERHUBUNG</strong> — Login di bawah';
      el.style.background = 'rgba(239,68,68,.08)';
      el.style.borderColor = 'rgba(239,68,68,.4)';
      login.style.display = 'block';
      dash.style.display = 'none';
    }
  },

  showSub(name) {
    document.querySelectorAll('.emp-subpanel').forEach(p => p.style.display = 'none');
    const sub = document.getElementById('empSub-' + name);
    if (sub) sub.style.display = 'block';
    document.querySelectorAll('#apanel-employees .chip').forEach(c => c.classList.remove('active'));
    const activeChip = document.querySelector(`#apanel-employees .chip[data-emp-sub="${name}"]`);
    if (activeChip) activeChip.classList.add('active');
    if (name === 'tasks') this.loadTasks();
    if (name === 'attendance') this.loadAttendance();
    if (name === 'reports') this.loadReports();
    if (name === 'announce') this.loadAnnouncements();
  },

  async loadAll() {
    await Promise.all([this.loadEmployees(), this.loadTodayStats()]);
  },

  async loadTodayStats() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const snap = await empGetDocs(empQuery(empCol(empDB, 'attendance'), empWhere('tanggal', '==', today)));
      const el = document.getElementById('empStatHadir');
      if (el) el.textContent = snap.size;
    } catch (e) { console.warn(e); }
  },

  async loadEmployees() {
    const c = document.getElementById('empListContainer');
    if (!c) return;
    try {
      const snap = await empGetDocs(empQuery(empCol(empDB, 'users'), empOrderBy('nama', 'asc')));
      document.getElementById('empStatTotal').textContent = snap.size;
      if (snap.empty) { c.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>Belum ada karyawan</p></div>'; return; }
      c.innerHTML = snap.docs.map(d => {
        const u = d.data();
        const active = u.status === 'aktif';
        return `<div class="admin-item-app">
          <div class="icon-app" style="background:${active ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)'};color:${active ? 'var(--green)' : 'var(--red)'};">
            <i class="fas fa-user"></i>
          </div>
          <div class="info-app">
            <div class="name-app">${u.nama || '-'}</div>
            <div class="meta-app">${u.jabatan || '-'} • <span style="color:${active ? 'var(--green)' : 'var(--red)'};">${active ? 'Aktif' : 'Nonaktif'}</span></div>
          </div>
          <button class="icon-btn-app edit" data-emp-edit="${d.id}"><i class="fas fa-pen"></i></button>
          <button class="icon-btn-app delete" data-emp-del="${d.id}"><i class="fas fa-trash"></i></button>
        </div>`;
      }).join('');
      c.querySelectorAll('[data-emp-edit]').forEach(b => b.onclick = () => this.openEdit(b.dataset.empEdit));
      c.querySelectorAll('[data-emp-del]').forEach(b => b.onclick = () => this.remove(b.dataset.empDel));
    } catch (e) {
      c.innerHTML = `<div class="empty-state"><p style="color:var(--red);">Error: ${e.message}</p></div>`;
    }
  },

  openAdd() {
    document.getElementById('empEditTitle').innerHTML = '<i class="fas fa-user-plus"></i> Tambah Karyawan';
    document.getElementById('empEditFields').innerHTML = `
      <div class="form-group"><label class="form-label">Nama Lengkap</label><input type="text" class="form-input" id="empNama" placeholder="Nama karyawan"></div>
      <div class="form-group"><label class="form-label">Email Login</label><input type="email" class="form-input" id="empEmail" placeholder="karyawan@email.com"></div>
      <div class="form-group"><label class="form-label">Password Awal (min 6)</label><input type="text" class="form-input" id="empPass" placeholder="Minimal 6 karakter"></div>
      <div class="form-group"><label class="form-label">Jabatan</label><input type="text" class="form-input" id="empJabatan" placeholder="Contoh: Teknisi Kolam"></div>
      <div class="form-group"><label class="form-label">No. WhatsApp</label><input type="tel" class="form-input" id="empPhone" placeholder="08xxxxxxxxxx"></div>
      <div class="form-group"><label class="form-label">Peran</label>
        <select class="form-input" id="empRole"><option value="karyawan">Karyawan</option><option value="admin">Admin</option></select>
      </div>
      <div class="form-group"><label class="form-label">Status</label>
        <select class="form-input" id="empStatus"><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></select>
      </div>`;
    document.getElementById('empEditSaveBtn').onclick = () => this.saveAdd();
    openModal('empEditModal');
  },

  async saveAdd() {
    const data = {
      nama: document.getElementById('empNama').value.trim(),
      email: document.getElementById('empEmail').value.trim(),
      password: document.getElementById('empPass').value,
      jabatan: document.getElementById('empJabatan').value.trim(),
      phone: document.getElementById('empPhone').value.trim(),
      role: document.getElementById('empRole').value,
      status: document.getElementById('empStatus').value
    };
    if (!data.nama || !data.email || !data.password) { toast('Nama, Email, Password wajib', 'error'); return; }
    if (data.password.length < 6) { toast('Password minimal 6 karakter', 'error'); return; }
    try {
      const secondary = initEmpApp(EMP_FIREBASE, 'empCreate_' + Date.now());
      const secAuth = empGetAuth(secondary);
      let uid;
      try {
        const cred = await empCreateUser(secAuth, data.email, data.password);
        uid = cred.user.uid;
      } finally {
        try { await empSignOut(secAuth); } catch (e) {}
        try { await empDeleteApp(secondary); } catch (e) {}
      }
      await empSetDoc(empDoc(empDB, 'users', uid), {
        nama: data.nama, email: data.email, jabatan: data.jabatan,
        phone: data.phone, role: data.role, status: data.status,
        createdAt: empServerTs(), updatedAt: empServerTs()
      });
      closeModal('empEditModal');
      toast('✅ Karyawan ditambahkan', 'success');
      this.loadEmployees();
    } catch (e) {
      const msg = e.code === 'auth/email-already-in-use' ? 'Email sudah terdaftar'
        : e.code === 'auth/weak-password' ? 'Password terlalu lemah'
        : e.code === 'auth/invalid-email' ? 'Format email tidak valid'
        : e.message;
      toast('❌ ' + msg, 'error');
    }
  },

  async openEdit(id) {
    try {
      const snap = await empGetDoc(empDoc(empDB, 'users', id));
      if (!snap.exists()) return;
      const u = snap.data();
      document.getElementById('empEditTitle').innerHTML = '<i class="fas fa-user-edit"></i> Edit Karyawan';
      document.getElementById('empEditFields').innerHTML = `
        <div class="form-group"><label class="form-label">Nama Lengkap</label><input type="text" class="form-input" id="empNama" value="${u.nama || ''}"></div>
        <div class="form-group"><label class="form-label">Email (tidak bisa diubah)</label><input type="email" class="form-input" value="${u.email || ''}" disabled></div>
        <div class="form-group"><label class="form-label">Jabatan</label><input type="text" class="form-input" id="empJabatan" value="${u.jabatan || ''}"></div>
        <div class="form-group"><label class="form-label">No. WhatsApp</label><input type="tel" class="form-input" id="empPhone" value="${u.phone || ''}"></div>
        <div class="form-group"><label class="form-label">Peran</label>
          <select class="form-input" id="empRole"><option value="karyawan" ${u.role === 'karyawan' ? 'selected' : ''}>Karyawan</option><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option></select>
        </div>
        <div class="form-group"><label class="form-label">Status</label>
          <select class="form-input" id="empStatus"><option value="aktif" ${u.status === 'aktif' ? 'selected' : ''}>Aktif</option><option value="nonaktif" ${u.status === 'nonaktif' ? 'selected' : ''}>Nonaktif</option></select>
        </div>`;
      document.getElementById('empEditSaveBtn').onclick = () => this.saveEdit(id);
      openModal('empEditModal');
    } catch (e) { toast('Gagal memuat: ' + e.message, 'error'); }
  },

  async saveEdit(id) {
    try {
      await empUpdateDoc(empDoc(empDB, 'users', id), {
        nama: document.getElementById('empNama').value.trim(),
        jabatan: document.getElementById('empJabatan').value.trim(),
        phone: document.getElementById('empPhone').value.trim(),
        role: document.getElementById('empRole').value,
        status: document.getElementById('empStatus').value,
        updatedAt: empServerTs()
      });
      closeModal('empEditModal');
      toast('✅ Diperbarui', 'success');
      this.
