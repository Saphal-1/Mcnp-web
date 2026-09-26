const form = document.getElementById("appForm");
const submitBtn = document.getElementById("submitBtn");
const progressBar = document.getElementById("progressBar");
const progressPercent = document.getElementById("progressPercent");
const progressLabel = document.getElementById("progressLabel");
const toast = document.getElementById("toast");
const uploadZone = document.getElementById("uploadZone");
const uploadInput = document.getElementById("verificationDocument");
const fileName = document.getElementById("fileName");

const sections = [...document.querySelectorAll(".card")];
const steps = [...document.querySelectorAll(".step")];

function showToast(message, type = "success") {
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.className = "toast", 4500);
}

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add("reveal");
  });
}, { threshold: 0.08 });
sections.forEach(section => observer.observe(section));

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    steps.forEach(step => step.classList.toggle("active", step.getAttribute("href") === `#${entry.target.id}`));
  });
}, { rootMargin: "-35% 0px -55% 0px", threshold: 0 });
sections.forEach(section => sectionObserver.observe(section));

function updateProgress() {
  const required = [...form.querySelectorAll("[required]")];
  const completed = required.filter(el => {
    if (el.type === "checkbox") return el.checked;
    return String(el.value || "").trim() !== "";
  }).length;
  const pct = required.length ? Math.round((completed / required.length) * 100) : 0;
  progressBar.style.width = `${pct}%`;
  progressPercent.textContent = `${pct}%`;
  progressLabel.textContent = pct >= 100 ? "Ready to submit" : pct >= 70 ? "Almost there" : pct >= 30 ? "In progress" : "Getting started";
}
form.addEventListener("input", updateProgress);
form.addEventListener("change", updateProgress);

function validateDepartments() {
  const boxes = [...form.querySelectorAll('input[name="departments"]')];
  const valid = boxes.some(box => box.checked);
  boxes.forEach(box => box.setCustomValidity(valid ? "" : "Select at least one department."));
  return valid;
}

uploadInput.addEventListener("change", () => {
  const file = uploadInput.files[0];
  if (!file) {
    fileName.textContent = "No document selected";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    uploadInput.value = "";
    fileName.textContent = "No document selected";
    showToast("The verification document must be 5 MB or smaller.", "error");
    return;
  }
  fileName.textContent = file.name;
  document.getElementById("verificationMethod").value = "Document uploaded";
  updateProgress();
});

["dragenter", "dragover"].forEach(evt => uploadZone.addEventListener(evt, e => {
  e.preventDefault();
  uploadZone.classList.add("dragging");
}));
["dragleave", "drop"].forEach(evt => uploadZone.addEventListener(evt, e => {
  e.preventDefault();
  uploadZone.classList.remove("dragging");
}));
uploadZone.addEventListener("drop", e => {
  const file = e.dataTransfer.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast("The verification document must be 5 MB or smaller.", "error");
    return;
  }
  uploadInput.files = e.dataTransfer.files;
  fileName.textContent = file.name;
  document.getElementById("verificationMethod").value = "Document uploaded";
  updateProgress();
});

form.addEventListener("submit", async e => {
  e.preventDefault();

  if (!validateDepartments() || !form.reportValidity()) {
    showToast("Please complete the required fields before submitting.", "error");
    const invalid = form.querySelector(":invalid");
    invalid?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const dob = document.getElementById("dateOfBirth").value;
  if (dob && new Date(dob) > new Date()) {
    showToast("Date of birth cannot be in the future.", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.querySelector("span").textContent = "Submitting…";

  try {
    // IMPORTANT: This endpoint must be your own backend/serverless function.
    // Never put the Discord webhook URL directly in this browser JavaScript.
    const response = await fetch("/api/apply", {
      method: "POST",
      body: new FormData(form)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
      throw new Error(result.message || "The application could not be submitted.");
    }

    form.reset();
    fileName.textContent = "No document selected";
    updateProgress();
    showToast("Application received. Thank you for applying to the MCNP Staff Team!");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    showToast(error.message || "Something went wrong. Please try again.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector("span").textContent = "Submit Application";
  }
});

updateProgress();
