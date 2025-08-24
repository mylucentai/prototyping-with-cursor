import { chromium, Browser, Page } from 'playwright';
import sharp from 'sharp';
import pixelmatch from 'pixelmatch';
import { createWorker } from 'tesseract.js';
import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const prisma = new PrismaClient();

// S3 configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT, // For Cloudflare R2
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

interface CaptureJob {
  id: string;
  url: string;
  breakpoint: 'desktop' | 'mobile';
  width: number;
  height: number;
  withContent: boolean;
  priority: number;
  siteId: string;
  screenId: string;
}

export class CaptureWorker {
  private browser: Browser | null = null;

  async initialize() {
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
  }

  async processJob(job: CaptureJob) {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    try {
      // Update screen status to processing
      await prisma.screen.update({
        where: { id: job.screenId },
        data: { status: 'processing' }
      });

      // Create new page
      const page = await this.browser.newPage();
      
      // Set viewport
      await page.setViewportSize({ width: job.width, height: job.height });

      // Note: setUserAgent is not available in this version of Playwright
      // The viewport size will handle mobile vs desktop rendering

      // Navigate to URL
      await page.goto(job.url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Handle cookie banners and popups
      await this.handleCookieBanners(page);

      // Scroll to load lazy content
      await this.scrollToLoadContent(page);

      // Wait for any animations to complete
      await page.waitForTimeout(2000);

      // Capture screenshot
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false
      });

      // Get page metadata
      const etag = await this.getEtag(page);
      const lastModified = await this.getLastModified(page);
      const domHash = await this.getDomHash(page);

      // Process image
      const processedImages = await this.processImage(screenshot, job);

      // Extract text with OCR if requested
      let ocrText = null;
      if (job.withContent) {
        ocrText = await this.extractText(screenshot);
      }

      // Generate AI tags
      const aiTags = await this.generateAITags(job.url, ocrText);

      // Check for PII and blur if needed
      const piiBlur = await this.detectAndBlurPII(processedImages.png);

      // Upload to S3
      const fileUrls = await this.uploadToS3(processedImages, job);

      // Save to database
      const screenFile = await prisma.screenFile.create({
        data: {
          screenId: job.screenId,
          webpUrl: fileUrls.webp,
          pngUrl: fileUrls.png,
          thumbUrl: fileUrls.thumb,
          sha256: processedImages.sha256,
          imgHash: processedImages.imgHash
        }
      });

      // Create capture record
      const capture = await prisma.capture.create({
        data: {
          screenId: job.screenId,
          etag,
          lastModified,
          domHash,
          imgHash: processedImages.imgHash,
          diffScore: await this.calculateDiffScore(job.screenId, processedImages.imgHash),
          changed: false // Will be calculated based on diff score
        }
      });

      // Update screen with new data
      await prisma.screen.update({
        where: { id: job.screenId },
        data: {
          status: 'captured',
          ocrText,
          aiTags,
          piiBlur,
          lastSeenAt: new Date()
        }
      });

      await page.close();

      return {
        success: true,
        screenId: job.screenId,
        captureId: capture.id,
        fileId: screenFile.id,
        urls: fileUrls
      };

    } catch (error) {
      console.error(`Capture failed for ${job.url}:`, error);
      
      // Update screen status to failed
      await prisma.screen.update({
        where: { id: job.screenId },
        data: { status: 'failed' }
      });

      throw error;
    }
  }

  private async handleCookieBanners(page: Page) {
    try {
      // Common cookie banner selectors
      const cookieSelectors = [
        '[data-testid="cookie-banner"]',
        '.cookie-banner',
        '#cookie-banner',
        '[aria-label*="cookie"]',
        'button:has-text("Accept")',
        'button:has-text("OK")',
        'button:has-text("Got it")'
      ];

      for (const selector of cookieSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            await element.click();
            await page.waitForTimeout(1000);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
    } catch (error) {
      // Ignore cookie banner errors
    }
  }

  private async scrollToLoadContent(page: Page) {
    try {
      // Scroll down to trigger lazy loading
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(1000);
      
      // Scroll back to top
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(500);
    } catch (error) {
      // Ignore scroll errors
    }
  }

  private async getEtag(page: Page): Promise<string | null> {
    try {
      const response = await page.waitForResponse(response => response.url() === page.url());
      return response.headers()['etag'] || null;
    } catch {
      return null;
    }
  }

  private async getLastModified(page: Page): Promise<string | null> {
    try {
      const response = await page.waitForResponse(response => response.url() === page.url());
      return response.headers()['last-modified'] || null;
    } catch {
      return null;
    }
  }

  private async getDomHash(page: Page): Promise<string> {
    const domContent = await page.content();
    return createHash('sha256').update(domContent).digest('hex');
  }

  private async processImage(screenshot: Buffer, job: CaptureJob) {
    // Create different versions of the image
    const png = screenshot;
    const webp = await sharp(screenshot).webp({ quality: 85 }).toBuffer();
    const thumb = await sharp(screenshot)
      .resize(300, 200, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    // Calculate hashes
    const sha256 = createHash('sha256').update(screenshot).digest('hex');
    const imgHash = createHash('md5').update(screenshot).digest('hex');

    return {
      png,
      webp,
      thumb,
      sha256,
      imgHash
    };
  }

  private async extractText(imageBuffer: Buffer): Promise<string> {
    const worker = await createWorker('eng');
    try {
      const { data: { text } } = await worker.recognize(imageBuffer);
      return text;
    } finally {
      await worker.terminate();
    }
  }

  private async generateAITags(url: string, ocrText: string | null): Promise<string[]> {
    // Simple keyword extraction - in production, you'd use a proper AI service
    const text = ocrText || '';
    const urlLower = url.toLowerCase();
    
    const tags = new Set<string>();
    
    // Extract common patterns
    if (urlLower.includes('checkout') || text.toLowerCase().includes('checkout')) {
      tags.add('checkout');
    }
    if (urlLower.includes('payment') || text.toLowerCase().includes('payment')) {
      tags.add('payment');
    }
    if (urlLower.includes('ticket') || text.toLowerCase().includes('ticket')) {
      tags.add('ticket');
    }
    if (urlLower.includes('event') || text.toLowerCase().includes('event')) {
      tags.add('event');
    }
    if (urlLower.includes('room') || text.toLowerCase().includes('room')) {
      tags.add('accommodation');
    }
    
    return Array.from(tags);
  }

  private async detectAndBlurPII(imageBuffer: Buffer): Promise<boolean> {
    // Simple PII detection - in production, use a proper PII detection service
    const text = await this.extractText(imageBuffer);
    
    // Check for common PII patterns
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/ // Phone
    ];
    
    const hasPII = piiPatterns.some(pattern => pattern.test(text));
    
    if (hasPII) {
      // In production, you would blur the image here
      console.log('PII detected, image should be blurred');
    }
    
    return hasPII;
  }

  private async uploadToS3(images: any, job: CaptureJob) {
    const bucket = process.env.S3_BUCKET!;
    const prefix = `screenshots/${job.siteId}/${job.screenId}`;
    
    const uploads = [
      {
        key: `${prefix}/original.webp`,
        body: images.webp,
        contentType: 'image/webp'
      },
      {
        key: `${prefix}/original.png`,
        body: images.png,
        contentType: 'image/png'
      },
      {
        key: `${prefix}/thumb.webp`,
        body: images.thumb,
        contentType: 'image/webp'
      }
    ];

    const urls: Record<string, string> = {};
    
    for (const upload of uploads) {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: upload.key,
        Body: upload.body,
        ContentType: upload.contentType,
        CacheControl: 'public, max-age=31536000'
      });
      
      await s3Client.send(command);
      
      const urlKey = upload.key.includes('thumb') ? 'thumb' : 
                    upload.key.includes('webp') ? 'webp' : 'png';
      urls[urlKey] = `${process.env.CDN_URL}/${upload.key}`;
    }
    
    return urls;
  }

  private async calculateDiffScore(screenId: string, newImgHash: string): Promise<number> {
    // Get the previous capture
    const previousCapture = await prisma.capture.findFirst({
      where: { screenId },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!previousCapture) {
      return 0; // First capture
    }
    
    // Simple hash comparison - in production, use pixelmatch for actual diff
    return previousCapture.imgHash === newImgHash ? 0 : 0.5;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Example usage
async function main() {
  const worker = new CaptureWorker();
  await worker.initialize();
  
  // Process a job
  const job: CaptureJob = {
    id: 'test-job',
    url: 'https://www.apple.com/store',
    breakpoint: 'desktop',
    width: 1440,
    height: 900,
    withContent: true,
    priority: 5,
    siteId: 'site-id',
    screenId: 'screen-id'
  };
  
  try {
    const result = await worker.processJob(job);
    console.log('Capture completed:', result);
  } catch (error) {
    console.error('Capture failed:', error);
  } finally {
    await worker.close();
  }
}

if (require.main === module) {
  main();
}
