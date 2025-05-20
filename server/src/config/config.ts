export default {
  mongoURI: process.env.MONGO_URI || 'mongodb://192.168.178.99:27017/housnkuh',
  jwtSecret: process.env.JWT_SECRET || 'housnkuh_secret',
  port: process.env.PORT || 4000
};