"use client"; // We have to add this because we added a function(interactivity) to our form in the client facing side. NextJS likes things to be separated and functionality to be on the server side.

const SearchBar = () => {
	const handleSubmit = () => {};

	return (
		<form className="flex flex-wrap gap-4 mt-12" onSubmit={handleSubmit}>
			<input
				type="text"
				placeholder="Enter product link"
				className="searchbar-input"
			/>
			<button type="submit" className="searchbar-btn">
				Search
			</button>
		</form>
	);
};
export default SearchBar;
