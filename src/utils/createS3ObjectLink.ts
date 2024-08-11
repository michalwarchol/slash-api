export const createS3ObjectLink = (bucket: string, key: string) =>
  `https://${bucket}.s3.amazonaws.com/${key}`;
