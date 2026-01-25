/**
 * AWS S3 Storage Adapter - Sprint 4 Phase 2
 * 
 * Stores backups in Amazon S3
 * Requires: npm install @aws-sdk/client-s3
 */

const fs = require('fs');
const path = require('path');

class S3StorageAdapter {
  constructor(logger) {
    this.logger = logger;
    this.bucket = process.env.AWS_S3_BUCKET;
    this.region = process.env.AWS_REGION || 'us-east-1';
    
    if (!this.bucket) {
      throw new Error('AWS_S3_BUCKET environment variable is required for S3 storage');
    }
    
    // Initialize S3 client (lazy loading)
    this.s3Client = null;
  }

  async getS3Client() {
    if (this.s3Client) return this.s3Client;
    
    try {
      const { S3Client } = require('@aws-sdk/client-s3');
      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      return this.s3Client;
    } catch (error) {
      throw new Error('AWS SDK not installed. Run: npm install @aws-sdk/client-s3');
    }
  }

  async upload(filePath, backupName) {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const client = await this.getS3Client();
    const fileName = path.basename(filePath);
    const fileContent = fs.readFileSync(filePath);
    
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: `backups/${fileName}`,
      Body: fileContent,
      StorageClass: 'STANDARD_IA' // Infrequent Access - cheaper for backups
    });
    
    await client.send(command);
    
    this.logger.info(`Backup uploaded to S3: ${fileName}`);
    
    return {
      path: `s3://${this.bucket}/backups/${fileName}`,
      size: fileContent.length
    };
  }

  async download(backupName) {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const client = await this.getS3Client();
    const tempDir = path.join(__dirname, '../../../temp');
    const tempPath = path.join(tempDir, backupName);
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: `backups/${backupName}`
    });
    
    const response = await client.send(command);
    const fileContent = await this.streamToBuffer(response.Body);
    
    fs.writeFileSync(tempPath, fileContent);
    return tempPath;
  }

  async listBackups() {
    const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
    const client = await this.getS3Client();
    
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: 'backups/'
    });
    
    const response = await client.send(command);
    
    return (response.Contents || []).map(obj => ({
      name: path.basename(obj.Key),
      date: obj.LastModified,
      size: obj.Size
    })).sort((a, b) => b.date - a.date);
  }

  async deleteBackup(backupName) {
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    const client = await this.getS3Client();
    
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: `backups/${backupName}`
    });
    
    await client.send(command);
    this.logger.info(`Deleted S3 backup: ${backupName}`);
  }

  async streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
}

module.exports = S3StorageAdapter;