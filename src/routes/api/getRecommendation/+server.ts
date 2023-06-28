import { createParser } from 'eventsource-parser';
import { OPENAI_API_KEY } from '$env/static/private';

const key = OPENAI_API_KEY;
// const decoder = new TextDecoder("utf-8");

const MAX_TOKEN_COUNT = 2048 - 100;

interface OpenAIStreamPayload {
	model: string;
	messages: { role: string; content: string; }[];
	temperature: number;
	top_p: number;
	frequency_penalty: number;
	presence_penalty: number;
	max_tokens: number;
	stream: boolean;
	n: number;
}

import {encode} from 'gpt-tokenizer';

function getPrompt(selectedCategories: string[], specificDescriptors: string, booksToAdd: any[] = []) {
	return `Give me a list of 5 book recommendations that you think I would like based on the following information: ${
		selectedCategories.length > 0 ? `The books must fit all of the following categories: ${selectedCategories}. ` : ''
		}${specificDescriptors ? `Make sure it fits the following description as well: ${specificDescriptors}. ` : ''
		}${booksToAdd.length > 0 ? generateGoodreadsString(booksToAdd) : ''
		}${selectedCategories || specificDescriptors
			? `If you do not have 5 recommendations that fit these criteria perfectly and you believe I would be interested in based on my current reading list, do your best to suggest other book's that I might like. `: ''
		}Please return this response as a numbered list with the book's title, followed by a colon, and then a brief description of the books. There should be a line of whitespace between each item in the list.`;
}

function generateGoodreadsString(booksToAdd: any[]) {
	let bookStatements = booksToAdd.map((/** @type {{ [x: string]: string; Title: string; Author: string; }} */ book) => getNewBookString(book));
	return `This is my current reading list of books I have read, am reading, and/or want to read: ${bookStatements.join("; ")}. My rating of the book is given if available (on a 5 point scale) as is my review. Please do not add any of these books on the recommended reading list (as I already know of all of them). Please also return books from a variety of authors. Ideally at least 3 of the books are by authors that I do not have on my reading list. `;
}

function getNewBookString(book: { [x: string]: string; Title: string; Author: string; }) {
	let statement = `Title: ${book.Title}, Author: ${book.Author}`;
	if (book["My Rating"] !== "0") {
		statement += `, My rating: ${book["My Rating"]}`;
	}
	if (book["My Review"] !== "") {
		statement += `, My review: ${book["My Review"]}`;
	}
	return statement;
}

async function generateFullSearchCriteria(goodreadsData: any[], selectedCategories: string[], specificDescriptors: string) {

	// Get the token count without the goodreads data
	let currentTokenCount = encode(getPrompt(selectedCategories, specificDescriptors)).length;

	// Create an array to store all the books we can add to the prompt
	let booksToAdd = [];

	// Books were sorted on the frontend but since we pop from the back of the array, we need to reverse it
	goodreadsData.reverse();

	// While we can still add books to the prompt, keep processing books
	while (currentTokenCount < MAX_TOKEN_COUNT && goodreadsData.length > 0) {
		let newBook = goodreadsData.pop();
		if (!newBook || !newBook.Title || !newBook.Author) {
			console.log("Book is missing title or author");
		} else {
			let newBookTokenCount = encode(`${getNewBookString(newBook)}; `).length;
			currentTokenCount += newBookTokenCount;
			if (currentTokenCount <= MAX_TOKEN_COUNT) {
				booksToAdd.push(newBook);
			}
		}
	}

	// Create the final prompt with all the books we can add as recommendations
	return getPrompt(selectedCategories, specificDescriptors, booksToAdd);
}

async function OpenAIStream(payload: OpenAIStreamPayload) {
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();

	let counter = 0;

	const res = await fetch('https://api.openai.com/v1/chat/completions', {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${key}`
		},
		method: 'POST',
		body: JSON.stringify(payload)
	});

	const stream = new ReadableStream({
		async start(controller) {
			function onParse(event: any) {
				if (event.type === 'event') {
					const data = event.data;
					// https://beta.openai.com/docs/api-reference/completions/create#completions/create-stream
					if (data === '[DONE]') {
						controller.close();
						return;
					}
					try {
						const json = JSON.parse(data);
						const text = json.choices[0].delta.content;

						if (counter < 2 && (text.match(/\n/) || []).length) {
							// this is a prefix character (i.e., "\n\n"), do nothing
							return;
						}
						const queue = encoder.encode(text);
						controller.enqueue(queue);
						counter++;
					} catch (e) {
						controller.error(e);
					}
				}
			}

			// stream response (SSE) from OpenAI may be fragmented into multiple chunks
			// this ensures we properly read chunks and invoke an event for each SSE event stream
			const parser = createParser(onParse);
			// https://web.dev/streams/#asynchronous-iteration
			for await (const chunk of res.body as any) {
				parser.feed(decoder.decode(chunk));
			}
		}
	});

	return stream;
}

export async function POST({ request }: { request: any }) {
	const { searchInfo } = await request.json();
	const {goodreadsData, selectedCategories, specificDescriptors} = searchInfo;
	const searched = await generateFullSearchCriteria(goodreadsData, selectedCategories, specificDescriptors);
	const payload = {
		model: 'gpt-3.5-turbo',
		messages: [
			{"role": "system", "content": "You are a book recommendation system."}, 
			{"role": "user", "content": searched}
		],
		temperature: 0.7,
		max_tokens: MAX_TOKEN_COUNT+100,
		top_p: 1.0,
		frequency_penalty: 0.0,
		stream: true,
		presence_penalty: 0.0,
		n: 1
	};
	const stream = await OpenAIStream(payload);
	return new Response(stream);
}
