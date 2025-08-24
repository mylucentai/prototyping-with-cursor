import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get screen with all related data
    const screen = await prisma.screen.findUnique({
      where: { id },
      include: {
        site: true,
        screenFiles: {
          orderBy: { createdAt: 'desc' }
        },
        captures: {
          orderBy: { createdAt: 'desc' },
          include: {
            screen: {
              include: {
                screenFiles: true
              }
            }
          }
        }
      }
    });

    if (!screen) {
      return NextResponse.json(
        { error: 'Screen not found' },
        { status: 404 }
      );
    }

    // Calculate diff scores and changes
    const capturesWithDiffs = screen.captures.map((capture, index) => {
      const previousCapture = screen.captures[index + 1];
      const hasChanged = previousCapture ? (capture.diffScore || 0) > 0.1 : false;
      
      return {
        id: capture.id,
        createdAt: capture.createdAt,
        etag: capture.etag,
        lastModified: capture.lastModified,
        domHash: capture.domHash,
        imgHash: capture.imgHash,
        diffScore: capture.diffScore,
        changed: hasChanged,
        imageUrl: capture.screen.screenFiles[0]?.pngUrl || null,
        thumbnailUrl: capture.screen.screenFiles[0]?.thumbUrl || null
      };
    });

    // Format response
    const response = {
      id: screen.id,
      site: {
        id: screen.site.id,
        name: screen.site.name,
        domain: screen.site.domain,
        category: screen.site.category
      },
      url: screen.url,
      breakpoint: screen.breakpoint,
      status: screen.status,
      dimensions: {
        width: screen.width,
        height: screen.height
      },
      metadata: {
        ocrText: screen.ocrText,
        aiTags: screen.aiTags,
        piiBlur: screen.piiBlur,
        version: screen.version,
        lastSeenAt: screen.lastSeenAt,
        createdAt: screen.createdAt
      },
      currentFiles: screen.screenFiles[0] ? {
        webpUrl: screen.screenFiles[0].webpUrl,
        pngUrl: screen.screenFiles[0].pngUrl,
        thumbUrl: screen.screenFiles[0].thumbUrl,
        sha256: screen.screenFiles[0].sha256,
        imgHash: screen.screenFiles[0].imgHash
      } : null,
      versionHistory: capturesWithDiffs,
      statistics: {
        totalCaptures: screen.captures.length,
        lastChange: capturesWithDiffs.find(c => c.changed)?.createdAt || null,
        averageDiffScore: screen.captures.length > 0 
          ? screen.captures.reduce((sum, c) => sum + (c.diffScore || 0), 0) / screen.captures.length
          : 0
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Screen detail error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Delete screen and all related data (cascade)
    await prisma.screen.delete({
      where: { id }
    });

    return NextResponse.json({
      message: 'Screen deleted successfully'
    });

  } catch (error) {
    console.error('Screen deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
