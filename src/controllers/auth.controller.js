const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

// Auxiliar para generar Tokens JWT
const generateToken = (user, roles) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            roles: roles,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
};

// 1. REGISTRO DE USUARIO
const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        const fullName = `${firstName} ${lastName}`;

        // Verificar si el usuario ya existe
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                status: 'fail',
                message: 'El correo electrónico ya está registrado',
            });
        }

        // Buscar el rol por defecto (USER)
        const defaultRole = await prisma.role.findUnique({ where: { name: 'USER' } });
        if (!defaultRole) {
            return res.status(500).json({
                status: 'error',
                message: 'El rol por defecto (USER) no existe en la base de datos',
            });
        }

        // Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Crear el usuario y asignarle el rol USER en una transacción implícita
        const newUser = await prisma.user.create({
            data: {
                email,
                password: passwordHash, // Usamos la columna 'password' del schema
                name: fullName,         // Usamos la columna 'name' del schema
                roles: {
                    create: {
                        roleId: defaultRole.id,
                    },
                },
            },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
            },
        });

        // Generar Token
        const token = generateToken(newUser, ['USER']);

        return res.status(201).json({
            status: 'success',
            message: 'Usuario registrado correctamente',
            data: {
                user: newUser,
                token,
            },
        });
    } catch (error) {
        console.error('Error en registro:', error);
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
};

// 2. INICIO DE SESIÓN (LOGIN)
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar usuario con sus roles asociados
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
        });

        if (!user || !user.isActive) {
            return res.status(401).json({
                status: 'fail',
                message: 'Credenciales inválidas o cuenta desactivada',
            });
        }

        // Comprobar contraseña (usando user.password)
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                status: 'fail',
                message: 'Credenciales inválidas',
            });
        }

        // Extraer nombres de roles
        const userRoles = user.roles.map((ur) => ur.role.name);

        // Generar Token JWT
        const token = generateToken(user, userRoles);

        return res.status(200).json({
            status: 'success',
            message: 'Inicio de sesión exitoso',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name, // ✅ Corregido (en lugar de firstName / lastName)
                    roles: userRoles,
                },
                token,
            },
        });
    } catch (error) {
        console.error('Error en login:', error);
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
};

// 3. OBTENER USUARIO ACTUAL (VERIFICAR SESIÓN)
const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                roles: {
                    select: {
                        role: {
                            select: { name: true },
                        },
                    },
                },
            },
        });

        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'Usuario no encontrado',
            });
        }

        const userRoles = user.roles.map((ur) => ur.role.name);

        return res.status(200).json({
            status: 'success',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    roles: userRoles,
                    createdAt: user.createdAt,
                },
            },
        });
    } catch (error) {
        console.error('Error en getMe:', error);
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
};

// 4. CIERRE DE SESIÓN (LOGOUT)
const logout = async (req, res) => {
  try {
    // En arquitecturas stateless (JWT en Authorization Header), el servidor confirma
    // el cierre de sesión para que el Frontend proceda a destruir el token almacenado.
    return res.status(200).json({
      status: 'success',
      message: 'Sesión cerrada correctamente',
    });
  } catch (error) {
    console.error('Error en logout:', error);
    return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
};

module.exports = { register, login, getMe, logout };