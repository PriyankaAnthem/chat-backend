
// import dotenv from "dotenv";
// dotenv.config();
// import sql from "mssql";

// const config = {
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   server: String(process.env.DB_SERVER), // force string
//   database: process.env.DB_NAME,
//   port: 1433, // 🔥 IMPORTANT for Site4Now

//   options: {
//     encrypt: true,
//     trustServerCertificate: true,
//   },

//   pool: {
//     max: 5,
//     min: 0,
//     idleTimeoutMillis: 30000,
//   },
// };

// let pool;

// export const getConnection = async () => {
//   try {
//     if (!pool) {
//       console.log("Connecting to:", config.server);
//       pool = await sql.connect(config);
//       console.log("✅ DB Connected");
//     }
//     return pool;
//   } catch (err) {
//     console.error("❌ DB Connection Error:", err);
//     throw err;
//   }
// };


import sql from "mssql";

const config = {
  user: process.env.DB_USER ?? "",
  password: process.env.DB_PASSWORD ?? "",
  server: process.env.DB_SERVER ?? "",
  database: process.env.DB_NAME ?? "",
  port: 1433,
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
      // ✅ Temporary debug — remove after fixing
      console.log("🔍 DB CONFIG CHECK:", {
        server: config.server,
        database: config.database,
        user: config.user,
        hasPassword: !!config.password,
        passwordLength: config.password?.length,
      });

      pool = await sql.connect(config);
      console.log("✅ DB Connected");
    }
    return pool;
  } catch (err) {
    console.error("❌ DB Connection Error:", err);
    throw err;
  }
};