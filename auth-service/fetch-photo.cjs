const fetch = require('node-fetch');
const cheerio = require('cheerio');

async function scrapePhoto(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Attempt to find the photo.
    // Usually on university faculty pages there is an img tag inside some specific div, e.g. class containing 'profile' or 'photo' or 'faculty'
    // Let's print out all image srcs that look like profile photos.
    const imgs = [];
    $('img').each((i, el) => {
      imgs.push($(el).attr('src'));
    });
    console.log("Found images:", imgs);
  } catch(e) {
    console.error(e);
  }
}

scrapePhoto('https://www.thapar.edu/faculties/view/Dr.-Anjula-Mehto/1574');
