/**
 * @author Daniel Sundberg
 * @version 1.0.0
 */

"use strict";

let
    path                = require("path"),
    exphbs              = require("express-handlebars"),
    http                = require("http"),
    io                  = require("socket.io"),
    express             = require("express"),
    shortid             = require("shortid"),
    ExpressPeerServer   = require("peer").ExpressPeerServer;

let app     = express(),
    port    = process.env.PORT || 8000;
var games = {};

// peerServer options
var options = {
    debug: true
};

// Launch Application ----------------------------------------------------------

let server = http.createServer(app).listen(port, () => {
    console.log("Express is running on port %s", port);
});

io = io(server);


// Confifguration --------------------------------------------------------------

app.use(express.static(path.join(__dirname + "/public")));

app.engine("hbs", exphbs({
    extname: ".hbs"
}));

app.set("view engine", "hbs");


// Routes ----------------------------------------------------------------------

app.use("/peer", ExpressPeerServer(server, options));

app.get("/play/:gameID", (req, res) => { //TODO: verify input
    res.render("game");
});

app.get("/", (req, res) => {
    res.render("lobby");
});

// Socket.io -------------------------------------------------------------------

io.on("connection", (socket) => {
    console.log("socket connection");

    // send the new player its ID
    socket.emit("ID", { ID: shortid.generate() });

    socket.on("join", (data) => { //TODO: validate data
        // a client wants to join the game data.gameID

        //store the gameID and peerID on the socket object
        socket.gameID = data.gameID;
        socket.peerID = data.peerID;

        // Check if the game exists
        if(!(data.gameID in games)){
            games[data.gameID] = {
                host: socket, // since this guy is the first here, make him/her the host
                peers: []
            };
            socket.emit("youAreHost", {hostID: shortid.generate(), peers: [] });
        } else {
            // tell the host to make a peer connection to this new player
            games[data.gameID].host.emit("playerJoined", {hostID: shortid.generate(), peerID: data.peerID });
            // add the new player to the peers list
            games[data.gameID].peers.push(socket);
        }
    });

    socket.on("disconnect", () => {

        var game = games[socket.gameID];
        if (!game) return;

        if (socket.peerID === game.host.peerID) { // check if the socket that disconnected was a host
            if (game.peers.length === 0) { // if there's no one left in the game, delete it

                delete games[socket.gameID];
                return;
            }

            // find and remove the old host
            game.peers.forEach(function(peer, index) {
                if(socket.peerID === peer.peerID){
                    game.peers.splice(index,1);
                }
            });

            // make the next guy the host
            game.host = game.peers[0];
            // remove him from the list of peers
            game.peers.splice(0,1);
            // send the new host the list of peers so he can setup connections
            var peers = game.peers.map((peer) => { return peer.peerID; });
            game.host.emit("youAreHost", {peers: peers});

        } else {
            // find the peer that left and remove him from the peers list
            game.peers.forEach(function(peer, index) {
                if(socket.peerID === peer.peerID){
                    game.peers.splice(index,1);
                }
            });
        }

        // tell everyone that player left
        console.log("PLAYER LEFT", socket.gameID, socket.peerID);
        socket.broadcast.emit("playerLeft", {playerID: socket.peerID});
    });

});
