/**
 * Backblaze B2 Storage Adapter - Sprint 4 Phase 2
 * 
 * Stores backups in Backblaze B2 (cost-effective S3 alternative)
 * Requires: npm install backblaze-b2
 */

const fs = require('fs');
const path = require('path');

class B2StorageAdapter {
  constructor(logger) {
    this.logger = logger;
    this.bucketName = process.env.B2_BUCKET_NAME;
    this.applicationKeyId = process.env.B2_APPLICATION_KEY_ID;
    this.applicationKey = process.env.B2_APPLICATION_KEY;
    
    if (!this.bucketName || !this.applicationKeyId || !this.applicationKey) {
      throw new Error('B2_BUCKET_NAME, B2_APPLICATION_KEY_ID, and B2_APPLICATION_KEY are required');
    }
    
    this.b2 = null;
    this.bucketId = null;
  }

  async getB2Client() {
    if (this.b2) return this.b2;
    
    try {
      const B2 = require('backblaze-b2');
      this.b2 = new B2({
        applicationKeyId: this.applicationKeyId,
        applicationKey: this.applicationKey
      });
      
      await this.b2.authorize();
      
      // Get bucket ID
      const response = await this.b2.listBuckets();
      const bucket = response.data.buckets.find(b => b.bucketName === this.bucketName);
      if (!bucket) {
        throw new Error(`Bucket not found: ${this.bucketName}`);
      }
      this.bucketId = bucket.bucketId;
      
      return this.b2;
    } catch (error) {
      throw new Error('Backblaze B2 SDK not installed. Run: npm install backblaze-b2');
    }
  }

  async upload(filePath, backupName) {
    const client = await this.getB2Client();
    const fileName = path.basename(filePath);
    const fileContent = fs.readFileSync(filePath);
    
    const uploadUrl = await client.getUploadUrl({ bucketId: this.bucketId });
    
    await client.uploadFile({
      uploadUrl: uploadUrl.data.uploadUrl,
      uploadAuthToken: uploadUrl.data.authorizationToken,
      fileName: `backups/${fileName}`,
      data: fileContent
    });
    
    this.logger.info(`Backup uploaded to B2: ${fileName}`);
    
    return {
      path: `b2://${this.bucketName}/backups/${fileName}`,
      size: fileContent.length
    };
  }

  async download(backupName) {
    const client = await this.getB2Client();
    const tempDir = path.join(__dirname, '../../../temp');
    const tempPath = path.join(tempDir, backupName);
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const response = await client.downloadFileByName({
      bucketName: this.bucketName,
      fileName: `backups/${backupName}`
    });
    
    fs.writeFileSync(tempPath, response.data);
    return tempPath;
  }

  async listBackups() {
    const client = await this.getB2Client();
    
    const response = await client.listFileNames({
      bucketId: this.bucketId,
      prefix: 'backups/',
      maxFileCount: 1000
    });
    
    return (response.data.files || []).map(file => ({
      name: path.basename(file.fileName),
      date: new Date(file.uploadTimestamp),
      size: file.contentLength
    })).sort((a, b) => b.date - a.date);
  }

  async deleteBackup(backupName) {
    const client = await this.getB2Client();
    
    // First, get file ID
    const files = await this.listBackups();
    const file = files.find(f => f.name === backupName);
    
    if (file) {
      await client.deleteFileVersion({
        fileId: file.fileId,
        fileName: `backups/${backupName}`
      });
      this.logger.info(`Deleted B2 backup: ${backupName}`);
    }
  }
}

module.exports = B2StorageAdapter;