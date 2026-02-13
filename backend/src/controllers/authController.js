import { getConnection, sql } from '../db/mssql.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const login = async (req, res) => {
  const { usuario, password } = req.body;
  if (!usuario || !password) {
    return res.status(400).json({ message: 'Usuario y contraseña requeridos.' });
  }
  try {
    const pool = await getConnection();
    console.log('Conectado a SQL Server');
    console.log('Datos recibidos:', { usuario, password });
    const result = await pool.request()
      .input('pIdUsuario', sql.NVarChar, usuario)
      .input('pClave', sql.NVarChar, password)
      .execute('sp_ValidarUsuario');
    console.log('Resultado del SP:', result);

    // El stored procedure debe retornar un registro si es válido
    if (!result.recordset || result.recordset.length === 0) {
      return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }
    const user = result.recordset[0];
    const token = jwt.sign({ usuario: user.USUARIO || usuario }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ 
      token, 
      message: `Bienvenido: ${user.NombreEmpleado || ''}`,
      nombre: user.NombreEmpleado || '',
      usuario: user.USUARIO || usuario,
      Cuadrilla: user.Cuadrilla,
      CodEmp: user.CodEmp !== undefined ? user.CodEmp : (user.codEmp !== undefined ? user.codEmp : null),
      CodVal: user.CodVal !== undefined ? user.CodVal : null
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};
