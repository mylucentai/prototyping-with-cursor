import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Validation schema for search requests
const searchSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  sites: z.array(z.string()).min(1, 'At least one site must be selected'),
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
    const { query, sites } = searchSchema.parse(body);

    // Validate that all requested sites are in the allowlist
    const invalidSites = sites.filter(site => !ALLOWED_SITES.includes(site));
    if (invalidSites.length > 0) {
      return NextResponse.json(
        { error: `Invalid sites: ${invalidSites.join(', ')}` },
        { status: 400 }
      );
    }

    // Store the search request
    const searchRequest = await prisma.request.create({
      data: {
        queryText: query,
        sites: sites,
      },
    });

    // Get existing screenshots that match the query
    const existingScreenshots = await prisma.screen.findMany({
      where: {
        site: {
          domain: { in: sites }
        },
        OR: [
          { ocrText: { contains: query, mode: 'insensitive' } },
          { aiTags: { hasSome: [query.toLowerCase()] } }
        ]
      },
      include: {
        site: true,
        screenFiles: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        captures: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { lastSeenAt: 'desc' }
    });

    // Enqueue capture jobs for new URLs (this would integrate with your queue system)
    // For now, we'll simulate this
    const captureJobs = await enqueueCaptureJobs(query, sites);

    // Format response
    const screenshots = existingScreenshots.map(screen => ({
      id: screen.id,
      site: screen.site.name,
      domain: screen.site.domain,
      path: new URL(screen.url).pathname,
      breakpoint: screen.breakpoint,
      capturedAt: screen.lastSeenAt.toISOString(),
      updated: screen.captures[0]?.changed || false,
      thumbUrl: screen.screenFiles[0]?.thumbUrl || '/placeholder-thumb.jpg',
      url: screen.url,
      status: screen.status
    }));

    return NextResponse.json({
      requestId: searchRequest.id,
      screenshots,
      captureJobs: captureJobs.length,
      message: `Found ${screenshots.length} existing screenshots, enqueued ${captureJobs.length} new captures`
    });

  } catch (error) {
    console.error('Search error:', error);
    
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

// Helper function to enqueue capture jobs
async function enqueueCaptureJobs(query: string, sites: string[]) {
  // This would integrate with your BullMQ/Redis queue system
  // For now, we'll return a mock implementation
  
  const captureJobs = [];
  
  // Generate some example URLs based on the query
  const queryKeywords = query.toLowerCase().split(' ');
  
  for (const site of sites) {
    // Generate 1-3 URLs per site based on query
    const urlCount = Math.min(3, Math.max(1, queryKeywords.length));
    
    for (let i = 0; i < urlCount; i++) {
      const path = generatePathFromQuery(query, i);
      const url = `https://www.${site}${path}`;
      
      captureJobs.push({
        url,
        site,
        breakpoints: ['desktop', 'mobile'],
        priority: 1
      });
    }
  }
  
  return captureJobs;
}

// Helper function to generate paths from search queries
function generatePathFromQuery(query: string, index: number): string {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('checkout') || queryLower.includes('payment')) {
    return '/checkout';
  } else if (queryLower.includes('ticket') && queryLower.includes('transfer')) {
    return '/tickets/transfer';
  } else if (queryLower.includes('event') || queryLower.includes('concert')) {
    return `/event/${1000 + index}`;
  } else if (queryLower.includes('room') || queryLower.includes('accommodation')) {
    return `/rooms/${2000 + index}`;
  } else if (queryLower.includes('store') || queryLower.includes('product')) {
    return `/store/product/${3000 + index}`;
  }
  
  return '/';
}
