-- AlterTable
ALTER TABLE `asset` MODIFY `provider` ENUM('CLOUDINARY', 'S3', 'GCS', 'R2', 'MINIO') NULL;
