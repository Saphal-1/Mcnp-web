// MCNP Staff Application backend
// Node.js 18+ / Express
//
// Install:
//   npm install
//
// Environment variables:
//   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
//   PORT=3000
//
// The frontend posts multipart/form-data to /api/apply.
// The document is intentionally NOT sent to Discord. Store it only in a
// secure, access-controlled location if your review process requires it.

import express from "express";
import multer from "multer";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

app.use(express.static("."));

function clean(value, max = 3000) {
  return String(value ?? "").trim().slice(0, max);
}

function ageFromDob(dob) {
  const date = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const beforeBirthday =
    now.getMonth() < date.getMonth() ||
    (now.getMonth() === date.getMonth() && now.getDate() < date.getDate());
  if (beforeBirthday) age--;
  return age;
}

app.post("/api/apply", upload.single("verificationDocument"), async (req, res) => {
  try {
    const webhook = process.env.DISCORD_WEBHOOK_URL;
    if (!webhook) return res.status(500).json({ success: false, message: "Application service is not configured." });

    const departments = Array.isArray(req.body.departments)
      ? req.body.departments
      : req.body.departments ? [req.body.departments] : [];

    if (!departments.length) return res.status(400).json({ success: false, message: "Select at least one department." });

    const dob = clean(req.body.dateOfBirth, 20);
    const age = ageFromDob(dob);
    if (age === null || age < 0 || age > 100) {
      return res.status(400).json({ success: false, message: "Please provide a valid date of birth." });
    }

    const hasDocument = Boolean(req.file);

    const fields = [
      ["Discord", clean(req.body.discordUsername, 100)],
      ["Minecraft", clean(req.body.mcUsername, 50)],
      ["Email", clean(req.body.email, 150)],
      ["Contact", clean(req.body.phone, 40)],
      ["Age", clean(req.body.age, 10)],
      ["Date of birth", dob],
      ["Verified age from DOB", String(age)],
      ["Verification method", clean(req.body.verificationMethod, 100)],
      ["Document uploaded", hasDocument ? `Yes — ${req.file.originalname}` : "No"],
      ["MCNP duration", clean(req.body.duration, 100)],
      ["Departments", departments.join(", ")],
      ["Why department", clean(req.body.whyDepartment)],
      ["Previous staff experience", clean(req.body.hasExperience, 50)],
      ["Experience details", clean(req.body.experienceDetails)],
      ["Skills", clean(req.body.skills)],
      ["Activity", clean(req.body.activity, 100)],
      ["Q13 — rule violation", clean(req.body.q11)],
      ["Q14 — chat argument", clean(req.body.q12)],
      ["Q15 — staff mistake", clean(req.body.q13)],
      ["Weekly hours", clean(req.body.weeklyHours, 50)],
      ["Why select", clean(req.body.whySelect)],
      ["Extra info", clean(req.body.extraInfo)]
    ];

    const embed = {
      title: "🛡️ New MCNP Staff Application",
      description: "A new application has been submitted through the official staff application form.",
      color: 0x7c5cff,
      fields: fields.map(([name, value]) => ({
        name: name.slice(0, 256),
        value: (value || "Not provided").slice(0, 1024),
        inline: name.length < 25
      })),
      footer: { text: "MCNP Staff Applications • Automated Intake" },
      timestamp: new Date().toISOString()
    };

    const discordResponse = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "MCNP Applications", embeds: [embed] })
    });

    if (!discordResponse.ok) {
      console.error("Discord webhook failed:", await discordResponse.text());
      return res.status(502).json({ success: false, message: "Application notification could not be delivered." });
    }

    // TODO: Securely store req.file.buffer if your verification workflow requires it.
    // Do not log the file, expose it publicly, or send identity documents to Discord.

    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Unexpected server error." });
  }
});

app.listen(port, () => console.log(`MCNP application server running on port ${port}`));
