import Product from "@/lib/model/product.model";
import { connectToDB } from "@/lib/mongoose";
import { generateEmailBody, sendEmail } from "@/lib/nodemailer";
import { scrapeAmazonProduct } from "@/lib/scraper";
import {
	getAveragePrice,
	getEmailNotifType,
	getHighestPrice,
	getLowestPrice,
} from "@/lib/utils";
import { NextResponse } from "next/server";

export const maxDuration = 10; //Supposed to be 300, had to be 10 for free hosting on vercel
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
	try {
		connectToDB();

		const products = await Product.find({});

		if (!products) throw new Error("No products found");

		// Scrape latest product details and update DB
		const updatedProducts = await Promise.all(
			products.map(async (currentProduct) => {
				const scrapedProduct = await scrapeAmazonProduct(currentProduct.url);

				if (!scrapedProduct) throw new Error("No product found"!);

				const updatedPriceHistory = [
					...currentProduct.priceHistory,
					{ price: scrapedProduct.currentPrice },
				];

				const product = {
					...scrapedProduct,
					priceHistory: updatedPriceHistory,
					lowestPrice: getLowestPrice(updatedPriceHistory),
					highestPrice: getHighestPrice(updatedPriceHistory),
					averagePrice: getAveragePrice(updatedPriceHistory),
				};

				// If product does not exist, create a new one
				const updatedProduct = await Product.findOneAndUpdate(
					{ url: product.url },
					product
				);

				// Check each product's status and send appropriate email
				const emailNotifType = getEmailNotifType(scrapedProduct, currentProduct);

				if (emailNotifType && updatedProduct.users.length > 0) {
					const productInfo = {
						title: updatedProduct.title,
						url: updatedProduct.url,
					};

					const emailContent = await generateEmailBody(productInfo, emailNotifType);

					const userEmails = updatedProduct.users.map((user: any) => user.email);

					await sendEmail(emailContent, userEmails);
				}

				return updatedProduct;
			})
		);

		return NextResponse.json({
			message: "OK",
			data: updatedProducts,
		});
	} catch (error) {
		throw new Error(`Error in GET: ${error}`);
	}
}
