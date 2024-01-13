const express = require('express');
const db = require('./db.js');
const app = express();
const cookieParser = require('cookie-parser');
const jwt = require("jsonwebtoken");
const bodyParser = require('body-parser')
const port = 8080;

app.set('view engine', 'hbs');
app.use(cookieParser());
app.use(express.static('public'))
app.use(express.urlencoded({extended: false}));
app.use(bodyParser.json());

app.get('/', async(req, res) => {
    try {
        const session = req.cookies['SESSION'];
        const matches = [];
        fetch("https://sports.daum.net/prx/hermes/api/game/schedule.json?page=1&leagueCode=epl&seasonKey=20232024&fromDate=20240101&toDate=20240131")
        .then((response) => response.json())
        .then((json) => {
            Object.keys(json["schedule"]).forEach(function(k){
                json["schedule"][k].forEach((e) => {
                    // db.initGameDB(e["gameId"]);
                    const map = {
                        "gameId": e["gameId"],
                        "date": e["startDate"].slice(0,4) + '.' + e["startDate"].slice(4,6) + '.' + e["startDate"].slice(6,8),
                        "time": e["startTime"].slice(0,2) + ':' + e["startTime"].slice(2,4),
                        "home": e["homeTeamName"],
                        "home_score": (e["homeResult"] === null) ? '-' : e["homeResult"],
                        "away": e["awayTeamName"],
                        "away_score": (e["awayResult"] === null) ? '-' : e["awayResult"]
                    }
                    matches.push(map);
                });
            });
            res.render("index", { matches, session } );
        });
    } catch (error) {
        console.error(error);
        res.status(500).send(error);
    }
});

app.get('/main', async(req, res) => {
    try{
        const gameId = req.query.gameId;
        const { home, away } = await db.predict(gameId);
        const session = req.cookies['SESSION'];
        const verified = (session) ? jwt.verify(session, 'c3NhbWJvbmctc29jY2Vy') : null;
        const id = (session) ? verified["id"] : null; ;
        const already = await db.alreadyPredict(id, gameId);
        const sum = parseInt(home) + parseInt(away);
        const p_home = home * 100 / sum ;
        const p_away = away * 100 / sum ;
        var map = {};
        fetch("https://sports.daum.net/prx/hermes/api/game/schedule.json?page=1&leagueCode=epl&seasonKey=20232024&fromDate=20240101&toDate=20240131")
        .then((response) => response.json())
        .then((json) => {
            Object.keys(json["schedule"]).forEach(function(k){
                json["schedule"][k].forEach((e) => {
                    if(e["gameId"] == gameId){
                        map = {
                            "gameId": e["gameId"],
                            "date": e["startDate"].slice(0,4) + '.' + e["startDate"].slice(4,6) + '.' + e["startDate"].slice(6,8),
                            "time": e["startTime"].slice(0,2) + ':' + e["startTime"].slice(2,4),
                            "home": e["homeTeamName"],
                            "home_score": (e["homeResult"] === null) ? '-' : e["homeResult"],
                            "away": e["awayTeamName"],
                            "away_score": (e["awayResult"] === null) ? '-' : e["awayResult"],
                            "homeWlt": e["homeWlt"]
                        }
                    }
                });
            });
            res.render("main", { map, session, home, away, sum, p_home, p_away, already } );
        });
    } catch (error) {
        console.error(error);
        res.status(500).send(error);
    }
});

app.post('/predict', async(req, res) => {
    const session = req.cookies['SESSION'];
    const body = req.body;
    const gameId = body["gameId"];
    const team = body["team"];
    const verified = jwt.verify(session, 'c3NhbWJvbmctc29jY2Vy');
    const id = verified["id"];
    await db.addPredict(gameId, team, id);
    res.redirect("/");
});

app.post('/register', async(req, res) => {
    const session = req.cookies['SESSION'];
    if(session) return res.redirect('/');
    const { id, pwd } = req.body;
    const result = await db.register(id, pwd);
    if (result) res.redirect('/');
    else res.redirect('/signup.html?result=alreadyExist');
    
});

app.post('/login', async(req, res) => {
    const session = req.cookies['SESSION'];
    if(session) return res.redirect('/');
    const { id, pwd } = req.body;
    const result = await db.login(id, pwd);
    if (result) {
        var token = jwt.sign({ id: id }, 'c3NhbWJvbmctc29jY2Vy');
        res.cookie('SESSION',token);
        res.redirect('/');
    }
    else res.redirect('/login.html?result=loginFailed');
});

app.post('/logout', async(req, res) => {
    res.clearCookie('SESSION');
    res.redirect('/');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});