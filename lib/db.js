
import dotenv from "dotenv";
dotenv.config();
import sql from "mssql";

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: String(process.env.DB_SERVER), // force string
  database: process.env.DB_NAME,
  port: 1433, // 🔥 IMPORTANT for Site4Now

  options: {
    encrypt: true,
    trustServerCertificate: true,
  },

  pool: {
    max: 5,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool;

export const getConnection = async () => {
  try {
    if (!pool) {
      console.log("Connecting to:", config.server);
      pool = await sql.connect(config);
      console.log("✅ DB Connected");
    }
    return pool;
  } catch (err) {
    console.error("❌ DB Connection Error:", err);
    throw err;
  }
};