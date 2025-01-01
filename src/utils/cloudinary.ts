import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import config from '../config';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../errors/ApiError';

// Configure Cloudinary with credentials from config file
cloudinary.config({
  cloud_name: config.cloudinary.cloudinary_name,
  api_key: config.cloudinary.cloudinary_api_key,
  api_secret: config.cloudinary.cloudinary_secret,
});

/**
 * Upload file(s) to Cloudinary with specified folder and file type.
 * @param {string | string[]} localFilePaths - Path(s) to the local file(s).
 * @param {string} destination - Folder in Cloudinary.
 * @param {'image' | 'raw'} file_type - Type of the file(s).
 * @returns {Promise<{ publicId: string, url: string }[] | null>} - Cloudinary file details.
 */
const uploadToCloudinary = async (
  localFilePaths: string | string[],
  destination: string,
  file_type: 'image' | 'raw',
): Promise<string[] | null> => {
  try {
    if (!localFilePaths || !destination) return null;

    const paths = Array.isArray(localFilePaths)
      ? localFilePaths
      : [localFilePaths];
    const urls: string[] = [];

    for (const path of paths) {
      const result = await cloudinary.uploader.upload(path, {
        resource_type: file_type,
        folder: destination,
      });
      if (result) {
        fs.unlinkSync(path); // Remove the local file after successful upload
        urls.push(result.secure_url); // Only store the URL
      }
    }

    return urls;
  } catch (error) {
    if (Array.isArray(localFilePaths)) {
      localFilePaths.forEach((path) => fs.unlinkSync(path));
    } else {
      fs.unlinkSync(localFilePaths);
    }
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to upload files to Cloudinary',
    );
  }
};

/**
 * Delete file(s) from Cloudinary using URLs.
 * @param {string | string[]} fileUrls - URL(s) of files to delete.
 * @param {'image' | 'raw'} file_type - Type of the file(s).
 * @param {boolean} invalidate - Whether to invalidate cached versions.
 * @returns {Promise<Object>} - Cloudinary deletion response.
 */
const deleteResourcesFromCloudinary = async (
  fileUrls: string | string[],
  file_type: 'image' | 'raw',
  invalidate: boolean,
): Promise<object> => {
  try {
    const urls = Array.isArray(fileUrls) ? fileUrls : [fileUrls];

    // Extract public IDs from URLs
    const publicIds = urls
      .map((url) => getPublicIdFromUrl(url))
      .filter((id): id is string => id !== null); // Remove null values

    if (publicIds.length === 0) {
      throw new Error('No valid public IDs found from the provided URLs');
    }

    // Delete resources
    const deletionResult = await cloudinary.api.delete_resources(publicIds, {
      resource_type: file_type,
      invalidate,
    });

    return deletionResult;
  } catch (error) {
    console.error('Failed to delete resources from Cloudinary:', error);
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to delete files from Cloudinary',
    );
  }
};
/**
 * Update file(s) in Cloudinary using their URLs.
 * @param {string | string[]} fileUrls - URL(s) of the file(s) to update.
 * @param {string | string[]} newFilePaths - Path(s) to the new file(s) to upload.
 * @param {'image' | 'raw'} file_type - Type of the file(s).
 * @param {boolean} invalidate - Whether to invalidate cached versions.
 * @param {string} destination - Folder in Cloudinary for the new file(s).
 * @returns {Promise<{ publicId: string, url: string }[]>} - Cloudinary updated file details.
 */
const updateCloudinaryFiles = async (
  fileUrls: string | string[],
  newFilePaths: string | string[],
  file_type: 'image' | 'raw',
  invalidate: boolean,
  destination: string,
): Promise<{ publicId: string; url: string }[]> => {
  try {
    const urls = Array.isArray(fileUrls) ? fileUrls : [fileUrls];
    const paths = Array.isArray(newFilePaths) ? newFilePaths : [newFilePaths];

    if (urls.length !== paths.length) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Mismatch between the number of URLs and file paths provided',
      );
    }

    const results: { publicId: string; url: string }[] = [];

    for (let i = 0; i < urls.length; i++) {
      const publicId = getPublicIdFromUrl(urls[i]);

      if (!publicId) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Failed to extract Public ID from URL: ${urls[i]}`,
        );
      }

      // 🗑️ Delete the old file from Cloudinary
      await cloudinary.uploader.destroy(publicId, {
        resource_type: file_type,
        invalidate,
      });

      // 📤 Upload the new file to Cloudinary
      const result = await cloudinary.uploader.upload(paths[i], {
        resource_type: file_type,
        folder: destination,
        use_filename: true,
        unique_filename: true,
      });

      if (result) {
        fs.unlinkSync(paths[i]); // Remove local file after successful upload
        results.push({ publicId: result.public_id, url: result.secure_url });
      }
    }

    return results;
  } catch (error) {
    console.error('Error updating files in Cloudinary:', error);

    // Clean up local files in case of an error
    if (Array.isArray(newFilePaths)) {
      newFilePaths.forEach((path) => {
        if (fs.existsSync(path)) fs.unlinkSync(path);
      });
    } else if (fs.existsSync(newFilePaths)) {
      fs.unlinkSync(newFilePaths);
    }

    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to update files in Cloudinary',
    );
  }
};

export {
  uploadToCloudinary,
  deleteResourcesFromCloudinary,
  updateCloudinaryFiles,
};

const getPublicIdFromUrl = (url: string): string | null => {
  try {
    const regex = /\/upload\/(?:v\d+\/)?(.+?)(\.\w+)?$/;
    const match = url.match(regex);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Failed to extract Public ID:', error);
    return null;
  }
};
