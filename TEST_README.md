# Unit Tests for Readability Proxy

This document describes the unit tests for the HTTP Readability Proxy and HTTP Image Convert Proxy services.

## Test Coverage

The test suite covers the following requirements for HTML generation:

### 1. HTML Structure Tests
- ✅ Generated HTML has correct `<!DOCTYPE html>` declaration
- ✅ Generated HTML includes proper `<html>`, `<head>`, and `<body>` structure
- ✅ HTML elements are properly nested

### 2. Charset Meta Tag Tests
- ✅ Generated HTML includes the correct `<meta charset="ISO-8859-1">` tag
- ✅ Charset meta tag is located in the `<head>` section
- ✅ Charset is specifically ISO-8859-1 (not UTF-8)

### 3. Title Tag Tests
- ✅ Generated HTML includes the correct `<title>` tag based on the original document's title
- ✅ Title tag is properly placed in the `<head>` section
- ✅ Title handles special characters appropriately

### 4. Body Content Tests
- ✅ Generated HTML includes the correct content within the `<body>` tag
- ✅ Body content preserves HTML structure from the original document
- ✅ Body content includes processed images

### 5. HTTP Response Header Tests
- ✅ HTTP response includes the `Content-Type: text/html; charset=ISO-8859-1` header
- ✅ Content-Type header format is correct

## Test Files

- `http-readability-proxy.test.js` - Tests for the Readability proxy service (port 8080)
- `http-image-convert-proxy.test.js` - Tests for the Image Convert proxy service (port 8081)

## Running the Tests

### Install Dependencies

First, install the required testing dependencies:

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

This will re-run tests automatically when files change:

```bash
npm run test:watch
```

### Run Tests with Coverage

This will generate a coverage report:

```bash
npm run test:coverage
```

The coverage report will be generated in the `coverage/` directory.

## Test Structure

Each test file is organized into describe blocks:

- **HTML Structure Tests** - Validates DOCTYPE, html, head, and body tags
- **Charset Meta Tag Tests** - Validates ISO-8859-1 charset declaration
- **Title Tag Tests** - Validates title tag and content
- **Body Content Tests** - Validates body content preservation
- **HTTP Response Headers Tests** - Validates Content-Type headers
- **Integration Tests** - Tests complete HTML generation with all elements

## Test Framework

The tests use:
- **Jest** - Testing framework
- **Supertest** - HTTP assertion library for testing Express apps
- **ES Modules** - Modern JavaScript module system

## Key Test Cases

### HTML Structure
```javascript
test('should have proper HTML structure with DOCTYPE, html, head, and body tags')
```

### Charset Meta Tag
```javascript
test('should include correct charset meta tag ISO-8859-1')
```

### Title Tag
```javascript
test('should include title tag based on article title')
```

### Body Content
```javascript
test('should include correct content within body tag')
```

### Content-Type Header
```javascript
test('should include Content-Type header with text/html and charset ISO-8859-1')
```

## Notes

- The tests are designed to validate the HTML generation logic, not the full end-to-end proxy functionality
- Mock objects are used to simulate external dependencies (fetch, JSDOM, Readability, etc.)
- Tests verify both individual components and complete integration scenarios
- All tests ensure compatibility with ISO-8859-1 encoding for vintage Mac systems
