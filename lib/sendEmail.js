import nodemailer from "nodemailer";

export async function sendUnansweredEmail(question) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false, // 587 = false
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `Chatbot <${process.env.EMAIL_USER}>`,
    to: "info@antheminfotech.com", // or manager email
    subject: "Unanswered Chatbot Query",
    html: `<p><strong>User Question:</strong> ${question}</p>`,
  });
}