import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

console.log('SQLSERVER_HOST en mssql.js:', process.env.SQLSERVER_HOST);

const config = {
  user: process.env.SQLSERVER_USER,
  password: process.env.SQLSERVER_PASSWORD,
  server: process.env.SQLSERVER_HOST,
  port: process.env.SQLSERVER_PORT ? parseInt(process.env.SQLSERVER_PORT, 10) : 1433,
  database: process.env.SQLSERVER_DB,
  options: {
    encrypt: true, // Para Azure
    trustServerCertificate: true // Para desarrollo local
  }
};

console.log('SQLSERVER_DB en mssql.js:', process.env.SQLSERVER_DB);

export const getConnection = async () => {
  try {
    const pool = await sql.connect(config);
    try {
      const r = await pool.request().query('SELECT DB_NAME() AS CurrentDB');
      console.log('Conectado a base de datos:', r.recordset?.[0]?.CurrentDB);
    } catch (e) {
      // no bloquear si la query de verificación falla
      console.warn('No se pudo verificar DB actual:', e.message);
    }
    return pool;
  } catch (err) {
    throw new Error('Error de conexión a SQL Server: ' + err.message);
  }
};

export { sql };
