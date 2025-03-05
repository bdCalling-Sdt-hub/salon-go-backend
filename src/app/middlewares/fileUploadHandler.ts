import { Request } from 'express';
import fs from 'fs';
import { StatusCodes } from 'http-status-codes';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import ApiError from '../../errors/ApiError';
import mime from 'mime-types';

const fileUploadHandler = () => {
  //create upload folder
  const baseUploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(baseUploadDir)) {
    fs.mkdirSync(baseUploadDir);
  }

  //folder create for different file
  const createDir = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);
    }
  };

  //create filename
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      let uploadDir;
      switch (file.fieldname) {
        case 'image':
          uploadDir = path.join(baseUploadDir, 'images');
          break;
        case 'ID':
          uploadDir = path.join(baseUploadDir, 'images');
          break;
        case 'KBIS':
          uploadDir = path.join(baseUploadDir, 'images');
          break;
        case 'media':
          uploadDir = path.join(baseUploadDir, 'medias');
          break;
        case 'doc':
          uploadDir = path.join(baseUploadDir, 'docs');
          break;
        default:
          throw new ApiError(StatusCodes.BAD_REQUEST, 'File is not supported');
      }
      createDir(uploadDir);
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const fileExt = path.extname(file.originalname);
      const fileName =
        file.originalname
          .replace(fileExt, '')
          .toLowerCase()
          .split(' ')
          .join('-') +
        '-' +
        Date.now();
      cb(null, fileName + fileExt);
    },
  });

  //file filter
  const filterFilter = (req: Request, file: any, cb: FileFilterCallback) => {
    const validImageMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const mimeType = mime.lookup(file.originalname) || file.mimetype;

    if (['image', 'ID', 'KBIS'].includes(file.fieldname)) {
      if (validImageMimeTypes.includes(mimeType)) {
        cb(null, true);
      } else {
        cb(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            'Only .jpeg, .png, .jpg files are supported',
          ),
        );
      }
    } else if (file.fieldname === 'media') {
      if (['video/mp4', 'audio/mpeg'].includes(mimeType)) {
        cb(null, true);
      } else {
        cb(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            'Only .mp4 and .mp3 files are supported',
          ),
        );
      }
    } else if (file.fieldname === 'doc') {
      if (mimeType === 'application/pdf') {
        cb(null, true);
      } else {
        cb(
          new ApiError(StatusCodes.BAD_REQUEST, 'Only PDF files are supported'),
        );
      }
    } else {
      cb(new ApiError(StatusCodes.BAD_REQUEST, 'This file is not supported'));
    }
  };

  const upload = multer({
    storage: storage,
    fileFilter: filterFilter,
  }).fields([
    { name: 'image', maxCount: 5 },
    { name: 'ID', maxCount: 1 },
    { name: 'KBIS', maxCount: 1 },
    { name: 'media', maxCount: 3 },
    { name: 'doc', maxCount: 3 },
  ]);
  return upload;
};

export default fileUploadHandler;
