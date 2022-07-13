import * as generate from './generators.js';

var iframeCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    const addButton = document.querySelector('#save-add');
    addButton.addEventListener('click', addArtist);

    const modifyLink = document.querySelector('#modify-link');
    modifyLink.addEventListener('click', changeView);
    modifyLink.view = 'modify';

    const homeLink = document.querySelector('#home-link');
    homeLink.addEventListener('click', changeView);
    homeLink.view = 'home';

    const favLink = document.querySelector('#favorites-link');
    favLink.addEventListener('click', changeView);
    favLink.view = 'favorites';

    const laterLink = document.querySelector('#later-link');
    laterLink.addEventListener('click', changeView);
    laterLink.view = 'later';

    // change max-height of the content card based on the navbar height
    const toggler = document.querySelector('.navbar-toggler');
    toggler.addEventListener('click', () => {
        let offsetHeight = document.getElementsByClassName('navbar')[0].offsetHeight;
        if (offsetHeight == 51) {
            document.getElementById('content-card').style.maxHeight = `calc(95vh - 86px)`;
        } else {
            document.getElementById('content-card').style.maxHeight = `calc(95vh - 51px)`;
        }  
    })

    /*
    This next block became fairly complicated when I implemented infinite scroll.
    It executes immediately after login because the home view is default.

    getHomeData() retrieves data for every artist in one fetch call, so the
    content must be handled from within the .then() block.

    We then define and call the loadMore() function. This function will load each
    artist individually in a For-loop, in order of data.most_recent. However,
    because the embedded tracks take a not-insignificant amount of time to load,
    the height of the content container is unknown. Therefore each time loadArtist()
    loads tracks from a site, we increment the global variable iframeCount. The 
    For-loop will break at >= 6 iframe sections because the height of each iframe is
    constant and 6 is a reasonable amount.

    The infinite scroll section adds an event listener to the container to detect
    when the scrollbar reaches the bottom. When it does, the iframeCount is reset
    to 0 and the nested loadMore() function is called again.
    */
    const title = document.querySelector('#title').innerHTML
    if (title == 'Home') {
        var i = 0;
        getHomeData().then((data) => {
            let artists = Object.keys(data.most_recent);
            let numArtists = artists.length;
            function loadMore() {
                if (numArtists == 0) {
                    document.querySelector("#content-body").innerHTML = `
                    Add an artist to watch below.`;
                } else {
                    for (i; i < numArtists; i++) {
                        loadArtist(data, artists[i]);
                        if (iframeCount >= 6) {
                            i++;
                            break;
                        }
                    }
                }
            }

            loadMore();

            // infinite scroll
            let cardBody = document.querySelector("#content-body");
            cardBody.onscroll = () => {
                var scrollY = cardBody.scrollHeight - cardBody.scrollTop;
                var height = cardBody.offsetHeight;
                var offset = height - scrollY;

                if (offset == 0 || offset == 1) {
                    // load more content
                    let title = document.querySelector('#title').innerHTML;
                    if (title == 'Home'){
                        iframeCount = 0;
                        loadMore();
                    }
                }
            };

            // if the page height is too high to be scrollable, the infinite scroll
            // wont work, so we add a listener to an arbitrary iframe that checks
            // for the height once the iframe is loaded.
            if (numArtists != 0) {
                const iframe = document.getElementsByTagName("iframe")[0];
                const handleLoad = () => {
                    if (cardBody.scrollHeight == cardBody.clientHeight){
                        iframeCount = 0;
                        loadMore();
                    }
                };
                iframe.addEventListener('load', handleLoad, true);
            }
        });
    }

})


function changeView(event) {
    let view = event.currentTarget.view

    if (view === 'home') {
        document.querySelector('#accordion').style.display = "none";
        document.querySelector('#favorites-div').style.display = "none";
        document.querySelector('#later-div').style.display = "none";
        document.querySelector('#artists-div').style.display = "block";
        document.querySelector('#title').innerHTML = 'Home';
    }
    if (view === 'modify') {
        document.querySelector('#artists-div').style.display = "none";
        document.querySelector('#favorites-div').style.display = "none";
        document.querySelector('#later-div').style.display = "none";
        document.querySelector('#title').innerHTML = 'Modify an Artist';
        document.querySelector('#accordion').innerHTML = '';
        document.querySelector('#accordion').style.display = "block";
        generate.modifyPage();
    }
    if (view === 'favorites') {
        document.querySelector('#artists-div').style.display = "none";
        document.querySelector('#title').innerHTML = 'Favorites';
        document.querySelector('#accordion').style.display = "none";
        document.querySelector('#later-div').style.display = "none";
        document.querySelector('#favorites-div').innerHTML = '';
        document.querySelector('#favorites-div').style.display = "block";
        generate.savedPage('favorites');
    }
    if (view === 'later') {
        document.querySelector('#artists-div').style.display = "none";
        document.querySelector('#title').innerHTML = 'Listen Later';
        document.querySelector('#accordion').style.display = "none";
        document.querySelector('#favorites-div').style.display = "none";
        document.querySelector('#later-div').innerHTML = '';
        document.querySelector('#later-div').style.display = "block";
        generate.savedPage('later');
    }
}


// saves pop-up add artist form
// checks that the artist name aligns with HTML naming rules
// and that the links are correct.
function addArtist() {
    function validateForm() {
        var name = document.querySelector('#name').value;
        var sc = document.querySelector('#sc').value;
        var yt = document.querySelector('#yt').value;
        var sp = document.querySelector('#sp').value;
        var nameExp = /[a-zA-Z]/g;
        var scExp = /^(soundcloud:|https:\/\/soundcloud\.com\/[\w-]+)/;
        var ytExp = /(https?:\/\/)?(www\.)?youtube\.com\/(channel|user|c)\/[\w-]+/;
        var spExp = /^(spotify:|https:\/\/[a-z]+\.spotify\.com\/artist)/;
        let message = '';

        if (name == '') {
            message += 'A name is required and must be unique.\n';
        }else if (!nameExp.test(name[0])) {
            message += 'Name must begin with a letter.\n';
        }
        if (sc == '' && yt == '' && sp == '') {
            message += 'At least one link must be given.\n'
        }
        if (sc != '' && !scExp.test(sc)) {
            message += 'Incorrect SoundCloud profile link.\n'
        }
        if (yt != '' && !ytExp.test(yt)) {
            message += 'Incorrect YouTube channel link.\n'
        }
        if (sp != '' && !spExp.test(sp)) {
            message += 'Incorrect Spotify artist link.\n'
        }

        if (message != '') {
            alert(message);
            return false;
        }
    }

    if (validateForm() == false) {return false;};

    fetch('/add_artist', {
        method: 'POST',
        body: JSON.stringify({
            name: document.querySelector('#name').value,
            soundcloud: document.querySelector('#sc').value,
            youtube: document.querySelector('#yt').value,
            spotify: document.querySelector('#sp').value,
        })
    })
    .then(response => response.json())
    .then(data => {
        document.querySelector('#name').value = "";
        document.querySelector('#sc').value = "";
        document.querySelector('#yt').value = "";
        document.querySelector('#sp').value = "";
        window.location.reload();
    })
}


// add artist modal popup activation
$('document').ready(function() {
    $('#add-button').click(function() {
      $('#add-modal').modal('show');
    });
  });


// Fetches track data from DB, may take some time as all artist data from
// each site is retrieved in one call, so a loading spinner is displayed
// and hidden upon completion.
function getHomeData() {
    let div = document.querySelector('#spinner-div');
    let spinner = generate.spinner();
    div.appendChild(spinner);

    return fetch('/get_tracks')
    .then(response => response.json())
    .then(data => {
        const artistData = data;
        spinner.style.display = "none";
        return artistData;})
}


// revised loadArtists()
function loadArtist(data, artist){
    // finding what site is the most recent based on date string length.
    let dateLength = data.most_recent[artist].length;
    let site = '';
    if (dateLength == 10) {
        site = 'Spotify';
        var order = 0;
    } else if (dateLength == 19) {
        site = 'YouTube';
        var order = 1;
    } else if (dateLength == 20) {
        site = 'SoundCloud';
        var order = 2;
    }

    // creates a div for each artist here, with date of most recent post.
    const artistSection = document.createElement('div');
    artistSection.id = `${artist}`.replace(/\s+/g, '');
    // if the date contains 1776 the site API request failed.
    if (data.most_recent[artist].search("1776") == -1) {
        var options = { year: 'numeric', month: 'long', day: 'numeric' };
        var date  = new Date(data.most_recent[artist]);
        artistSection.innerHTML = `
            ${artist} posted on ${date.toLocaleDateString("en-US", options)} to ${site}: 
        `;
    } else {
        artistSection.innerHTML = `
            ${artist} data from ${site} failed to load. 
        `;
    }
    document.querySelector('#artists-div').append(artistSection);

    // calling the respective addTracksToPage functions.
    // the order variable's initial value determines which
    // function is called first. the following function calls
    // are arbitrarily ordered.
    for (let i = 0; i < 3; i++) {
        if (order == 2) {
            if (artist in data.soundcloud_tracks) {
                addSCTracksToPage({
                    'name': artist,
                    'tracklist': data.soundcloud_tracks[artist],
                    'favorites': data.favorites,
                    'laters': data.laters,
                });
                iframeCount++;
            }
            order++;
        }
        if (order == 1) {
            if (artist in data.youtube_tracks) {
                addYTTracksToPage({
                    'name': artist,
                    'tracklist': data.youtube_tracks[artist],
                    'favorites': data.favorites,
                    'laters': data.laters,
                });
                iframeCount++;
            }
            order++;
        }
        if (order == 0) {
            if (artist in data.spotify_tracks) {
                addSPTracksToPage({
                    'name': artist,
                    'tracklist': data.spotify_tracks[artist],
                    'favorites': data.favorites,
                    'laters': data.laters,
                });
                iframeCount++;
            }
            order++;
        }
        if (order == 3) {
            order = 0;
        }
    }
}


// inserts HTML required for each Soundcloud track
function addSCTracksToPage(context) {
    // creating the horizontal scroll menu
    const menu = document.createElement('div');
    menu.className = "scrollmenu";
    menu.id = `soundcloud${context.name}`.replace(/\s+/g, '');
    context.tracklist.forEach(track => {
        const widget = document.createElement('div');
        if (String(track).search("Failed") != -1) {
            widget.innerHTML = track;
        } else {
            widget.innerHTML = generate.scHTML(track);
        
            // creating save buttons and adding the listeners here.
            let favState = 0;
            let laterState = 0;

            let favIndex = context.favorites.findIndex(element => element.includes(track));
            let laterIndex = context.laters.findIndex(element => element.includes(track));
            
            if (favIndex !== -1) favState = 1;
            if (laterIndex !== -1) laterState = 1;

            widget.querySelector(".save-buttons")
            .appendChild(generate.createSaveButtons(favState, laterState));
            widget.querySelector("#fav-button").addEventListener('click', () => {
                clickedSave('favorite', widget.querySelector("iframe").outerHTML);
                let button = widget.querySelector("#fav-button");
                button.value = button.value === '\u2605' ? '\u2606' : '\u2605';
            });
            widget.querySelector("#later-button").addEventListener('click', () => {
                clickedSave('later', widget.querySelector("iframe").outerHTML);
                let button = widget.querySelector("#later-button");
                button.value = button.value === '\u29D7' ? '\u29D6' : '\u29D7';
            });
        }
        menu.appendChild(widget);
    });

    // appending the elements
    const artistDiv = document.createElement('div');
    artistDiv.append(menu);
    document.querySelector(`#${context.name}`.replace(/\s+/g, '')).append(artistDiv);
}


function addSPTracksToPage(context) {
    // creating the horizontal scroll menu
    const menu = document.createElement('div');
    menu.className = "scrollmenu";
    menu.id = `spotify${context.name}`.replace(/\s+/g, '');
    context.tracklist.forEach(track => {
        const widget = document.createElement('div');
        if (String(track).search("Failed") != -1) {
            widget.innerHTML = track;
        } else {
            widget.innerHTML = generate.spHTML(track);
            
            // creating save buttons and adding the listeners here.
            let favState = 0;
            let laterState = 0;

            let favIndex = context.favorites.findIndex(element => element.includes(track));
            let laterIndex = context.laters.findIndex(element => element.includes(track));
            
            if (favIndex !== -1) favState = 1;
            if (laterIndex !== -1) laterState = 1;

            widget.querySelector(".save-buttons")
            .appendChild(generate.createSaveButtons(favState, laterState));
            widget.querySelector("#fav-button").addEventListener('click', () => {
                clickedSave('favorite', widget.querySelector("iframe").outerHTML);
                let button = widget.querySelector("#fav-button");
                button.value = button.value === '\u2605' ? '\u2606' : '\u2605';
            });
            widget.querySelector("#later-button").addEventListener('click', () => {
                clickedSave('later', widget.querySelector("iframe").outerHTML);
                let button = widget.querySelector("#later-button");
                button.value = button.value === '\u29D7' ? '\u29D6' : '\u29D7';
            });
        }
        menu.appendChild(widget);
    });

    // appending the elements
    const artistDiv = document.createElement('div');
    artistDiv.append(menu);
    document.querySelector(`#${context.name}`.replace(/\s+/g, '')).append(artistDiv);
}


function addYTTracksToPage(context) {
    // creating the horizontal scroll menu
    const menu = document.createElement('div');
    menu.className = "scrollmenu";
    menu.id = `youtube${context.name}`.replace(/\s+/g, '');
    context.tracklist.forEach(track => {
        const widget = document.createElement('div');
        if (String(track).search("Failed") != -1) {
            widget.innerHTML = track;
        } else {
            widget.innerHTML = generate.ytHTML(track);

            // creating save buttons and adding the listeners here.
            let favState = 0;
            let laterState = 0;

            let favIndex = context.favorites.findIndex(element => element.includes(track));
            let laterIndex = context.laters.findIndex(element => element.includes(track));
            
            if (favIndex !== -1) favState = 1;
            if (laterIndex !== -1) laterState = 1;

            widget.querySelector(".save-buttons")
            .appendChild(generate.createSaveButtons(favState, laterState));
            widget.querySelector("#fav-button").addEventListener('click', () => {
                clickedSave('favorite', widget.querySelector("iframe").outerHTML);
                let button = widget.querySelector("#fav-button");
                button.value = button.value === '\u2605' ? '\u2606' : '\u2605';
            });
            widget.querySelector("#later-button").addEventListener('click', () => {
                clickedSave('later', widget.querySelector("iframe").outerHTML);
                let button = widget.querySelector("#later-button");
                button.value = button.value === '\u29D7' ? '\u29D6' : '\u29D7';
            });
        }
        menu.appendChild(widget);
    });

    // appending the elements
    const artistDiv = document.createElement('div');
    artistDiv.append(menu);
    document.querySelector(`#${context.name}`.replace(/\s+/g, '')).append(artistDiv);
}


function clickedSave(type, iframe) {
    let options = {};
    if (type == 'favorite') {
        options = {
            method: 'POST',
            body: JSON.stringify({
                'favorited_state': 1,
                'listen_state': 0,
                'post': iframe,
            })
        };
    } else if (type == 'later') {
        options = {
            method: 'POST',
            body: JSON.stringify({
                'listen_state': 1,
                'favorited_state': 0,
                'post': iframe,
            })
        };
    }

    fetch('save', options);
}