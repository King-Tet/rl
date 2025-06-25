// home-server.js

const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000; // You can change the port if you need to

/**
 * The core scraping logic, now wrapped in a reusable function.
 * @param {string} platform The player's platform (e.g., 'epic', 'steam').
 * @param {string} username The player's username.
 * @returns {Promise<object>} A promise that resolves with the parsed JSON data.
 */
async function scrapeProfile(platform, username) {
  const urlToScrape = `https://api.tracker.gg/api/v2/rocket-league/standard/profile/${platform}/${username}`;
  let browser;

  console.log(`[Scraper] Launching browser for ${platform}/${username}...`);

  try {
    browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');
    
    console.log(`[Scraper] Navigating to ${urlToScrape}`);
    await page.goto(urlToScrape, { waitUntil: 'networkidle2' });
    
    await page.waitForSelector('pre', { timeout: 15000 }); // Increased timeout for reliability
    
    const jsonDataString = await page.evaluate(() => {
      const preElement = document.querySelector('pre');
      return preElement ? preElement.innerText : null;
    });

    if (!jsonDataString) {
      throw new Error('Could not find data to scrape on the page.');
    }
    
    return JSON.parse(jsonDataString);

  } finally {
    if (browser) {
      console.log(`[Scraper] Closing browser for ${platform}/${username}.`);
      await browser.close();
    }
  }
}

// Define the API route. It will listen for requests like /scrape/epic/King-Tet
app.get('/scrape/:platform/:username', async (req, res) => {
  const { platform, username } = req.params;

  if (!platform || !username) {
    return res.status(400).json({ error: 'Platform and username are required.' });
  }

  console.log(`[API] Received request for ${platform}/${username}.`);

  try {
    const data = await scrapeProfile(platform, username);
    console.log(`[API] Successfully scraped data. Sending response.`);
    res.status(200).json(data);
  } catch (error) {
    console.error(`[API] Error scraping for ${platform}/${username}:`, error);
    res.status(500).json({ error: `An error occurred: ${error.message}` });
  }
});

// A simple root endpoint to confirm the server is running.
app.get('/', (req, res) => {
  res.status(200).send('Scraper service is running.');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Scraper service listening on http://localhost:${PORT}`);
});
