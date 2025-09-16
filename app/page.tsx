"use client";
import dynamic from "next/dynamic";

// Dynamically import Swagger UI to avoid SSR issues
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });
import "swagger-ui-react/swagger-ui.css";

export default function Home() {
  // Swagger spec for our API
  const swaggerSpec = {
    openapi: "3.0.0",
    info: {
      title: "Fetcher API",
      description: "The Fetcher API description",
      version: "1.0.0",
    },
    servers: [
      {
        url: typeof window !== 'undefined' ? window.location.origin : "http://localhost:3000",
        description: "Development server",
      },
    ],
    paths: {
      "/api/fetch": {
        get: {
          summary: "Fetch URL content",
          description: "Fetches content from the specified URL and returns it",
          parameters: [
            {
              name: "url",
              in: "query",
              required: true,
              description: "URL to fetch",
              schema: {
                type: "string",
                format: "uri",
              },
            },
          ],
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "*/*": {
                  schema: {
                    type: "string",
                    description: "The fetched content",
                  },
                },
              },
            },
            "400": {
              description: "Bad Request - Invalid URL",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
            "404": {
              description: "Not Found - URL not found",
            },
            "408": {
              description: "Request Timeout",
            },
            "500": {
              description: "Internal Server Error",
            },
          },
        },
      },
    },
  };

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <SwaggerUI spec={swaggerSpec} />
    </div>
  );
}
