// fetches saved tracks from DB and display the requested page
export function savedPage(type) {
    fetch('/saved_tracks')
    .then(response => response.json())
    .then(data => {
        let numFavs = Object.keys(data.favorites).length
        let numLaters = Object.keys(data.laters).length
        if (type == 'favorites') {
            let favDiv = document.querySelector('#favorites-div');
            if (numFavs == 0) {favDiv.innerHTML = 'Click the star next to a track to save it.';}
            else {
                data.favorites.forEach(track => {
                    let trackDiv = document.createElement('div');
                    trackDiv.className = 'saved-track mb-3';
                    let trackFrame = document.createElement('div');

                    let removeButton = removeSaveButton();
                    removeButton.addEventListener('click', () => {
                        clickedSave('favorite', track); // toggles the DB value
                        trackDiv.style.display = "none";
                        removeButton.style.display = "none";
                        changeSaveIcon("#fav-button", track);
                    })

                    trackDiv.appendChild(removeButton);
                    trackDiv.appendChild(trackFrame);
                    trackFrame.outerHTML = track;
                    favDiv.appendChild(trackDiv);
                })
            }
        }
        if (type == 'later') {
            let laterDiv = document.querySelector('#later-div');
            if (numLaters == 0) {laterDiv.innerHTML = 'Click the hourglass next to a track to save it.';}
            else {
                data.laters.forEach(track => {
                    let trackDiv = document.createElement('div');
                    trackDiv.className = 'saved-track mb-3';
                    let trackFrame = document.createElement('div');

                    let removeButton = removeSaveButton();
                    removeButton.addEventListener('click', () => {
                        clickedSave('later', track); // toggles the DB value
                        trackDiv.style.display = "none";
                        removeButton.style.display = "none";
                        changeSaveIcon("#later-button", track);
                    })

                    trackDiv.appendChild(removeButton);
                    trackDiv.appendChild(trackFrame);
                    trackFrame.outerHTML = track;
                    laterDiv.appendChild(trackDiv);
                })
            }
        }
    })
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


// changes the fav/later icon in the home view when the track gets removed from
// the fav/later view.
function changeSaveIcon(type, track) {
    const homeDiv = document.querySelector('#artists-div');
    var iframes = homeDiv.getElementsByTagName("iframe");

    for (var i = 0; i < iframes.length; i++) {
        if (iframes[i].outerHTML == track) {
            var iconDiv = iframes[i].parentElement.previousElementSibling;
            let button = iconDiv.querySelector(type);
            if (button.value == '\u2605') {button.value = '\u2606';}
            if (button.value == '\u29D7') {button.value = '\u29D6';}

            break;
        }
    } 
}


// creates the remove button on saved pages
function removeSaveButton() {
    const removeButton = document.createElement('input');
    removeButton.type = "button";
    removeButton.id = "remove-button";
    removeButton.className = "remove-button btn btn-danger";
    removeButton.value = "\u24CD";

    return removeButton;
}


// generates the modify artists page
export function modifyPage() {
    // creating cancel and save buttons. cancel displays the home content
    // again, save will fetch the DB and reload home page.
    const cancelButton = document.createElement('button');
    cancelButton.id = "close-modal";
    cancelButton.type = "button";
    cancelButton.className = "float-right cancel-button btn btn-secondary";
    cancelButton.innerHTML = "Cancel";
    cancelButton.addEventListener('click', () => {
        document.querySelector('#accordion').style.display = "none";
        document.querySelector('#artists-div').style.display = "block";
        document.querySelector('#title').innerHTML = 'Home';
    })

    // fetch list of artists/links and add to the modify artists page
    fetch("/artists")
    .then(response => response.json())
    .then(data => {
        data.artists.forEach(artist => {
            const artistCard = document.createElement('div');
            artistCard.className = "card";
            artistCard.id = `modify-card`;
            artistCard.innerHTML = `
                <div class="card-header" id="modify-header">
                    <h5 class="mb-0">
                        <button class="btn modify-button" data-toggle="collapse" data-target="#collapse${artist.id}" aria-expanded="true" aria-controls="collapse${artist.id}">
                            ${artist.name}
                        </button>
                    </h5>
                </div>
            
                <div id="collapse${artist.id}" class="collapse" aria-labelledby="heading${artist.id}" data-parent="#accordion">
                    <div class="card-body">
                        <form>
                            <div class="form-group row">
                                <label for="name${artist.id}" class="col-sm-3 col-form-label">Name</label>
                                <div class="col-sm-9">
                                    <input type="text" class="form-control" id="name${artist.id}" value="${artist.name}">
                                </div>
                            </div>
                            <div class="form-group row">
                                <label for="sc${artist.id}" class="col-sm-3 col-form-label">Soundcloud</label>
                                <div class="col-sm-9">
                                    <input type="text" class="form-control" id="sc${artist.id}" value="${artist.links[0]}">
                                </div>
                            </div>
                            <div class="form-group row">
                                <label for="yt${artist.id}" class="col-sm-3 col-form-label">YouTube</label>
                                <div class="col-sm-9">
                                    <input type="text" class="form-control" id="yt${artist.id}" value="${artist.links[2]}">
                                </div>
                            </div>
                            <div class="form-group row">
                                <label for="sp${artist.id}" class="col-sm-3 col-form-label">Spotify</label>
                                <div class="col-sm-9">
                                    <input type="text" class="form-control" id="sp${artist.id}" value="${artist.links[1]}">
                                </div>
                            </div>
                        </form
                        <div>
                            <button id="save${artist.id}" type="button" class="float-right save-button btn btn-primary mb-3">Save Changes</button>
                            <button id="delete${artist.id}" type="button" class="float-right mr-3 delete-button btn btn-danger">Delete Artist</button>
                        </div>
                    </div>
                </div>
            `;
            artistCard.appendChild(cancelButton);
            document.querySelector('#accordion').append(artistCard);
            document.querySelector(`#save${artist.id}`).addEventListener('click', () => {
                modifyArtist(artist.id);
            })
            document.querySelector(`#delete${artist.id}`).addEventListener('click', (event) => {
                deleteArtist(artist.id);
                event.preventDefault();
                window.location.reload();
            })
        })
    })
}


// checks the modified input, PUTs it to the DB, reloads the page.
function modifyArtist(artistId) {
    var name = document.querySelector(`#name${artistId}`).value;
    var sc = document.querySelector(`#sc${artistId}`).value;
    var yt = document.querySelector(`#yt${artistId}`).value;
    var sp = document.querySelector(`#sp${artistId}`).value;

    function validateForm() {
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

    // fetch the edit route
    fetch(`/artists/${artistId}`, {
        method: 'PUT',
        body: JSON.stringify({
            name: name,
            soundcloud: sc,
            youtube: yt,
            spotify: sp,
        })
    })
   
    window.location.reload();
}


function deleteArtist(artistId) {
    // fetch the delete route
    fetch(`/delete/${artistId}`, {
        method: 'DELETE',
    })
}


export function createSaveButtons(favoriteStatus, laterStatus) {
    const favButton = document.createElement('input');
    favButton.type = "button";
    favButton.id = "fav-button";
    favButton.className = "btn btn-light";
    favButton.value = favoriteStatus === 0 ? '\u2606' : '\u2605';

    const laterButton = document.createElement('input');
    laterButton.type = "button";
    laterButton.id = "later-button";
    laterButton.className = "btn btn-light";
    laterButton.value = laterStatus === 0 ? '\u29D6' : '\u29D7';

    const saveDiv = document.createElement('div');
    saveDiv.className = "btn-group-vertical btn-group-sm btn-block";
    saveDiv.style = "display:flex;flex-direction:column;height:160px;";
    saveDiv.role = "group";
    saveDiv.appendChild(favButton);
    saveDiv.appendChild(laterButton);

    return saveDiv;
}


export function spinner() {
    const spinner = document.createElement('div');
    spinner.className = "spinner-border mb-3";
    spinner.role = "status";
    spinner.innerHTML = `<span class="sr-only">Loading...</span>`;

    return spinner;
}


// each site has unique embed code
export function scHTML(id) {
    const html = `
    <div class="container mr-2" style="width: 18rem;height:160px;">
        <div class="d-flex row" style="height:100%;align-items:center;">
            <div class="col-1 p-0" style="height:100%;">
                <div class="save-buttons d-flex" style="height:100%;align-items:center;"></div>
            </div>
            <div class="col-11 p-0">
            <iframe class="embed-responsive embed-responsive-16by9" height="160" scrolling="yes" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${id}&color=%2364dfdf&auto_play=false&hide_related=false&show_comments=false&show_user=true&show_reposts=false&show_teaser=true&visual=true"></iframe>
            </div>
        </div>
    </div>
    `;
    return html;
}


export function spHTML(id) {
    const html = `
    <div class="container mr-2" style="width: 18rem;height:160px;">
            <div class="d-flex row" style="height:100%;align-items:center;">
                <div class="col-1 p-0" style="height:100%;">
                    <div class="save-buttons d-flex" style="height:100%;align-items:center;"></div>
                </div>
                <div class="col-11 p-0">
                <iframe src="https://open.spotify.com/embed/album/${id}?utm_source=generator" class="embed-responsive embed-responsive-16by9" height="160px" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>
                </div>
            </div>
        </div>
    `;
    return html;
}


export function ytHTML(id) {
    const html = `
    <div class="container mr-2" style="width: 18rem;height:160px;">
            <div class="d-flex row" style="height:100%;align-items:center;">
                <div class="col-1 p-0" style="height:100%;">
                    <div class="save-buttons d-flex" style="height:100%;align-items:center;"></div>
                </div>
                <div class="col-11 p-0">
                    <iframe class="embed-responsive embed-responsive-16by9" height="160px" src="https://www.youtube.com/embed/${id}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                </div>
            </div>
        </div>
    `;
    return html;
}