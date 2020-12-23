'use strict';

let nowPlayingHash = null;

const CONFIG = {
	dataUrl: getQueryVariable('url') || '/example.json',
	size: getQueryVariable('size') || '100',
	color: getQueryVariable('color') || 'black',
	style: getQueryVariable('style') || 'block'
};

console.info('Using config:', CONFIG);

const css = document.createElement('style');
css.innerHTML = `html, body { 
	font-size: ${CONFIG.size}%; color: ${CONFIG.color}; 
}

${CONFIG.style === 'inline' 
? `
.text {
	display: flex;
	align-items: center;
	transform: translateY(.35rem);
}

.title, .artist {
	display:;
	font-size: 3.5rem;
}

.title {
	margin-right: .75rem;
}
` 
: ''}

`;
document.body.append(css);

const DOM = {
	text: document.querySelector('.text'),
	cover: document.querySelector('.cover'),
	title: document.querySelector('.title'),
	artist: document.querySelector('.artist')
};

DOM.cover.addEventListener('load', coverDidLoad);
DOM.cover.addEventListener('error', coverDidError);

setInterval(tick, 2000);
tick();

async function tick() {
	const nowPlaying = await fetchNowPlaying();

	if (nowPlaying && hashString(nowPlaying.title) !== nowPlayingHash) {
		nowPlayingHash = hashString(nowPlaying.title);

		updateTrack(nowPlaying);

		const coverId = await fetchCoverForTrackJson(nowPlaying);
		
		updateCover(coverId);
	}
}


async function fetchNowPlaying() {
	try {
		const response = await fetch(CONFIG.dataUrl, { cache: 'reload' });
		const json = await response.json();

		return json;
	} catch (e) {
		console.error('Error fetching now playing', e);
		return null;
	}
}

async function updateTrack(trackJson) {
	DOM.text.classList.add('hidden');
	DOM.cover.classList.add('hidden');

	setTimeout(() => {
		DOM.title.textContent = trackJson.title;
		DOM.artist.textContent = trackJson.artist;
		DOM.text.classList.remove('hidden');
	}, 300);
}

async function updateCover(coverId) {
	if (coverId) {
		DOM.cover.src = `https://coverartarchive.org/release/${coverId}/front`;
	} else {
		DOM.cover.src = '';
	}
}

function coverDidLoad() {
	if (DOM.cover.src !== '')
		DOM.cover.classList.remove('hidden');
}

function coverDidError() {
	DOM.cover.classList.add('hidden');
	DOM.cover.src = '';
}

async function fetchCoverForTrackJson(trackJson) {
	const ids = await fetchReleaseIdsOnMusicBrainz(trackJson.title, trackJson.artist);

	if (ids.length === 0) {
		throw new Error('track not found');
	}

	const coverId = await fetchCoverForReleaseIds(ids);

	return coverId;
}

async function fetchReleaseIdsOnMusicBrainz(title, artist) {
	const artistQuery = artist
		? `AND artist:"${encodeURIComponent(artist)}"`
		: '';
	const url = `https://musicbrainz.org/ws/2/recording?query=title:"${encodeURIComponent(title)}"${artistQuery}&fmt=json`;

	let ids = [];

	try {
		const response = await fetch(url);
		const json = await response.json();

		if (json && json.recordings && json.recordings.length > 0) {
			for (const recording of json.recordings) {
				if (!recording.releases)
					continue;

				for (const release of recording.releases) {
					ids.push(release.id);
				}
			}

			console.log('Found', ids.length, 'releases');

			return ids;
		} else {
			console.warn('No releases found 404');
			return [];
		}
	} catch (e) {
		console.error('Error fetching song from MusicBrainz', e);
		return [];
	}
}

async function fetchCoverForReleaseIds(releaseIds) {
	const chunks = chunkArray(releaseIds, 2);
	for (const idChunk of chunks) {
		try {
			const id = await promiseAny(idChunk.map(id => checkCover(id)));
			return id;
		} catch (e) {
			// nothin
			console.error('wat', e);
		}
	}

	return null;
}

async function checkCover(id) {
	const response = await fetch('https://coverartarchive.org/release/' + id);
		
	if (response.status < 400) {
		return id;
	}

	throw new Error('cover not found');
}