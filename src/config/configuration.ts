export default () => ({
  port: parseInt(process.env.APP_PORT, 10) || 4000,
  nodeEnv: process.env.NODE_ENV,
  database: {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    name: process.env.MYSQL_DATABASE,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRE,
  },
  aws: {
    region: process.env.AWS_REGION,
    videoBucketName: process.env.AWS_VIDEO_BUCKET_NAME,
    utilityBucketName: process.env.AWS_UTILITY_BUCKET_NAME,
  },
  mailersend: {
    apiKey: process.env.MAILERSEND_API_KEY,
    mail: process.env.MAILERSEND_MAIL,
  },
});
