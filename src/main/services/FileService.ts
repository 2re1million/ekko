import * as fs from 'fs';
import * as path from 'path';

export class FileService {
  /**
   * Delete a file safely with error handling
   */
  static async deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: true }; // File doesn't exist, consider it "deleted"
      }

      await fs.promises.unlink(filePath);
      console.log(`File deleted successfully: ${filePath}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Delete audio file and associated snippet files
   */
  static async deleteAudioWithSnippets(audioFilePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const results: { success: boolean; error?: string }[] = [];

      // Delete main audio file
      if (audioFilePath) {
        const result = await this.deleteFile(audioFilePath);
        results.push(result);
      }

      // Delete snippet directory if it exists
      const snippetsDir = path.join(path.dirname(audioFilePath), 'snippets');
      if (fs.existsSync(snippetsDir)) {
        try {
          // Delete all files in snippets directory
          const files = fs.readdirSync(snippetsDir);
          for (const file of files) {
            const snippetPath = path.join(snippetsDir, file);
            await this.deleteFile(snippetPath);
          }
          
          // Remove the empty directory
          fs.rmdirSync(snippetsDir);
          console.log(`Snippets directory deleted: ${snippetsDir}`);
        } catch (error) {
          console.warn(`Failed to clean up snippets directory: ${error}`);
        }
      }

      const hasErrors = results.some(r => !r.success);
      if (hasErrors) {
        const errors = results.filter(r => r.error).map(r => r.error).join('; ');
        return { success: false, error: errors };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get file size in a human-readable format
   */
  static getFileSize(filePath: string): string {
    try {
      if (!fs.existsSync(filePath)) return 'File not found';
      
      const stats = fs.statSync(filePath);
      const bytes = stats.size;
      
      if (bytes === 0) return '0 B';
      
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    } catch (error) {
      return 'Unknown size';
    }
  }

  /**
   * Check if a file exists and is accessible
   */
  static fileExists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    } catch {
      return false;
    }
  }
}