This will just be a simple web app with a search bar for tikers and will display basic info about a stock. 

Basic Node Express backend that runs a single html page

Files

    - app.js
    - /api/index.js
    - /api/stock.js
    - /public/styles.css
    - /public/index.html

app runs on localhost:3001

paths
    /home -> delivers the html file /public/index.html
    /api/stock -> expects a jquery {ticker:""} and returns stock data 

packages
    - Express
    - Cors
    - path

external tools
    chart.js
    finance.yahoo.com