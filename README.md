
# Readability Proxy with Original Page Viewer

This proxy allows you to fetch webpages and simplify them for easier reading on vintage or limited-capacity devices, while also providing a way to view the original content.

## Features:
- **Readability Mode**: Strips unnecessary elements and simplifies the page for reading.
- **ISO-8859-1 Encoding**: Converts content to ISO-8859-1 encoding for compatibility with older systems that don’t support UTF-8.
- **Original Page Button**: Allows users to view the original, unmodified page in a separate window.

## Setup Instructions

### Prerequisites:
- Node.js (v14 or above) installed
- NPM or Yarn (for package management)

### 1. Clone the repository or download the code.

```bash
git clone https://github.com/yourusername/readability-proxy.git
cd readability-proxy
```

### 2. Install Dependencies

```bash
npm install
```

This will install the necessary dependencies:
- `express` - Web server framework
- `node-fetch` - To fetch pages
- `jsdom` - To parse and manipulate HTML
- `@mozilla/readability` - For extracting simplified readable content
- `iconv-lite` - For converting content to ISO-8859-1 encoding

### 3. Run the Proxy Server

Start the server by running:

```bash
node http-readability-proxy.js
```

This will start the readability proxy server on [http://localhost:8080](http://localhost:8080).

### 4. Using the Proxy

- To access a simplified, readable version of any page, visit `http://localhost:8080/?url=http://example.com`.
- To view the original unmodified page, click the **"View Original Page"** button at the top of the page.

### Example Usage:

- Simplified page: `http://localhost:8080/?url=http://www.apple.com`
- View original page: A "View Original Page" button is available on the simplified page. Clicking it will open the original page in a new tab.

## Code Explanation

- The **main proxy server** (`http-readability-proxy.js`) listens for requests and fetches the target page.
- It uses the **Readability** library to simplify the content for better readability on low-powered systems.
- All pages are converted to **ISO-8859-1** encoding using the `iconv-lite` library to ensure compatibility with older systems.
- The **original page** can be viewed by clicking the button in the toolbar at the top of the page. This redirects the user to the original URL without readability enhancements.

## Notes

- The proxy works with both HTTP and HTTPS URLs. It automatically forces HTTPS URLs to HTTP, as older systems may not handle HTTPS.
- If you are using a vintage browser or system that doesn’t support UTF-8, this proxy should allow you to view simplified content in ISO-8859-1 encoding.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
