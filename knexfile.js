require('dotenv').config();
module.exports = {
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgres://opsec:opsecpass@localhost:5432/opsecdb',
  migrations: {
    directory: __dirname + '/migrations'
  },
  seeds: {
    directory: __dirname + '/seeds'
  }
};
