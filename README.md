# PaperScraper Pro

A specialized tool to scrape, parse, and convert digital newspaper content (specifically designed for Founder E-Paper systems like China Education Daily) into clean Markdown. It features bulk date processing and AI-powered text cleanup using Google Gemini.

## Features

- **Bulk Scraping**: Scrape multiple dates and pages automatically.
- **Smart Parsing**: Handles "Founder" system idiosyncrasies (GBK encoding, node_id pagination, table-based layouts).
- **AI Optimization**: Uses Google Gemini to clean up broken text and formatting.
- **Markdown Export**: Export your collection as a single, formatted Markdown file.

## Deployment

### Vercel (Recommended)

1.  Push this code to a GitHub repository.
2.  Import the project into Vercel.
3.  Vercel should automatically detect the settings (Framework: Vite).
4.  **Environment Variables**: Go to the project settings in Vercel and add:
    *   `VITE_API_KEY`: Your Google Gemini API Key.

### Local Development

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Create a `.env` file in the root directory:
    ```env
    VITE_API_KEY=your_google_gemini_api_key_here
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```

## Configuration

*   **URL Pattern**: `http://paper.jyb.cn/zgjyb/html/{YYYY}-{MM}/{DD}/node_{PAGE}.htm`
*   **Selectors**: Pre-configured for `jyb.cn` but adjustable in the UI settings.
*   **Proxy**: Enabled by default using `allorigins.win` to bypass CORS restrictions in the browser.
