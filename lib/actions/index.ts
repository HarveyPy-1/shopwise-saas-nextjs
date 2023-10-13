"use server";

import { revalidatePath } from "next/cache"; // Read about this
import Product from "../model/product.model";
import { connectToDB } from "../mongoose";
import { scrapeAmazonProduct } from "../scraper";
import { getAveragePrice, getHighestPrice, getLowestPrice } from "../utils";
import { User } from "@/types";
import { generateEmailBody, sendEmail } from "../nodemailer";

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
		const product = await Product.findOne({ _id: productID });

		if (!product) return null;

		return product;
	} catch (error) {
		console.log(error);
	}
}

export async function getAllProducts() {
	try {
		connectToDB();

		const products = await Product.find();
		return products;
	} catch (error) {
		console.log(error);
	}
}

export async function getSimilarProducts(productID: string) {
	try {
		connectToDB();

		const currentProduct = await Product.findById(productID);

		if (!currentProduct) return null;

		const similarProducts = await Product.find({ _id: { $ne: productID } }).limit(
			3
		);

		return similarProducts;
	} catch (error) {
		console.log(error);
	}
}

export async function addUserEmailToTrackedProduct(
	productID: string,
	userEmail: string
) {
	try {
		const product = await Product.findById(productID);

		if (!product) return;

		const userExists = product.users.some(
			(user: User) => user.email === userEmail
		);

		if (!userExists) {
			product.users.push({ email: userEmail });

			await product.save();

			const emailContent = await generateEmailBody(product, "WELCOME");

			await sendEmail(emailContent, [userEmail])
		}
	} catch (error) {}
}
