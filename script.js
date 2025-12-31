const API_BASE = "https://woxsen-app-student-backend.onrender.com";
// const API_BASE = "http://localhost:4000";
let messageInterval = null;

const BRANCH_DATA = {
  "B.Tech": {
    "AIML": ["Tigers", "Rhinos", "Panthers", "Leopards", "Whales", "Wolves"],
    "CSE": ["Tigers", "Rhinos", "Panthers"],
    "ECE": ["Default"],
    "BCA": ["Default"]
  },
  "BBA": {
    "ED": ["Wolves"],
    "AIDs": ["Tigers"],
    "Marketing": ["Panthers"],
    "Finance": ["Whales", "Leopards"]
  }
};

function togglePassword(id) {
  const input = document.getElementById(id);
  input.type = input.type === "password" ? "text" : "password";
}

function getToken() {
  return localStorage.getItem("token");
}
function getUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}
function saveSession(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

// Generic API helper
async function api(path, options = {}) {
  const token = getToken();
  const headers = options.headers || {};
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }
  const res = await fetch(API_BASE + path, {
    ...options,
    headers
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Request failed");
  }
  return res.json().catch(() => ({}));
}

// Simple routing: check which page we are on
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("login-form")) {
    initAuthPage();
  }
  if (document.querySelector(".layout")) {
    initDashboardPage();
  }
});

// ---------- Auth page ----------
// ---------- Auth page ----------
function initAuthPage() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      tabContents.forEach((c) =>
        c.id === tab + "-tab" ? c.classList.add("active") : c.classList.remove("active")
      );
    });
  });

  const signupRole = document.getElementById("signup-role");
  const studentExtra = document.getElementById("student-extra");
  // teacher-extra removed from DOM logic since email is global

  signupRole.addEventListener("change", () => {
    const role = signupRole.value;
    const studentExtra = document.getElementById("student-extra");
    const teacherExtra = document.getElementById("teacher-extra");
    const branchSection = document.getElementById("branch-section");

    if (role === "student") {
      studentExtra.classList.remove("hidden");
      branchSection.classList.remove("hidden");
      teacherExtra.classList.add("hidden");
      document.getElementById("signup-program-group").classList.remove("hidden");
    } else {
      studentExtra.classList.add("hidden");
      branchSection.classList.add("hidden");
      teacherExtra.classList.remove("hidden");
      document.getElementById("signup-program-group").classList.add("hidden");
    }
  });

  const signupProgram = document.getElementById("signup-program");
  const signupBranch = document.getElementById("signup-branch");
  const signupSubBranch = document.getElementById("signup-sub-branch");
  const subBranchWrapper = document.getElementById("sub-branch-wrapper");

  signupProgram.addEventListener("change", () => {
    const program = signupProgram.value;
    signupBranch.innerHTML = '<option value="">Select Branch</option>';
    signupSubBranch.innerHTML = '<option value="">Select Section</option>';
    subBranchWrapper.classList.add("hidden");

    if (program && BRANCH_DATA[program]) {
      Object.keys(BRANCH_DATA[program]).forEach(branch => {
        const opt = document.createElement("option");
        opt.value = branch;
        opt.textContent = branch;
        signupBranch.appendChild(opt);
      });
      document.getElementById("branch-section").classList.remove("hidden");
    }
  });

  signupBranch.addEventListener("change", () => {
    const program = signupProgram.value;
    const branch = signupBranch.value;
    signupSubBranch.innerHTML = '<option value="">Select Section</option>';

    if (program && branch && BRANCH_DATA[program][branch]) {
      const subs = BRANCH_DATA[program][branch];
      if (subs.length > 0 && subs[0] !== "Default") {
        subBranchWrapper.classList.remove("hidden");
        subs.forEach(sub => {
          const opt = document.createElement("option");
          opt.value = `${branch} - ${sub}`;
          opt.textContent = sub;
          signupSubBranch.appendChild(opt);
        });
      } else {
        subBranchWrapper.classList.add("hidden");
        // For BCA/ECE, branch is sub-branch
      }
    }
  });

  // Login
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";

    const role = document.getElementById("login-role").value;
    const identifier = document.getElementById("login-identifier").value.trim();
    const password = document.getElementById("login-password").value;

    try {
      const data = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ role, identifier, password })
      });
      saveSession(data.token, data.user);
      window.location.href = "dashboard.html";
    } catch (err) {
      loginError.textContent = err.message;
    }
  });

  // Signup
  const signupForm = document.getElementById("signup-form");
  const signupError = document.getElementById("signup-error");

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    signupError.textContent = "";

    const role = signupRole.value;
    const name = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;

    let payload = { role, name, email, password };

    if (role === "student") {
      const program = document.getElementById("signup-program").value;
      const branch = document.getElementById("signup-branch").value;
      const subBranch = document.getElementById("signup-sub-branch").value;
      const rollNumber = document.getElementById("signup-roll").value.trim();
      const year = document.getElementById("signup-year").value.trim();

      payload.program = program;
      payload.branch = subBranch || branch; // Use sub-branch if available
      payload.rollNumber = rollNumber;
      payload.year = year;
    } else {
      payload.rank = document.getElementById("signup-rank").value;
      // OTP is passed for teacher
      payload.otp = document.getElementById("signup-otp").value.trim();
    }

    try {
      const data = await api("/api/signup", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      saveSession(data.token, data.user);
      window.location.href = "dashboard.html";
    } catch (err) {
      signupError.textContent = err.message;
    }
  });

  // Teacher Signup OTP Handler removed - using static code 97201


  // Forgot Password / Reset Logic
  initForgotAndReset();

  // If already logged in, jump to dashboard
  if (getToken() && getUser()) {
    window.location.href = "dashboard.html";
  }
}

function initForgotAndReset() {
  const link = document.getElementById("forgot-password-link");
  const modal = document.getElementById("forgot-modal");
  const btnClose = document.getElementById("btn-close-forgot");
  const btnSendOtp = document.getElementById("btn-send-otp");
  const btnResetPass = document.getElementById("btn-reset-pass");
  const msg = document.getElementById("forgot-message");

  const step1 = document.getElementById("forgot-step-1");
  const step2 = document.getElementById("forgot-step-2");

  if (!link) return;

  link.addEventListener("click", (e) => {
    e.preventDefault();
    modal.classList.remove("hidden");
    step1.classList.remove("hidden");
    step2.classList.add("hidden");
    msg.textContent = "";
  });

  btnClose.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  btnSendOtp.addEventListener("click", async () => {
    const email = document.getElementById("forgot-email").value.trim();
    if (!email) {
      msg.textContent = "Please enter your email.";
      return;
    }
    msg.textContent = "Sending OTP...";
    try {
      await api("/api/auth/send-otp", { // Changed endpoint
        method: "POST",
        body: JSON.stringify({ email, type: "reset" })
      });
      msg.textContent = "";
      step1.classList.add("hidden");
      step2.classList.remove("hidden");
    } catch (err) {
      msg.textContent = err.message;
    }
  });

  btnResetPass.addEventListener("click", async () => {
    const email = document.getElementById("forgot-email").value.trim();
    const otp = document.getElementById("forgot-otp").value.trim();
    const newPassword = document.getElementById("forgot-new-pass").value.trim();

    if (!otp || !newPassword) {
      msg.textContent = "Please fill all fields.";
      return;
    }

    try {
      const res = await api("/api/auth/reset-password-otp", { // Changed endpoint
        method: "POST",
        body: JSON.stringify({ email, otp, newPassword })
      });
      msg.style.color = "lightgreen";
      msg.textContent = res.message;
      setTimeout(() => {
        modal.classList.add("hidden");
        // Switch to login tab?
        document.querySelector(".tab-btn[data-tab='login']").click();
      }, 2000);
    } catch (err) {
      msg.style.color = "var(--error)";
      msg.textContent = err.message;
    }
  });
}

// ---------- Dashboard page ----------
function initDashboardPage() {
  const user = getUser();
  if (!user || !getToken()) {
    window.location.href = "index.html";
    return;
  }

  const userNameSpan = document.getElementById("user-name");
  const userRoleBadge = document.getElementById("user-role-badge");
  const logoutBtn = document.getElementById("logout-btn");

  userNameSpan.textContent = user.name;
  userRoleBadge.textContent = user.role === "student" ? "Student" : "Teacher";
  if (user.role === "student") {
    document.querySelectorAll(".teacher-only").forEach((el) => el.style.display = "none");
    document.getElementById("teacher-only-submissions").style.display = "none";
  } else {
    document.getElementById("student-only-pending").style.display = "none";
  }

  logoutBtn.addEventListener("click", () => {
    clearSession();
    window.location.href = "index.html";
  });

  // Nav between views
  const navBtns = document.querySelectorAll(".nav-btn");
  const views = document.querySelectorAll(".view");
  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;

      // Clear interval if leaving messages view
      if (messageInterval) {
        clearInterval(messageInterval);
        messageInterval = null;
      }

      navBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      views.forEach((v) =>
        v.id === "view-" + view ? v.classList.add("active") : v.classList.remove("active")
      );

      if (view === "courses") loadCourses();
      if (view === "assignments") loadAssignments();
      if (view === "messages") initMessagesView();
      if (view === "datesheets") initDateSheetView();
      if (view === "profile") loadProfile();
      if (view === "materials") initMaterialsView();
      if (view === "overview") loadDashboardSummary();
    });
  });

  // Initial loads
  loadDashboardSummary();
  loadCourses();
  loadAssignments();
  initMessagesView();
  loadProfile();

  initCoursesSection(user);
  initAssignmentsSection(user);
  initProfileSection(user);
}

// Dashboard summary
async function loadDashboardSummary() {
  try {
    const data = await api("/api/dashboard/summary");
    const user = getUser();
    // Notifications (only for students usually, but we check endpoint)
    let notifs = [];
    if (user.role === "student") {
      notifs = await api("/api/notifications");
    }

    document.getElementById("stat-courses").textContent = data.myCoursesCount ?? "0";

    if (user.role === "student") {
      document.getElementById("stat-pending").textContent =
        data.pendingAssignmentsCount ?? "0";

      const extra = document.getElementById("overview-extra");
      extra.innerHTML = "";

      // Grid for pending assignments + notifications
      const container = document.createElement("div");
      container.className = "two-col-grid"; // custom class we might need, or just grid
      container.style.display = "grid";
      container.style.gridTemplateColumns = "1fr 1fr";
      container.style.gap = "1rem";

      // 1. Pending Assignments Column
      const pendingCol = document.createElement("div");
      pendingCol.innerHTML = "<h3>Pending</h3>";
      if (data.pendingAssignments && data.pendingAssignments.length > 0) {
        data.pendingAssignments.slice(0, 3).forEach((a) => {
          const card = document.createElement("div");
          card.className = "assignment-card";
          card.innerHTML = `
            <h4>${a.title}</h4>
            <span class="small">Due: ${new Date(a.dueDate).toLocaleString()}</span>
          `;
          pendingCol.appendChild(card);
        });
      } else {
        pendingCol.innerHTML += "<p class='hint'>No pending assignments.</p>";
      }
      container.appendChild(pendingCol);

      // 2. Notifications Column
      const notifCol = document.createElement("div");
      notifCol.innerHTML = "<h3>Notifications</h3>";
      if (notifs && notifs.length > 0) {
        notifs.forEach(n => {
          const div = document.createElement("div");
          div.className = "assignment-card";
          // Condition: Notification turns red if type is warning
          const color = n.type === "warning" ? "red" : "var(--accent-pink)";
          div.style.borderLeft = `4px solid ${color}`;
          div.innerHTML = `
             <div class="small" style="color:${n.type === 'warning' ? 'red' : 'var(--text-bright)'}; font-weight:${n.type === 'warning' ? 'bold' : 'normal'}">${n.message}</div>
             <div class="small" style="opacity:0.6; font-size:0.75rem;">${new Date(n.createdAt).toLocaleDateString()}</div>
           `;
          notifCol.appendChild(div);
        });
      } else {
        notifCol.innerHTML += "<p class='hint'>No new notifications.</p>";
      }
      container.appendChild(notifCol);

      extra.appendChild(container);

    } else {
      const leftToGrade = data.submissionsToGradeCount ?? 0;
      const statusText = leftToGrade > 0 ? `${leftToGrade} assignments left to grade` : "All graded";
      document.getElementById("stat-to-grade").textContent = statusText;
      if (leftToGrade > 0) {
        document.getElementById("stat-to-grade").style.color = "orange";
      } else {
        document.getElementById("stat-to-grade").style.color = "lightgreen";
      }

      // Add Subject Boards button for teachers
      const overviewExtra = document.getElementById("overview-extra");
      if (overviewExtra) {
        overviewExtra.innerHTML = ""; // Clear
        const btn = document.createElement("button");
        btn.className = "btn-primary";
        btn.style.marginTop = "20px";
        btn.textContent = "Faculty Subject Boards";
        btn.onclick = openSubjectBoardSelection;
        overviewExtra.appendChild(btn);
      }
    }
  } catch (err) {
    console.error("Dashboard summary error:", err);
  }
}

// Courses
let cachedJoinedCourses = [];
let cachedAllCourses = [];

async function loadCourses() {
  const container = document.getElementById("courses-list");
  const user = getUser();
  container.innerHTML = "<p>Loading...</p>";

  try {
    cachedJoinedCourses = await api("/api/my-courses");

    if (user.role === "student") {
      // Fetch all to find available ones
      cachedAllCourses = await api("/api/courses");
      const joinedIds = new Set(cachedJoinedCourses.map(c => c.id));
      const available = cachedAllCourses.filter(c => !joinedIds.has(c.id));

      container.innerHTML = "";

      // Section 1: My Courses
      const mySection = document.createElement("div");
      mySection.style.marginBottom = "2rem";
      mySection.innerHTML = "<h4 style='margin-bottom:1rem; border-bottom:1px solid #333; padding-bottom:0.5rem;'>My Courses</h4>";

      if (cachedJoinedCourses.length === 0) {
        mySection.innerHTML += "<p class='hint'>You haven't joined any courses yet.</p>";
      } else {
        const grid = document.createElement("div");
        grid.className = "grid";
        cachedJoinedCourses.forEach(c => {
          const card = createCourseCard(c, true, true); // (course, isJoined, isStudent)
          grid.appendChild(card);
        });
        mySection.appendChild(grid);
      }
      container.appendChild(mySection);

      // Section 2: Available Courses
      const availSection = document.createElement("div");
      availSection.innerHTML = "<h4 style='margin-bottom:1rem; border-bottom:1px solid #333; padding-bottom:0.5rem;'>Available Courses</h4>";

      if (available.length === 0) {
        availSection.innerHTML += "<p class='hint'>No other courses available.</p>";
      } else {
        const grid = document.createElement("div");
        grid.className = "grid";
        available.forEach(c => {
          const card = createCourseCard(c, false, true); // (course, isJoined, isStudent)
          grid.appendChild(card);
        });
        availSection.appendChild(grid);
      }
      container.appendChild(availSection);

    } else {
      // Teacher: Just show my courses (teaching)
      container.innerHTML = "";
      if (cachedJoinedCourses.length === 0) {
        container.innerHTML = "<p class='hint'>You are not teaching any courses.</p>";
      } else {
        const grid = document.createElement("div");
        grid.className = "grid";
        cachedJoinedCourses.forEach(c => {
          const card = createCourseCard(c, true, false);
          grid.appendChild(card);
        });
        container.appendChild(grid);
      }
    }
  } catch (err) {
    container.innerHTML = `<p class="error">${err.message}</p>`;
  }
}

function createCourseCard(c, isJoined, isStudent) {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <h4>${c.name}</h4>
    <div class="small" style="color:var(--text-dim); margin-bottom:0.1rem;">${c.code}</div>
    <div class="small" style="color:var(--accent-cyan); font-weight:bold;">${c.teacherRank || ""} ${c.teacherName || ""}</div>
    <div class="small">${c.description || "No description"}</div>
    ${c.instructorExpertise ? `
    <div class="small" style="margin-top:10px; padding:5px; background:rgba(255,255,255,0.05); border-radius:4px;">
      <strong>Professor Expertise:</strong><br>
      ${c.instructorExpertise}
    </div>` : ""}
    <div style="margin-top:auto; padding-top:1rem;">
       ${getActionButtons(c, isJoined, isStudent)}
    </div>
  `;
  return card;
}

function getActionButtons(c, isJoined, isStudent) {
  if (!isStudent) {
    // Teacher
    let btns = `<button class="btn-primary-small" onclick="alert('Enter course view logic or unrelated')">Enter</button>`;
    btns += `<button class="btn-primary-small" style="margin-left:5px;" onclick="setExamDate('${c.id}')">Exam Date</button>`;
    btns += `<button class="btn-outline-small" style="color:red; margin-left:5px;" onclick="deleteCourse('${c.id}')">Delete</button>`;
    return btns;
  }

  // Student
  if (isJoined) {
    return `<button class="btn-outline-small" disabled>Joined</button>`;
    // We could add "Enter" if we had a specific Course Home Page. 
    // But currently we have generic tabs.
  } else {
    return `<button class="btn-primary-small join-btn" data-id="${c.id}">Join Course</button>`;
  }
}

function initCoursesSection(user) {
  const refreshBtn = document.getElementById("btn-refresh-courses");
  const createBtn = document.getElementById("btn-create-course");
  const searchInput = document.getElementById("course-search");

  if (refreshBtn) refreshBtn.onclick = loadCourses;

  // Search filter (Client-side simple)
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      // Re-render filtering local logic is hard with 2 sections.
      // For simplicity, let's just re-load or handle simplest case:
      // Filter visible cards?
      const q = searchInput.value.toLowerCase();
      document.querySelectorAll("#courses-list .card").forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(q) ? "flex" : "none";
      });
    });
  }

  // Teacher Set Exam Date
  window.setExamDate = async (courseId) => {
    openModal("Set Exam Schedule", (body, close) => {
      body.innerHTML = `
         <label>Exam Date</label>
         <input type="date" id="exam-date-input">
         <label>Exam Time</label>
         <input type="time" id="exam-time-input">
       `;
      return async () => {
        const examDate = document.getElementById("exam-date-input").value;
        const examTime = document.getElementById("exam-time-input").value;
        if (!examDate || !examTime) { alert("Both fields required"); return; }

        await api(`/api/courses/${courseId}`, {
          method: "PUT",
          body: JSON.stringify({ examDate, examTime })
        });
        alert("Exam schedule updated.");
        close();
        loadCourses();
      };
    });
  };

  // Join handler (delegation)
  document.getElementById("courses-list").addEventListener("click", async (e) => {
    if (e.target.classList.contains("join-btn")) {
      const courseId = e.target.dataset.id;
      try {
        e.target.textContent = "Joining...";
        e.target.disabled = true;
        await api(`/api/courses/${courseId}/join`, { method: "POST" });
        loadCourses(); // Refresh
        alert("Joined successfully!");
      } catch (err) {
        alert(err.message);
        e.target.textContent = "Join";
        e.target.disabled = false;
      }
    }
  });

  if (user.role === "teacher" && createBtn) {
    createBtn.style.display = "inline-block";
    createBtn.onclick = () => {
      openModal("Create course", (body, close) => {
        let branchCheckboxes = "";
        Object.keys(BRANCH_DATA).forEach(prog => {
          branchCheckboxes += `<h5>${prog} Branches</h5>`;
          Object.keys(BRANCH_DATA[prog]).forEach(branch => {
            const subs = BRANCH_DATA[prog][branch];
            if (subs[0] === "Default") {
              branchCheckboxes += `<label><input type="checkbox" class="course-section-check" value="${branch}"> ${branch}</label><br>`;
            } else {
              subs.forEach(sub => {
                const val = `${branch} - ${sub}`;
                branchCheckboxes += `<label><input type="checkbox" class="course-section-check" value="${val}"> ${val}</label><br>`;
              });
            }
          });
        });

        body.innerHTML = `
            <label>Course name</label>
            <input type="text" id="modal-course-name">
            <label>Course code</label>
            <input type="text" id="modal-course-code">
            <label>Description</label>
            <input type="text" id="modal-course-desc">
            <label>Program</label>
            <select id="modal-course-program">
              <option value="B.Tech">B.Tech</option>
              <option value="BBA">BBA</option>
            </select>
            <label>Target Semester</label>
            <input type="number" id="modal-course-sem" min="1" max="8" value="1">
            <label>Mandatory for selected branches?</label>
            <input type="checkbox" id="modal-course-mandatory">
            <div style="margin-top:10px; max-height:150px; overflow-y:auto; border:1px solid #444; padding:5px;">
              <strong>Select Branches/Sections:</strong><br>
              ${branchCheckboxes}
            </div>
        `;

        const progSelect = body.querySelector("#modal-course-program");
        const semInput = body.querySelector("#modal-course-sem");
        progSelect.onchange = () => {
          semInput.max = progSelect.value === "B.Tech" ? 8 : 6;
          if (parseInt(semInput.value) > parseInt(semInput.max)) semInput.value = semInput.max;
        };

        return async () => {
          const name = document.getElementById("modal-course-name").value;
          const code = document.getElementById("modal-course-code").value;
          const description = document.getElementById("modal-course-desc").value;
          const program = document.getElementById("modal-course-program").value;
          const semester = document.getElementById("modal-course-sem").value;
          const isMandatory = document.getElementById("modal-course-mandatory").checked;
          const sections = Array.from(document.querySelectorAll(".course-section-check:checked")).map(cb => cb.value);

          try {
            await api("/api/courses", {
              method: "POST",
              body: JSON.stringify({ name, code, description, program, semester, sections, isMandatory })
            });
            close();
            loadCourses();
          } catch (e) {
            alert(e.message);
          }
        };
      });
    };
  } else if (createBtn) {
    createBtn.style.display = "none";
  }
}

async function deleteCourse(courseId) {
  let confirms = 0;
  const maxConfirms = 4; // Changed from 3 to 4

  const askConfirm = async () => {
    if (confirms < maxConfirms) {
      if (confirm(`ARE YOU SURE? (${confirms + 1}/${maxConfirms}) Deleting a course is permanent.`)) {
        confirms++;
        return await askConfirm();
      } else {
        return false;
      }
    }
    return true;
  };

  const confirmed = await askConfirm();
  if (!confirmed) return;

  openModal("Delete Course - Final Step", (body, close) => {
    body.innerHTML = `
      <p style="color:red; font-weight:bold;">Final Warning!</p>
      <p>Please write a reason for deleting this course (minimum 50 words).</p>
      <textarea id="delete-reason" style="width:100%; height:100px; background:#222; color:white; border:1px solid #444;"></textarea>
      <p id="word-count" class="hint">Word count: 0</p>
    `;

    body.querySelector("#delete-reason").addEventListener("input", (e) => {
      const words = e.target.value.trim().split(/\s+/).filter(w => w.length > 0);
      body.querySelector("#word-count").textContent = `Word count: ${words.length}`;
    });

    return async () => {
      const reason = document.getElementById("delete-reason").value;
      const wordCount = reason.trim().split(/\s+/).filter(w => w.length > 0).length;

      if (wordCount < 50) {
        alert("Reason must be at least 50 words. Current: " + wordCount);
        return;
      }

      try {
        await api(`/api/courses/${courseId}`, {
          method: "DELETE",
          body: JSON.stringify({ reason, confirmCount: confirms })
        });
        close();
        loadCourses();
        alert("Course deleted.");
      } catch (err) {
        alert(err.message);
      }
    };
  });
}

// Assignments
let cachedAssignments = [];

async function loadAssignments() {
  try {
    // We need assignments course-wise; easiest: for each course we load separately
    const myCourses = await api("/api/my-courses");
    const all = [];
    for (const c of myCourses) {
      const assignments = await api(`/api/courses/${c.id}/assignments`);
      assignments.forEach((a) => {
        all.push({ ...a, course: c });
      });
    }
    cachedAssignments = all;
    renderAssignments();
  } catch (err) {
    console.error("Assignments error:", err);
  }
}

function renderAssignments() {
  const container = document.getElementById("assignments-list");
  const user = getUser();
  container.innerHTML = "";
  cachedAssignments.forEach((a) => {
    const card = document.createElement("div");
    card.className = "assignment-card";

    // Attachments Links
    let attachmentsHtml = "";
    if (a.attachments && a.attachments.length > 0) {
      attachmentsHtml = `<div class="small" style="margin-top:0.5rem; border-top:1px solid rgba(255,255,255,0.1); padding-top:0.5rem;">
         <strong>Instructions / Files:</strong><br>
         ${a.attachments.map(f => `<a href="${f.url}" target="_blank" style="color:var(--accent-cyan);margin-right:10px;">📄 ${f.originalName}</a>`).join("")}
       </div>`;
    }

    const timeRemaining = new Date(a.dueDate) - new Date();
    const requiredMs = (a.requiredTime || 0) * 3600000;
    let timeColor = "inherit";
    if (timeRemaining > 0 && timeRemaining <= 2 * requiredMs) {
      timeColor = "red";
    }

    card.innerHTML = `
        <h4 style="color:${timeColor}">${a.title}</h4>
        <div class="small">${a.course.name} (${a.course.code})</div>
        <div class="small">Due: ${new Date(a.dueDate).toLocaleString()}</div>
        ${a.requiredTime ? `<div class="small" style="color:${timeColor}">Estimated effort: ${a.requiredTime} hours</div>` : ""}
        <div class="small">Max marks: ${a.maxMarks}</div>
        <div class="small">${a.description || ""}</div>
        ${attachmentsHtml}
        <div class="small" id="assignment-actions-${a.id}" style="margin-top:1rem;"></div>
      `;
    container.appendChild(card);

    const actions = card.querySelector(`#assignment-actions-${a.id}`);
    if (user.role === "student") {
      const mySub = a.submissions ? a.submissions.find(s => s.studentId === user.id) : null;

      const statusDiv = document.createElement("div");
      statusDiv.style.marginBottom = "0.5rem";

      if (mySub) {
        statusDiv.innerHTML = `<span style="color:var(--accent-cyan)">✓ Submitted</span> <span class="small">(${new Date(mySub.submittedAt).toLocaleDateString()})</span>`;

        // Render Submitted Files
        if (mySub.files && mySub.files.length > 0) {
          const filesDiv = document.createElement("div");
          filesDiv.style.marginTop = "0.5rem";
          const isDeletable = (new Date() - new Date(mySub.submittedAt)) < 5 * 60 * 1000; // 5 mins

          mySub.files.forEach(f => {
            const fRow = document.createElement("div");
            fRow.className = "small";
            fRow.style.marginBottom = "4px";
            fRow.innerHTML = `<a href="${f.url}" target="_blank" style="margin-right:10px;">📄 ${f.originalName}</a>`;

            if (isDeletable && f._id) {
              const delBtn = document.createElement("button");
              delBtn.textContent = "Delete";
              delBtn.className = "btn-outline-small";
              delBtn.style.color = "red";
              delBtn.style.padding = "2px 6px";
              delBtn.style.fontSize = "0.7rem";
              delBtn.onclick = async () => {
                if (!confirm("Delete this file?")) return;
                try {
                  await api(`${API_BASE}/api/assignments/${a.id}/submission/files/${f._id}`, { method: "DELETE" });
                  loadAssignments(); // Reload to reflect changes
                } catch (e) {
                  alert(e.message);
                }
              };
              fRow.appendChild(delBtn);
            }
            filesDiv.appendChild(fRow);
          });
          statusDiv.appendChild(filesDiv);
        }

        if (mySub.marks !== null && mySub.marks !== undefined) {
          statusDiv.innerHTML += `
            <div style="margin-top:4px; font-weight:bold; color:var(--accent-pink);">
              Score: ${mySub.marks} / ${a.maxMarks}
            </div>
            ${mySub.feedback ? `<div class="small">Feedback: ${mySub.feedback}</div>` : ""}
          `;
        } else {
          statusDiv.innerHTML += `<div class="small" style="opacity:0.7;">(Not graded yet)</div>`;
        }
      } else {
        statusDiv.innerHTML = `<span style="color:orange">Pending</span>`;
      }
      actions.appendChild(statusDiv);

      const btn = document.createElement("button");
      btn.className = "btn-primary-small";
      btn.textContent = mySub ? "Add more files" : "Submit / Add files";
      btn.addEventListener("click", () => openSubmitAssignmentModal(a));
      actions.appendChild(btn);
    } else {
      const viewBtn = document.createElement("button");
      viewBtn.className = "btn-outline-small";
      viewBtn.textContent = "View submissions";
      viewBtn.addEventListener("click", () => openGradeModal(a));
      actions.appendChild(viewBtn);
    }
  });
}

function initAssignmentsSection(user) {
  const searchInput = document.getElementById("assignment-search");
  const refreshBtn = document.getElementById("btn-refresh-assignments");
  const createBtn = document.getElementById("btn-create-assignment");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.toLowerCase();
      const filtered = cachedAssignments.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.course.name.toLowerCase().includes(q) ||
          a.course.code.toLowerCase().includes(q)
      );
      const backup = cachedAssignments;
      cachedAssignments = filtered;
      renderAssignments();
      cachedAssignments = backup;
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadAssignments);
  }

  if (user.role === "teacher" && createBtn) {
    createBtn.addEventListener("click", async () => {
      const myCourses = await api("/api/my-courses");
      if (myCourses.length === 0) {
        alert("You have no courses yet. Create a course first.");
        return;
      }
      openModal("Create assignment", (body, close) => {
        const options = myCourses
          .map((c) => `<option value="${c.id}">${c.name} (${c.code})</option>`)
          .join("");
        body.innerHTML = `
          <label>Course</label>
          <select id="modal-assignment-course">${options}</select>
          <label>Title</label>
          <input type="text" id="modal-assignment-title">
          <label>Description (Optional)</label>
          <input type="text" id="modal-assignment-desc">
          <label>Instruction Files (PDF, etc.)</label>
          <input type="file" id="modal-assignment-files" multiple>
          <label>Due date & time</label>
          <input type="datetime-local" id="modal-assignment-due">
          <label>Required Time (Hours)</label>
          <input type="number" id="modal-assignment-req-time" value="0">
          <label>Max marks</label>
          <input type="number" id="modal-assignment-max" value="100">
        `;
        return async () => {
          const courseId = document.getElementById("modal-assignment-course").value;
          const title = document.getElementById("modal-assignment-title").value.trim();
          const description = document.getElementById("modal-assignment-desc").value.trim();
          const dueLocal = document.getElementById("modal-assignment-due").value;
          const reqTime = document.getElementById("modal-assignment-req-time").value;
          const maxMarksRaw = document.getElementById("modal-assignment-max").value;
          const maxMarks = parseInt(maxMarksRaw, 10);

          // Validate required fields
          if (!courseId || !title || !dueLocal || !maxMarksRaw) {
            alert("Please fill in all required fields: Course, Title, Due date, and Max marks.");
            return;
          }
          if (isNaN(maxMarks) || maxMarks <= 0) {
            alert("Max marks must be a positive number.");
            return;
          }

          // FormData for multipart
          const formData = new FormData();
          formData.append("courseId", courseId);
          formData.append("title", title);
          formData.append("description", description);
          formData.append("dueDate", new Date(dueLocal).toISOString());
          formData.append("requiredTime", reqTime || 0);
          formData.append("maxMarks", maxMarks);

          const fileInput = document.getElementById("modal-assignment-files");
          if (fileInput.files.length > 0) {
            for (let i = 0; i < fileInput.files.length; i++) {
              formData.append("files", fileInput.files[i]);
            }
          }

          try {
            // Using fetch directly because 'api' helper sets Content-Type json if not FormData, 
            // but here we have FormData. The helper handles FormData if body is instance of FormData.
            // Let's verify 'api' helper. 
            // Yes, api helper: if (!(options.body instanceof FormData)) set json. 
            // So we can use api helper.
            await api("/api/assignments", {
              method: "POST",
              body: formData
            });
            close();
            loadAssignments();
          } catch (err) {
            alert("Error: " + err.message);
          }
        };
      });
    });
  }
}

function openSubmitAssignmentModal(assignment) {
  openModal("Submit assignment", (body, close, modalEl) => {
    body.innerHTML = `
      <p class="small">${assignment.title} — ${assignment.course.name}</p>
      <label>Upload files (pdf, images, doc/xls)</label>
      <input type="file" id="modal-files" multiple>
      <p class="hint">You can add more files later; previous ones remain.</p>
    `;
    return async () => {
      const input = document.getElementById("modal-files");
      const files = input.files;
      if (!files || files.length === 0) {
        alert("Select at least one file.");
        return;
      }

      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      const token = getToken();
      try {
        const res = await fetch(
          `${API_BASE}/api/assignments/${assignment.id}/submit`,
          {
            method: "POST",
            headers: {
              Authorization: "Bearer " + token
            },
            body: formData
          }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Upload failed");
        }
        await res.json();
        close();
        alert("Submission uploaded.");
      } catch (err) {
        alert("Error: " + err.message);
      }
    };
  });
}

function openGradeModal(assignment) {
  openModal("Grade submissions", async (body, close) => {
    body.innerHTML = `<p class="small">Loading submissions...</p>`;
    try {
      const data = await api(`/api/assignments/${assignment.id}/submissions`);
      const list = document.createElement("div");
      list.style.maxHeight = "280px";
      list.style.overflowY = "auto";
      data.submissions.forEach((s) => {
        const div = document.createElement("div");
        div.className = "assignment-card";
        const filesLinks = s.files
          .map(
            (f) =>
              `<a href="${f.url}" target="_blank">${f.originalName}</a>`
          )
          .join("<br>");
        div.innerHTML = `
          <div class="small">
            <strong>${s.studentName}</strong> (${s.rollNumber || "roll?"})
          </div>
          <div class="small">Submitted: ${new Date(
          s.submittedAt
        ).toLocaleString()}</div>
          <div class="small">${filesLinks}</div>
          <div class="small">
            Marks: <input type="number" data-student-id="${s.studentId}" class="grade-marks" style="width:70px;" value="${s.marks ?? ""}">
          </div>
          <div class="small">
            Feedback: <input type="text" data-student-id="${s.studentId}" class="grade-feedback" style="width:95%;">
          </div>
        `;
        list.appendChild(div);
      });
      body.innerHTML = "";
      body.appendChild(list);
    } catch (err) {
      body.innerHTML = `<p class="error">${err.message}</p>`;
    }

    return async () => {
      const marksInputs = Array.from(
        document.querySelectorAll(".grade-marks")
      );
      const feedbackInputs = Array.from(
        document.querySelectorAll(".grade-feedback")
      );

      for (const mi of marksInputs) {
        const studentId = mi.dataset.studentId;
        const marks = mi.value;
        if (marks === "") continue;
        const feedbackInput = feedbackInputs.find(
          (fi) => fi.dataset.studentId === studentId
        );
        const feedback = feedbackInput ? feedbackInput.value : "";
        try {
          await api(`/api/assignments/${assignment.id}/submissions/${studentId}/grade`, {
            method: "POST",
            body: JSON.stringify({ marks: parseInt(marks, 10), feedback })
          });
          // No close() here, allow grading multiple students
        } catch (e) {
          alert("Error grading " + studentId + ": " + e.message);
        }
      }
      close();
      // Instant feedback for the assignment list
      const fullAss = await api(`/api/assignments/${assignment.id}`);
      const idx = cachedAssignments.findIndex(a => a.id === assignment.id);
      if (idx !== -1) cachedAssignments[idx] = fullAss;
      renderAssignments();
      alert("Graded successfully!");
      loadDashboardSummary(); // Update dashboard summary (e.g., counts)
    };
  });
}

// Messages
async function initMessagesView() {
  const select = document.getElementById("messages-course-select");
  const container = document.getElementById("messages-container");
  const form = document.getElementById("message-form");
  if (!select || !container || !form) return;

  delete container.dataset.lastData; // Ensure fresh load on tab entry

  const myCourses = await api("/api/my-courses");
  select.innerHTML = myCourses
    .map((c) => `<option value="${c.id}">${c.name} (${c.code})</option>`)
    .join("");

  async function loadMessages() {
    const courseId = select.value;
    // container.innerHTML = ""; // Removed to prevent blinking
    if (!courseId) return;
    try {
      const messages = await api(`/api/courses/${courseId}/messages`);

      // Smart update: only render if data changed
      const dataStr = JSON.stringify(messages);
      if (container.dataset.lastData === dataStr) return;
      container.dataset.lastData = dataStr;

      // Reverse messages so newest appear at bottom
      const reversedMessages = [...messages].reverse();

      const newHtml = reversedMessages.length === 0
        ? "<p class='hint'>No messages yet.</p>"
        : reversedMessages.map(m => `
          <div class="message">
            <div class="message-header">
              ${m.userName} • ${m.userRole} • ${new Date(m.createdAt).toLocaleString()}
            </div>
            <div class="message-content">${m.content}</div>
          </div>
        `).join("");

      container.innerHTML = newHtml;

      // Auto-scroll to bottom to show newest messages
      container.scrollTop = container.scrollHeight;
    } catch (err) {
      // console.error("Message polling error:", err); // Silent fail on poll? Or show error?
      // If we show error, it might replace good content. Let's show it if it persists?
      // For now, simple logging to console to avoid disrupting UI flow on transient network blips.
      console.warn("Message poll error:", err.message);
    }
  }

  // Bind listeners ONLY if not initialized
  if (!container.dataset.initialized) {
    select.addEventListener("change", () => {
      // On manual switch, show loading and reset cache
      container.innerHTML = "<p class='hint'>Loading...</p>";
      delete container.dataset.lastData;
      loadMessages();
    });
    document.getElementById("btn-refresh-courses")?.addEventListener("click", loadMessages);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = document.getElementById("message-input");
      const content = input.value.trim();
      if (!content) return;

      const courseId = select.value;
      try {
        await api(`/api/courses/${courseId}/messages`, {
          method: "POST",
          body: JSON.stringify({ content })
        });
        input.value = "";
        loadMessages();
      } catch (err) {
        alert("Error: " + err.message);
      }
    });

    container.dataset.initialized = "true";
  }

  // Initial load
  await loadMessages();

  // Start Auto-Refresh (3 seconds)
  if (messageInterval) clearInterval(messageInterval);
  messageInterval = setInterval(loadMessages, 3000);
}

// Profile
async function loadProfile() {
  try {
    const data = await api("/api/me");
    document.getElementById("profile-name").value = data.name || "";
    document.getElementById("profile-role").value = data.role || "";
    document.getElementById("profile-roll").value = data.rollNumber || "";
    document.getElementById("profile-branch-dept").value =
      data.role === "student" ? data.branch || "" : data.department || "";
    document.getElementById("profile-year").value = data.year || "";
    document.getElementById("profile-email").value = data.email || "";
    document.getElementById("profile-photo").value = data.profilePhotoUrl || "";
  } catch (err) {
    console.error("Profile load error:", err);
  }
}

function initProfileSection(user) {
  const form = document.getElementById("profile-form");
  const message = document.getElementById("profile-message");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    message.textContent = "";

    const name = document.getElementById("profile-name").value.trim();
    const branchDept = document.getElementById("profile-branch-dept").value.trim();
    const year = document.getElementById("profile-year").value.trim();
    const profilePhotoUrl = document.getElementById("profile-photo").value.trim();
    const expertise = document.getElementById("profile-expertise")?.value.trim() || "";
    const currentPassword = document.getElementById("profile-current-password").value;
    const newPassword = document.getElementById("profile-new-password").value;

    const payload = { name, profilePhotoUrl, expertise };

    if (user.role === "student") {
      payload.branch = branchDept;
      payload.year = year;
    } else {
      payload.department = branchDept;
    }

    if (currentPassword && newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    try {
      await api("/api/me", {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      message.textContent = "Profile updated.";
      document.getElementById("profile-current-password").value = "";
      document.getElementById("profile-new-password").value = "";
      loadProfile();
    } catch (err) {
      message.textContent = err.message;
    }
  });
}

async function initMaterialsView() {
  const courseSelect = document.getElementById("materials-course-select");
  const materialsList = document.getElementById("materials-list");
  const uploadBtn = document.getElementById("btn-upload-material");
  const user = getUser();

  // Load user courses
  const myCourses = await api("/api/my-courses");
  courseSelect.innerHTML = myCourses
    .map(c => `<option value="${c.id}">${c.name} (${c.code})</option>`)
    .join("");

  async function loadMaterials() {
    const courseId = courseSelect.value;
    const coursesDb = await api("/api/courses");
    const course = coursesDb.find(c => c.id === courseId);

    materialsList.innerHTML = "";

    if (!course || !course.materials || course.materials.length === 0) {
      materialsList.innerHTML = "<p class='hint'>No study material uploaded yet.</p>";
      return;
    }

    course.materials.forEach(m => {
      const card = document.createElement("div");
      card.className = "assignment-card";

      let deleteBtn = "";
      if (user.role === "teacher") {
        deleteBtn = `<button class="btn-outline-small delete-mat-btn" style="color:red; margin-left:10px;">Delete</button>`;
      }

      card.innerHTML = `
        <h4>${m.originalName}</h4>
        <div style="margin-bottom:5px;">
          ${m.fileType === 'video' ? `
            <a class="small" href="${m.url}" target="_blank" style="color:var(--accent-cyan); font-weight:bold;">[ Watch Video ]</a>
          ` : `
            <a class="small" href="${m.url}" target="_blank" style="margin-right:10px;">[ View ]</a>
            <a class="small" href="${m.url}" download target="_blank">[ Download ]</a>
          `}
        </div>
        ${deleteBtn}
      `;

      if (user.role === "teacher") {
        const btn = card.querySelector(".delete-mat-btn");
        if (btn && m._id) {
          btn.onclick = async () => {
            if (!confirm(`Delete material "${m.originalName}"?`)) return;
            try {
              await api(`/api/courses/${course.id}/materials/${m._id}`, { method: "DELETE" });
              loadMaterials();
            } catch (e) {
              alert(e.message);
            }
          };
        }
      }

      materialsList.appendChild(card);
    });
  }

  courseSelect.addEventListener("change", loadMaterials);
  loadMaterials();

  if (user.role === "teacher") {
    uploadBtn.onclick = () => {
      openModal("Upload Material or Video", (body, close) => {
        body.innerHTML = `
          <div style="margin-bottom:1rem;">
            <label>Type</label>
            <select id="material-type">
              <option value="file">File (PDF, PPT, Word)</option>
              <option value="video">Video URL (YouTube, etc.)</option>
            </select>
          </div>
          <div id="file-input-group">
            <label>Select file(s)</label>
            <input type="file" id="materialFiles" multiple>
          </div>
          <div id="video-input-group" class="hidden">
            <label>Video Title</label>
            <input type="text" id="video-title" placeholder="Introduction to AI">
            <label>URL</label>
            <input type="text" id="video-url" placeholder="https://...">
          </div>
        `;

        const typeSelect = body.querySelector("#material-type");
        typeSelect.onchange = () => {
          if (typeSelect.value === "video") {
            body.querySelector("#file-input-group").classList.add("hidden");
            body.querySelector("#video-input-group").classList.remove("hidden");
          } else {
            body.querySelector("#file-input-group").classList.remove("hidden");
            body.querySelector("#video-input-group").classList.add("hidden");
          }
        };

        return async () => {
          const type = typeSelect.value;
          const courseId = courseSelect.value;
          const token = getToken();

          if (type === "video") {
            const videoUrl = document.getElementById("video-url").value;
            const originalName = document.getElementById("video-title").value;
            if (!videoUrl) return alert("URL is required");
            await api(`/api/courses/${courseId}/materials`, {
              method: "POST",
              body: JSON.stringify({ videoUrl, originalName })
            });
          } else {
            const input = document.getElementById("materialFiles");
            const files = input.files;
            if (!files.length) return alert("Select at least one file.");
            const formData = new FormData();
            for (let f of files) formData.append("files", f);

            try {
              const res = await fetch(`${API_BASE}/api/courses/${courseId}/materials`, {
                method: "POST",
                headers: { Authorization: "Bearer " + token },
                body: formData
              });

              if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Upload failed with status ${res.status}`);
              }

              const result = await res.json();
              console.log("Upload successful:", result);
            } catch (error) {
              console.error("Upload error:", error);
              throw error;
            }
          }
          close();
          loadMaterials();
        };
      });
    };
  } else {
    uploadBtn.style.display = "none";
  }
}

async function openSubjectBoardSelection() {
  const user = getUser();
  // Get unique subjects the teacher teaches
  const courses = await api("/api/my-courses"); // Changed to my-courses to get courses taught by the teacher
  const subjects = [...new Set(courses.map(c => c.name))];

  if (subjects.length === 0) return alert("You don't have any subjects yet.");

  openModal("Select Subject Board", (body, close) => {
    body.innerHTML = `
      <label>Choose a subject to enter its common faculty board:</label>
      <select id="board-subject-select" style="width:100%; padding:0.5rem;">
        ${subjects.map(s => `<option value="${s}">${s}</option>`).join("")}
      </select>
    `;
    return async () => {
      const subject = document.getElementById("board-subject-select").value;
      close();
      openFacultySubjectBoard(subject);
    };
  });
}

async function openFacultySubjectBoard(subjectName) {
  openModal(`Faculty Board: ${subjectName}`, (body, close) => {
    body.innerHTML = `
      <div id="faculty-board-messages" style="height:300px; overflow-y:auto; background:#111; padding:10px; border-radius:8px; margin-bottom:10px;">
        <p class="hint">Loading messages...</p>
      </div>
      <div class="two-col">
        <input type="text" id="faculty-msg-input" placeholder="Type a message to other ${subjectName} teachers..." style="width:80%;">
        <button id="send-faculty-msg" class="btn-primary-small" style="width:18%;">Send</button>
      </div>
    `;

    const container = body.querySelector("#faculty-board-messages");
    const input = body.querySelector("#faculty-msg-input");
    const sendBtn = body.querySelector("#send-faculty-msg");

    const loadMsgs = async () => {
      try {
        const msgs = await api(`/api/faculty/discussion/${encodeURIComponent(subjectName)}`);
        container.innerHTML = msgs.map(m => `
          <div class="message">
            <div class="message-header" style="color:var(--accent-cyan)">${m.userName} (${m.userRole}) • ${new Date(m.createdAt).toLocaleString()}</div>
            <div class="message-content">${m.content}</div>
          </div>
        `).join("") || "<p class='hint'>No messages yet.</p>";
        container.scrollTop = container.scrollHeight;
      } catch (err) { alert(err.message); }
    };

    const interval = setInterval(loadMsgs, 3000);
    loadMsgs();

    sendBtn.onclick = async () => {
      const content = input.value.trim();
      if (!content) return;
      await api(`/api/faculty/discussion/${encodeURIComponent(subjectName)}`, {
        method: "POST",
        body: JSON.stringify({ content })
      });
      input.value = "";
      loadMsgs();
    };

    return async () => {
      clearInterval(interval);
      close();
    };
  });
}


// Date Sheets
let calendar = null;

async function initDateSheetView() {
  const courseSelect = document.getElementById("datesheets-course-select");
  const list = document.getElementById("datesheets-list");
  const uploadBtn = document.getElementById("btn-upload-datesheet");
  const calendarContainer = document.getElementById("calendar-container");
  const user = getUser();

  if (!courseSelect || !list) return;

  // Load user courses
  const myCourses = await api("/api/my-courses");
  courseSelect.innerHTML = '<option value="all">All Courses</option>' +
    myCourses
      .map(c => `<option value="${c.id}">${c.name} (${c.code})</option>`)
      .join("");

  // Initialize FullCalendar
  if (calendarContainer && typeof FullCalendar !== 'undefined') {
    if (calendar) {
      calendar.destroy();
    }

    calendar = new FullCalendar.Calendar(calendarContainer, {
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek'
      },
      editable: user.role === 'teacher',
      selectable: user.role === 'teacher',
      selectMirror: true,
      dayMaxEvents: true,
      events: async function (info, successCallback, failureCallback) {
        try {
          let events = [];
          const courseId = courseSelect.value;

          if (user.role === 'student') {
            const schedule = await api("/api/student/exam-schedule");
            events = schedule.map(s => ({
              id: s.courseId,
              title: `${s.courseName}`,
              start: s.examDate,
              extendedProps: { courseCode: s.courseCode, time: s.examTime },
              backgroundColor: '#38BDF8',
              borderColor: '#6366F1'
            }));
          } else {
            if (courseId === 'all') {
              for (const course of myCourses) {
                if (course.examDate && course.examTime) {
                  events.push({
                    id: course.id,
                    title: course.name,
                    start: course.examDate,
                    extendedProps: { courseCode: course.code, time: course.examTime, courseId: course.id },
                    backgroundColor: '#38BDF8',
                    borderColor: '#6366F1'
                  });
                }
              }
            } else {
              const course = myCourses.find(c => c.id === courseId);
              if (course && course.examDate && course.examTime) {
                events.push({
                  id: course.id,
                  title: course.name,
                  start: course.examDate,
                  extendedProps: { courseCode: course.code, time: course.examTime, courseId: course.id },
                  backgroundColor: '#38BDF8',
                  borderColor: '#6366F1'
                });
              }
            }
          }
          successCallback(events);
        } catch (err) {
          console.error("Calendar error:", err);
          failureCallback(err);
        }
      },
      select: function (info) {
        if (user.role === 'teacher') {
          const courseId = courseSelect.value;
          if (courseId === 'all') {
            alert("Please select a specific course to add an exam date.");
            calendar.unselect();
            return;
          }
          openModal("Schedule Exam", (body, close) => {
            body.innerHTML = `
              <label>Exam Date</label>
              <input type="date" id="exam-date-input" value="${info.startStr}">
              <label>Exam Time</label>
              <input type="time" id="exam-time-input" value="09:00">
            `;
            return async () => {
              const examDate = document.getElementById("exam-date-input").value;
              const examTime = document.getElementById("exam-time-input").value;
              if (!examDate || !examTime) { alert("Both required"); return; }
              try {
                await api(`/api/courses/${courseId}`, {
                  method: "PUT",
                  body: JSON.stringify({ examDate, examTime })
                });
                close();
                calendar.refetchEvents();
                alert("Exam scheduled!");
              } catch (err) {
                alert(err.message);
              }
            };
          });
          calendar.unselect();
        }
      },
      eventClick: function (info) {
        const event = info.event;
        const props = event.extendedProps;
        openModal("Exam Details", (body, close) => {
          body.innerHTML = `
            <h4 style="color: var(--accent-cyan);">${event.title}</h4>
            <p><strong>Date:</strong> ${new Date(event.start).toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${props.time || 'Not set'}</p>
            <p><strong>Code:</strong> ${props.courseCode || 'N/A'}</p>
          `;
          if (user.role === 'teacher') {
            const delBtn = document.createElement("button");
            delBtn.className = "btn-outline-small";
            delBtn.style.cssText = "color:red; margin-top:10px;";
            delBtn.textContent = "Remove";
            delBtn.onclick = async () => {
              if (confirm("Remove exam date?")) {
                try {
                  await api(`/api/courses/${props.courseId}`, {
                    method: "PUT",
                    body: JSON.stringify({ examDate: null, examTime: null })
                  });
                  close();
                  calendar.refetchEvents();
                  alert("Removed.");
                } catch (err) {
                  alert(err.message);
                }
              }
            };
            body.appendChild(delBtn);
          }
          document.getElementById("modal-save").style.display = "none";
          return () => { };
        });
      }
    });

    calendar.render();

    courseSelect.addEventListener("change", () => {
      if (calendar) calendar.refetchEvents();
    });
  }

  async function loadSheets() {
    const courseId = courseSelect.value;
    const container = document.getElementById("datesheets-list");
    container.innerHTML = "";
    if (!courseId) return;

    try {
      const data = await api(`/api/courses/${courseId}/datesheets`);
      // Also fetch generated schedule if student
      let schedule = [];
      if (user.role === 'student') {
        try { schedule = await api("/api/student/exam-schedule"); } catch (e) { }
      }

      if (data.length === 0 && schedule.length === 0) {
        container.innerHTML = "<p class='hint'>No date sheets available.</p>";
        return;
      }

      // Render Aggregated Schedule Table first
      if (schedule.length > 0 && courseId === "all") { // Special case if we want all
        // Student view usually filters by course in dropdown, but for date sheet we want ALL
        // But current UI has a dropdown.
        // Let's add a "All Scheduled Exams" option to dropdown or just render it above.
      }

      // Actually, per requirement: "single page their all schedule based on their branch"
      // So layout: Calendar Table (All) + Individual PDF Cards

      const scheduleDiv = document.createElement("div");
      if (schedule.length > 0) {
        scheduleDiv.innerHTML = `
          <h4 style="margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:5px;">Your Exam Schedule</h4>
          <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
            <tr style="background:rgba(255,255,255,0.05); text-align:left;">
              <th style="padding:8px;">Date</th>
              <th style="padding:8px;">Time</th>
              <th style="padding:8px;">Course</th>
              <th style="padding:8px;">Code</th>
            </tr>
            ${schedule.map(s => `
              <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
                <td style="padding:8px; color:var(--accent-cyan); font-weight:bold;">${new Date(s.examDate).toLocaleDateString()}</td>
                <td style="padding:8px;">${s.examTime}</td>
                <td style="padding:8px;">${s.courseName}</td>
                <td style="padding:8px; opacity:0.7;">${s.courseCode}</td>
              </tr>
            `).join("")}
          </table>
        `;
        container.appendChild(scheduleDiv);
      }

      data.forEach((ds) => {
        const card = document.createElement("div");
        card.className = "assignment-card"; // Changed from 'card' to 'assignment-card' for consistency

        let previewHtml = "";
        if (ds.type === "generated") {
          try {
            const events = JSON.parse(ds.url); // Assuming 'url' field stores the JSON string for generated calendars
            previewHtml = `
            <table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:0.8rem;">
              <tr style="border-bottom:1px solid #444;">
                <th style="text-align:left; padding:4px;">Date</th>
                <th style="text-align:left; padding:4px;">Subject</th>
              </tr>
              ${events.map(e => `
                <tr style="border-bottom:1px solid #222;">
                  <td style="padding:4px;">${new Date(e.date).toLocaleDateString()}</td>
                  <td style="padding:4px;">${e.subject}</td>
                </tr>
              `).join("")}
            </table>
          `;
          } catch (e) { previewHtml = "<p class='error'>Invalid calendar data</p>"; }
        }

        card.innerHTML = `
          <h4>${ds.name}</h4>
          <div class="small">${new Date(ds.createdAt).toLocaleDateString()} • ${ds.type === 'generated' ? 'Generated' : 'PDF'}</div>
          ${previewHtml}
          <div style="margin-top:auto; padding-top:1rem;">
            ${ds.type === 'file' ? `<a href="${ds.url}" target="_blank" class="btn-primary-small">View PDF</a>` : ''}
            ${user.role === "teacher" ? `<button class="btn-outline-small" style="color:red; margin-left:5px;" onclick="deleteDateSheet('${ds.id}')">Delete</button>` : ''}
          </div>
        `;
        container.appendChild(card);
      });
    } catch (err) {
      list.innerHTML = `<p class="error">${err.message}</p>`;
    }
  }

  courseSelect.addEventListener("change", loadSheets);
  loadSheets();

  async function deleteDateSheet(dsId) {
    const user = getUser();
    const courseSelect = document.getElementById("datesheets-course-select");
    const courseId = courseSelect?.value;
    if (!courseId || !confirm("Delete this date sheet?")) return;

    try {
      await api(`/api/courses/${courseId}/datesheets/${dsId}`, { method: "DELETE" });
      alert("Date sheet deleted.");
      initDateSheetsView();
    } catch (err) {
      alert(err.message);
    }
  }
  window.deleteDateSheet = deleteDateSheet; // Make it global for inline onclick

  if (user.role === "teacher" && uploadBtn) {
    uploadBtn.onclick = () => {
      openModal("Upload Date Sheet", (body, close) => {
        body.innerHTML = `
          <label>Select file(s)</label>
          <input type="file" id="dsFiles" multiple>
        `;
        return async () => {
          const input = document.getElementById("dsFiles");
          const files = input.files;
          if (!files.length) {
            alert("Select at least one file.");
            return;
          }

          const courseId = courseSelect.value;
          const formData = new FormData();
          for (let f of files) formData.append("files", f);

          try {
            const token = getToken();
            const res = await fetch(`${API_BASE}/api/courses/${courseId}/datesheets`, {
              method: "POST",
              headers: { Authorization: "Bearer " + token },
              body: formData
            });

            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              throw new Error(errorData.message || `Upload failed with status ${res.status}`);
            }

            const result = await res.json();
            console.log("Date sheet upload successful:", result);
            close();
            loadSheets();
            alert("Date sheet uploaded successfully!");
          } catch (e) {
            console.error("Date sheet upload error:", e);
            alert("Error: " + e.message);
          }
        };
      });
    };
  } else if (uploadBtn) {
    uploadBtn.style.display = "none";
  }

  const createCalendarBtn = document.getElementById("btn-create-calendar");
  if (user.role === "teacher" && createCalendarBtn) {
    createCalendarBtn.onclick = () => {
      openModal("Generate Date Sheet Calendar", (body, close) => {
        body.innerHTML = `
          <p class="hint">Enter exam details row by row (Date, Subject)</p>
          <div id="calendar-rows">
            <div class="two-col" style="margin-bottom:5px;">
              <input type="date" class="cal-date">
              <input type="text" class="cal-subject" placeholder="e.g. Mathematics">
            </div>
          </div>
          <button id="add-cal-row" class="btn-outline-small" style="margin-top:5px;">+ Add Exam</button>
        `;

        body.querySelector("#add-cal-row").onclick = () => {
          const div = document.createElement("div");
          div.className = "two-col";
          div.style.marginBottom = "5px";
          div.innerHTML = `<input type="date" class="cal-date"> <input type="text" class="cal-subject" placeholder="Next Exam">`;
          body.querySelector("#calendar-rows").appendChild(div);
        };

        return async () => {
          const rows = Array.from(body.querySelectorAll("#calendar-rows .two-col"));
          const events = rows.map(r => ({
            date: r.querySelector(".cal-date").value,
            subject: r.querySelector(".cal-subject").value
          })).filter(e => e.date && e.subject);

          if (events.length === 0) return alert("Add at least one exam.");

          const courseId = courseSelect.value;
          try {
            await api(`/api/courses/${courseId}/datesheets/generate`, {
              method: "POST",
              body: JSON.stringify({ name: "Exam Calendar", events })
            });
            alert("Calendar generated and saved.");
            close();
            loadSheets(); // Changed from loadDateSheets to loadSheets for consistency
          } catch (err) {
            alert(err.message);
          }
        };
      });
    };
  } else if (createCalendarBtn) {
    createCalendarBtn.style.display = "none";
  }
}

// Modal helper
function openModal(title, buildFn) {
  console.log('openModal called');
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modal-title");
  const modalBody = document.getElementById("modal-body");
  const btnCancel = document.getElementById("modal-cancel");
  const btnSave = document.getElementById("modal-save");

  modalTitle.textContent = title;
  modalBody.innerHTML = "";
  modal.classList.remove("hidden");

  // Reset button state just in case
  btnSave.textContent = "Confirm"; // Default text, or we could pass it
  btnSave.disabled = false;

  const close = () => {
    modal.classList.add("hidden");
    modalBody.innerHTML = "";
    btnSave.onclick = null;
    btnCancel.onclick = null;
    btnSave.textContent = "Confirm";
    btnSave.disabled = false;
  };

  // Handle both sync and async buildFn
  const buildResult = buildFn(modalBody, close, modal);
  console.log('[openModal] buildResult:', buildResult);
  console.log('[openModal] buildResult is Promise?', buildResult instanceof Promise);
  console.log('[openModal] buildResult type:', typeof buildResult);

  btnCancel.onclick = close;
  btnSave.onclick = async () => {
    console.log('[btnSave.onclick] Button clicked!');
    const originalText = btnSave.textContent;
    try {
      btnSave.textContent = "Processing...";
      btnSave.disabled = true;

      // Await buildResult if it's a Promise to get the actual onSave function
      console.log('[btnSave.onclick] About to resolve buildResult...');
      const onSave = buildResult instanceof Promise ? await buildResult : buildResult;
      console.log('[btnSave.onclick] onSave resolved:', onSave);
      console.log('[btnSave.onclick] onSave type:', typeof onSave);
      console.log('[btnSave.onclick] onSave is function?', typeof onSave === 'function');

      if (onSave && typeof onSave === 'function') {
        console.log('[btnSave.onclick] Calling onSave()...');
        await onSave();
        console.log('[btnSave.onclick] onSave() completed');
      } else {
        console.error('[btnSave.onclick] onSave is NOT a function!', onSave);
      }
    } catch (err) {
      console.error("Modal action error:", err);
      alert("Error: " + err.message);
    } finally {
      // If the modal is still open (meaning onSave didn't call close()), 
      // we must restore the button state.
      if (modal && !modal.classList.contains("hidden")) {
        btnSave.textContent = originalText;
        btnSave.disabled = false;
      }
    }
  };
}