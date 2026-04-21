

import nodemailer from "nodemailer";

export async function sendUnansweredEmail(question) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false, // 587 → false
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      debug: true,   
      logger: true, 
    });

    console.log("📧 Sending email...");

    const info = await transporter.sendMail({
      from: `Chatbot <${process.env.EMAIL_USER}>`,
      // to: "info@antheminfotech.com", 
    to: "priyanka@antheminfotech.com",
      subject: "Unanswered Chatbot Query",
     html: `
  <div style="font-family: Arial, sans-serif; background:#f6f8fb; padding:20px;">
    
    <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <div style="background:#0f172a; padding:20px; text-align:center;">
        <div style="font-size:40px;">🤖</div>
        <h2 style="color:#ffffff; margin-top:10px;">AI Chatbot Alert</h2>
      </div>

      <!-- Body -->
      <div style="padding:20px;">
        <p style="font-size:16px; color:#333;">
          ⚠️ The chatbot could not answer the following user query:
        </p>

        <div style="background:#f1f5f9; padding:15px; border-radius:8px; margin:15px 0;">
          <strong>💬 Question:</strong><br/>
          <span style="color:#111;">${question}</span>
        </div>

        <p style="font-size:14px; color:#555;">
          Please review this query and update the knowledge base if required.
        </p>

        <p style="font-size:13px; color:#888; margin-top:20px;">
          ⏰ ${new Date().toLocaleString()}
        </p>
      </div>

      <!-- Footer -->
      <div style="background:#f9fafb; padding:15px; text-align:center; font-size:12px; color:#888;">
        📩 Generated automatically by AI Assistant <br/>
        © ${new Date().getFullYear()} Anthem Infotech
      </div>

    </div>
  </div>
`,
    });

    console.log("✅ Email sent:", info.response);

  } catch (error) {
    console.error("❌ Email error:", error.message);
  }
}