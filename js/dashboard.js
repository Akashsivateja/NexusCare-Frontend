/* START OF FILE dashboard.js */

const backendURL = "https://nexuscare-backend.onrender.com"; // 🔁 Replace with your actual Render backend URL

const token = localStorage.getItem("token");
const userRole = localStorage.getItem("userRole");
const userName = localStorage.getItem("userName");
let userId = null; // Will be set after parsing JWT

// Function to parse JWT token and extract payload
function parseJwt(token) {
  try {
    if (!token) return null;
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Error parsing JWT:", e);
    return null;
  }
}

// Extract userId from token immediately
const decodedToken = parseJwt(token);
if (decodedToken) {
  userId = decodedToken.userId;
}

// --- Utility Functions (can be moved to a shared file if needed) ---
function showNotification(message, type = "success") {
  const container = document.getElementById("notification-container");
  if (!container) {
    alert(message); // Fallback if container not found
    return;
  }

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  container.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("fade-out");
    notification.addEventListener("transitionend", () => notification.remove());
  }, 3000);
}

function setButtonLoading(button, isLoading) {
  const spinner = button.querySelector(".spinner");
  const textSpan = button.querySelector("span");
  if (spinner && textSpan) {
    if (isLoading) {
      spinner.classList.remove("hidden");
      textSpan.style.visibility = "hidden";
      button.disabled = true;
    } else {
      spinner.classList.add("hidden");
      textSpan.style.visibility = "visible";
      button.disabled = false;
    }
  }
}
// --- End Utility Functions ---

// --- Authentication & Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  if (!token || !userId || !userRole) {
    window.location.href = "login.html"; // Redirect if no essential token/role data
    return;
  }

  const userGreeting = document.getElementById("userGreeting");
  if (userGreeting && userName) {
    userGreeting.textContent = `Hello, ${userName}!`;
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.clear(); // Clear all stored data
      window.location.href = "login.html";
    });
  }

  renderDashboardContent();
});

async function renderDashboardContent() {
  const dashboardMain = document.querySelector(".dashboard-main");
  if (!dashboardMain) {
    console.error("Dashboard main container not found.");
    return;
  }

  dashboardMain.innerHTML = '<p class="loading-text">Loading dashboard...</p>'; // Initial loading state

  if (userRole === "patient") {
    await renderPatientDashboard(dashboardMain);
  } else if (userRole === "doctor") {
    await renderDoctorDashboard(dashboardMain);
  } else {
    showNotification("Unknown user role. Please log in again.", "error");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);
  }
}

// --- Shared Display Functions ---
function displayVitals(vitals, container) {
  if (vitals.length === 0) {
    container.innerHTML = '<p class="loading-text">No vitals recorded yet.</p>';
    return;
  }
  container.innerHTML = vitals
    .map(
      (record) => `
        <div class="record-item">
          <span>BP: <strong>${record.bp}</strong></span>
          <span>Sugar: <strong>${record.sugar}</strong></span>
          <span>HR: <strong>${record.heartRate}</strong></span>
          <span class="record-date">${new Date(
            record.createdAt
          ).toLocaleString()}</span>
        </div>
      `
    )
    .join("");
}

function displayFiles(files, container) {
  if (files.length === 0) {
    container.innerHTML = '<p class="loading-text">No files uploaded yet.</p>';
    return;
  }
  container.innerHTML = files
    .map(
      (file) => `
        <div class="file-item">
          <a href="${file.fileUrl}" target="_blank" download="${
        file.fileName
      }" class="file-link">
            <span class="file-icon">📄</span> ${file.fileName}
          </a>
          <span class="file-date">${new Date(
            file.createdAt
          ).toLocaleString()}</span>
        </div>
      `
    )
    .join("");
}

function updateChart(
  canvasId,
  chartInstance,
  data,
  label,
  borderColor,
  yAxisTitle
) {
  const dates = data
    .map((d) => new Date(d.createdAt).toLocaleDateString())
    .reverse();
  const values = data
    .map((d) => {
      if (label === "Systolic BP") return parseInt(d.bp.split("/")[0]);
      if (label === "Sugar Level") return parseInt(d.sugar);
      if (label === "Heart Rate") return parseInt(d.heartRate);
      return 0; // Fallback
    })
    .reverse();

  if (chartInstance) chartInstance.destroy();

  const ctx = document.getElementById(canvasId);
  if (!ctx) return; // Ensure canvas exists

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: dates,
      datasets: [
        {
          label: label,
          data: values,
          borderColor: borderColor,
          tension: 0.1,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: true, title: { display: true, text: "Date" } },
        y: {
          display: true,
          beginAtZero: false,
          title: { display: true, text: yAxisTitle },
        },
      },
    },
  });
  return chartInstance; // Return updated instance
}

// --- Patient Dashboard Functions ---
let patientBpChartInstance, patientSugarChartInstance, patientHrChartInstance;

async function renderPatientDashboard(container) {
  container.innerHTML = `
    <section class="dashboard-section input-forms">
      <div class="glass-card form-card">
        <h3 class="card-title">🩺 Add Daily Vitals</h3>
        <form id="vitalsForm">
          <div class="input-group">
            <label for="bp">Blood Pressure (e.g., 120/80)</label>
            <input type="text" id="bp" placeholder="e.g., 120/80 mmHg" required />
          </div>
          <div class="input-group">
            <label for="sugar">Sugar Level (mg/dL)</label>
            <input type="text" id="sugar" placeholder="e.g., 90 mg/dL" required />
          </div>
          <div class="input-group">
            <label for="hr">Heart Rate (bpm)</label>
            <input type="text" id="hr" placeholder="e.g., 75 bpm" required />
          </div>
          <button type="submit" class="btn btn-primary">
            <span>Submit Vitals</span>
            <div class="spinner hidden"></div>
          </button>
        </form>
      </div>

      <div class="glass-card form-card">
        <h3 class="card-title">📁 Upload Medical Report</h3>
        <form id="fileForm" enctype="multipart/form-data">
          <div class="input-group">
            <label for="file">Select File</label>
            <input type="file" id="file" required />
          </div>
          <button type="submit" class="btn btn-secondary">
            <span>Upload File</span>
            <div class="spinner hidden"></div>
          </button>
        </form>
      </div>

      <div class="glass-card form-card">
        <h3 class="card-title">👩‍⚕️ Find & Consult a Doctor</h3>
        <div class="input-group">
            <label for="doctorSearch">Search Doctors (by name or specialty)</label>
            <input type="text" id="doctorSearch" placeholder="e.g., John Doe or Cardiologist" />
            <button id="searchDoctorBtn" class="btn btn-primary mt-3">
                <span>Search</span>
                <div class="spinner hidden"></div>
            </button>
        </div>
        <div id="doctorSearchResult" class="data-list mt-4">
            <p class="loading-text">No doctors found. Search above.</p>
        </div>
      </div>

    </section>

    <section class="dashboard-section data-display">
      <div class="glass-card data-card">
        <h3 class="card-title">📈 Your Vitals Trends</h3>
        <div class="chart-container">
          <h4>Blood Pressure Over Time</h4>
          <canvas id="patientBpChart"></canvas>
        </div>
        <div class="chart-container">
          <h4>Sugar Level Over Time</h4>
          <canvas id="patientSugarChart"></canvas>
        </div>
        <div class="chart-container">
          <h4>Heart Rate Over Time</h4>
          <canvas id="patientHrChart"></canvas>
        </div>
      </div>

      <div class="glass-card data-card">
        <h3 class="card-title">🩺 Your Recent Vitals</h3>
        <div id="patientRecordsList" class="data-list">
          <p class="loading-text">Loading vitals...</p>
        </div>
      </div>

      <div class="glass-card data-card">
        <h3 class="card-title">📂 Your Uploaded Files</h3>
        <div id="patientFilesList" class="data-list">
          <p class="loading-text">Loading files...</p>
        </div>
      </div>

       <div class="glass-card data-card">
        <h3 class="card-title">💬 Notes from your Doctor</h3>
        <div id="patientNotesList" class="data-list">
          <p class="loading-text">Loading notes...</p>
        </div>
      </div>

      <div class="glass-card data-card">
        <h3 class="card-title">👩‍⚕️ Your Consulted Doctors</h3>
        <div id="myDoctorsList" class="data-list">
          <p class="loading-text">Loading doctors...</p>
        </div>
      </div>

      <div class="glass-card data-card">
        <h3 class="card-title">💊 Your Prescriptions</h3>
        <div id="myPrescriptionsList" class="data-list">
          <p class="loading-text">Loading prescriptions...</p>
        </div>
      </div>
    </section>
  `;

  // Attach event listeners and fetch data for patient
  attachPatientEventListeners();
  await fetchPatientDataAndCharts(userId);
  await fetchPatientNotes(userId); // Fetch notes for the patient
  await fetchMyDoctors();
  await fetchMyPrescriptions();
}

function attachPatientEventListeners() {
  // Vitals Form Submit
  const vitalsForm = document.getElementById("vitalsForm");
  if (vitalsForm) {
    vitalsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const bp = document.getElementById("bp").value;
      const sugar = document.getElementById("sugar").value;
      const hr = document.getElementById("hr").value;
      const submitBtn = vitalsForm.querySelector(".btn-primary");
      setButtonLoading(submitBtn, true);

      try {
        const res = await fetch(`${backendURL}/api/records/add`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({ bp, sugar, heartRate: hr }),
        });
        const data = await res.json();
        if (res.ok) {
          showNotification(data.message, "success");
          vitalsForm.reset();
          await fetchPatientDataAndCharts(userId); // Refresh data
        } else {
          showNotification(data.error || "Failed to add vitals.", "error");
        }
      } catch (err) {
        console.error("Add vitals error:", err);
        showNotification("Network error. Could not add vitals.", "error");
      } finally {
        setButtonLoading(submitBtn, false);
      }
    });
  }

  // File Form Submit
  const fileForm = document.getElementById("fileForm");
  if (fileForm) {
    fileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById("file");
      const file = fileInput.files[0];
      if (!file) {
        showNotification("Please select a file to upload.", "warning");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const submitBtn = fileForm.querySelector(".btn-secondary");
      setButtonLoading(submitBtn, true);

      try {
        const res = await fetch(`${backendURL}/api/files/upload`, {
          method: "POST",
          headers: {
            Authorization: token,
          },
          body: formData,
        });
        const data = await res.json();
        if (res.ok) {
          showNotification(data.message, "success");
          fileForm.reset();
          await fetchPatientDataAndCharts(userId); // Refresh data
        } else {
          showNotification(data.error || "Failed to upload file.", "error");
        }
      } catch (err) {
        console.error("File upload error:", err);
        showNotification("Network error. Could not upload file.", "error");
      } finally {
        setButtonLoading(submitBtn, false);
      }
    });
  }

  // Doctor Search & Consult Logic
  const searchDoctorBtn = document.getElementById("searchDoctorBtn");
  const doctorSearchInput = document.getElementById("doctorSearch");
  const doctorSearchResult = document.getElementById("doctorSearchResult");

  if (searchDoctorBtn) {
    searchDoctorBtn.addEventListener("click", async () => {
      const query = doctorSearchInput.value.trim();
      if (!query) {
        showNotification(
          "Please enter a doctor's name or specialty.",
          "warning"
        );
        return;
      }
      setButtonLoading(searchDoctorBtn, true);
      doctorSearchResult.innerHTML =
        '<p class="loading-text">Searching doctors...</p>';

      try {
        const res = await fetch(
          `${backendURL}/api/consultations/search-doctors?query=${encodeURIComponent(
            query
          )}`,
          {
            headers: { Authorization: token },
          }
        );
        const doctors = await res.json();

        if (res.ok && doctors.length > 0) {
          doctorSearchResult.innerHTML = doctors
            .map(
              (doctor) => `
                      <div class="doctor-item">
                          <span>Dr. <strong>${doctor.name}</strong> (${
                doctor.email
              }) ${doctor.specialty ? `- ${doctor.specialty}` : ""}</span>
                          ${
                            doctor.isConsulted
                              ? '<span style="color: green;">(Consulted)</span>'
                              : doctor.isPending
                              ? '<span style="color: orange;">(Pending Request)</span>'
                              : `<button class="btn btn-primary btn-sm consult-doctor-btn" data-doctor-id="${doctor._id}">Consult</button>`
                          }
                      </div>
                  `
            )
            .join("");

          document.querySelectorAll(".consult-doctor-btn").forEach((button) => {
            button.addEventListener("click", async (e) => {
              const doctorId = e.target.dataset.doctorId;
              const consultBtn = e.target;
              setButtonLoading(consultBtn, true);
              try {
                const consultRes = await fetch(
                  `${backendURL}/api/consultations/request/${doctorId}`,
                  {
                    method: "POST",
                    headers: { Authorization: token },
                  }
                );
                const data = await consultRes.json();
                if (consultRes.ok) {
                  showNotification(data.message, "success");
                  await fetchMyDoctors(); // Refresh my doctors list
                  await searchDoctorBtn.click(); // Re-run search to update status
                } else {
                  showNotification(
                    data.error || "Failed to send consultation request.",
                    "error"
                  );
                }
              } catch (err) {
                console.error("Consultation request error:", err);
                showNotification(
                  "Network error. Could not send request.",
                  "error"
                );
              } finally {
                setButtonLoading(consultBtn, false);
              }
            });
          });
        } else if (res.ok && doctors.length === 0) {
          doctorSearchResult.innerHTML =
            '<p class="loading-text">No doctors found matching your search.</p>';
        } else {
          doctorSearchResult.innerHTML = `<p class="error-text">Error searching doctors: ${
            doctors.error || "Unknown error"
          }</p>`;
        }
      } catch (err) {
        console.error("Doctor search error:", err);
        doctorSearchResult.innerHTML =
          '<p class="error-text">Network error during doctor search.</p>';
      } finally {
        setButtonLoading(searchDoctorBtn, false);
      }
    });
  }
}

async function fetchPatientDataAndCharts(patientId) {
  const recordsList = document.getElementById("patientRecordsList");
  const filesList = document.getElementById("patientFilesList");

  if (!recordsList || !filesList) return;

  recordsList.innerHTML = '<p class="loading-text">Loading vitals...</p>';
  filesList.innerHTML = '<p class="loading-text">Loading files...</p>';

  try {
    // Fetch Vitals
    const vitalsRes = await fetch(`${backendURL}/api/records/my`, {
      headers: { Authorization: token },
    });
    const vitals = await vitalsRes.json();

    if (vitalsRes.ok) {
      displayVitals(vitals, recordsList);
      patientBpChartInstance = updateChart(
        "patientBpChart",
        patientBpChartInstance,
        vitals,
        "Systolic BP",
        "#4a90e2",
        "BP (mmHg)"
      );
      patientSugarChartInstance = updateChart(
        "patientSugarChart",
        patientSugarChartInstance,
        vitals,
        "Sugar Level",
        "#50e3c2",
        "Sugar (mg/dL)"
      );
      patientHrChartInstance = updateChart(
        "patientHrChart",
        patientHrChartInstance,
        vitals,
        "Heart Rate",
        "#ff7d7d",
        "Heart Rate (bpm)"
      );
    } else {
      recordsList.innerHTML = `<p class="error-text">Error loading vitals: ${
        vitals.error || "Unknown error"
      }</p>`;
    }

    // Fetch Files
    const filesRes = await fetch(`${backendURL}/api/files/my`, {
      headers: { Authorization: token },
    });
    const files = await filesRes.json();

    if (filesRes.ok) {
      displayFiles(files, filesList);
    } else {
      filesList.innerHTML = `<p class="error-text">Error loading files: ${
        files.error || "Unknown error"
      }</p>`;
    }
  } catch (err) {
    console.error("Error fetching patient data:", err);
    recordsList.innerHTML =
      '<p class="error-text">Network error loading data.</p>';
    filesList.innerHTML =
      '<p class="error-text">Network error loading data.</p>';
  }
}

async function fetchPatientNotes(patientId) {
  const notesList = document.getElementById("patientNotesList");
  if (!notesList) return;
  notesList.innerHTML = '<p class="loading-text">Loading notes...</p>';
  try {
    const res = await fetch(
      `${backendURL}/api/doctor/patient/${patientId}/notes`,
      {
        // Using doctor route for notes
        headers: { Authorization: token },
      }
    );
    const notes = await res.json();
    if (res.ok) {
      if (notes.length === 0) {
        notesList.innerHTML =
          '<p class="loading-text">No notes from doctors yet.</p>';
        return;
      }
      notesList.innerHTML = notes
        .map(
          (note) => `
                <div class="record-item">
                    <span><strong>Note:</strong> ${note.content}</span>
                    <span><strong>From:</strong> Dr. ${
                      note.doctorId ? note.doctorId.name : "Unknown"
                    }</span>
                    <span class="record-date">${new Date(
                      note.createdAt
                    ).toLocaleString()}</span>
                </div>
            `
        )
        .join("");
    } else {
      notesList.innerHTML = `<p class="error-text">Error loading notes: ${
        notes.error || "Unknown error"
      }</p>`;
    }
  } catch (err) {
    console.error("Error fetching notes for patient:", err);
    notesList.innerHTML =
      '<p class="error-text">Network error loading notes.</p>';
  }
}

async function fetchMyDoctors() {
  const myDoctorsList = document.getElementById("myDoctorsList");
  if (!myDoctorsList) return;
  myDoctorsList.innerHTML =
    '<p class="loading-text">Loading your doctors...</p>';
  try {
    const res = await fetch(`${backendURL}/api/consultations/my-doctors`, {
      headers: { Authorization: token },
    });
    const doctors = await res.json();
    if (res.ok) {
      if (doctors.length === 0) {
        myDoctorsList.innerHTML =
          '<p class="loading-text">You haven\'t consulted any doctors yet.</p>';
        return;
      }
      myDoctorsList.innerHTML =
        "<h4>Doctors you are consulting:</h4>" +
        doctors
          .map(
            (doctor) => `
                <div class="doctor-item">
                    <span>Dr. <strong>${doctor.name}</strong> (${
              doctor.email
            }) ${doctor.specialty ? `- ${doctor.specialty}` : ""}</span>
                </div>
            `
          )
          .join("");
    } else {
      myDoctorsList.innerHTML = `<p class="error-text">Error loading doctors: ${
        doctors.error || "Unknown error"
      }</p>`;
    }
  } catch (err) {
    console.error("Error fetching my doctors:", err);
    myDoctorsList.innerHTML =
      '<p class="error-text">Network error loading your doctors.</p>';
  }
}

async function fetchMyPrescriptions() {
  const myPrescriptionsList = document.getElementById("myPrescriptionsList");
  if (!myPrescriptionsList) return;
  myPrescriptionsList.innerHTML =
    '<p class="loading-text">Loading prescriptions...</p>';
  try {
    const res = await fetch(`${backendURL}/api/doctor/my-prescriptions`, {
      // Doctor's endpoint to get prescriptions
      headers: { Authorization: token },
    });
    const prescriptions = await res.json();
    if (res.ok) {
      if (prescriptions.length === 0) {
        myPrescriptionsList.innerHTML =
          '<p class="loading-text">No prescriptions received yet.</p>';
        return;
      }
      myPrescriptionsList.innerHTML = prescriptions
        .map(
          (p) => `
                <div class="prescription-item">
                    <strong>Date: ${new Date(
                      p.createdAt
                    ).toLocaleDateString()}</strong>
                    <p>Issued by: Dr. ${
                      p.doctorId ? p.doctorId.name : "Unknown"
                    }</p>
                    <div class="medications">
                        <strong>Medications:</strong>
                        ${p.medications
                          .split("\n")
                          .map((med) => `<span>- ${med.trim()}</span>`)
                          .join("")}
                    </div>
                    <p>Instructions: ${p.instructions}</p>
                </div>
            `
        )
        .join("");
    } else {
      myPrescriptionsList.innerHTML = `<p class="error-text">Error loading prescriptions: ${
        prescriptions.error || "Unknown error"
      }</p>`;
    }
  } catch (err) {
    console.error("Error fetching my prescriptions:", err);
    myPrescriptionsList.innerHTML =
      '<p class="error-text">Network error loading prescriptions.</p>';
  }
}

// --- Doctor Dashboard Functions ---
let currentSelectedPatientId = null;
let doctorBpChartInstance, doctorSugarChartInstance, doctorHrChartInstance;

async function renderDoctorDashboard(container) {
  container.innerHTML = `
    <section class="dashboard-section doctor-patient-grid">
      <div class="glass-card data-card patient-lists-card">
        <h3 class="card-title">👨‍⚕️ Your Patients & Requests</h3>
        <h4>Pending Consultation Requests:</h4>
        <div id="pendingConsultationsList" class="data-list mb-4">
            <p class="loading-text">Loading requests...</p>
        </div>

        <h4>Your Consulted Patients:</h4>
        <div class="input-group">
            <label for="doctorPatientSearch">Search My Patients (by name or email)</label>
            <input type="text" id="doctorPatientSearch" placeholder="Patient Name or Email" />
            <button id="searchMyPatientBtn" class="btn btn-primary btn-sm mt-3">
                <span>Search</span>
                <div class="spinner hidden"></div>
            </button>
        </div>
        <div id="myPatientsList" class="data-list mt-4">
            <p class="loading-text">Loading your patients...</p>
        </div>
      </div>

      <div id="patientDetailsCard" class="glass-card data-card hidden patient-details-card">
        <h3 class="card-title">Details for: <span id="currentPatientName"></span></h3>
        <button id="closePatientDetailsBtn" class="btn btn-outline" style="position:absolute; top: 20px; right: 20px;">Close</button>

        <h4>AI Health Summary</h4>
        <button id="generateSummaryBtn" class="btn btn-secondary btn-sm mb-3">
            <span>Generate Summary</span>
            <div class="spinner hidden"></div>
        </button>
        <div id="aiSummaryBox" class="ai-summary-box hidden">
            <h5>Generated Health Summary</h5>
            <p id="aiSummaryContent">Loading AI summary...</p>
        </div>


        <div class="chart-container">
          <h4>Blood Pressure Over Time</h4>
          <canvas id="doctorBpChart"></canvas>
        </div>
        <div class="chart-container">
          <h4>Sugar Level Over Time</h4>
          <canvas id="doctorSugarChart"></canvas>
        </div>
        <div class="chart-container">
          <h4>Heart Rate Over Time</h4>
          <canvas id="doctorHrChart"></canvas>
        </div>

        <h4>Vitals History</h4>
        <div id="doctorPatientVitalsList" class="data-list mb-4"></div>

        <h4>Medical Files</h4>
        <div id="doctorPatientFilesList" class="data-list mb-4"></div>

        <h4>Add Note for Patient</h4>
        <form id="addNoteForm" class="mb-4">
          <div class="input-group">
            <label for="noteContent">Note Content</label>
            <textarea id="noteContent" rows="4" placeholder="Enter clinical notes here..." required></textarea>
          </div>
          <button type="submit" class="btn btn-primary">
            <span>Add Note</span>
            <div class="spinner hidden"></div>
          </button>
        </form>
        <h4>Previous Notes</h4>
        <div id="doctorPatientNotesList" class="data-list mb-4">
            <p class="loading-text">Loading notes...</p>
        </div>

        <h4>Create Prescription</h4>
        <form id="createPrescriptionForm">
          <div class="input-group">
            <label for="medications">Medications (one per line)</label>
            <textarea id="medications" rows="6" placeholder="Paracetamol 500mg - 1 tablet 3 times a day
Amoxicillin 250mg - 1 capsule twice a day" required></textarea>
          </div>
          <div class="input-group">
            <label for="instructions">Instructions</label>
            <textarea id="instructions" rows="3" placeholder="Take with food. Complete the full course of antibiotics." required></textarea>
          </div>
          <button type="submit" class="btn btn-secondary">
            <span>Issue Prescription</span>
            <div class="spinner hidden"></div>
          </button>
        </form>
      </div>
    </section>
  `;

  // Attach event listeners and fetch data for doctor
  attachDoctorEventListeners();
  await fetchPendingConsultations();
  await fetchMyPatients();
}

function attachDoctorEventListeners() {
  const patientDetailsCard = document.getElementById("patientDetailsCard");
  const currentPatientName = document.getElementById("currentPatientName");
  const closePatientDetailsBtn = document.getElementById(
    "closePatientDetailsBtn"
  );
  const addNoteForm = document.getElementById("addNoteForm");
  const createPrescriptionForm = document.getElementById(
    "createPrescriptionForm"
  );
  const generateSummaryBtn = document.getElementById("generateSummaryBtn");
  const doctorPatientSearchInput = document.getElementById(
    "doctorPatientSearch"
  );
  const searchMyPatientBtn = document.getElementById("searchMyPatientBtn");

  // Close Patient Details
  if (closePatientDetailsBtn) {
    closePatientDetailsBtn.addEventListener("click", () => {
      patientDetailsCard.classList.add("hidden");
      currentSelectedPatientId = null;
      // Clear charts
      if (doctorBpChartInstance) doctorBpChartInstance.destroy();
      if (doctorSugarChartInstance) doctorSugarChartInstance.destroy();
      if (doctorHrChartInstance) doctorHrChartInstance.destroy();
      // Clear lists
      document.getElementById("doctorPatientVitalsList").innerHTML = "";
      document.getElementById("doctorPatientFilesList").innerHTML = "";
      document.getElementById("doctorPatientNotesList").innerHTML = "";
      document.getElementById("aiSummaryBox").classList.add("hidden");
      document.getElementById("aiSummaryContent").textContent =
        "Generating summary, please wait...";

      // Clear forms
      document.getElementById("noteContent").value = "";
      document.getElementById("medications").value = "";
      document.getElementById("instructions").value = "";

      // Refresh patient list in case a new consultation was accepted
      fetchMyPatients();
      fetchPendingConsultations(); // Also refresh pending consultations
    });
  }

  // Add Note Form Submit
  if (addNoteForm) {
    addNoteForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentSelectedPatientId) {
        showNotification("Please select a patient first.", "warning");
        return;
      }
      const noteContent = document.getElementById("noteContent").value;
      const submitBtn = addNoteForm.querySelector(".btn-primary");
      setButtonLoading(submitBtn, true);

      try {
        const res = await fetch(
          `${backendURL}/api/doctor/patient/${currentSelectedPatientId}/notes`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: token,
            },
            body: JSON.stringify({ content: noteContent }),
          }
        );
        const data = await res.json();
        if (res.ok) {
          showNotification(data.message, "success");
          addNoteForm.reset();
          await fetchPatientNotesForDoctor(currentSelectedPatientId); // Refresh notes
        } else {
          showNotification(data.error || "Failed to add note.", "error");
        }
      } catch (err) {
        console.error("Add note error:", err);
        showNotification("Network error. Could not add note.", "error");
      } finally {
        setButtonLoading(submitBtn, false);
      }
    });
  }

  // Create Prescription Form Submit
  if (createPrescriptionForm) {
    createPrescriptionForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentSelectedPatientId) {
        showNotification("Please select a patient first.", "warning");
        return;
      }
      const medications = document.getElementById("medications").value;
      const instructions = document.getElementById("instructions").value;
      const submitBtn = createPrescriptionForm.querySelector(".btn-secondary");
      setButtonLoading(submitBtn, true);

      try {
        const res = await fetch(
          `${backendURL}/api/doctor/patient/${currentSelectedPatientId}/prescriptions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: token,
            },
            body: JSON.stringify({ medications, instructions }),
          }
        );
        const data = await res.json();
        if (res.ok) {
          showNotification(data.message, "success");
          createPrescriptionForm.reset();
          // No need to refresh a list here, prescriptions are for patients
        } else {
          showNotification(
            data.error || "Failed to issue prescription.",
            "error"
          );
        }
      } catch (err) {
        console.error("Issue prescription error:", err);
        showNotification(
          "Network error. Could not issue prescription.",
          "error"
        );
      } finally {
        setButtonLoading(submitBtn, false);
      }
    });
  }

  // Generate Summary Button
  if (generateSummaryBtn) {
    generateSummaryBtn.addEventListener("click", async () => {
      if (!currentSelectedPatientId) {
        showNotification("Please select a patient first.", "warning");
        return;
      }
      const summaryBox = document.getElementById("aiSummaryBox");
      const summaryContent = document.getElementById("aiSummaryContent");
      summaryBox.classList.remove("hidden");
      summaryContent.textContent = "Generating summary, please wait...";
      setButtonLoading(generateSummaryBtn, true);

      try {
        const res = await fetch(
          `${backendURL}/api/doctor/patient/${currentSelectedPatientId}/summary`,
          {
            headers: { Authorization: token },
          }
        );
        const data = await res.json();
        if (res.ok) {
          summaryContent.textContent = data.summary || "No summary generated.";
          showNotification("Health summary generated.", "success");
        } else {
          summaryContent.textContent =
            data.error || "Failed to generate summary.";
          showNotification(
            data.error || "Failed to generate summary.",
            "error"
          );
        }
      } catch (err) {
        console.error("Generate summary error:", err);
        summaryContent.textContent =
          "Network error or server issue while generating summary.";
        showNotification("Network error. Could not generate summary.", "error");
      } finally {
        setButtonLoading(generateSummaryBtn, false);
      }
    });
  }

  // Search My Patients
  if (searchMyPatientBtn) {
    searchMyPatientBtn.addEventListener("click", async () => {
      const query = doctorPatientSearchInput.value.trim();
      const myPatientsList = document.getElementById("myPatientsList");
      if (!query) {
        await fetchMyPatients(); // If search is empty, show all
        return;
      }

      myPatientsList.innerHTML =
        '<p class="loading-text">Searching patients...</p>';
      setButtonLoading(searchMyPatientBtn, true);

      try {
        const res = await fetch(
          `${backendURL}/api/doctor/my-patients?search=${encodeURIComponent(
            query
          )}`,
          {
            headers: { Authorization: token },
          }
        );
        const patients = await res.json();

        if (res.ok && patients.length > 0) {
          displayDoctorPatients(patients, myPatientsList);
        } else if (res.ok && patients.length === 0) {
          myPatientsList.innerHTML =
            '<p class="loading-text">No patients found matching your search among your consulted patients.</p>';
        } else {
          myPatientsList.innerHTML = `<p class="error-text">${
            patients.error || "Failed to search patients."
          }</p>`;
        }
      } catch (err) {
        console.error("Doctor patient search error:", err);
        myPatientsList.innerHTML =
          '<p class="error-text">Network error during patient search.</p>';
      } finally {
        setButtonLoading(searchMyPatientBtn, false);
      }
    });
  }
}

async function fetchPendingConsultations() {
  const pendingConsultationsList = document.getElementById(
    "pendingConsultationsList"
  );
  if (!pendingConsultationsList) return;
  pendingConsultationsList.innerHTML =
    '<p class="loading-text">Loading pending requests...</p>';
  try {
    const res = await fetch(`${backendURL}/api/consultations/pending`, {
      headers: { Authorization: token },
    });
    const requests = await res.json();
    if (res.ok && requests.length > 0) {
      pendingConsultationsList.innerHTML = requests
        .map(
          (req) => `
                <div class="consultation-request-item">
                    <span>Patient: <strong>${req.name}</strong> (${
            req.email
          })</span>
                    <span class="consultation-date">${new Date(
                      req.createdAt
                    ).toLocaleDateString()}</span>
                    <div>
                        <button class="btn btn-primary btn-sm accept-consult-btn" data-patient-id="${
                          req._id
                        }">Accept</button>
                        <button class="btn btn-outline btn-sm reject-consult-btn" data-patient-id="${
                          req._id
                        }">Reject</button>
                    </div>
                </div>
            `
        )
        .join("");

      document.querySelectorAll(".accept-consult-btn").forEach((button) => {
        button.addEventListener("click", (e) =>
          handleConsultationResponse(
            e.target.dataset.patientId,
            "accept",
            e.target
          )
        );
      });
      document.querySelectorAll(".reject-consult-btn").forEach((button) => {
        button.addEventListener("click", (e) =>
          handleConsultationResponse(
            e.target.dataset.patientId,
            "reject",
            e.target
          )
        );
      });
    } else if (res.ok && requests.length === 0) {
      pendingConsultationsList.innerHTML =
        '<p class="loading-text">No pending consultation requests.</p>';
    } else {
      pendingConsultationsList.innerHTML = `<p class="error-text">Error loading requests: ${
        requests.error || "Unknown error"
      }</p>`;
    }
  } catch (err) {
    console.error("Error fetching pending consultations:", err);
    pendingConsultationsList.innerHTML =
      '<p class="error-text">Network error loading requests.</p>';
  }
}

async function handleConsultationResponse(patientId, action, buttonElement) {
  setButtonLoading(buttonElement, true);
  try {
    const res = await fetch(
      `${backendURL}/api/consultations/respond/${patientId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({ action }),
      }
    );
    const data = await res.json();
    if (res.ok) {
      showNotification(data.message, "success");
      await fetchPendingConsultations(); // Refresh pending list
      await fetchMyPatients(); // Refresh my patients list
    } else {
      showNotification(data.error || `Failed to ${action} request.`, "error");
    }
  } catch (err) {
    console.error(`Error ${action}ing consultation:`, err);
    showNotification(`Network error. Could not ${action} request.`, "error");
  } finally {
    setButtonLoading(buttonElement, false);
  }
}

async function fetchMyPatients() {
  const myPatientsList = document.getElementById("myPatientsList");
  if (!myPatientsList) return;
  myPatientsList.innerHTML =
    '<p class="loading-text">Loading your patients...</p>';
  try {
    const res = await fetch(`${backendURL}/api/doctor/my-patients`, {
      headers: { Authorization: token },
    });
    const patients = await res.json();
    if (res.ok) {
      displayDoctorPatients(patients, myPatientsList);
    } else {
      myPatientsList.innerHTML = `<p class="error-text">Error loading patients: ${
        patients.error || "Unknown error"
      }</p>`;
    }
  } catch (err) {
    console.error("Error fetching my patients:", err);
    myPatientsList.innerHTML =
      '<p class="error-text">Network error loading patients.</p>';
  }
}

function displayDoctorPatients(patients, container) {
  if (patients.length === 0) {
    container.innerHTML =
      '<p class="loading-text">No patients linked to your account yet.</p>';
    return;
  }
  container.innerHTML =
    "<h4>Your current patients:</h4>" +
    patients
      .map(
        (patient) => `
        <div class="record-item">
            <span><strong>Name:</strong> ${patient.name}</span>
            <span><strong>Email:</strong> ${patient.email}</span>
            <button class="btn btn-secondary btn-sm view-doctor-patient-btn" data-patient-id="${patient._id}" data-patient-name="${patient.name}">View Details</button>
        </div>
    `
      )
      .join("");

  document.querySelectorAll(".view-doctor-patient-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const id = e.target.dataset.patientId;
      const name = e.target.dataset.patientName;
      displayPatientDetailsForDoctor(id, name);
    });
  });
}

async function displayPatientDetailsForDoctor(patientId, patientName) {
  currentSelectedPatientId = patientId;
  const patientDetailsCard = document.getElementById("patientDetailsCard");
  const currentPatientNameSpan = document.getElementById("currentPatientName");

  if (patientDetailsCard && currentPatientNameSpan) {
    currentPatientNameSpan.textContent = patientName;
    patientDetailsCard.classList.remove("hidden");
    // Scroll to the patient details section
    patientDetailsCard.scrollIntoView({ behavior: "smooth", block: "start" });

    // Hide summary box initially
    document.getElementById("aiSummaryBox").classList.add("hidden");
    document.getElementById("aiSummaryContent").textContent =
      "Generating summary, please wait...";

    // Clear forms
    document.getElementById("noteContent").value = "";
    document.getElementById("medications").value = "";
    document.getElementById("instructions").value = "";

    // Fetch and display vitals, files, and notes for the selected patient
    await fetchPatientVitalsForDoctor(patientId);
    await fetchPatientFilesForDoctor(patientId);
    await fetchPatientNotesForDoctor(patientId);
  }
}

async function fetchPatientVitalsForDoctor(patientId) {
  const patientVitalsList = document.getElementById("doctorPatientVitalsList");
  if (!patientVitalsList) return;
  patientVitalsList.innerHTML = '<p class="loading-text">Loading vitals...</p>';
  try {
    const res = await fetch(
      `${backendURL}/api/doctor/patient/${patientId}/vitals`,
      {
        headers: { Authorization: token },
      }
    );
    const vitals = await res.json();
    if (res.ok) {
      displayVitals(vitals, patientVitalsList); // Reuse displayVitals function
      doctorBpChartInstance = updateChart(
        "doctorBpChart",
        doctorBpChartInstance,
        vitals,
        "Systolic BP",
        "#4a90e2",
        "BP (mmHg)"
      );
      doctorSugarChartInstance = updateChart(
        "doctorSugarChart",
        doctorSugarChartInstance,
        vitals,
        "Sugar Level",
        "#50e3c2",
        "Sugar (mg/dL)"
      );
      doctorHrChartInstance = updateChart(
        "doctorHrChart",
        doctorHrChartInstance,
        vitals,
        "Heart Rate",
        "#ff7d7d",
        "Heart Rate (bpm)"
      );
    } else {
      patientVitalsList.innerHTML = `<p class="error-text">Error loading vitals: ${
        vitals.error || "Unknown error"
      }</p>`;
    }
  } catch (err) {
    console.error("Error fetching doctor patient vitals:", err);
    patientVitalsList.innerHTML =
      '<p class="error-text">Network error loading vitals.</p>';
  }
}

async function fetchPatientFilesForDoctor(patientId) {
  const patientFilesList = document.getElementById("doctorPatientFilesList");
  if (!patientFilesList) return;
  patientFilesList.innerHTML = '<p class="loading-text">Loading files...</p>';
  try {
    const res = await fetch(
      `${backendURL}/api/doctor/patient/${patientId}/files`,
      {
        headers: { Authorization: token },
      }
    );
    const files = await res.json();
    if (res.ok) {
      displayFiles(files, patientFilesList); // Reuse displayFiles function
    } else {
      patientFilesList.innerHTML = `<p class="error-text">Error loading files: ${
        files.error || "Unknown error"
      }</p>`;
    }
  } catch (err) {
    console.error("Error fetching doctor patient files:", err);
    patientFilesList.innerHTML =
      '<p class="error-text">Network error loading files.</p>';
  }
}

async function fetchPatientNotesForDoctor(patientId) {
  const patientNotesList = document.getElementById("doctorPatientNotesList");
  if (!patientNotesList) return;
  patientNotesList.innerHTML = '<p class="loading-text">Loading notes...</p>';
  try {
    const res = await fetch(
      `${backendURL}/api/doctor/patient/${patientId}/notes`,
      {
        headers: { Authorization: token },
      }
    );
    const notes = await res.json();
    if (res.ok) {
      if (notes.length === 0) {
        patientNotesList.innerHTML =
          '<p class="loading-text">No notes for this patient yet.</p>';
        return;
      }
      patientNotesList.innerHTML = notes
        .map(
          (note) => `
                <div class="record-item">
                    <span><strong>Note:</strong> ${note.content}</span>
                    <span><strong>From:</strong> Dr. ${
                      note.doctorId ? note.doctorId.name : "Unknown"
                    }</span>
                    <span class="record-date">${new Date(
                      note.createdAt
                    ).toLocaleString()}</span>
                </div>
            `
        )
        .join("");
    } else {
      patientNotesList.innerHTML = `<p class="error-text">Error loading notes: ${
        notes.error || "Unknown error"
      }</p>`;
    }
  } catch (err) {
    console.error("Error fetching doctor patient notes:", err);
    patientNotesList.innerHTML =
      '<p class="error-text">Network error loading notes.</p>';
  }
}
