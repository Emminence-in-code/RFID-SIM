
export const COCO_API_KEY = 'ee751d75-6408-4674-9632-b514b306b441';
export const COCO_BASE_URL = `https://coco-mailer-api.vercel.app/api/send-mail/${COCO_API_KEY}`;

interface EmailPayload {
  recipient_list: string[];
  subject: string;
  content?: string;
  is_html?: boolean;
  template_key?: number;
  context?: Record<string, any>;
}

export const sendCustomEmail = async (payload: EmailPayload) => {
  try {
    const response = await fetch(COCO_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(JSON.stringify(errorData));
    }

    return await response.json();
  } catch (error) {
    console.error("Coco Mailer Error:", error);
    // We don't block the app flow if email fails, but we log it
    throw error;
  }
};

export const sendWelcomeEmail = async (email: string, name: string, role: string) => {
  // We inject variables directly using ${} to ensure they render, 
  // rather than relying on the API's {{}} templating which might be failing.
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #4f46e5;">Welcome to RFID Portal</h1>
      </div>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Thank you for registering as a <strong>${role.toUpperCase()}</strong> on our platform.</p>
      <p>Your account has been created successfully. Please verify your email address if you haven't done so already.</p>
      
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #64748b; font-size: 14px;">Next Steps:</p>
        <ul style="color: #334155;">
          ${role === 'student' ? '<li>Complete your profile setup</li><li>Enroll in your courses</li>' : '<li>Setup your staff profile</li><li>Manage your courses</li>'}
        </ul>
      </div>

      <p style="color: #64748b; font-size: 12px; margin-top: 30px; text-align: center;">
        Sent via RFID Portal Notification System
      </p>
    </div>
  `;

  return sendCustomEmail({
    recipient_list: [email],
    subject: 'Welcome to RFID Portal',
    content: htmlContent,
    is_html: true,
    // We still pass context in case the API uses it for logging, but the content is already baked.
    context: {
      name: name,
      role: role.toUpperCase()
    }
  });
};

export const sendReportEmail = async (email: string, courseCode: string, stats: { total: number, attended: number, date: string }) => {
  const rate = Math.round((stats.attended / stats.total) * 100);
  
  const htmlContent = `
    <div style="font-family: monospace; padding: 20px; border: 1px solid #ccc;">
      <h2 style="color: #333;">Attendance Report Export</h2>
      <p><strong>Course:</strong> ${courseCode}</p>
      <p><strong>Date Generated:</strong> ${stats.date}</p>
      <hr style="border-color: #eee;"/>
      <p>Total Students Enrolled: <strong>${stats.total}</strong></p>
      <p>Students Attended: <strong>${stats.attended}</strong></p>
      <p>Attendance Rate: <strong>${rate}%</strong></p>
    </div>
  `;

  return sendCustomEmail({
    recipient_list: [email],
    subject: `Report: ${courseCode} Attendance`,
    content: htmlContent,
    is_html: true,
    context: {
      course: courseCode,
      date: stats.date,
      total: stats.total,
      attended: stats.attended,
      rate: rate
    }
  });
};

export const sendSessionStartEmail = async (emails: string[], courseName: string, lecturerName: string) => {
  const htmlContent = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">Session Started</h2>
      
      <p style="font-size: 16px;">The attendance session for <strong>${courseName}</strong> has just begun.</p>
      
      <p style="margin: 10px 0;"><strong>Lecturer:</strong> ${lecturerName}</p>
      
      <div style="background-color: #ecfdf5; color: #047857; padding: 15px; border-radius: 6px; border: 1px solid #a7f3d0; margin: 20px 0; font-weight: bold; text-align: center;">
        Please make your way to the venue immediately to sign your attendance.
      </div>
      
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 30px;">
        This is an automated notification from the RFID Portal.
      </p>
    </div>
  `;

  return sendCustomEmail({
    recipient_list: emails,
    subject: `New Session Started: ${courseName}`,
    content: htmlContent,
    is_html: true,
    context: {
      course: courseName,
      lecturer: lecturerName
    }
  });
};
