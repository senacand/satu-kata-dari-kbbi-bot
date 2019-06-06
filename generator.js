var FB = require('fb');
var request = require('request');
var fs = require('fs');
var imgur = require('imgur');
var fetch = require('node-fetch');

require('dotenv').config()

const fbAccessToken = process.env.FB_ACCESS_TOKEN;
const fbPageId = process.env.FB_PAGE_ID;
const kategloUrl = "http://kateglo.com/api.php?format=json&phrase=";

const { createCanvas, loadImage, registerFont } = require('canvas')

// Register font for image
registerFont('Montserrat.ttf', { family: 'Montserrat' });

// Set Facebook Access Token
FB.setAccessToken(fbAccessToken);

// Load list of words
const contents = fs.readFileSync('kata_dasar_kbbi.csv', { encoding: 'utf-8' });
const daftarKataDasar = contents
    .split('\n')
    .filter((row) => row != "");
console.log(daftarKataDasar.length + " kata telah dimuat.")

// Post one random word and start one hour timer
postRandomWordFromKBBI();
setInterval(postRandomWordFromKBBI, 1000*60*60);

// Post random word from KBBI
function postRandomWordFromKBBI() {
    postToFacebook(generateRandomWordFromKBBI());
}

// Generate image from text and post them to Facebook
async function postToFacebook(text) {
    createImageFromText(text.toUpperCase());
    try {
        const imageUrl = await imgur.uploadFile("generated_image.png")
            .then((json) => json.data.link);
        const definitions = await getWordDefinitionsFromKBBI(text);

        FB.api(
            "/" + fbPageId + "/photos",
            "POST",
            {
                "url": imageUrl,
                "caption": definitions,
            },
            function (response) {
                console.log(response);
            }
        );

    } catch(e) {
        console.log(e);
    }
}

// Generate image from text
function createImageFromText(text) {
    const canvas = createCanvas(1000, 1000)
    const ctx = canvas.getContext('2d')

    // Write "Awesome!"
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 1000, 1000);
    ctx.fillStyle = "black";
    ctx.font = "100px Montserrat";
    ctx.textAlign = "center";
    ctx.fillText(text, 500, 500);


    const buff = canvas.toBuffer();
    fs.writeFileSync("generated_image.png", buff);
}

// Get KBBI definition of word from Kateglo
function getWordDefinitionsFromKBBI(text) {
    const url = kategloUrl + text;
    return fetch(url)
        .then((res) => res.json())
        .then((json) => {
            const kateglo = json.kateglo;
            const phrase = kateglo.phrase;
            const lex_class = kateglo['lex_class'];
            const definitions = kateglo.definition
                .map((definition) => definition["def_text"]);
            const reference = kateglo.reference;

            var definition = phrase + '(' + lex_class + ')\n' + definitions.join('\n');
            if (typeof reference[0] !== 'undefined' && reference[0] !== null) {
                definition += '\n\n' + reference[0].url.replace(/\\/g, '');
            }

            return definition;
        });
}

// Generate random integer number between range
function getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min) ) + min;
}

// Get random word
function generateRandomWordFromKBBI() {
    const word = daftarKataDasar[getRndInteger(0, daftarKataDasar.length-1)];
    return word;
}