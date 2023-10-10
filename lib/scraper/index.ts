import axios from "axios";
import * as cheerio from "cheerio";
import { extractCurrency, extractDescription, extractPrice } from "../utils";

export async function scrapeAmazonProduct(url: string) {
	if (!url) return;

	//BrightData proxy configuration
	const username = String(process.env.BRIGHT_DATA_USERNAME);
	const password = String(process.env.BRIGHT_DATA_PASSWORD);
	const port = 22225;
	const session_id = (1000000 * Math.random()) | 0;
	const options = {
		auth: {
			username: `${username}-session-${session_id}`,
			password,
		},

		host: "brd.superproxy.io",
		port,
		rejectUnauthorized: false,
	};

	try {
		// Fetch amazon product page
		const response = await axios.get(url, options);

		// Parse the HTML
		const $ = cheerio.load(response.data);
		const title = $("#productTitle").text().trim();
		const currentPrice = extractPrice(
			$(".priceToPay span.a-price-whole"),
			$("a.size.base.a-color-price"),
			$(".a-button-selected a.color-base"),
			$(".a-price-whole")
		);
		const currentPricePennies = extractPrice($(".a-price-fraction"));

		const originalPrice = extractPrice(
			$(".a-price.a-text-price span.a-offscreen"),
			$("#priceblock_ourprice"),
			$("#listPrice"),
			$(".a-size-base.a-color-price")
		);

		const outOfStock =
			$("#availability span").text().trim().toLowerCase() ===
			"currently unavailable";

		const images =
			$("#imgBlkFront").attr("data-a-dynamic-image") ||
			$("#landingImage").attr("data-a-dynamic-image") ||
			"{}";

		const imageUrls = Object.keys(JSON.parse(images));

		const currency = extractCurrency($(".a-price-symbol"));

		const discountRate = $(".savingsPercentage").text().replace(/[-%]/g, "");

		const description = extractDescription($);

		// console.log({
		// 	title,
		// 	currentPrice,
		// 	currentPricePennies,
		// 	originalPrice,
		// 	outOfStock,
		// 	imageUrls,
		// 	currency,
		// 	discountRate,
		// });

		// Construct data object with scraped data
		const data = {
			url,
			currency: currency || "$",
			image: imageUrls[0],
			title,
			currentPrice: parseInt(currentPrice) || Number(originalPrice),
			originalPrice: Number(originalPrice) || parseInt(currentPrice),
			currentPricePennies: Number(currentPricePennies.slice(0, 2)),
			priceHistory: [],
			discountRate: Number(discountRate),
			isOutOfStock: outOfStock,
			category: "get_category",
			reviewCount: "get_review_count",
			stars: "get_stars",
			description,
			lowestPrice: parseInt(currentPrice) || Number(originalPrice),
			highestPrice: Number(originalPrice) || parseInt(currentPrice),
			averagePrice: parseInt(currentPrice) || Number(originalPrice),
		};

		// console.log(data);
		return data;
	} catch (error: any) {
		throw new Error(`Failed to scrape product: ${error.message}`);
	}
}
