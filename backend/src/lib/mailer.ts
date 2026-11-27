import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    ciphers: "SSLv3",
    rejectUnauthorized: false,
  },
});

const baseTemplate = (headerColor: string, headerLabel: string, content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f0f4f8; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">

          <!-- Top accent bar -->
          <tr>
            <td style="background: linear-gradient(90deg, #0EA5E9, #0b2c4a); height: 5px; border-radius: 8px 8px 0 0;"></td>
          </tr>

          <!-- Logo header -->
          <tr>
            <td style="background: #0b2c4a; padding: 36px 48px;">
              <p style="margin:0; color:#0EA5E9; font-size:20px; font-weight:700; letter-spacing:2px;">DEE PIPING SYSTEM</p>
              <p style="margin:6px 0 0; color:rgba(255,255,255,0.45); font-size:12px;">INHOUSE TRAVEL MANAGEMENT PLATFORM</p>
            </td>
          </tr>

          <!-- Colored status bar -->
          <tr>
            <td style="background:${headerColor}; padding: 18px 48px;">
              <p style="margin:0; color:#ffffff; font-size:16px; font-weight:600;">${headerLabel}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff; padding: 48px;">
              ${content}
              <p style="margin:32px 0 0; color:#94a3b8; font-size:13px; text-align:center;">
                This is an automated email, please do not reply.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0b2c4a; padding:24px 48px; border-radius:0 0 8px 8px;">
              <p style="margin:0; color:#0EA5E9; font-size:13px; font-weight:600;">DEE PIPING SYSTEM</p>
              <p style="margin:4px 0 0; color:rgba(255,255,255,0.3); font-size:11px;">Inhouse Travel Management Platform</p>
            </td>
          </tr>

          <!-- Bottom accent bar -->
          <tr>
            <td style="background: linear-gradient(90deg, #0b2c4a, #0EA5E9); height:4px; border-radius:0 0 8px 8px;"></td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const detailsTable = (rows: { label: string; value: string }[]) => `
<table width="100%" cellpadding="0" cellspacing="0"
  style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; margin-bottom:32px;">
  <tr>
    <td style="padding:20px 24px; border-bottom:1px solid #e2e8f0;">
      <p style="margin:0; color:#94a3b8; font-size:11px; text-transform:uppercase; letter-spacing:1px; font-weight:600;">
        Travel Request Details
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:20px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${rows.map((r, i) => `
        <tr>
          <td style="padding:8px 0; ${i < rows.length - 1 ? "border-bottom:1px solid #f1f5f9;" : ""}">
            <span style="color:#64748b; font-size:13px;">${r.label}</span>
          </td>
          <td align="right" style="padding:8px 0; ${i < rows.length - 1 ? "border-bottom:1px solid #f1f5f9;" : ""}">
            <span style="color:#0f172a; font-size:13px; font-weight:600;">${r.value}</span>
          </td>
        </tr>`).join("")}
      </table>
    </td>
  </tr>
</table>
`;

const ctaButton = (label: string) => `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
  <tr>
    <td align="center">
      <a href="${process.env.APP_URL || "http://localhost:5173"}"
         style="display:inline-block; background:#0b2c4a; color:#ffffff;
                padding:16px 48px; border-radius:8px; font-size:15px;
                font-weight:600; text-decoration:none;">
        ${label} →
      </a>
    </td>
  </tr>
</table>
`;

// ─── 1. Account Approved ────────────────────────────────────────────────────
export const sendApprovalEmail = async (email: string, name: string) => {
  const content = `
    <h2 style="margin:0 0 24px; color:#0b2c4a; font-size:26px; font-weight:700;">Hello, ${name} </h2>
    <p style="margin:0 0 24px; color:#475569; font-size:15px; line-height:1.8;">
      Your account has been <strong style="color:#16a34a;">approved</strong> by the administrator.
      You now have full access to the DEE Piping System Travel Management Platform.
    </p>
    ${ctaButton("Login to DEE TravelFlow")}
  `;
  await transporter.sendMail({
    from: `"DEE TravelFlow" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "✅ Your Account Has Been Approved — DEE TravelFlow",
    html: baseTemplate("#16a34a", " Account Successfully Approved", content),
  });
  console.log(` Approval email sent to ${email}`);
};

// ─── 2. HOD Approved → Email Employee ──────────────────────────────────────
export const sendHodApprovedEmployee = async (
  employeeEmail: string,
  employeeName: string,
  route: string,
  fromDate: string,
  toDate: string,
  hodName: string,
  department: string,
) => {
  const content = `
    <h2 style="margin:0 0 24px; color:#0b2c4a; font-size:26px; font-weight:700;">Hello, ${employeeName} 👋</h2>
    <p style="margin:0 0 24px; color:#475569; font-size:15px; line-height:1.8;">
      Your travel request has been <strong style="color:#16a34a;">approved by your HOD</strong> 
      and has been forwarded to the Director for final approval.
    </p>
    ${detailsTable([
      { label: "Route",       value: route },
      { label: "Travel Dates", value: `${fromDate} – ${toDate}` },
      { label: "Department",  value: department },
      { label: "Approved By", value: `${hodName} (HOD)` },
      { label: "Next Step",   value: "Pending Director Approval" },
    ])}
    ${ctaButton("Track My Request")}
  `;
  await transporter.sendMail({
    from: `"DEE TravelFlow" <${process.env.EMAIL_USER}>`,
    to: employeeEmail,
    subject: "✅ HOD Approved Your Travel Request — DEE TravelFlow",
    html: baseTemplate("#16a34a", "✅ HOD Approved Your Travel Request", content),
  });
  console.log(`✅ HOD approval email sent to ${employeeEmail}`);
};

// ─── 3. HOD Approved → Email Director ──────────────────────────────────────
export const sendHodApprovedDirector = async (
  directorEmail: string,
  directorName: string,
  employeeName: string,
  route: string,
  fromDate: string,
  toDate: string,
  hodName: string,
  hodComment: string,
  department: string,
) => {
  const content = `
    <h2 style="margin:0 0 24px; color:#0b2c4a; font-size:26px; font-weight:700;">Hello, ${directorName} 👋</h2>
    <p style="margin:0 0 24px; color:#475569; font-size:15px; line-height:1.8;">
      A travel request has been <strong style="color:#0b2c4a;">approved by the HOD</strong> 
      and requires your review and approval.
    </p>
    ${detailsTable([
      { label: "Employee",    value: employeeName },
      { label: "Department",  value: department },
      { label: "Route",       value: route },
      { label: "Travel Dates", value: `${fromDate} – ${toDate}` },
      { label: "HOD",         value: hodName },
      { label: "HOD Comment", value: hodComment || "No comment" },
    ])}
    ${hodComment ? `
    <div style="background:#fef3c7; border-left:4px solid #f59e0b; padding:12px 16px; border-radius:4px; margin-bottom:24px;">
      <p style="margin:0; color:#92400e; font-size:13px; font-weight:600;">HOD Comment</p>
      <p style="margin:4px 0 0; color:#78350f; font-size:14px;">${hodComment}</p>
    </div>` : ""}
    ${ctaButton("Review & Approve Request")}
  `;
  await transporter.sendMail({
    from: `"DEE TravelFlow" <${process.env.EMAIL_USER}>`,
    to: directorEmail,
    subject: `📋 Travel Request Needs Your Approval — ${employeeName}`,
    html: baseTemplate("#1d4ed8", "📋 Travel Request Awaiting Your Approval", content),
  });
  console.log(`✅ Director approval request email sent to ${directorEmail}`);
};

// ─── 4. Director Approved → Email Employee ──────────────────────────────────
export const sendDirectorApprovedEmployee = async (
  employeeEmail: string,
  employeeName: string,
  route: string,
  fromDate: string,
  toDate: string,
  directorName: string,
  department: string,
) => {
  const content = `
    <h2 style="margin:0 0 24px; color:#0b2c4a; font-size:26px; font-weight:700;">Hello, ${employeeName} 👋</h2>
    <p style="margin:0 0 24px; color:#475569; font-size:15px; line-height:1.8;">
      Great news! Your travel request has been <strong style="color:#16a34a;">approved by the Director</strong>. 
      The Travel Manager will now process your travel arrangements.
    </p>
    ${detailsTable([
      { label: "Route",        value: route },
      { label: "Travel Dates", value: `${fromDate} – ${toDate}` },
      { label: "Department",   value: department },
      { label: "Approved By",  value: `${directorName} (Director)` },
      { label: "Next Step",    value: "Travel Manager Processing" },
    ])}
    ${ctaButton("Track My Request")}
  `;
  await transporter.sendMail({
    from: `"DEE TravelFlow" <${process.env.EMAIL_USER}>`,
    to: employeeEmail,
    subject: " Director Approved Your Travel Request — DEE TravelFlow",
    html: baseTemplate("#16a34a", " Director Approved Your Travel Request", content),
  });
  console.log(` Director approval email sent to ${employeeEmail}`);
};

// ─── 5. Director Approved → Email Travel Manager ────────────────────────────
export const sendDirectorApprovedManager = async (
  managerEmail: string,
  managerName: string,
  employeeName: string,
  route: string,
  fromDate: string,
  toDate: string,
  department: string,
  accommodation: boolean,
) => {
  const content = `
    <h2 style="margin:0 0 24px; color:#0b2c4a; font-size:26px; font-weight:700;">Hello, ${managerName} </h2>
    <p style="margin:0 0 24px; color:#475569; font-size:15px; line-height:1.8;">
      A travel request has been <strong style="color:#0b2c4a;">fully approved</strong> and is ready 
      for you to process travel arrangements.
    </p>
    ${detailsTable([
      { label: "Employee",      value: employeeName },
      { label: "Department",    value: department },
      { label: "Route",         value: route },
      { label: "Travel Dates",  value: `${fromDate} – ${toDate}` },
      { label: "Accommodation", value: accommodation ? "Required" : "Not Required" },
    ])}
    ${accommodation ? `
    <div style="background:#eff6ff; border-left:4px solid #3b82f6; padding:12px 16px; border-radius:4px; margin-bottom:24px;">
      <p style="margin:0; color:#1e40af; font-size:14px; font-weight:600;">🛏️ Accommodation Required</p>
      <p style="margin:4px 0 0; color:#1e3a8a; font-size:13px;">Please arrange hotel accommodation for this employee.</p>
    </div>` : ""}
    ${ctaButton("Process Travel Request")}
  `;
  await transporter.sendMail({
    from: `"DEE TravelFlow" <${process.env.EMAIL_USER}>`,
    to: managerEmail,
    subject: `🎫 New Travel Request Ready for Processing — ${employeeName}`,
    html: baseTemplate("#0369a1", "🎫 Travel Request Ready for Processing", content),
  });
  console.log(` Travel manager processing email sent to ${managerEmail}`);
};

// ─── 6. Travel Manager Approved → Email Employee ────────────────────────────
export const sendManagerApprovedEmployee = async (
  employeeEmail: string,
  employeeName: string,
  route: string,
  fromDate: string,
  toDate: string,
  managerName: string,
  managerComment: string,
) => {
  const content = `
    <h2 style="margin:0 0 24px; color:#0b2c4a; font-size:26px; font-weight:700;">Hello, ${employeeName} 🎉</h2>
    <p style="margin:0 0 24px; color:#475569; font-size:15px; line-height:1.8;">
      Your travel request has been <strong style="color:#16a34a;">fully approved and processed</strong> 
      by the Travel Manager. Your ticket will be available in the portal shortly.
    </p>
    ${detailsTable([
      { label: "Route",        value: route },
      { label: "Travel Dates", value: `${fromDate} – ${toDate}` },
      { label: "Processed By", value: `${managerName} (Travel Manager)` },
      { label: "Status",       value: "Fully Approved " },
    ])}
    ${managerComment ? `
    <div style="background:#f0fdf4; border-left:4px solid #22c55e; padding:12px 16px; border-radius:4px; margin-bottom:24px;">
      <p style="margin:0; color:#15803d; font-size:13px; font-weight:600;">Travel Arrangements</p>
      <p style="margin:4px 0 0; color:#14532d; font-size:14px;">${managerComment}</p>
    </div>` : ""}
    ${ctaButton("View My Ticket")}
  `;
  await transporter.sendMail({
    from: `"DEE TravelFlow" <${process.env.EMAIL_USER}>`,
    to: employeeEmail,
    subject: "🎉 Your Travel Request is Fully Approved — DEE TravelFlow",
    html: baseTemplate("#16a34a", "🎉 Travel Request Fully Approved!", content),
  });
  console.log(`✅ Final approval email sent to ${employeeEmail}`);
};

// ─── 7. Rejected → Email Employee ───────────────────────────────────────────
export const sendRejectedEmployee = async (
  employeeEmail: string,
  employeeName: string,
  route: string,
  fromDate: string,
  toDate: string,
  rejectedBy: string,
  rejectedByRole: string,
  comment: string,
) => {
  const content = `
    <h2 style="margin:0 0 24px; color:#0b2c4a; font-size:26px; font-weight:700;">Hello, ${employeeName}</h2>
    <p style="margin:0 0 24px; color:#475569; font-size:15px; line-height:1.8;">
      Unfortunately, your travel request has been <strong style="color:#dc2626;">rejected</strong>. 
      Please review the reason below and contact your manager if you have any questions.
    </p>
    ${detailsTable([
      { label: "Route",        value: route },
      { label: "Travel Dates", value: `${fromDate} – ${toDate}` },
      { label: "Rejected By",  value: `${rejectedBy} (${rejectedByRole})` },
    ])}
    ${comment ? `
    <div style="background:#fef2f2; border-left:4px solid #ef4444; padding:12px 16px; border-radius:4px; margin-bottom:24px;">
      <p style="margin:0; color:#991b1b; font-size:13px; font-weight:600;">Reason for Rejection</p>
      <p style="margin:4px 0 0; color:#7f1d1d; font-size:14px;">${comment}</p>
    </div>` : ""}
    ${ctaButton("Submit New Request")}
  `;
  await transporter.sendMail({
    from: `"DEE TravelFlow" <${process.env.EMAIL_USER}>`,
    to: employeeEmail,
    subject: "❌ Travel Request Rejected — DEE TravelFlow",
    html: baseTemplate("#dc2626", "❌ Travel Request Rejected", content),
  });
  console.log(` Rejection email sent to ${employeeEmail}`);
};