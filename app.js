'use strict';

let nowPlayingHash = null;

const size = getQueryVariable('size') || '100';
const color = getQueryVariable('color') || 'black';
const style = getQueryVariable('style') || 'block';

const css = document.createElement('style');
css.innerHTML = `html, body { 
	font-size: ${size}%; color: ${color}; 
}

.title, .artist {
	display: ${style === 'inline' ? 'inline-block' : 'block'};
	font-size: 2.5rem;
}

.title {
	margin-right: .75rem;
}

`;
document.body.append(css);

setInterval(tick, 2000);
tick();

async function tick() {
	const nowPlaying = await fetchNowPlaying();

	if (nowPlaying && hashString(nowPlaying.title) !== nowPlayingHash) {
		nowPlayingHash = hashString(nowPlaying.title);

		updateTrack(nowPlaying);

		const coverId = await fetchCoverForTrackJson(nowPlaying);

		if (coverId)
			updateCover(coverId);
	}
}


async function fetchNowPlaying() {
	try {
		const response = await fetch('/example.json');
		const json = await response.json();

		return json;
	} catch (e) {
		console.error('Error fetching now playing', e);
		return null;
	}
}

async function updateTrack(trackJson) {
	document.querySelector('.title').textContent = trackJson.title;
	document.querySelector('.artist').textContent = trackJson.artist;
	
	document.querySelector('.cover').src = 'default.jpg';
}

async function updateCover(coverId) {
	const coverDOM = document.querySelector('.cover');
	
	// coverDOM.classList.remove('hidden');
	coverDOM.src = `https://coverartarchive.org/release/${coverId}/front`;
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