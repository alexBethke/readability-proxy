import express from "express";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import iconv from "iconv-lite"; // Import the iconv-lite library for encoding conversion
import sharp from "sharp"; // Import sharp for image processing
import { createWriteStream, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { URL } from "url";
import crypto from "crypto";

const app = express();
const PORT = 8080;

// Create images cache directory
const IMAGES_DIR = join(process.cwd(), 'cached_images');
if (!existsSync(IMAGES_DIR)) {
  mkdirSync(IMAGES_DIR, { recursive: true });
}

// Serve cached images
app.use('/cached_images', express.static(IMAGES_DIR));

// Function to create a proper hash from URL
function createImageHash(imageUrl) {
  return crypto.createHash('md5').update(imageUrl).digest('hex').substring(0, 16);
}

// Function to extract website logo/favicon URLs
function extractLogoUrls(document, targetUrl) {
  const logoUrls = [];
  
  // Try to find various favicon and logo meta tags
  const selectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]', 
    'link[rel="apple-touch-icon"]',
    'link[rel="apple-touch-icon-precomposed"]',
    'link[rel="mask-icon"]',
    'meta[property="og:image"]',
    'link[rel="image_src"]'
  ];
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      const url = el.getAttribute('href') || el.getAttribute('content');
      if (url) {
        try {
          const absoluteUrl = new URL(url, targetUrl).href;
          logoUrls.push(absoluteUrl);
        } catch (error) {
          // Skip invalid URLs
        }
      }
    });
  });
  
  // Add default favicon.ico if no icons found
  if (logoUrls.length === 0) {
    try {
      const domain = new URL(targetUrl);
      logoUrls.push(`${domain.origin}/favicon.ico`);
    } catch (error) {
      // Skip if URL parsing fails
    }
  }
  
  return logoUrls;
}

// Function to process website logo with special handling
async function processLogo(logoUrl, targetUrl) {
  try {
    const hash = createImageHash(logoUrl + '_logo');
    const filename = `logo_${hash}.jpg`;
    const filepath = join(IMAGES_DIR, filename);
    
    // Check if logo is already cached
    if (existsSync(filepath)) {
      console.log(`Using cached logo: ${filename}`);
      const cachedMetadata = await sharp(filepath).metadata();
      return {
        path: `/cached_images/${filename}`,
        width: Math.min(cachedMetadata.width, 32),
        height: Math.min(cachedMetadata.height, 32)
      };
    }
    
    const response = await fetch(logoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 5000 // Shorter timeout for logos
    });
    
    if (!response.ok) {
      console.log(`Failed to fetch logo: ${logoUrl} (${response.status})`);
      return null;
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      console.log(`Not an image: ${logoUrl} (${contentType})`);
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(buffer);
    
    // Process logo: convert to small JPEG, max 32x32 for vintage systems
    const sharpInstance = sharp(imageBuffer);
    const metadata = await sharpInstance.metadata();
    
    const processedBuffer = await sharpInstance
      .jpeg({ quality: 60, progressive: false })
      .resize({ 
        width: 32, 
        height: 32, 
        fit: 'inside', 
        withoutEnlargement: false // Allow enlargement for small favicons
      })
      .toBuffer();
    
    // Save processed logo
    const fs = await import('fs');
    fs.writeFileSync(filepath, processedBuffer);
    
    // Get the actual dimensions after processing
    const processedMetadata = await sharp(processedBuffer).metadata();
    
    console.log(`Processed logo: ${logoUrl} -> ${filename} (${processedMetadata.width}x${processedMetadata.height})`);
    return {
      path: `/cached_images/${filename}`,
      width: processedMetadata.width,
      height: processedMetadata.height
    };
  } catch (error) {
    console.error(`Error processing logo ${logoUrl}:`, error.message);
    return null;
  }
}

// Function to process and cache images
async function processImage(imageUrl, targetUrl) {
  try {
    const hash = createImageHash(imageUrl);
    const filename = `${hash}.jpg`;
    const filepath = join(IMAGES_DIR, filename);
    
    // Check if image is already cached
    if (existsSync(filepath)) {
      console.log(`Using cached image: ${filename}`);
      // Get dimensions from cached file
      const cachedMetadata = await sharp(filepath).metadata();
      return {
        path: `/cached_images/${filename}`,
        width: cachedMetadata.width,
        height: cachedMetadata.height
      };
    }
    
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
    
    const buffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(buffer);
    
    // Skip very small images (likely tracking pixels)
    if (imageBuffer.length < 1000) {
      console.log(`Image too small, skipping: ${imageUrl}`);
      return null;
    }
    
    // Process image: convert to JPEG with reduced quality for vintage Macs
    const sharpInstance = sharp(imageBuffer);
    const metadata = await sharpInstance.metadata();
    
    // Skip very small images by dimensions
    if (metadata.width < 50 || metadata.height < 50) {
      console.log(`Image dimensions too small: ${imageUrl} (${metadata.width}x${metadata.height})`);
      return null;
    }
    
    const processedBuffer = await sharpInstance
      .jpeg({ quality: 45, progressive: false })
      .resize({ 
        width: 320, 
        height: 240, 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .toBuffer();
    
    // Get the actual dimensions after processing for proper display
    const processedMetadata = await sharp(processedBuffer).metadata();
    
    // Save processed image synchronously to ensure it's available immediately
    const fs = await import('fs');
    fs.writeFileSync(filepath, processedBuffer);
    
    console.log(`Processed image: ${imageUrl} -> ${filename} (${processedMetadata.width}x${processedMetadata.height})`);
    return {
      path: `/cached_images/${filename}`,
      width: processedMetadata.width,
      height: processedMetadata.height
    };
  } catch (error) {
    console.error(`Error processing image ${imageUrl}:`, error.message);
    return null;
  }
}

// Route to serve the original page (without readability)
app.get("/original", async (req, res) => {
  let targetUrl = req.query.url;

  // If no ?url= is provided, return an error
  if (!targetUrl) {
    return res.status(400).send("Error: No URL provided");
  }

  // If the URL has 'ttp' (a common mistake), fix it
  if (targetUrl.startsWith("ttp://")) {
    targetUrl = "http://" + targetUrl.slice(5);
  }

  console.log(`Fetching original page: ${targetUrl}`);

  try {
    // Fetch the requested page (HTTP or HTTPS)
    const response = await fetch(targetUrl);
    const originalHtml = await response.text();

    // Convert HTML content from UTF-8 to ISO-8859-1
    const isoHtml = iconv.encode(originalHtml, "ISO-8859-1");

    // Set response headers to indicate the encoding
    res.setHeader("Content-Type", "text/html; charset=ISO-8859-1");

    // Send the ISO-8859-1 encoded content
    res.send(isoHtml);
  } catch (error) {
    res.status(500).send(`Error fetching original page: ${error.message}`);
  }
});

app.use(async (req, res) => {
  let targetUrl = req.query.url;

  // If no ?url= is provided, assume it's part of the path and prepend 'http://'
  if (!targetUrl) {
    targetUrl = req.url.startsWith("/") ? req.url.slice(1) : req.url; // Remove leading slash if it exists
    // Ensure the URL starts with http:// if it doesn't have a protocol
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "http://" + targetUrl;
    }
  }

  // If the URL has 'ttp' (a common mistake), fix it
  if (targetUrl.startsWith("ttp://")) {
    targetUrl = "http://" + targetUrl.slice(5);
  }

  console.log(`Fetching: ${targetUrl}`);

  try {
    // Fetch the requested page (HTTP or HTTPS)
    const response = await fetch(targetUrl);
    const html = await response.text();

    // Parse with Readability
    const dom = new JSDOM(html, { url: targetUrl });
    const originalDocument = dom.window.document;
    
    // Extract all images from the original page before Readability processing
    const allImages = Array.from(originalDocument.querySelectorAll('img')).map(img => {
      const src = img.getAttribute('src');
      const alt = img.getAttribute('alt') || '';
      const title = img.getAttribute('title') || '';
      try {
        return {
          src: new URL(src, targetUrl).href,
          alt,
          title,
          element: img
        };
      } catch (error) {
        return null;
      }
    }).filter(Boolean);
    
    // Extract website logo/favicon
    const logoUrls = extractLogoUrls(originalDocument, targetUrl);
    console.log(`Found ${logoUrls.length} potential logos for ${targetUrl}:`, logoUrls);
    
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return res.status(500).send("Failed to parse content");
    }

    // Rewrite links to stay within the proxy, and force HTTP on any HTTPS links
    const contentDom = new JSDOM(article.content);
    const document = contentDom.window.document;
    
    // Enhanced link processing - preserve more links but filter problematic ones
    const problematicDomains = ['javascript:', 'mailto:', 'tel:', 'ftp:', 'file:'];
    document.querySelectorAll("a").forEach((link) => {
      let href = link.getAttribute("href");
      if (href && !href.startsWith("#")) {
        // Skip problematic protocols
        if (problematicDomains.some(domain => href.toLowerCase().startsWith(domain))) {
          link.removeAttribute("href");
          return;
        }
        
        try {
          let absoluteUrl = new URL(href, targetUrl).href;
          // Force HTTP instead of HTTPS
          absoluteUrl = absoluteUrl.replace(/^https:\/\//, "http://");
          // Ensure the link goes through the proxy
          link.setAttribute(
            "href",
            `http://${req.headers.host}/?url=${encodeURIComponent(absoluteUrl)}`
          );
        } catch (error) {
          // If URL parsing fails, remove the href
          link.removeAttribute("href");
        }
      }
    });

    // Process images: Enhanced approach to capture more images
    const imagePromises = [];
    const processedImageUrls = new Set();
    const currentPageImages = new Set(); // Track images already on this specific page
    
    // First, process existing images in the readable content
    document.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src");
      if (src) {
        try {
          const absoluteImageUrl = new URL(src, targetUrl).href;
          processedImageUrls.add(absoluteImageUrl);
          currentPageImages.add(absoluteImageUrl);
          const promise = processImage(absoluteImageUrl, targetUrl).then(processedImage => {
            if (processedImage) {
              img.setAttribute("src", `http://${req.headers.host}${processedImage.path}`);
              img.setAttribute("width", processedImage.width.toString());
              img.setAttribute("height", processedImage.height.toString());
              // Remove any existing style that might force dimensions
              img.removeAttribute("style");
              if (img.getAttribute('alt')) {
                img.setAttribute('alt', img.getAttribute('alt'));
              }
            } else {
              img.remove();
            }
          }).catch(() => img.remove());
          imagePromises.push(promise);
        } catch (error) {
          img.remove();
        }
      } else {
        img.remove();
      }
    });
    
    // Filter and rank additional images from original page
    const relevantImages = allImages
      .filter(imgData => !currentPageImages.has(imgData.src)) // Don't duplicate images already on this page
      .filter(imgData => {
        // Skip tiny images, ads, tracking pixels, etc.
        const url = imgData.src.toLowerCase();
        return !url.includes('pixel') && 
               !url.includes('beacon') && 
               !url.includes('tracking') &&
               !url.includes('analytics') &&
               !url.includes('ads') &&
               !url.includes('logo') && // Skip logos that might appear on multiple pages
               !url.includes('icon') && // Skip icons
               !url.match(/\.(gif|png|jpg|jpeg)\?.*[wh]=\d{1,2}$/) && // Skip very small images
               !url.includes('1x1') &&
               !url.includes('avatar') && // Skip user avatars
               !url.includes('profile'); // Skip profile images
      })
      .slice(0, 3); // Limit to 3 additional images to avoid overwhelming vintage systems
    
    console.log(`Found ${relevantImages.length} additional relevant images for page: ${targetUrl}`);
    
    // Process additional relevant images and add them to the page
    const additionalImagePromises = relevantImages.map((imgData, index) => {
      return processImage(imgData.src, targetUrl).then(processedImage => {
        if (processedImage) {
          currentPageImages.add(imgData.src); // Track this image as being on this page
          
          // Create new img element and add to content
          const newImg = document.createElement('img');
          newImg.setAttribute('src', `http://${req.headers.host}${processedImage.path}`);
          newImg.setAttribute('width', processedImage.width.toString());
          newImg.setAttribute('height', processedImage.height.toString());
          newImg.setAttribute('style', 'display: block; margin: 10px 0; border: 1px solid #ccc;');
          if (imgData.alt) {
            newImg.setAttribute('alt', imgData.alt);
          }
          if (imgData.title) {
            newImg.setAttribute('title', imgData.title);
          }
          
          // Insert images strategically in the content
          const paragraphs = document.querySelectorAll('p');
          if (paragraphs.length > index + 1) {
            // Insert after different paragraphs to spread them out
            const targetP = paragraphs[index + 1];
            if (targetP && targetP.parentNode) {
              targetP.parentNode.insertBefore(newImg, targetP.nextSibling);
            }
          } else if (document.body) {
            document.body.appendChild(newImg);
          }
          
          console.log(`Added additional image: ${imgData.src}`);
        }
      }).catch(error => {
        console.log(`Failed to process additional image: ${imgData.src} - ${error.message}`);
      });
    });
    
    imagePromises.push(...additionalImagePromises);
    
    // Process website logo
    let websiteLogo = null;
    if (logoUrls.length > 0) {
      for (const logoUrl of logoUrls) {
        try {
          websiteLogo = await processLogo(logoUrl, targetUrl);
          if (websiteLogo) {
            console.log(`Successfully processed logo: ${logoUrl}`);
            break; // Use the first successful logo
          }
        } catch (error) {
          console.log(`Failed to process logo ${logoUrl}:`, error.message);
        }
      }
    }
    
    // Wait for all image processing to complete
    await Promise.all(imagePromises);
    
    // Generate website header
    const websiteUrl = new URL(targetUrl);
    const websiteName = websiteUrl.hostname.replace('www.', '');
    
    const logoHtml = websiteLogo 
      ? `<img src="http://${req.headers.host}${websiteLogo.path}" width="${websiteLogo.width}" height="${websiteLogo.height}" alt="${websiteName} logo">` 
      : '';
    
    const headerHtml = `
      <div class="website-header">
        ${logoHtml}
        <strong>Source:</strong> ${websiteName} 
        <span class="website-info">(${websiteUrl.protocol}//${websiteUrl.host})</span>
      </div>
    `;

    // Enhanced CSS and styling support
    document.querySelectorAll("*").forEach((el) => {
      const style = el.getAttribute("style");
      if (style) {
        // Preserve background colors but remove background images
        let newStyle = style
          .replace(/background-image[^;]*;?/gi, '')
          .replace(/background[^;]*url\([^)]*\)[^;]*;?/gi, '')
          .trim();
        
        // Keep basic styling properties that work on vintage systems
        const allowedProperties = [
          'color', 'background-color', 'font-size', 'font-weight', 'font-family',
          'text-align', 'margin', 'padding', 'border', 'width', 'height'
        ];
        
        const styleParts = newStyle.split(';').filter(part => {
          const property = part.split(':')[0]?.trim().toLowerCase();
          return property && allowedProperties.some(allowed => property.includes(allowed));
        });
        
        if (styleParts.length > 0) {
          el.setAttribute("style", styleParts.join(';') + (styleParts[styleParts.length - 1].endsWith(';') ? '' : ';'));
        } else {
          el.removeAttribute("style");
        }
      }
    });
    
    // Add basic CSS for vintage Mac compatibility
    const basicStyles = `
      <style>
        body { font-family: Geneva, Arial, sans-serif; font-size: 12px; line-height: 1.4; margin: 8px; }
        h1 { font-size: 18px; font-weight: bold; margin: 8px 0; }
        h2 { font-size: 16px; font-weight: bold; margin: 6px 0; }
        h3 { font-size: 14px; font-weight: bold; margin: 4px 0; }
        p { margin: 4px 0; }
        a { color: #0000FF; text-decoration: underline; }
        a:visited { color: #800080; }
        img { max-width: 320px; max-height: 240px; border: 1px solid #000; height: auto; width: auto; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #000; padding: 2px; font-size: 11px; }
        .website-header { 
          background-color: #f0f0f0; 
          border: 2px solid #ccc; 
          padding: 8px; 
          margin-bottom: 12px; 
          font-size: 11px;
          font-family: Geneva, Arial, sans-serif;
        }
        .website-header img { 
          vertical-align: middle; 
          margin-right: 8px; 
          border: 1px solid #999;
          max-width: 32px;
          max-height: 32px;
        }
        .website-info { color: #666; margin-left: 8px; }
      </style>
    `;

    // Add a toolbar with a button to view the original page
    const toolbarHtml = `
      <div style="background-color: #333; color: white; padding: 10px; text-align: center;">
        <a href="/original?url=${encodeURIComponent(
          targetUrl
        )}" target="_blank" style="color: white; text-decoration: none; font-weight: bold;">View Original Page</a>
      </div>
    `;

    // Convert HTML content from UTF-8 to ISO-8859-1
    const htmlContent = `
      <html>
        <head>
          <meta charset="ISO-8859-1">
          <title>${article.title}</title>
          ${basicStyles}
        </head>
        <body>
          ${toolbarHtml}
          ${headerHtml}
          <h1>${article.title}</h1>
          ${document.body.innerHTML}
        </body>
      </html>
    `;

    // Convert to ISO-8859-1 using iconv-lite
    const isoHtml = iconv.encode(htmlContent, "ISO-8859-1");

    // Set response headers to indicate the encoding
    res.setHeader("Content-Type", "text/html; charset=ISO-8859-1");

    // Send the ISO-8859-1 encoded content
    res.send(isoHtml);
  } catch (error) {
    res.status(500).send(`Error fetching page: ${error.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Readability proxy running on http://localhost:${PORT}`);
});
