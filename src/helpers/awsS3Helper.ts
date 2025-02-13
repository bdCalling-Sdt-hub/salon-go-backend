// import AWS from 'aws-sdk';
// import fs from 'fs';
// import path from 'path';

// import { StatusCodes } from 'http-status-codes';
// import ApiError from '../errors/ApiError';
// import config from '../config';

// // Initialize the S3 Client
// const s3Client = new AWS.S3({
//   accessKeyId: config.aws.access_key_id!, // Add your access key from config
//   secretAccessKey: config.aws.secret_access_key!, // Add your secret key from config
//   region: config.aws.aws_region!, // AWS region
// });

// const BUCKET_NAME = config.aws.bucket_name!;
// const AWS_REGION = config.aws.aws_region!;
// const s3_base_url = `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/`;

// class FileManager {
//   private uploadDir: string;

//   constructor() {
//     this.uploadDir = path.join(process.cwd(), 'uploads');
//   }

//   private async uploadToS3(filePath: string, s3Key: string): Promise<string> {
//     const fileStream = fs.createReadStream(filePath);

//     const params = {
//       Bucket: BUCKET_NAME,
//       Key: s3Key,
//       Body: fileStream,
//       ACL: 'public-read', // Set ACL to 'public-read' or 'private' based on your need
//     };

//     try {
//       const s3Response = await s3Client.upload(params).promise();
//       return s3Response.Location; // Return the public URL of the uploaded file
//     } catch (err) {
//       throw new ApiError(
//         StatusCodes.INTERNAL_SERVER_ERROR,
//         'Error uploading file to S3',
//       );
//     }
//   }

//   private deleteLocalFile(filePath: string): void {
//     try {
//       fs.unlinkSync(filePath); // Delete local file after upload to S3
//     } catch (err) {
//       console.error('Error deleting local file', err);
//     }
//   }

//   // Function to upload a single file
//   async uploadSingleFile(
//     file: Express.Multer.File,
//     fieldname: string,
//   ): Promise<string> {
//     const localFilePath = path.join(this.uploadDir, fieldname, file.filename);
//     const s3Key = `${fieldname}s/${Date.now()}-${file.filename}`;

//     try {
//       const s3Url = await this.uploadToS3(localFilePath, s3Key);
//       this.deleteLocalFile(localFilePath); // Delete local file after upload
//       return s3Url; // Return the URL of the uploaded file
//     } catch (err) {
//       throw new ApiError(
//         StatusCodes.INTERNAL_SERVER_ERROR,
//         'Failed to upload file',
//       );
//     }
//   }

//   // Function to upload multiple files
//   async uploadMultipleFiles(
//     files: Express.Multer.File[],
//     fieldname: string,
//   ): Promise<string[]> {
//     const uploadPromises = files.map(async (file) => {
//       const localFilePath = path.join(this.uploadDir, fieldname, file.filename);
//       const s3Key = `${fieldname}s/${Date.now()}-${file.filename}`;
//       try {
//         const s3Url = await this.uploadToS3(localFilePath, s3Key);
//         this.deleteLocalFile(localFilePath); // Delete local file after upload
//         return s3Url;
//       } catch (err) {
//         throw new ApiError(
//           StatusCodes.INTERNAL_SERVER_ERROR,
//           'Failed to upload files',
//         );
//       }
//     });

//     return await Promise.all(uploadPromises); // Resolve all promises for multiple files
//   }

//   // Function to update a file (delete old file and upload new one)
//   async updateFile(
//     oldFileUrl: string,
//     newFile: Express.Multer.File,
//     fieldname: string,
//   ): Promise<string> {
//     // Extract the file name from the old URL
//     const oldFileName = oldFileUrl.split('/').pop() || '';
//     const oldFileKey = `${fieldname}/${oldFileName}`;

//     const isDefaultImage = !oldFileUrl.includes(BUCKET_NAME);

//     if (!isDefaultImage) {
//       await this.deleteFileFromS3(oldFileKey);
//     }
//     // Upload the new file to S3 and return the new URL
//     return await this.uploadSingleFile(newFile, fieldname);
//   }

//   // Function to delete a file from S3
//   async deleteFileFromS3(fileKey: string): Promise<void> {
//     const params = {
//       Bucket: BUCKET_NAME,
//       Key: fileKey,
//     };

//     try {
//       await s3Client.deleteObject(params).promise();
//     } catch (err) {
//       throw new ApiError(
//         StatusCodes.INTERNAL_SERVER_ERROR,
//         'Error deleting file from S3',
//       );
//     }
//   }
// }

// export default FileManager;
