# ScreenPad - Competitive Design Research Tool

ScreenPad is a powerful internal tool for capturing, storing, and comparing screenshots of industry-leading websites. Built specifically for product designers to track competitor UX/UI patterns and changes over time.

## Features

### 🎯 Core Functionality
- **Smart Capture Engine**: Automated screenshot capture at desktop (1440x900) and mobile (390x844) breakpoints
- **Pattern Search**: Search for UX patterns like "checkout flow" or "ticket transfer" across multiple sites
- **Version History**: Track changes over time with diff scoring and visual comparisons
- **PII Protection**: Automatic detection and blurring of personally identifiable information
- **OCR Integration**: Extract and search text content from screenshots
- **AI Tagging**: Automatic categorization of screenshots based on content

### 🏢 Supported Sites
- **Apple** (apple.com)
- **Airbnb** (airbnb.com)
- **Ticketmaster** (ticketmaster.com)
- **StubHub** (stubhub.com)
- **SeatGeek** (seatgeek.com)
- **Gametime** (gametime.co)

### 🛠 Technical Stack
- **Frontend**: Next.js 15, React 19, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Queue System**: BullMQ with Redis
- **Image Processing**: Playwright, Sharp, Tesseract OCR
- **Storage**: S3-compatible (Cloudflare R2)
- **Search**: Meilisearch
- **UI Components**: Custom CSS with modern design

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Placeholder Content
This prototype uses HTML placeholder files to simulate what real website screenshots would look like:
```bash
node scripts/generate-placeholders.js
```

### 3. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000/prototypes/screenpad` to access ScreenPad.

## Current Implementation

### Demo Mode
This prototype is currently running in **demo mode** with the following features:

- **Placeholder Screenshots**: HTML files that simulate what actual website screenshots would look like
- **Mock Data**: Sample screenshots for Apple, Airbnb, Ticketmaster, StubHub, SeatGeek, and Gametime
- **Search Interface**: Functional command bar interface (⌘K) for searching and filtering
- **Capture Simulation**: Mock capture API that simulates the screenshot capture process

### Real Implementation
The full system includes:
- **Database Integration**: PostgreSQL with Prisma ORM
- **Queue System**: BullMQ with Redis for background processing
- **Image Processing**: Playwright for browser automation and screenshot capture
- **Storage**: S3-compatible storage (Cloudflare R2) for images
- **OCR & AI**: Text extraction and automatic tagging

### Environment Setup (For Full Implementation)
Copy the example environment file and configure your settings:
```bash
cp env.example .env.local
```

Required environment variables for full functionality:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection for job queue
- `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY`: S3/R2 credentials
- `S3_BUCKET`: Storage bucket name
- `CDN_URL`: CDN domain for serving images

## Usage

### Command Bar Interface
- Press `⌘K` (Mac) or `Ctrl+K` (Windows) to open the command bar
- Type your search query (e.g., "checkout flow", "ticket transfer")
- Select target sites from the allowlist
- Execute search to capture relevant screenshots

### Screenshot Grid
- View captured screenshots in a responsive grid layout
- Each card shows site info, capture date, and update status
- Click "Open URL" to visit the original page
- Click "Export PNG" to download the screenshot
- Click "Re-capture" to update the screenshot

### API Endpoints

#### Search Screenshots
```bash
POST /api/search
{
  "query": "checkout flow",
  "sites": ["apple.com", "airbnb.com"]
}
```

#### Capture Single URL
```bash
POST /api/capture
{
  "url": "https://www.apple.com/store",
  "withContent": true,
  "breakpoints": ["desktop", "mobile"]
}
```

#### Get Screen Details
```bash
GET /api/screens/{screenId}
```

## Architecture

### Data Model
```
sites (id, name, domain, category, priority)
├── screens (id, site_id, url, breakpoint, status, ocr_text, ai_tags)
    ├── screen_files (id, screen_id, webp_url, png_url, thumb_url)
    └── captures (id, screen_id, etag, dom_hash, img_hash, diff_score)
```

### Capture Pipeline
1. **URL Validation**: Check against allowlist
2. **Browser Automation**: Playwright with custom viewport
3. **Cookie Handling**: Auto-accept common banners
4. **Content Loading**: Scroll to trigger lazy loading
5. **Screenshot Capture**: High-quality PNG output
6. **Image Processing**: Sharp for WebP conversion and thumbnails
7. **OCR Extraction**: Tesseract for text content
8. **PII Detection**: Regex patterns for sensitive data
9. **Storage Upload**: S3/R2 with CDN delivery
10. **Database Update**: Prisma for data persistence

### Queue System
- **BullMQ**: Redis-backed job queue
- **Priority Handling**: High-priority captures processed first
- **Retry Logic**: Automatic retry for failed captures
- **Concurrency Control**: Limit concurrent browser instances

## Development

### Project Structure
```
app/prototypes/screenpad/
├── page.tsx              # Main ScreenPad interface
├── styles.module.css     # Component styles
└── README.md            # This file

app/api/
├── search/route.ts       # Search API endpoint
├── capture/route.ts      # Capture API endpoint
└── screens/[id]/route.ts # Screen detail API

workers/
└── capture-worker.ts     # Playwright capture worker

prisma/
└── schema.prisma        # Database schema
```

### Adding New Sites
1. Update `ALLOWED_SITES` array in API routes
2. Add site name mapping in `getSiteName()` function
3. Update Prisma schema if needed
4. Test with sample URLs

### Customizing Capture Logic
- Modify `CaptureWorker` class in `workers/capture-worker.ts`
- Adjust viewport settings for different breakpoints
- Add custom cookie banner selectors
- Implement advanced PII detection

### Styling
- CSS modules for component-specific styles
- Responsive design with mobile-first approach
- Modern gradient backgrounds and glassmorphism effects
- Smooth animations and hover states

## Deployment

### Frontend (Vercel)
```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

### Worker (Render/Fly)
```bash
# Build worker
npm run build:worker

# Deploy to Render
render deploy
```

### Database
- Use managed PostgreSQL (Supabase, Railway, etc.)
- Set up connection pooling for production
- Configure automated backups

### Storage
- Cloudflare R2 for cost-effective S3-compatible storage
- Configure CDN for fast image delivery
- Set up lifecycle policies for old screenshots

## Monitoring & Analytics

### Key Metrics
- Capture success rate
- Average processing time
- Storage usage
- Search query patterns
- Most captured sites/pages

### Logging
- Structured logging with request IDs
- Error tracking and alerting
- Performance monitoring
- User activity analytics

## Security Considerations

### Data Protection
- PII detection and blurring
- Secure storage of credentials
- Rate limiting on API endpoints
- Input validation and sanitization

### Access Control
- Internal tool only (no public access)
- IP allowlisting if needed
- Audit logging for all operations
- Regular security updates

## Future Enhancements

### Planned Features
- **Figma Integration**: Plugin to import screenshots as frames
- **Advanced Search**: Semantic search with embeddings
- **Change Alerts**: Email notifications for significant changes
- **Bulk Operations**: Mass capture and export
- **Analytics Dashboard**: Usage statistics and insights
- **API Rate Limiting**: Respect robots.txt and site policies

### Technical Improvements
- **Caching**: Redis cache for frequently accessed data
- **CDN Optimization**: Image optimization and compression
- **Background Jobs**: Scheduled captures and maintenance
- **Error Recovery**: Better handling of network issues
- **Performance**: Database indexing and query optimization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

Internal use only - not for public distribution.

---

Built with ❤️ for competitive design research at Ticketmaster.
