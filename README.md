
# Readability Proxy

This project provides two specialized web proxies designed to make websites accessible on vintage and limited-capacity devices. It includes a readability-focused proxy that simplifies pages and optimizes images, plus an image conversion proxy for maximum compatibility.

## Features

### Readability Proxy (`http-readability-proxy.js`)
- **Readability Mode**: Uses Mozilla's Readability library to extract and simplify article content
- **Image Optimization**: Automatically converts and resizes images to JPEG format (320x240 max, 45% quality) for vintage systems
- **Image Caching**: Caches processed images locally to improve performance
- **Logo/Favicon Display**: Extracts and displays website logos (32x32 max) in article headers
- **Smart Image Detection**: Identifies and includes relevant images from the original page
- **Vintage Mac Styling**: Optimized CSS for Geneva font and classic Mac aesthetics
- **ISO-8859-1 Encoding**: Converts all content to ISO-8859-1 for compatibility with older systems
- **Link Preservation**: Rewrites internal links to stay within the proxy
- **Original Page Access**: Provides a button to view the unmodified original page

### Image Conversion Proxy (`http-image-convert-proxy.js`)
- **PNG to GIF Conversion**: Automatically converts PNG images to GIF format for broader compatibility
- **Image Proxying**: Proxies other image formats (JPEG, GIF) with proper MIME types for old browsers
- **Style Stripping**: Removes all CSS to ensure maximum compatibility
- **Image Caching**: Caches converted images to avoid redundant processing
- **ISO-8859-1 Encoding**: Converts HTML content for vintage system compatibility

## Prerequisites

- Node.js (v14 or above)
- NPM or Yarn

## Installation

1. Clone the repository:

```bash
git clone https://github.com/alexBethke/readability-proxy.git
cd readability-proxy
```

2. Install dependencies:

```bash
npm install
```

This installs:
- `express` - Web server framework
- `node-fetch` - HTTP client for fetching pages
- `jsdom` - HTML parsing and manipulation
- `@mozilla/readability` - Content extraction
- `iconv-lite` - Character encoding conversion
- `sharp` - Image processing

## Usage

### Readability Proxy

Start the readability proxy server:

```bash
node http-readability-proxy.js
```

The server runs on **http://localhost:8080**

#### Endpoints

**Main Proxy (Readability Mode)**
- **URL**: `http://localhost:8080/?url=<target_url>`
- **Method**: GET
- **Description**: Fetches and simplifies the target URL using Readability, processes images, and returns optimized content
- **Example**: `http://localhost:8080/?url=http://www.apple.com`
- **Alternative**: `http://localhost:8080/<target_url>` (automatically prepends `http://` if no protocol specified)
- **Example**: `http://localhost:8080/www.nytimes.com`

**Original Page Viewer**
- **URL**: `http://localhost:8080/original?url=<target_url>`
- **Method**: GET
- **Description**: Returns the unmodified original page (no readability processing) with ISO-8859-1 encoding
- **Example**: `http://localhost:8080/original?url=http://www.apple.com`

**Cached Images**
- **URL**: `http://localhost:8080/cached_images/<filename>`
- **Method**: GET
- **Description**: Serves processed and cached images (automatically used by the proxy)
- **Note**: Images are cached in the `cached_images/` directory

### Image Conversion Proxy

Start the image conversion proxy server:

```bash
node http-image-convert-proxy.js
```

The server runs on **http://localhost:8081**

#### Endpoints

**Main Proxy (Image Conversion Mode)**
- **URL**: `http://localhost:8081/?url=<target_url>`
- **Method**: GET
- **Description**: Fetches the target URL, converts PNG images to GIF, and proxies other images with proper MIME types
- **Example**: `http://localhost:8081/?url=http://example.com`
- **Alternative**: `http://localhost:8081/<target_url>`

**Image Proxy**
- **URL**: `http://localhost:8081/image-proxy?url=<image_url>`
- **Method**: GET
- **Description**: Proxies individual images with correct MIME types for vintage browser compatibility
- **Example**: `http://localhost:8081/image-proxy?url=http://example.com/image.jpg`

**Converted Images**
- **URL**: `http://localhost:8081/converted_images/<filename>`
- **Method**: GET
- **Description**: Serves converted images (PNG->GIF) from cache
- **Note**: Images are cached in the `converted_images/` directory

## How It Works

### Readability Proxy Workflow

1. Fetches the target webpage
2. Parses HTML with JSDOM
3. Extracts website logo/favicon from various meta tags
4. Applies Mozilla Readability to extract article content
5. Processes all images:
   - Converts to JPEG format
   - Resizes to max 320x240 pixels
   - Applies 45% quality compression
   - Caches locally with MD5 hash-based filenames
6. Processes website logo (32x32 max, 60% quality)
7. Identifies and includes up to 3 additional relevant images from the original page
8. Rewrites all links to stay within the proxy
9. Applies vintage-friendly CSS styling
10. Converts final HTML to ISO-8859-1 encoding
11. Returns optimized content

### Image Conversion Proxy Workflow

1. Fetches the target webpage or image
2. For HTML pages:
   - Parses and identifies all images
   - Converts PNG images to GIF format
   - Proxies other formats with correct MIME types
   - Strips all CSS styling
3. For direct image requests:
   - Serves the image with proper Content-Type headers
4. Converts HTML to ISO-8859-1 encoding
5. Returns the processed content

## Technical Details

### Image Processing

- **Format**: All images converted to JPEG (readability proxy) or GIF (conversion proxy)
- **Max Dimensions**: 320x240 pixels (readability proxy maintains aspect ratio)
- **Quality**: 45% JPEG quality for optimal size/quality balance on vintage systems
- **Logo Processing**: Separate handling for favicons/logos (32x32 max)
- **Filtering**: Skips tracking pixels, ads, very small images (<50x50), and images <1KB

### Encoding

- All HTML content is converted to ISO-8859-1 encoding
- Proper charset headers are set in responses
- Compatible with vintage Macintosh browsers and systems that don't support UTF-8

### Link Handling

- HTTPS URLs are forced to HTTP for vintage system compatibility
- All links are rewritten to stay within the proxy
- Problematic protocols (javascript:, mailto:, tel:, ftp:, file:) are filtered out
- Relative URLs are converted to absolute URLs

### Caching

- Processed images are cached using MD5 hashes of original URLs
- Cache directories are created automatically on first run
- Cached images are reused on subsequent requests to improve performance

## Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

## Notes

- Both proxies work with HTTP and HTTPS URLs
- HTTPS URLs are automatically converted to HTTP for vintage system compatibility
- The readability proxy is optimized for article-style content
- The image conversion proxy provides maximum compatibility by converting PNGs to GIFs
- Common URL typos (e.g., "ttp://" instead of "http://") are automatically corrected
- Timeouts are set to 10 seconds for page fetches and 5 seconds for logos

## Use Cases

- Browsing modern websites on vintage Macintosh computers
- Accessing content on systems with limited memory or processing power
- Reading articles on devices that don't support modern web standards
- Testing web content compatibility with legacy browsers
- Accessing sites on systems without UTF-8 support

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
