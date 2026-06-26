const mongoose = require('mongoose');
const config = require('./index');

async function connectDB() {
  mongoose.set('strictQuery', true);
  const conn = await mongoose.connect(config.mongoUri);
  console.log(`[db] MongoDB connected: ${conn.connection.host}`);
  return conn;
}

module.exports = connectDB;
