"use client";
import { scrapeAndStoreProduct } from "@/lib/actions";
// We have to add this because we added a function(interactivity) to our form in the client facing side. NextJS likes things to be separated and functionality to be on the server side.
import { FormEvent, useState } from "react";

// True/False
const isValidAmazonProductURL = (url: string) => {
	try {
		const parsedURL = new URL(url);
		const hostname = parsedURL.hostname;

		if (
			hostname.includes("amazon.com") ||
			hostname.includes("amazon.") ||
			hostname.endsWith("amazon")
		) {
			return true;
		}
	} catch (error) {
		return false;
	}
};

const SearchBar = () => {
	const [searchPrompt, setSearchPrompt] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	// We need to define what type of data event is, hence the FormEvent...
	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const isLinkValid = isValidAmazonProductURL(searchPrompt);

		if (!isLinkValid) return alert("Please provide a valid Amazon Link");

		try {
			setIsLoading(true);

			// Scrape the website's product page
			const product = await scrapeAndStoreProduct(searchPrompt);
		} catch (error) {
			console.log(error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<form className="flex flex-wrap gap-4 mt-12" onSubmit={handleSubmit}>
			<input
				type="text"
				value={searchPrompt}
				onChange={(e) => setSearchPrompt(e.target.value)}
				placeholder="Enter product link"
				className="searchbar-input"
			/>
			<button
				type="submit"
				className="searchbar-btn"
				disabled={searchPrompt === ""}>
				{isLoading ? "Searching..." : "Search"}
			</button>
		</form>
	);
};
export default SearchBar;
