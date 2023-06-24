<script>
    // import { onMount, writable, derived } from 'svelte';
    import Papa from 'papaparse';

    /**
	 * @type File
	 */
	let goodreadsFile; // The uploaded Goodreads export file
	/**
	 * @param {File} file
	 */
	async function parseGoodreadsFile(file) {
		if (!file) {
			throw new Error('No file provided');
		}

		return new Promise((resolve, reject) => {
			Papa.parse(file, {
				header: true,
				complete: function(/** @type {{ data: any; }} */ results) {
					resolve(results.data);
				},
				error: reject
			});
		});
	}

    let data = [];
    let fileUploaded = false;
    let sortKey = "Title";  // initial sort key
    let sortOrder = 1;  // initial sort order

    function sort(key) {
        // return;
        if (sortKey === key) sortOrder *= -1;  // If the same key was clicked again, reverse the order
        else {
            sortKey = key;
            sortOrder = 1;  // Reset the order to ascending
        }
        data = data.slice().sort((a, b) => {
            if (a[sortKey] < b[sortKey]) return -sortOrder;
            if (a[sortKey] > b[sortKey]) return sortOrder;
            return 0;
        });
    };

    function handleFileUpload(event) {
        // return;
        const goodreadsFile = event.target.files[0];
        if (!goodreadsFile) return;
            // assuming `parseFile` is a function that parses the file and returns the data as an array of objects
            parseGoodreadsFile(goodreadsFile).then(newData => {
                data = newData.filter(book => book["Book Id"] != "");
                fileUploaded = true; // change the flag after file has been processed
        });
    }

    /**
	 * @type Array<any>
	 */
    export let checkedBooks = []; // An array to store the checked books

    $: checkedBooksCount = checkedBooks.length; // This will update every time checkedBooks changes

    function handleRowClick(book) {
        if (checkedBooks.includes(book)) {
            checkedBooks = checkedBooks.filter(checkedBook => checkedBook !== book);
        } else if (checkedBooks.length < 10) {
            checkedBooks = [...checkedBooks, book];
        }
    }

</script>

<div class="mt-4">
    <div class="mb-4 font-semibold text-lg">
        Import your Goodreads export to further personalize the recommendations.
    </div>
    <input
            type="file"
            id="goodreadsFile"
            name="goodreadsFile"
            on:change={handleFileUpload}
            class="bg-white/40 border border-white/0 p-2 rounded-md placeholder:text-slate-800 text-slate-900 w-full font-medium"
        />
        {#if fileUploaded}
            <div class="mt-4 font-semibold text-lg">
                Please select up to 10 books you would like to your recommendations to be similar to.
            </div>
            <div class="mt-4 px-4">
                <table class="w-full">
                    <thead class="sticky top-0">
                        <tr>
                            <th width="50%"><button on:click={() => sort('Title')} class="text-slate-200 font-bold mr-2 mt-2 text-sm py-2 px-4 rounded-full border border-pink-600">Title</button></th>
                            <th width="30%"><button on:click={() => sort('Author')} class="text-slate-200 font-bold mr-2 mt-2 text-sm py-2 px-4 rounded-full border border-pink-600">Author</button></th>
                            <th width="20%"><button on:click={() => sort('My Rating')} class="text-slate-200 font-bold mr-2 mt-2 text-sm py-2 px-4 rounded-full border border-pink-600">My Rating</button></th>
                            <!-- <th width="20%"><button on:click={() => sort('Bookshelves')} class="text-slate-200 font-bold mr-2 mt-2 text-sm py-2 px-4 rounded-full border border-pink-600">Shelf</button></th> -->
                            <!-- <th width="20%"><button on:click={() => sort('My Review')} class="text-slate-200 font-bold mr-2 mt-2 text-sm py-2 px-4 rounded-full border border-pink-600">My Review</button></th> -->
                        </tr>
                    </thead>
                </table>
            </div>
            <div class="mt-4 overflow-auto rounded-md px-4 py-2 border border-pink-600" style="max-height: 300px;">
                <table class="w-full">
                    <tbody class="text-slate-900">
                        {#each data as book (book['Book Id'])}
                            <tr 
                                class={checkedBooks.includes(book) ? 'bg-pink-600/40 cursor-pointer' : 'cursor-pointer'}
                                on:click={() => handleRowClick(book)}
                            >
                                <td width="50%" class="text-slate-200 py-2 text-center" style="font-size: 12px;">{book.Title}</td>
                                <td width="30%" class="text-slate-200 py-2 text-center" style="font-size: 12px;">{book.Author}</td>
                                <td width="20%" class="text-slate-200 py-2 text-center" style="font-size: 12px;">{book['My Rating']}</td>
                                <!-- <td width="20%" class="text-slate-200 py-2 text-center">{book.Bookshelves}</td> -->
                                <!-- <td width="20%" class="text-slate-200 py-2 text-center">{book['My Review']}</td> -->
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
            <div class="mt-4 font-semibold text-lg">
                Selected Books : {checkedBooksCount}/10:
            </div>
            <div class="mt-4 overflow-auto rounded-md px-4 py-2 border border-pink-600" style="max-height: 300px;">
                <table class="w-full">
                    <tbody class="text-slate-900">
                        {#each checkedBooks as book (book['Book Id'])}
                            <tr>
                                <td class="text-slate-200 py-2 text-center">{book.Title}</td>
                                <!-- <td width="30%" class="text-slate-200 py-2 text-center" style="font-size: 12px;">{book.Author}</td>
                                <td width="20%" class="text-slate-200 py-2 text-center" style="font-size: 12px;">{book['My Rating']}</td> -->
                                <!-- <td width="20%" class="text-slate-200 py-2 text-center">{book.Bookshelves}</td> -->
                                <!-- <td width="20%" class="text-slate-200 py-2 text-center">{book['My Review']}</td> -->
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
</div>