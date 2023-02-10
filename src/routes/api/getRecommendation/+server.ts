import { createParser } from 'eventsource-parser';
const key = import.meta.env.VITE_OPENAI_API_KEY;

interface OpenAIStreamPayload {
	model: string;
	prompt: string;
	temperature: number;
	top_p: number;
	frequency_penalty: number;
	presence_penalty: number;
	max_tokens: number;
	stream: boolean;
	n: number;
}

async function OpenAIStream(payload: OpenAIStreamPayload) {
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();

	const res = await fetch('https://api.openai.com/v1/completions', {
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
						const text = json.choices[0].text;

						const queue = encoder.encode(text);
						controller.enqueue(queue);
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
	const { searched } = await request.json();
	const payload = {
		model: 'text-davinci-003',
		prompt: searched,
		temperature: 0.7,
		max_tokens: 2048,
		top_p: 1.0,
		frequency_penalty: 0.0,
		stream: true,
		presence_penalty: 0.0,
		n: 1
	};
	const stream = await OpenAIStream(payload);
	return new Response(stream);
}
