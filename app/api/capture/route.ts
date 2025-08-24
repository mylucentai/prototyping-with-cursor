import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Validation schema for capture requests
const captureSchema = z.object({
  url: z.string().url('Valid URL is required'),
  withContent: z.boolean().optional().default(false),
  breakpoints: z.array(z.enum(['desktop', 'mobile'])).optional().default(['desktop', 'mobile']),
  priority: z.number().min(1).max(10).optional().default(5),
});

// Allowed sites configuration
const ALLOWED_SITES = [
  'apple.com',
  'airbnb.com', 
  'ticketmaster.com',
  'stubhub.com',
  'seatgeek.com',
  'gametime.co'
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, withContent, breakpoints, priority } = captureSchema.parse(body);

    // Validate URL is from allowed sites
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    
    if (!ALLOWED_SITES.includes(domain)) {
      return NextResponse.json(
        { error: `Domain ${domain} is not in the allowlist` },
        { status: 400 }
      );
    }

    // Get or create site record
    let site = await prisma.site.findUnique({
      where: { domain }
    });

    if (!site) {
      site = await prisma.site.create({
        data: {
          name: getSiteName(domain),
          domain,
          category: 'ecommerce', // You could categorize based on domain
          priority: 0
        }
      });
    }

    // Create capture jobs for each breakpoint
    const captureJobs = [];
    
    for (const breakpoint of breakpoints) {
      const { width, height } = getBreakpointDimensions(breakpoint);
      
      // Check if screen already exists
      let screen = await prisma.screen.findUnique({
        where: {
          siteId_url_breakpoint: {
            siteId: site.id,
            url,
            breakpoint
          }
        }
      });

      if (!screen) {
        // Create new screen record
        screen = await prisma.screen.create({
          data: {
            siteId: site.id,
            url,
            breakpoint,
            status: 'pending',
            width,
            height,
            version: 1
          }
        });
      } else {
        // Update existing screen
        screen = await prisma.screen.update({
          where: { id: screen.id },
          data: {
            status: 'pending',
            version: { increment: 1 },
            lastSeenAt: new Date()
          }
        });
      }

      // Enqueue capture job (this would integrate with your queue system)
      const job = {
        id: screen.id,
        url,
        breakpoint,
        width,
        height,
        withContent,
        priority,
        siteId: site.id,
        screenId: screen.id
      };

      captureJobs.push(job);
    }

    // In a real implementation, you would add these to your BullMQ queue
    // await queue.add('capture', captureJobs, { priority });

    return NextResponse.json({
      message: `Enqueued ${captureJobs.length} capture jobs`,
      jobs: captureJobs,
      site: {
        id: site.id,
        name: site.name,
        domain: site.domain
      }
    });

  } catch (error) {
    console.error('Capture error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get site name from domain
function getSiteName(domain: string): string {
  const siteNames: Record<string, string> = {
    'apple.com': 'Apple',
    'airbnb.com': 'Airbnb',
    'ticketmaster.com': 'Ticketmaster',
    'stubhub.com': 'StubHub',
    'seatgeek.com': 'SeatGeek',
    'gametime.co': 'Gametime'
  };
  
  return siteNames[domain] || domain;
}

// Helper function to get breakpoint dimensions
function getBreakpointDimensions(breakpoint: string): { width: number; height: number } {
  switch (breakpoint) {
    case 'desktop':
      return { width: 1440, height: 900 };
    case 'mobile':
      return { width: 390, height: 844 };
    default:
      return { width: 1440, height: 900 };
  }
}
