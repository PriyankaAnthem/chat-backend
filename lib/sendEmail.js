
import nodemailer from "nodemailer";
import { getConnection} from "@/lib/db";
import sql from "mssql";

export async function sendUnansweredEmail(question) {
  let questionId = null;

  // ✅ Save to UnansweredQueries table first
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("question", sql.NVarChar(sql.MAX), question)
      .query(
        `INSERT INTO UnansweredQueries (question, status)
         OUTPUT INSERTED.id
         VALUES (@question, 'pending')`
      );
    questionId = result.recordset[0]?.id;
    console.log("✅ Saved to UnansweredQueries, id:", questionId);
  } catch (dbErr) {
    console.error("❌ DB insert error:", dbErr.message);
  }

  // ✅ Send email with Review button linking to admin panel
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
       connectionTimeout: 5000,  // ✅ 5 seconds max to connect
  greetingTimeout: 3000,    // ✅ 3 seconds max for greeting
  socketTimeout: 5000, 
    });

    const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/unanswered${
      questionId ? `?highlight=${questionId}` : ""
    }`;

    const info = await transporter.sendMail({
      from: `Chatbot <${process.env.EMAIL_USER}>`,
      to:"priyanka@antheminfotech.com",
      subject: "Unanswered Chatbot Query",
      html: `
  <div style="font-family: Arial, sans-serif; background:#f6f8fb; padding:20px;">
    <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
      <div style="background:#0f172a; padding:20px; text-align:center;">
        <div style="font-size:40px;">🤖</div>
        <h2 style="color:#ffffff; margin-top:10px;">AI Chatbot Alert</h2>
      </div>
      <div style="padding:24px;">
        <p style="font-size:16px; color:#333;">⚠️ The chatbot could not answer the following user query:</p>
        <div style="background:#f1f5f9; padding:15px; border-radius:8px; margin:15px 0;">
          <strong>💬 Question:</strong><br/>
          <span style="color:#111;">${question}</span>
        </div>
        <p style="font-size:14px; color:#555;">Please review this query and update the knowledge base.</p>

        <!-- ✅ Review Button -->
        <div style="text-align:center; margin:28px 0 16px;">
          <a href="${adminUrl}"
             style="background:#0f172a; color:#ffffff; padding:14px 32px; border-radius:8px;
                    text-decoration:none; font-size:15px; font-weight:600; display:inline-block;">
            🔍 Review &amp; Answer in Admin Panel
          </a>
        </div>

        <p style="font-size:12px; color:#888; text-align:center;">
          You will be asked to sign in with Google before accessing the panel.
        </p>
        <p style="font-size:13px; color:#888; margin-top:20px;">⏰ ${new Date().toLocaleString()}</p>
      </div>
      <div style="background:#f9fafb; padding:15px; text-align:center; font-size:12px; color:#888;">
        📩 Generated automatically by AI Assistant<br/>
        © ${new Date().getFullYear()} Anthem Infotech
      </div>
    </div>
  </div>`,
    });

    console.log("✅ Email sent:", info.response);
  } catch (err) {
    console.error("❌ Email error:", err.message);
  }
}
