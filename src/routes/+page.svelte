<script>
	import * as animateScroll from 'svelte-scrollto';
	import { fade } from 'svelte/transition';
	import Form from '$lib/Form.svelte';
	import Home from '$lib/Home.svelte';
	import Footer from '$lib/Footer.svelte';
	import Header from '$lib/Header.svelte';
	import RecommendationCard from '$lib/RecommendationCard.svelte';
	import { onMount } from 'svelte';
	import LoadingCard from '$lib/LoadingCard.svelte';

	let loading = false;
	let error = '';
	let endStream = false;
	let makeRecommendation = false;

	/**
	 * @type {string}
	 */
	let searchResponse = '';
	/**
	 * @type {Array<string | {title: string, description: string}>}
	 */
	let recommendations = [];
	/**
	 * @type Array<any>
	 */
	let goodreadsData;


	/**
	 * @param {string} target
	 */

	$: {
		if (searchResponse) {
			let lastLength = recommendations.length;
			let x = searchResponse?.split('\n');
			recommendations = x.map((d, i) => {
				if ((x.length - 1 > i || endStream) && d !== '') {
					// @ts-ignore
					const [, title, description] = d.match(/\d\.\s*(.*?):\s*(.*)/);
					return { title, description };
				} else {
					return d;
				}
			});
			if (recommendations.length > lastLength) {
				animateScroll.scrollToBottom({ duration: 1500 });
			}
		}
	}

	/**
	 * @type {string}
	 */
	// let cinemaType = 'Book';
	/**
	 * @type {Array<string>}
	 */
	let selectedCategories = [];
	let specificDescriptors = '';

	async function search() {
		if (loading) return;
		recommendations = [];
		searchResponse = '';
		endStream = false;
		loading = true;

		const searchInfo = {
			'selectedCategories': selectedCategories,
			'specificDescriptors': specificDescriptors,
			'goodreadsData': goodreadsData
		};

		const response = await fetch('/api/getRecommendation', {
			method: 'POST',
			body: JSON.stringify({ searchInfo: searchInfo }),
			headers: {
				'content-type': 'application/json'
			}
		});

		if (response.ok) {
			try {
				const data = response.body;
				if (!data) {
					return;
				}

				const reader = data.getReader();
				const decoder = new TextDecoder();

				while (true) {
					const { value, done } = await reader.read();
					const chunkValue = decoder.decode(value);

					searchResponse += chunkValue;

					if (done) {
						endStream = true;
						break;
					}
				}
			} catch (err) {
				error = 'Looks like OpenAI timed out :(';
			}
		} else {
			error = await response.text();
		}
		loading = false;
	}
	function clearForm() {
		recommendations = [];
		searchResponse = '';
		endStream = false;
		// cinemaType = 'book';
		selectedCategories = [];
		specificDescriptors = '';
	}
</script>

<div>
	<div class="h-screen w-full bg-cover fixed" style="background-image: url(/pexels-engin-akyurt-2943603.jpg)">
		<div
			class={`${
				makeRecommendation ? 'backdrop-blur-md' : ''
			}  flex flex-col items-center justify-center min-h-screen w-full h-full bg-gradient-to-br from-slate-900/80 to-black/90`}
		/>
	</div>

	<div class="absolute inset-0 px-6 flex flex-col h-screen overflor-auto">
		<Header
			on:click={() => {
				makeRecommendation = false;
			}}
		/>

		{#if !makeRecommendation}
			<div
				in:fade
				class="flex-grow max-w-4xl mx-auto w-full md:pt-20  flex flex-col items-center justify-center"
			>
				<Home
					on:click={() => {
						makeRecommendation = true;
					}}
				/>
			</div>
		{:else}
			<div in:fade class="w-full max-w-4xl mx-auto">
				<div class="w-full mb-8">
					<Form
						bind:selectedCategories
						bind:loading
						bind:specificDescriptors
						bind:goodreadsData
						on:click={search}
					/>
					{#if recommendations.length > 0 && endStream}
						<button
							on:click={clearForm}
							class="bg-white/20 hover:bg-white/30 mt-4 w-full h-10 text-white font-bold p-3 rounded-full flex items-center justify-center"
						>
							Clear Search
						</button>
					{/if}
				</div>
				<div class="md:pb-20 max-w-4xl mx-auto w-full">
					{#if loading && !searchResponse && !recommendations}
						<div class="fontsemibold text-lg text-center mt-8 mb-4">
							Please be patient as I think. Good things are coming 😎.
						</div>
					{/if}
					{#if error}
						<div class="fontsemibold text-lg text-center mt-8 text-red-500">
							Woops! {error}
						</div>
					{/if}
					{#if recommendations}
						{#each recommendations as recommendation, i (i)}
							<div>
								{#if recommendation !== ''}
									<div class="mb-8">
										{#if typeof recommendation !== 'string' && recommendation.title}
											<RecommendationCard {recommendation} />
										{:else}
											<div in:fade>
												<LoadingCard incomingStream={recommendation} />
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					{/if}
				</div>
			</div>
		{/if}
		<Footer />
	</div>
</div>
