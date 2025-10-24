import express from "express";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import iconv from "iconv-lite";
import sharp from "sharp";
import { createWriteStream, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { URL } from "url";
import crypto from "crypto";

const app = express();
const PORT = 8081;

// Create images cache directory
const IMAGES_DIR = join(process.cwd(), 'converted_images');
if (!existsSync(IMAGES_DIR)) {
  mkdirSync(IMAGES_DIR, { recursive: true });
}

// Serve converted images with proper MIME types
app.use('/converted_images', express.static(IMAGES_DIR, {
  setHeaders: (res, path) => {
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    }
  }
}));

// Proxy route for original images (GIF, JPEG, etc) with proper MIME types
app.get('/image-proxy', async (req, res) => {
  const imageUrl = req.query.url;
  
  if (!imageUrl) {
    return res.status(400).send('No image URL provided');
  }
  
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch image');
    }
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(buffer);
    
    // Set proper MIME type for old browsers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', imageBuffer.length.toString());
    res.send(imageBuffer);
  } catch (error) {
    console.error(`Error proxying image: ${imageUrl}`, error);
    res.status(500).send('Error fetching image');
  }
});

// Function to create a proper hash from URL
function createImageHash(imageUrl) {
  return crypto.createHash('md5').update(imageUrl).digest('hex').substring(0, 16);
}

// Function to convert PNG images to JPG or GIF
async function convertImage(imageUrl, targetUrl) {
  try {
    const hash = createImageHash(imageUrl);
    
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    if (!response.ok) {
      console.log(`Failed to fetch image: ${imageUrl} (${response.status})`);
      return null;
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      console.log(`Not an image: ${imageUrl} (${contentType})`);
      return null;
    }
    
    // Only process PNG images - skip everything else
    if (!contentType.includes('png')) {
      console.log(`Skipping non-PNG image: ${imageUrl} (${contentType})`);
      return { path: imageUrl, converted: false };
    }
    
    const buffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(buffer);
    
    const sharpInstance = sharp(imageBuffer);
    const metadata = await sharpInstance.metadata();
    
    // Always convert to GIF
    const filename = `${hash}.gif`;
    const filepath = join(IMAGES_DIR, filename);
    
    // Check if image is already cached
    if (existsSync(filepath)) {
      console.log(`Using cached converted image: ${filename}`);
      return {
        path: `/converted_images/${filename}`,
        converted: true
      };
    }
    
    // Convert to GIF
    const processedBuffer = await sharpInstance
      .gif()
      .toBuffer();
    
    // Save converted image
    const fs = await import('fs');
    fs.writeFileSync(filepath, processedBuffer);
    
    console.log(`Converted PNG to GIF: ${imageUrl} -> ${filename}`);
    return {
      path: `/converted_images/${filename}`,
      converted: true
    };
  } catch (error) {
    console.error(`Error converting image ${imageUrl}:`, error.message);
    return null;
  }
}

app.use(async (req, res) => {
  let targetUrl = req.query.url;

  // If no ?url= is provided, assume it's part of the path
  if (!targetUrl) {
    targetUrl = req.url.startsWith("/") ? req.url.slice(1) : req.url;
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "http://" + targetUrl;
    }
  }

  // Fix common 'ttp' typo
  if (targetUrl.startsWith("ttp://")) {
    targetUrl = "http://" + targetUrl.slice(5);
  }

  console.log(`Fetching: ${targetUrl}`);

  try {
    // Fetch the requested page
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    const contentType = response.headers.get('content-type') || '';
    
    // If it's an image, serve it directly with proper MIME type
    if (contentType.startsWith('image/')) {
      const buffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(buffer);
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', imageBuffer.length.toString());
      return res.send(imageBuffer);
    }
    
    const html = await response.text();

    // Parse the HTML
    const dom = new JSDOM(html, { url: targetUrl });
    const document = dom.window.document;
    
    // Set headers for streaming and keep-alive
    res.setHeader("Content-Type", "text/html; charset=ISO-8859-1");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Transfer-Encoding", "chunked");
    res.removeHeader("Content-Length"); // Can't know length when streaming
    
    // Strip all CSS links and style tags from head
    const headClone = document.head.cloneNode(true);
    headClone.querySelectorAll('link[rel="stylesheet"]').forEach(el => el.remove());
    headClone.querySelectorAll('style').forEach(el => el.remove());
    
    const headHtml = '<!DOCTYPE html>\n<html><head>' + 
                     '<meta charset="ISO-8859-1">' +
                     '<title>' + (document.title || 'Loading...') + '</title>' +
                     '</head><body>';
    const isoHead = iconv.encode(headHtml, "ISO-8859-1");
    res.write(isoHead);
    
    // Immediately send a loading indicator so user sees something
    const loadingHtml = '<p><i>Loading page content...</i></p>\n';
    const isoLoading = iconv.encode(loadingHtml, "ISO-8859-1");
    res.write(isoLoading);
    res.flush?.(); // Flush immediately to trigger browser rendering
    
    // Process all images
    const imagePromises = [];
    
    const images = Array.from(document.querySelectorAll("img"));
    
    for (const img of images) {
      const src = img.getAttribute("src");
      if (src) {
        try {
          const absoluteImageUrl = new URL(src, targetUrl).href;
          const promise = convertImage(absoluteImageUrl, targetUrl).then(convertedImage => {
            if (convertedImage && convertedImage.converted) {
              // Update src to point to converted image (PNG -> GIF)
              img.setAttribute("src", `http://${req.headers.host}${convertedImage.path}`);
            } else if (convertedImage && !convertedImage.converted) {
              // Proxy non-PNG images through our server with proper MIME types
              img.setAttribute("src", `http://${req.headers.host}/image-proxy?url=${encodeURIComponent(absoluteImageUrl)}`);
            }
            // If null, original src remains
            return convertedImage;
          }).catch((error) => {
            console.error(`Failed to process image: ${src}`, error);
            return null;
          });
          imagePromises.push(promise);
        } catch (error) {
          console.error(`Invalid image URL: ${src}`, error);
        }
      }
    }
    
    // Wait for all image processing to complete
    await Promise.all(imagePromises);
    
    // Strip all style tags and style attributes from body
    document.querySelectorAll('style').forEach(el => el.remove());
    document.querySelectorAll('link[rel="stylesheet"]').forEach(el => el.remove());
    document.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
    
    // Send the body content and closing tags
    const bodyHtml = document.body.innerHTML + '</body></html>';
    const isoBody = iconv.encode(bodyHtml, "ISO-8859-1");
    res.write(isoBody);
    res.end();
  } catch (error) {
    res.status(500).send(`Error fetching page: ${error.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Image conversion proxy running on http://localhost:${PORT}`);
});
