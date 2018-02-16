const fetch = require('node-fetch');

function getWord() {
    const key = 'a2a73e7b926c924fad7001ca3111acd55af2ffabf50eb4ae5';
    const corpus = 100000; 
    const def = true;
    const type = 'noun';
    const exludeType = 'noun-plural';
    const url = `http://api.wordnik.com/v4/words.json/randomWord?hasDictionaryDef=${def}` +
        `&includePartOfSpeech=${type}&excludePartOfSpeech=${exludeType}&minCorpusCount=${corpus}&api_key=${key}`;

    return fetch(url)
        .then((response) => response.json())
        .then(({word}) => word)
        .catch(() => 'error api request');
}

module.exports = getWord;
