export default () => ({
  port: parseInt(process.env.APP_PORT, 10) || 4000,
  database: {
    uri: process.env.MONGODB_URI,
  }
});