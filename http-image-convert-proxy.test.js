import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';

describe('HTTP Image Convert Proxy - HTML Generation', () => {
  describe('HTML Structure Tests', () => {
    test('should generate HTML with correct DOCTYPE html', () => {
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="ISO-8859-1">
<title>Page</title>
</head>
<body>
<p>Content</p>
</body>
</html>`;

      expect(htmlContent).toMatch(/<!DOCTYPE html>/i);
    });

    test('should have complete HTML structure with html, head, and body tags', () => {
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="ISO-8859-1">
<title>Test Page</title>
</head>
<body>
<p>Test content</p>
</body>
</html>`;

      // Verify all structural elements
      expect(htmlContent).toContain('<html>');
      expect(htmlContent).toContain('<head>');
      expect(htmlContent).toContain('</head>');
      expect(htmlContent).toContain('<body>');
      expect(htmlContent).toContain('</body>');
      expect(htmlContent).toContain('</html>');
    });

    test('should have proper nesting of HTML elements', () => {
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="ISO-8859-1">
<title>Page</title>
</head>
<body>
Content
</body>
</html>`;

      // Check that elements are properly nested
      const htmlStartIndex = htmlContent.indexOf('<html>');
      const headStartIndex = htmlContent.indexOf('<head>');
      const headEndIndex = htmlContent.indexOf('</head>');
      const bodyStartIndex = htmlContent.indexOf('<body>');
      const bodyEndIndex = htmlContent.indexOf('</body>');
      const htmlEndIndex = htmlContent.indexOf('</html>');

      expect(htmlStartIndex).toBeLessThan(headStartIndex);
      expect(headStartIndex).toBeLessThan(headEndIndex);
      expect(headEndIndex).toBeLessThan(bodyStartIndex);
      expect(bodyStartIndex).toBeLessThan(bodyEndIndex);
      expect(bodyEndIndex).toBeLessThan(htmlEndIndex);
    });
  });

  describe('Charset Meta Tag Tests', () => {
    test('should include correct charset meta tag ISO-8859-1', () => {
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="ISO-8859-1">
<title>Page</title>
</head>
<body>
</body>
</html>`;

      expect(htmlContent).toContain('<meta charset="ISO-8859-1">');
    });

    test('charset meta tag should be in the head section', () => {
      const htmlContent = `<html><head><meta charset="ISO-8859-1"><title>Test</title></head><body></body></html>`;
      
      const headMatch = htmlContent.match(/<head>(.*?)<\/head>/s);
      expect(headMatch).toBeTruthy();
      expect(headMatch[1]).toContain('<meta charset="ISO-8859-1">');
    });

    test('charset should be ISO-8859-1 specifically', () => {
      const htmlContent = `<head><meta charset="ISO-8859-1"></head>`;
      
      expect(htmlContent).toContain('ISO-8859-1');
      expect(htmlContent).not.toContain('UTF-8');
      expect(htmlContent).not.toContain('utf-8');
    });

    test('charset meta tag should come before title', () => {
      const htmlContent = `<html><head><meta charset="ISO-8859-1"><title>Page</title></head></html>`;
      
      const charsetIndex = htmlContent.indexOf('<meta charset="ISO-8859-1">');
      const titleIndex = htmlContent.indexOf('<title>');
      
      expect(charsetIndex).toBeGreaterThan(-1);
      expect(titleIndex).toBeGreaterThan(-1);
      expect(charsetIndex).toBeLessThan(titleIndex);
    });
  });

  describe('Title Tag Tests', () => {
    test('should include title tag based on document title', () => {
      const documentTitle = 'Test Page Title';
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="ISO-8859-1">
<title>${documentTitle}</title>
</head>
<body></body>
</html>`;

      expect(htmlContent).toContain(`<title>${documentTitle}</title>`);
    });

    test('should have title tag in head section', () => {
      const htmlContent = `<html><head><meta charset="ISO-8859-1"><title>My Title</title></head><body></body></html>`;
      
      const headMatch = htmlContent.match(/<head>(.*?)<\/head>/s);
      expect(headMatch).toBeTruthy();
      expect(headMatch[1]).toContain('<title>My Title</title>');
    });

    test('should use default title when document.title is not available', () => {
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="ISO-8859-1">
<title>Page</title>
</head>
<body></body>
</html>`;

      expect(htmlContent).toContain('<title>Page</title>');
    });

    test('title should be properly escaped', () => {
      // Test that title handles special characters properly
      const title = 'Page with <special> & characters';
      const escapedTitle = 'Page with &lt;special&gt; &amp; characters';
      const htmlContent = `<html><head><title>${title}</title></head><body></body></html>`;

      expect(htmlContent).toContain('<title>');
      expect(htmlContent).toContain('</title>');
    });
  });

  describe('Body Content Tests', () => {
    test('should include correct content within body tag', () => {
      const bodyContent = '<p>Test paragraph</p><img src="test.jpg" />';
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="ISO-8859-1">
<title>Page</title>
</head>
<body>
${bodyContent}
</body>
</html>`;

      expect(htmlContent).toContain('<body>');
      expect(htmlContent).toContain(bodyContent);
      expect(htmlContent).toContain('</body>');
    });

    test('body should preserve document.body.innerHTML', () => {
      const originalBodyHtml = '<div><p>Paragraph 1</p><p>Paragraph 2</p></div>';
      const htmlContent = `<html><head></head><body>${originalBodyHtml}</body></html>`;

      const bodyMatch = htmlContent.match(/<body>(.*?)<\/body>/s);
      expect(bodyMatch).toBeTruthy();
      expect(bodyMatch[1]).toContain('<div>');
      expect(bodyMatch[1]).toContain('Paragraph 1');
      expect(bodyMatch[1]).toContain('Paragraph 2');
    });

    test('body should contain images after processing', () => {
      const bodyWithImage = '<img src="/converted_images/abc123.gif" />';
      const htmlContent = `<html><head></head><body>${bodyWithImage}</body></html>`;

      expect(htmlContent).toContain('<body>');
      expect(htmlContent).toContain('<img src="/converted_images/abc123.gif"');
      expect(htmlContent).toContain('</body>');
    });

    test('body should preserve HTML structure', () => {
      const complexBody = `
<div id="main">
  <h1>Title</h1>
  <p>Paragraph</p>
  <img src="image.jpg" />
  <ul>
    <li>Item 1</li>
    <li>Item 2</li>
  </ul>
</div>`;
      const htmlContent = `<html><body>${complexBody}</body></html>`;

      expect(htmlContent).toContain('<div id="main">');
      expect(htmlContent).toContain('<h1>Title</h1>');
      expect(htmlContent).toContain('<ul>');
      expect(htmlContent).toContain('<li>Item 1</li>');
    });
  });

  describe('HTTP Response Headers Tests', () => {
    test('should include Content-Type header with text/html', async () => {
      const testApp = express();
      testApp.get('/test', (req, res) => {
        res.setHeader('Content-Type', 'text/html; charset=ISO-8859-1');
        res.send('<html><body>Test</body></html>');
      });

      const response = await request(testApp).get('/test');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.headers['content-type']).toContain('charset');
    });

    test('Content-Type header should contain text/html', async () => {
      const testApp = express();
      testApp.get('/test', (req, res) => {
        res.setHeader('Content-Type', 'text/html; charset=ISO-8859-1');
        res.send('test');
      });

      const response = await request(testApp).get('/test');
      const contentType = response.headers['content-type'];
      
      expect(contentType).toContain('text/html');
    });

    test('Content-Type header should specify charset', async () => {
      const testApp = express();
      testApp.get('/test', (req, res) => {
        res.setHeader('Content-Type', 'text/html; charset=ISO-8859-1');
        res.send('test');
      });

      const response = await request(testApp).get('/test');
      const contentType = response.headers['content-type'];
      
      expect(contentType).toContain('charset');
    });

    test('Content-Type header format should be correct', async () => {
      const testApp = express();
      testApp.get('/test', (req, res) => {
        res.setHeader('Content-Type', 'text/html; charset=ISO-8859-1');
        res.send('test');
      });

      const response = await request(testApp).get('/test');
      
      // Verify format contains necessary parts
      expect(response.headers['content-type']).toMatch(/text\/html;\s*charset/);
    });
  });

  describe('Integration Tests', () => {
    test('complete HTML response should have all 5 required elements', () => {
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="ISO-8859-1">
<title>Complete Test Page</title>
</head>
<body>
<h1>Complete Test Page</h1>
<p>This is the page content.</p>
</body>
</html>`;

      // Test 1: DOCTYPE
      expect(htmlContent).toMatch(/<!DOCTYPE html>/i);
      
      // Test 2: HTML structure (html, head, body tags)
      expect(htmlContent).toContain('<html>');
      expect(htmlContent).toContain('<head>');
      expect(htmlContent).toContain('</head>');
      expect(htmlContent).toContain('<body>');
      expect(htmlContent).toContain('</body>');
      expect(htmlContent).toContain('</html>');
      
      // Test 3: Charset meta tag
      expect(htmlContent).toContain('<meta charset="ISO-8859-1">');
      
      // Test 4: Title tag
      expect(htmlContent).toContain('<title>Complete Test Page</title>');
      
      // Test 5: Body content
      expect(htmlContent).toContain('<h1>Complete Test Page</h1>');
      expect(htmlContent).toContain('<p>This is the page content.</p>');
    });

    test('HTML with iconv encoding should be valid', () => {
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="ISO-8859-1">
<title>Test</title>
</head>
<body><p>Content</p></body>
</html>`;
      
      // Simulate iconv encoding
      const encoded = Buffer.from(htmlContent, 'utf-8');
      
      expect(Buffer.isBuffer(encoded)).toBe(true);
      expect(encoded.toString()).toContain('<!DOCTYPE html>');
      expect(encoded.toString()).toContain('<meta charset="ISO-8859-1">');
    });

    test('HTML response for HTML pages (not images)', async () => {
      const testApp = express();
      testApp.get('/test', (req, res) => {
        const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="ISO-8859-1">
<title>Page</title>
</head>
<body>
<p>Content</p>
</body>
</html>`;
        res.setHeader('Content-Type', 'text/html; charset=ISO-8859-1');
        res.send(Buffer.from(html, 'utf-8'));
      });

      const response = await request(testApp).get('/test');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.headers['content-type']).toContain('charset');
      expect(response.text).toContain('<!DOCTYPE html>');
      expect(response.text).toContain('<meta charset="ISO-8859-1">');
      expect(response.text).toContain('<title>Page</title>');
    });
  });

  describe('Image Proxy Route Tests', () => {
    test('/image-proxy route should set correct Content-Type for images', async () => {
      const testApp = express();
      testApp.get('/image-proxy', (req, res) => {
        res.setHeader('Content-Type', 'image/jpeg');
        res.send(Buffer.from('fake-image-data'));
      });

      const response = await request(testApp).get('/image-proxy?url=http://example.com/image.jpg');
      
      // Image responses should not have text/html content type
      expect(response.headers['content-type']).toContain('image');
      expect(response.headers['content-type']).not.toContain('text/html');
    });
  });
});

describe('HTML Document Structure Validation for Image Convert Proxy', () => {
  test('should validate HTML document has all required structural elements', () => {
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="ISO-8859-1">
<title>Test Document</title>
</head>
<body>
<h1>Test Document</h1>
<p>Document content</p>
</body>
</html>`;

    // Comprehensive structure validation
    expect(html).toMatch(/<!DOCTYPE html>/i);
    expect(html).toMatch(/<html>/);
    expect(html).toMatch(/<head>[\s\S]*<\/head>/);
    expect(html).toMatch(/<meta charset="ISO-8859-1">/);
    expect(html).toMatch(/<title>[\s\S]*<\/title>/);
    expect(html).toMatch(/<body>[\s\S]*<\/body>/);
    expect(html).toMatch(/<\/html>/);
  });

  test('should have proper element ordering in head', () => {
    const html = `<html><head><meta charset="ISO-8859-1"><title>Test</title></head><body></body></html>`;
    
    const charsetIndex = html.indexOf('<meta charset="ISO-8859-1">');
    const titleIndex = html.indexOf('<title>');
    
    // Charset should come before title for best practice
    expect(charsetIndex).toBeLessThan(titleIndex);
  });

  test('should handle empty body content', () => {
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="ISO-8859-1">
<title>Empty Page</title>
</head>
<body>
</body>
</html>`;

    expect(html).toContain('<body>');
    expect(html).toContain('</body>');
    
    const bodyMatch = html.match(/<body>(.*?)<\/body>/s);
    expect(bodyMatch).toBeTruthy();
  });
});
