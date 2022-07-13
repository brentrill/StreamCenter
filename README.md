# StreamCenter

Now deployed on Heroku: https://stream-center.herokuapp.com/

Have you ever missed a song by your favorite underground artist because they thought it would be cool to release it on a single streaming service and not say anything about it? With StreamCenter you can easily stay up-to-date with your favorite popular loner musicians (some input required).

Currently only for use with SoundCloud, YouTube, and Spotify, add &#65291; an artist to watch by giving them a name and their respective profile/channel/artist links. StreamCenter will then pool together the 5 latest releases on each service and display the most recent one first on the Home &#8962; page. With multiple artists added, they will be displayed in order of their most recent release. You can then listen to the songs or watch videos directly from StreamCenter!

Do you really like a song, or want to listen to it later? Save it to your Favorites &#9733; or Listen Later &#10711; list by clicking the icons to the left of any track.

Favorite artist got cancelled? Visit the Modify &#128393; page and delete them! You can also change or add another link here.

### Demonstration
https://www.youtube.com/watch?v=vXAb7UFYktQ

### Distinctiveness and Complexity

The idea for this project came from wanting to solve a real problem I experience online. The distinctiveness of this project comes from this very same niche problem. StreamCenter aggregates data from three different services and displays it neatly and uniformly. I believe it's self-evident that this project is wholly unlike any previous project in this course.

StreamCenter is markedly more complex than anything I've made before. Each different service it watches has a specific way of dealing with its API, which required many deep-dives into their documentation. The format of JSON data received by each service is also unique, so the app needed to standardize all of this for uniformity.

In order to display the most recent song from the most recent service and then display the artists in order of this date, I wrote a very pythonically intense piece of code that compares the dates and returns the list of artists in order.

Because StreamCenter communicates with these outside services, and because the program takes user input, there is always the possibility of failure. The app deals with empty responses from these sites gracefully. In the event that one artist or site fails to load, the app won't break and will continue to display the other content, while telling the user which site has the problem. I also had to be aware of the number of requests made to each site because some have quotas, and with many requests come performance issues so I needed to adequately optimize the code.

The frontend is also quite complex. A lot of data is displayed at once, so there were many important design choices I had to make such as the horizontal scrolling of the embedded media, infinite scrolling, and save icons on the left of each track. The displayed tracks are not saved to the database, they are retrieved on each page reload, so I faced an interesting problem when it came to saving the tracks to the Favorites or Listen Later. I decided on saving the track's entire <iframe> HTML to the database, and displaying this data when the saved pages are visited. 

When a track is saved, the icon on the Home page is filled in and it's data is added to the saved list. However, if the track gets removed from the saveds, the icon on the Home page needs to change back to unfilled. The Javascript will search the document for the saved HTML data and if a match is found, the icon will change. Unforseen problems like this and many others contribute to the complexity of this project.

The application uses 3 Django models and is mobile responsive.


### Installation
* Install project dependencies by executing `pip install -r requirements.txt` in the project directory. This will install Django, pytube for scraping YouTube, and requests.
* Make and apply migrations with `python manage.py makemigrations` followed by `python manage.py migrate`.
* Optionally create a superuser for use in the admin site with `python manage.py createsuperuser`. Follow the onscreen prompts.
* Start the website with `python manage.py runserver`.
* Go to the localhost address given onscreen in your web browser and register an account.


### File Contents
```
|   db.sqlite3  --> Contains the database.
|   manage.py
|   requirements.txt    --> List of imported Python libraries.
|   
+---project5
|   |   asgi.py
|   |   settings.py --> Settings and configurations for the project.
|   |   urls.py     --> Path to the admin site and includes streamcenter urls.
|   |   wsgi.py
|   |   __init__.py
|   |   
|   \---__pycache__
|           
\---streamcenter
    |   admin.py    --> Models registered here for use in the admin site.
    |   apps.py
    |   models.py   --> Contains the database models.
    |   tests.py    --> I only used this file to design an algorithm.
    |   urls.py     --> App URL patterns and API routes
    |   views.py    --> The main backend code.
    |   __init__.py
    |   
    +---migrations
    |   |   
    |   \---__pycache__
    |           
    +---static      --> Contains frontend code.
    |   \---streamcenter
    |           generators.js   --> Exports functions for use in script.js.
    |                               They generally contain HTML code or
    |                               create buttons.
    |           script.js   --> Main Javascript code. Streamcenter is a
    |                           single-page site so it changes the view,
    |                           sends and retrieves data from the DB,
    |                           and dynamically displays content.
    |           styles.css  --> Raw CSS styling.
    |           styles.css.map
    |           styles.scss --> Source SCSS styling code.
    |           
    +---templates
    |   \---streamcenter    --> Contains every HTML page rendered.
    |           index.html  --> Main page seen after login. Contains divs
    |                           for each view and imports script.js.
    |           layout.html --> Template used by the other HTML files.
    |                           Contains header info, navbar, the add-artist
    |                           modal, and imports jQuery, Popper, and
    |                           Bootstrap.
    |           login.html
    |           register.html
    |           
    \---__pycache__
```


### Additional Information

SoundCloud is definitely the most troublesome service. Currently their API registration is closed, so the methods and endpoints in their documention simply do not work without valid API keys. I ended up 'reverse engineering' their API to meet my needs, however this makes it fairly unstable.

Given that the inputted SoundCloud link is correct, the get_artist_tracks() function in views.py tends to not retrieve any data. If it fails, it will recursively call itself and try again. If I let this run infinitely, it will eventually work, but this means long load times and bad resource management. The function takes a 'tries' variable that limits how many recursive calls it makes before returning 'Failed' track data. 

If some of the artists fail to load SoundCloud data, just reload the page and it may work.

In the event that SoundCloud loads nothing even after reloading, the 'client_id' and 'app_version' variables at the top of views.py may need to be updated. Details are given in the comment above the variable.