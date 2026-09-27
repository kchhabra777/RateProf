import * as cheerio from 'cheerio';

/**
 * Given a Thapar faculty profile URL, scrapes the page and returns the photo URL.
 * @param {string} profileUrl 
 * @returns {Promise<string|null>} The photo URL or null if not found
 */
export async function scrapeThaparPhoto(profileUrl) {
  try {
    if (!profileUrl || !profileUrl.includes('thapar.edu')) {
      return null;
    }

    const response = await fetch(profileUrl);
    if (!response.ok) {
      console.warn(`Failed to fetch ${profileUrl}: ${response.statusText}`);
      return null;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Thapar's profile page usually has an image within a specific class.
    // E.g. <img src="https://thapar.edu/images/faculty/xxxx.jpg" class="img-responsive"...> or inside a .faculty-image div
    let photoUrl = null;
    
    $('img').each((i, el) => {
      const src = $(el).attr('src');
      // We look for typical faculty image paths
      if (src && (src.includes('images/faculty/') || src.includes('faculties/images/') || src.includes('uploads/faculty/'))) {
        photoUrl = src;
        // Break out of each
        return false;
      }
    });

    if (photoUrl && !photoUrl.startsWith('http')) {
      // Handle relative URLs
      if (photoUrl.startsWith('/')) {
        photoUrl = 'https://www.thapar.edu' + photoUrl;
      } else {
        photoUrl = 'https://www.thapar.edu/' + photoUrl;
      }
    }

    return photoUrl;
  } catch (error) {
    console.error("Error scraping Thapar profile photo:", error.message);
    return null;
  }
}
