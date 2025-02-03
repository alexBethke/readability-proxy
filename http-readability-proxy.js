import express from "express";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import iconv from "iconv-lite"; // Import the iconv-lite library for encoding conversion

const app = express();
const PORT = 8080;

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
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return res.status(500).send("Failed to parse content");
    }

    // Rewrite links to stay within the proxy, and force HTTP on any HTTPS links
    const contentDom = new JSDOM(article.content);
    const document = contentDom.window.document;
    document.querySelectorAll("a").forEach((link) => {
      let href = link.getAttribute("href");
      if (href && !href.startsWith("#")) {
        let absoluteUrl = new URL(href, targetUrl).href;

        // Force HTTP instead of HTTPS
        absoluteUrl = absoluteUrl.replace(/^https:\/\//, "http://");

        // Ensure the link goes through the proxy
        link.setAttribute(
          "href",
          `http://${req.headers.host}/?url=${encodeURIComponent(absoluteUrl)}`
        );
      }
    });

    // Remove all <img> tags
    document.querySelectorAll("img").forEach((img) => img.remove());

    // Remove all background images (inline styles and CSS)
    document.querySelectorAll("*").forEach((el) => {
      const style = el.getAttribute("style");
      if (style && /background-image/i.test(style)) {
        el.style.backgroundImage = "none"; // Remove inline background image
      }
    });

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
        </head>
        <body>
          ${toolbarHtml}
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
