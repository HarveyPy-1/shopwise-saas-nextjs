"use server";

import { revalidatePath } from "next/cache"; // Read about this
import Product from "../model/product.model";
import { connectToDB } from "../mongoose";
import { scrapeAmazonProduct } from "../scraper";
import { getAveragePrice, getHighestPrice, getLowestPrice } from "../utils";

export async function scrapeAndStoreProduct(productUrl: string) {
	if (!productUrl) return;

	try {
		connectToDB();

		const scrapedProduct = await scrapeAmazonProduct(productUrl);

		if (!scrapedProduct) return;

		let product = scrapedProduct;

		// Check if product already exists by the URL and update the price
		const existingProduct = await Product.findOne({ url: scrapedProduct.url });

		if (existingProduct) {
			console.log("I found a product");

			const updatedPriceHistory: any = [
				...existingProduct.priceHistory,
				{ price: scrapedProduct.currentPrice },
			];

			product = {
				...scrapedProduct,
				priceHistory: updatedPriceHistory,
				lowestPrice: getLowestPrice(updatedPriceHistory),
				highestPrice: getHighestPrice(updatedPriceHistory),
				averagePrice: getAveragePrice(updatedPriceHistory),
			};
		}

		// If product does not exist, create a new one
		const newProduct = await Product.findOneAndUpdate(
			{ url: scrapedProduct.url },
			product,
			{ upsert: true, new: true }
		);

		revalidatePath(`/products/${newProduct._id}`);
	} catch (error: any) {
		throw new Error(`Failed to create/update product: ${error.message}`);
	}
}

export async function getProductById(productID: string) {
    try { 
        connectToDB();
        const product = await Product.findOne({_id: productID})

        if(!product) return null;

        return product;
    } catch (error) {
        console.log(error)
    }
}
