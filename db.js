const { Client } = require("pg");
const account = require('./account.js');
const client = new Client({
    user: "server",
    host: "127.0.0.1",
    database: "soccer",
    password: "revres",
    port: 5432,
});

client.connect();

const initGameDB = async (gameId) => {
    try {
        const query = {
            text: 'INSERT INTO predict VALUES($1, 0, 0)',
            values: [gameId]
        }

        await client.query(query);
    } catch(e) {
        console.error(e);
    }
}

const register = async (id, pwd) => {
    try {
        const { hashedPassword, salt } = await account.createHashedPassword(pwd);
        const verQuery = {
            text: 'SELECT * FROM account WHERE id = $1',
            values: [id]
        }

        var f = true;
        await client.query(verQuery).then((res) => {
            if (res.rows[0] != null) { 
                f=false; 
                return false; 
            }
        });

        if(f) {
            const regQuery = {
                text: "INSERT INTO account VALUES ($1, $2, $3)",
                values: [id, hashedPassword, salt]
            };
            await client.query(regQuery);
            return true;
        }
    } catch(e) {
        console.error(e);
    }
};

const login = async (id, pwd) => {
    try {
        const query = {
            text: 'SELECT * FROM account WHERE id = $1',
            values: [id]
        }

        var r, f = true;
        await client.query(query).then((res) => {
            if (res.rows[0] == undefined) {
                f = false;
                return false
            }; 
            r = res;
        });
        if(f){
            const v = await account.verifyPassword(pwd, r.rows[0]["salt"], r.rows[0]["pwd"]);
            if(v) return true;
            return false;
        }

    } catch(e) {
        console.error(e);
    }
};

const predict = async (gameId) => {
    try {
        const query = {
            text: 'SELECT * FROM predict WHERE gameid = $1',
            values: [gameId]
        }
        var home, away;
        await client.query(query).then((res) => {
            home = res.rows[0]["home"];
            away = res.rows[0]["away"];
        });
        return { home, away };
    } catch(e){
        console.error(e);
    }
}

const addPredict = async (gameId, team, user) => {
    try {
        const prSelQuery = {
            text: 'SELECT * FROM predict WHERE gameid = $1',
            values: [gameId]
        }
        var val;
        await client.query(prSelQuery).then((res) => {
            val = parseInt(res.rows[0][team]) + 1;
        });

        const prUpdQuery = {
            text: `UPDATE predict SET ${team} = $1 WHERE gameid = $2`,
            values: [val, gameId]
        }
        await client.query(prUpdQuery);
        
        const usSelQuery = {
            text: 'SELECT * FROM account WHERE id = $1',
            values: [user]
        }
        var list;
        await client.query(usSelQuery).then((res) => {
            list = (res.rows[0]["predictlist"] == null ? [] : res.rows[0]["predictlist"]);
        });
        list.push(gameId);

        const usUpdQuery = {
            text: 'UPDATE account SET predictlist = $1 WHERE id = $2',
            values: [list, user]
        }
        await client.query(usUpdQuery);

        
    } catch(e) {
        console.error(e);
    }
}

const alreadyPredict = async (id, gameId) => {
    try {
        const query = {
            text: 'SELECT * FROM account WHERE id = $1',
            values: [id]
        }
        var already = null;
        await client.query(query).then((res) => {
            if (res.rows[0]["predictlist"].includes(gameId)) already = 1;
        });
        return already;
    } catch (e) {
        console.error(e);
    }
};


module.exports = { register, login, initGameDB, predict, addPredict, alreadyPredict };