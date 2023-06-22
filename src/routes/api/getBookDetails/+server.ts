import { GOOGLE_BOOKS_API_KEY } from '$env/static/private';
import { json } from '@sveltejs/kit';

export async function POST({ request }: { request: any }) {
	const { title } = await request.json();
	const url = `https://www.googleapis.com/books/v1/volumes?q=intitle:${title}`;

	const res = await fetch(url);
	const details = await res.json();
	return json(details);
}