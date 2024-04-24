# CGP Book Scraper

Tool for scraping content as PNGs from a [CGP](https://www.cgpbooks.co.uk) book which you can then turn into a PDF.  Built with [Bun](https://bun.sh/).

## Preparation
1. Go on the CGP website and buy a **digital** book with your account logged in,
2. Go to [Your Online Products](https://www.cgpbooks.co.uk/bookspacedemo)
3. Pick a book and click on the **+** button, then **Book**
4. Wait for the book to load and copy the URL and pop it into the `.env` file as `BOOK_URL`

# Configuration
Create a `.env` file in the root directory with the following content:
```.dotenv
EMAIL="[cgp account email]"
PASSWORD="[cgp account password]"
CODE="[the activation code cgp sent you in the email]"
BOOK_URL="[the url of the book you want to scrape]"
```

## Usage
1. Run `bun install` to install the dependencies
2. Run `bun start` to start the scraper
3. The PNGs will be saved in the `screenshots` directory in the current working directory

Disclaimer: This can only be used on purchased books meaning you need to buy the book before using this tool
