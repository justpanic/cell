const { response } = require("express");
const http = require("http");
const app = require("express")();
app.get("/", (req, res)=>res.sendFile(__dirname + "/index.html"))
app.listen(9091, ()=>console.log("Listening on 9091"))
const websocketServer = require("websocket").server
const httpServer = http.createServer();
httpServer.listen(9090, () => console.log("Listening on 9090"))

// hashmap
const clients = {};
const games = {};

const wsServer = new websocketServer({
    "httpServer" : httpServer
}) 

wsServer.on("request", request => {
    // connect
    const connection = request.accept(null, request.origin);
    connection.on("open", () => console.log("opened!"))
    connection.on("close", () => console.log("closed!"))
    connection.on("message", message => {
        // received a message from the client 
        const result = JSON.parse(message.utf8Data) // console.log(result)
        // a user want to create new game
        if(result.method==="create") {
            const clientId = result.clientId;
            const gameId = guid();
            games[gameId] = {
                "id" : gameId,
                "balls" : 20,
                "clients" : []
            }

            const payLoad = {
                "method" : "create",
                "game" : games[gameId]
            }

            const con = clients[clientId].connection;
            con.send(JSON.stringify(payLoad));

        }

        // a client want to join 
        if(result.method==="join") {
            const clientId = result.clientId;
            const gameId = result.gameId;
            const game = games[gameId];

            if(game.clients.length>=3){ // max clients reach
                return;
            }
            const color = {"0":"Red","1":"Green","2":"Blue"}[game.clients.length]
            game.clients.push({
                "clientId" : clientId,
                "color" : color
            });

            // start the game (3명이 모이면 게임시작)
            if (game.clients.length === 3) updateGameState();

            const payLoad = {
                "method" : "join",
                "game" : game
            }

            // loop through all clients and tell them that people has joined.
            game.clients.forEach(c => {
                clients[c.clientId].connection.send(JSON.stringify(payLoad))
            });
        }

        // a user play
        if(result.method==="play") {
            const clientId = result.clientId;
            const gameId = result.gameId;
            const ballId = result.ballId;
            const color = result.color;
            let state = games[gameId].state;

            if(!state)
                state = {}
            
            state[ballId] = color;
            games[gameId].state = state;

        }
    })

    // generate a new clientID
    const clientId = guid();
    clients[clientId] = {
        "connection" : connection
    }

    const payLoad = {
        "method" : "connect",
        "clientId" : clientId
    }

    // send back the client connect
    connection.send(JSON.stringify(payLoad))

})

function updateGameState() {
    for (const g of Object.keys(games)) {
        const game = games[g]
        const payLoad = {
            "method" : "update",
            "game" : game
        }
        game.clients.forEach(c=> {
            clients[c.clientId].connection.send(JSON.stringify(payLoad))
        })
    }
    setTimeout(updateGameState, 500);
}

function s4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1)
}

const guid = () => `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4() + s4() + s4()}`;
