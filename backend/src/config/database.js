const { Sequelize } = require('sequelize');
const path = require('path');

const dialect = process.env.DB_DIALECT || 'sqlite'; // Default to sqlite so it works out of the box!

let sequelize;

if (process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('postgres://') || process.env.DATABASE_URL.startsWith('postgresql://'))) {
  // Conexión directa por URL (Recomendado para Supabase en producción)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Requerido por proveedores como Supabase
      },
      // Resolver DNS forzando IPv4 solo en Render (evita fallos ENETUNREACH de IPv6 en Render)
      lookup: process.env.RENDER ? (hostname, options, callback) => {
        require('dns').lookup(hostname, Object.assign({}, options, { family: 4 }), callback);
      } : undefined,
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    timezone: '+01:00',
    define: {
      underscored: true,
      timestamps: true,
    },
  });
} else {
  if (process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL se ha detectado pero no tiene un formato válido (debe empezar con postgres:// o postgresql://).');
  }
  if (dialect === 'sqlite') {
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: path.join(__dirname, '..', '..', 'padel_club.sqlite'),
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      define: {
        underscored: true,
        timestamps: true,
      },
    });
  } else {
    sequelize = new Sequelize(
      process.env.DB_NAME || 'padel_club',
      process.env.DB_USER || 'padel_user',
      process.env.DB_PASSWORD || 'padel_pass_2024',
      {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
          // Resolver DNS forzando IPv4 solo en Render (evita fallos ENETUNREACH de IPv6 en Render)
          lookup: process.env.RENDER ? (hostname, options, callback) => {
            require('dns').lookup(hostname, Object.assign({}, options, { family: 4 }), callback);
          } : undefined,
        },
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        timezone: '+01:00',
        pool: {
          max: 10,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
        define: {
          underscored: true,
          timestamps: true,
        },
      }
    );
  }
}

module.exports = sequelize;
