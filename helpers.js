'use strict';

function reversePromise(promise) {
    return new Promise((resolve, reject) => Promise.resolve(promise).then(reject, resolve));
}

function promiseAny(iterable) {
    return reversePromise(Promise.all([...iterable].map(reversePromise)));
};

function chunkArray(array, groupsize){
    var sets = [], chunks, i = 0;
    chunks = Math.ceil(array.length / groupsize);

    while(i < chunks){
        sets[i] = array.splice(0, groupsize);
	i++;
    }
    return sets;
};

function hashString(str) {
    var hash = 0;
    if (str.length == 0) {
        return hash;
    }
    for (var i = 0; i < str.length; i++) {
        var char = str.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
        }
    }
    
    return null;
}

function randomId() {
	return Math.floor(Math.random() * 10000);
}