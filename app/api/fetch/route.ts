import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import winston from 'winston';

// Zod schema for validation
const fetchUrlSchema = z.object({
  url: z.string().url('Invalid URL format').min(1, 'URL parameter is required'),
});

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.simple()
  ),
  defaultMeta: { service: 'next-fetcher' },
  transports: [
    new winston.transports.Console(),
  ],
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  logger.info(`Fetch endpoint called with URL: ${url}`);

  // Validate URL
  try {
    fetchUrlSchema.parse({ url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues[0]?.message || 'Validation error';
      logger.error(`Validation error: ${errorMessage}`);
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }
  }

  try {
    const response = await fetch(url!, {
      method: 'GET',
      headers: {
        'User-Agent': 'Next-Fetcher/1.0 (Next.js Application)',
        'Accept': '*/*',
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      logger.error(`HTTP error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `HTTP ${response.status}: ${response.statusText}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'unknown';
    logger.info(`Successfully fetched from ${url} - Content-Type: ${contentType}`);

    // Get the response content
    const content = await response.text();
    logger.info(`Fetched content length: ${content.length} characters`);
    logger.info(`Content preview: ${content.substring(0, 200)}...`);

    // Create a new response with the fetched content
    const headers = new Headers(response.headers);
    headers.set('X-Fetched-From', url!);
    headers.set('X-Fetch-Timestamp', new Date().toISOString());

    logger.info(`Returning response with status ${response.status} and content length ${content.length}`);

    // Return the response with the content using NextResponse
    return new NextResponse(content, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });

  } catch (error: any) {
    logger.error(`Error fetching URL: ${url}`, error);

    let errorMessage = 'Error fetching URL';
    let statusCode = 500;

    if (error.name === 'AbortError') {
      errorMessage = 'Request timed out';
      statusCode = 408;
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused - server may be down';
      statusCode = 502;
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Host not found - check the URL';
      statusCode = 404;
    } else if (error.message) {
      errorMessage = error.message;
    }

    logger.error(`Failed to fetch from ${url}: ${errorMessage}`, error);

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}