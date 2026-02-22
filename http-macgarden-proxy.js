import express from "express";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import iconv from "iconv-lite";
import sharp from "sharp";
import { mkdirSync, existsSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { URL } from "url";
import crypto from "crypto";

const app = express();
const PORT = 8082;

// Create images cache directory
const IMAGES_DIR = join(process.cwd(), 'macgarden_images');
const STATIC_DIR = join(process.cwd(), 'static');
if (!existsSync(IMAGES_DIR)) {
  mkdirSync(IMAGES_DIR, { recursive: true });
}

// Convert logo PNG to GIF on startup
const LOGO_PATH = join(STATIC_DIR, 'garden.png');
const LOGO_GIF_PATH = join(IMAGES_DIR, 'logo.gif');

async function convertLogoToGif() {
  if (existsSync(LOGO_PATH)) {
    try {
      const logoBuffer = readFileSync(LOGO_PATH);
      const gifBuffer = await sharp(logoBuffer)
        .resize({ width: 48, height: 48, fit: 'inside' })
        .gif()
        .toBuffer();
      writeFileSync(LOGO_GIF_PATH, gifBuffer);
      console.log('Converted logo to GIF');
    } catch (error) {
      console.error('Failed to convert logo:', error.message);
    }
  }
}
convertLogoToGif();

// Serve cached images
app.use('/macgarden_images', express.static(IMAGES_DIR));

// Function to create a hash from URL
function createImageHash(imageUrl) {
  return crypto.createHash('md5').update(imageUrl).digest('hex').substring(0, 16);
}

// Function to convert and cache images for vintage Macs (PNG to GIF, others to GIF too)
async function processImage(imageUrl) {
  try {
    const hash = createImageHash(imageUrl);
    const filename = `${hash}.gif`;
    const filepath = join(IMAGES_DIR, filename);
    
    // Check if already cached
    if (existsSync(filepath)) {
      const cachedMetadata = await sharp(filepath).metadata();
      return {
        path: `/macgarden_images/${filename}`,
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
    
    if (!response.ok) return null;
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) return null;
    
    const buffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(buffer);
    
    // Convert to GIF for classic Mac compatibility
    const processedBuffer = await sharp(imageBuffer)
      .resize({ 
        width: 400, 
        height: 300, 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .gif()
      .toBuffer();
    
    const processedMetadata = await sharp(processedBuffer).metadata();
    writeFileSync(filepath, processedBuffer);
    
    return {
      path: `/macgarden_images/${filename}`,
      width: processedMetadata.width,
      height: processedMetadata.height
    };
  } catch (error) {
    console.error(`Error processing image ${imageUrl}:`, error.message);
    return null;
  }
}

// Transform macintoshgarden.org header to table layout
function transformHeader(document, host) {
  // Remove original header/nav elements
  const header = document.querySelector('#header, header, .header');
  const nav = document.querySelector('#navigation, nav, .nav, .menu');
  const logo = document.querySelector('#logo, .logo, .site-logo');
  const firstUl = document.querySelector('ul');
  
  // Extract navigation links before removing
  const navLinks = [];
  
  // First, check the first <ul> on the page (often the main nav)
  if (firstUl) {
    firstUl.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href');
      const text = link.textContent.trim();
      if (href && text && !href.startsWith('#') && text.length < 30) {
        navLinks.push({ href, text });
      }
    });
  }
  
  // Also check nav element
  if (nav) {
    nav.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href');
      const text = link.textContent.trim();
      if (href && text && !href.startsWith('#')) {
        if (!navLinks.find(l => l.href === href)) {
          navLinks.push({ href, text });
        }
      }
    });
  }
  
  // Also check for menu items in header
  if (header) {
    header.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href');
      const text = link.textContent.trim();
      if (href && text && !href.startsWith('#') && text.length < 30) {
        // Avoid duplicates
        if (!navLinks.find(l => l.href === href)) {
          navLinks.push({ href, text });
        }
      }
    });
  }
  
  // Remove original elements
  if (firstUl) firstUl.remove();
  if (header) header.remove();
  if (nav) nav.remove();
  if (logo) logo.remove();
  
  // Remove sidebar
  document.querySelectorAll('#sidebar, .sidebar, [class*="sidebar"]').forEach(el => el.remove());
  
  // Also remove any fixed/sticky headers
  document.querySelectorAll('[class*="header"], [id*="header"]').forEach(el => {
    if (el.tagName === 'HEADER' || el.className.includes('site-header')) {
      el.remove();
    }
  });
  
  // Build table-based header with garden green theme
  const wrapper = document.createElement('div');
  
  // Header table (logo + title)
  const tableHeader = document.createElement('table');
  tableHeader.setAttribute('width', '100%');
  tableHeader.setAttribute('border', '0');
  tableHeader.setAttribute('cellpadding', '0');
  tableHeader.setAttribute('cellspacing', '0');
  
  // Logo and title row
  const titleRow = document.createElement('tr');
  titleRow.setAttribute('bgcolor', '#FBF4E1');
  
  // Logo cell
  const logoCell = document.createElement('td');
  logoCell.setAttribute('width', '60');
  logoCell.setAttribute('align', 'center');
  logoCell.setAttribute('valign', 'middle');
  logoCell.setAttribute('bgcolor', '#FBF4E1');
  logoCell.setAttribute('style', 'padding: 6px;');
  logoCell.innerHTML = `<a href="/"><img src="http://${host}/macgarden_images/logo.gif" width="48" height="48" alt="Logo" border="0"></a>`;
  titleRow.appendChild(logoCell);
  
  // Title cell
  const titleCell = document.createElement('td');
  titleCell.setAttribute('align', 'left');
  titleCell.setAttribute('valign', 'middle');
  titleCell.setAttribute('style', 'padding: 8px;');
  titleCell.innerHTML = `<font color="#4A7C4E" size="5"><b>Macintosh Garden</b></font><br><font color="#5C8F5F" size="2">Classic Mac Software Archive</font>`;
  titleRow.appendChild(titleCell);
  
  // Search cell (third column)
  const searchCell = document.createElement('td');
  searchCell.setAttribute('width', '250');
  searchCell.setAttribute('align', 'right');
  searchCell.setAttribute('valign', 'middle');
  searchCell.setAttribute('style', 'padding: 8px;');
  
  const searchActionUrl = `http://${host}/search`;
  searchCell.innerHTML = `<form method="get" action="${searchActionUrl}"><input type="text" maxlength="128" name="keys" size="15"><input type="submit" value="Search"></form>`;
  
  titleRow.appendChild(searchCell);
  
  tableHeader.appendChild(titleRow);
  
  wrapper.appendChild(tableHeader);
  
  // Navigation table (separate)
  if (navLinks.length > 0) {
    const navTable = document.createElement('table');
    navTable.setAttribute('width', '100%');
    navTable.setAttribute('border', '0');
    navTable.setAttribute('cellpadding', '0');
    navTable.setAttribute('cellspacing', '0');
    
    const navRow = document.createElement('tr');
    navRow.setAttribute('bgcolor', '#5C8F5F');
    
    const navCell = document.createElement('td');
    navCell.setAttribute('align', 'center');
    
    // Limit to reasonable number of nav items
    const displayLinks = navLinks.slice(0, 8);
    
    const linkHtml = displayLinks.map(link => {
      let proxyHref = link.href;
      try {
        const absUrl = new URL(link.href, 'https://macintoshgarden.org').href;
        proxyHref = `http://${host}/?url=${encodeURIComponent(absUrl)}`;
      } catch (e) {}
      return `<a href="${proxyHref}"><font color="#FFFFFF" size="3"><b>${link.text}</b></font></a>`;
    }).join(' <font color="#A8D4A8">|</font> ');
    
    navCell.innerHTML = linkHtml;
    navRow.appendChild(navCell);
    navTable.appendChild(navRow);
    
    wrapper.appendChild(navTable);
  }
  
  // Bottom border table
  const borderTable = document.createElement('table');
  borderTable.setAttribute('width', '100%');
  borderTable.setAttribute('border', '0');
  borderTable.setAttribute('cellpadding', '0');
  borderTable.setAttribute('cellspacing', '0');
  
  const borderRow = document.createElement('tr');
  const borderCell = document.createElement('td');
  borderCell.setAttribute('bgcolor', '#2D4A2F');
  borderCell.setAttribute('height', '3');
  borderRow.appendChild(borderCell);
  borderTable.appendChild(borderRow);
  
  wrapper.appendChild(borderTable);
  
  return wrapper;
}

// Handle search route - redirect to proxy with search URL
app.get('/search', (req, res) => {
  const keys = req.query.keys || '';
  const searchUrl = `http://www.macintoshgarden.org/search/node?keys=${encodeURIComponent(keys)}`;
  res.redirect(`/?url=${encodeURIComponent(searchUrl)}`);
});

app.use(async (req, res) => {
  let targetUrl = req.query.url;

  // Default to macintoshgarden.org if no URL provided
  if (!targetUrl) {
    targetUrl = "https://macintoshgarden.org/";
  }

  // Fix common 'ttp' typo
  if (targetUrl.startsWith("ttp://") || targetUrl.startsWith("ttps://")) {
    targetUrl = "h" + targetUrl;
  }

  console.log(`Fetching: ${targetUrl}`);

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    const contentType = response.headers.get('content-type') || '';
    
    // Don't proxy binary content - redirect to original
    const isText = contentType.startsWith('text/') || 
                   contentType.includes('json') || 
                   contentType.includes('xml');
    if (!isText) {
      return res.redirect(targetUrl);
    }
    
    const html = await response.text();

    // Parse the HTML
    const dom = new JSDOM(html, { url: targetUrl });
    const document = dom.window.document;
    
    // Remove all existing styles
    document.querySelectorAll('style').forEach(el => el.remove());
    document.querySelectorAll('link[rel="stylesheet"]').forEach(el => el.remove());
    document.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
    
    // Remove scripts
    document.querySelectorAll('script').forEach(el => el.remove());
    
    // Transform header to table layout
    const tableHeader = transformHeader(document, req.headers.host);
    
    // Process all images
    const imagePromises = [];
    const images = document.querySelectorAll('img');
    
    for (const img of images) {
      const src = img.getAttribute('src');
      if (src) {
        try {
          const absoluteImageUrl = new URL(src, targetUrl).href;
          const promise = processImage(absoluteImageUrl).then(processedImage => {
            if (processedImage) {
              img.setAttribute('src', `http://${req.headers.host}${processedImage.path}`);
              img.setAttribute('width', String(processedImage.width));
              img.setAttribute('height', String(processedImage.height));
              img.setAttribute('border', '1');
            }
          }).catch(() => {});
          imagePromises.push(promise);
        } catch (error) {
          // Skip invalid URLs
        }
      }
    }
    
    await Promise.all(imagePromises);
    
    // Rewrite all links to go through proxy
    document.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
        try {
          let absoluteUrl = new URL(href, targetUrl).href;
          // Force HTTP for vintage Mac compatibility
          absoluteUrl = absoluteUrl.replace(/^https:\/\//, 'http://');
          link.setAttribute('href', `http://${req.headers.host}/?url=${encodeURIComponent(absoluteUrl)}`);
        } catch (error) {
          // Keep original href if URL parsing fails
        }
      }
    });
    
    // Build the final HTML with table-based layout
    const bodyContent = document.body ? document.body.innerHTML : '';
    
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="ISO-8859-1">
<title>${document.title || 'Macintosh Garden'}</title>
<style>
body { font-family: Geneva, Arial, sans-serif; font-size: 12px; margin: 0; padding: 0; background-color: #F5F5E8; }
a { color: #2D5A2E; text-decoration: underline; }
a:visited { color: #4A7C4E; }
a:hover { color: #6B9F6E; }
table { font-size: 12px; }
td { vertical-align: top; }
img { border: 1px solid #7BA37D; }
h1, h2, h3 { color: #2D5A2E; }
h1 { font-size: 16px; margin: 8px 0; }
h2 { font-size: 14px; margin: 6px 0; }
h3 { font-size: 12px; margin: 4px 0; }
p { margin: 6px 0; line-height: 1.4; }
hr { border: none; border-top: 1px solid #7BA37D; margin: 8px 0; }
</style>
<body spacing="0" padding="0" cellpadding="0" cellspacing="0">
${tableHeader.outerHTML}
<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#F5F5E8">
<tr>
<td>
${bodyContent}
</td>
</tr>
</table>
<table width="100%" border="0" cellpadding="6" cellspacing="0" bgcolor="#3D6B40">
<tr>
<td align="center">
<font color="#FBF4E1" size="1">Macintosh Garden Proxy - Classic Mac Compatible</font>
</td>
</tr>
</table>
</body>
</html>`;
    
    // Convert to ISO-8859-1 for vintage Mac compatibility
    const isoHtml = iconv.encode(htmlContent, "ISO-8859-1");
    res.setHeader("Content-Type", "text/html; charset=ISO-8859-1");
    res.send(isoHtml);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send(`Error fetching page: ${error.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Macintosh Garden proxy running on http://localhost:${PORT}`);
});
