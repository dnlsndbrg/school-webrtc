// var helpers = require("./helpers");
var Mouse = require("./Mouse");
var Keyboard = require("./Keyboard");
var NetworkControls = require("./NetworkControls");
//var Bullet = require("./Bullet");
//var weapons = require("./data/weapons");
//var Weapon = require("./weapons/Weapon");
var Shotgun = require("./weapons/Shotgun");
var Ak47 = require("./weapons/Ak47");
//var Animation = require("./Animation");
var Entity = require("./Entity");
var Emitter = require("./particle/Emitter");
var weaponCreator = require("./weapons/weaponCreator");

function Player(playerData) {
    this.id = playerData.id;
    this.radius = playerData.radius || 20; // circle radius
    this.x = playerData.x || (Math.floor(Math.random() * (window.game.level.width - this.radius)) + this.radius / 2);
    this.y = playerData.y || (Math.floor(Math.random() * (window.game.level.height - this.radius)) + this.radius / 2);
    this.direction = playerData.direction || Math.floor(Math.random() * 360) + 1;
    this.viewingAngle = playerData.viewingAngle || 45;
    this.speed = playerData.speed || 100; //pixels per second
    this.hp = playerData.hp || 100;
    this.alive = playerData.alive || true;

    this.sx = 0;
    this.sy = 0;
    this.sw = 60;
    this.sh = 60;
    this.dw = 60;
    this.dh = 60;

    this.ctx = window.game.ctx;

    // keys
    this.kUp = false;
    this.kDown = false;
    this.kLeft = false;
    this.kRight = false;

    // mouse
    this.mouseX = this.x;
    this.mouseY = this.y;
    this.mouseLeft = false;

    // position on level
    this.tileRow = 0;
    this.tileCol = 0;

    this.weapons = [];
    // recreate weapons if the player has any else create new weapons
    if (playerData.weaponState) {
        for (var i = 0; i < playerData.weaponState.length; i+= 1) {
            this.weapons.push(weaponCreator(this, playerData.weaponState[i]));
        }
    }else {
        this.weapons = [new Ak47(this), new Shotgun(this)];
    }

    //this.weapons = [new Ak47(this), new Shotgun(this)];

    this.selectedWeaponIndex = playerData.selectedWeaponIndex || 0;

    this.lastClientState = this.getClientState();
    this.lastFullState = this.getFullState();

    this.ping = "-";
    this.actions = []; // actions to be performed
    this.performedActions = []; // succesfully performed actions

    // this.animations = {
    //     "idle": new Animation({name: "idle", sx: 0, sy: 0, w: 60, h: 60, frames: 1, playOnce: false}),
    //     "fire": new Animation({name: "fire", sx: 0, sy: 60, w: 60, h: 60, frames: 1, playOnce: true})
    // };
    //
    // this.currentAnimation = this.animations.idle;

    //is this me or another player
    if (playerData.id === window.game.network.client.peer.id) {
        this.controls = {mouse: new Mouse(this), keyboard: new Keyboard(this)};
        window.game.camera.follow(this);
    } else {
        this.controls = new NetworkControls();
    }
}

Player.prototype.update = function(dt){

    // go through all the queued up actions and perform them
    for (var i = 0; i < this.actions.length; i += 1){

        var success = this.performAction(this.actions[i]);
        if (success) {
            this.performedActions.push(this.actions[i]);
        }
    //     }
    }
    this.actions = [];

    if (!this.alive) return;


    // this.tileRow = Math.floor(this.y / window.game.level.tileSize);
    // this.tileCol = Math.floor(this.x / window.game.level.tileSize);

    this.move(dt);


    //check if off screen
    if (this.x > window.game.level.width) this.x = window.game.level.width;
    if (this.x < 0) this.x = 0;
    if (this.y > window.game.level.height) this.y = window.game.level.height;
    if (this.y < 0) this.y = 0;

    // update current weapon;
    this.weapons[this.selectedWeaponIndex].update(dt);

    //this.currentAnimation.update(dt);

    if (this.mouseLeft) { // if firing
        this.actions.push({ // add to the actions queue
            action: "fire",
            data: {
                x: this.mouseX,
                y: this.mouseY
            }
        });
    }

    this.turnTowards(this.mouseX, this.mouseY);
};

Player.prototype.move = function(dt) {

    // var oldX = this.x;
    // var oldY = this.y;

    // Update movement
    var distance = this.speed * dt;
    if (this.kUp && this.kLeft) {
        distance = distance * 0.71;
        this.y -= distance;
        this.mouseY -= distance;
        this.x -= distance;
        this.mouseX -= distance;
    } else if (this.kUp && this.kRight) {
        distance = distance * 0.71;
        this.y -= distance;
        this.mouseY -= distance;
        this.x += distance;
        this.mouseX += distance;
    } else if (this.kDown && this.kLeft) {
        distance = distance * 0.71;
        this.y += distance;
        this.mouseY += distance;
        this.x -= distance;
        this.mouseX -= distance;
    } else if (this.kDown && this.kRight) {
        distance = distance * 0.71;
        this.y += distance;
        this.mouseY += distance;
        this.x += distance;
        this.mouseX += distance;
    } else if (this.kUp) {
        this.y -= distance;
        this.mouseY -= distance;
    } else if (this.kDown) {
        this.y += distance;
        this.mouseY += distance;
    } else if (this.kLeft) {
        this.x -= distance;
        this.mouseX -= distance;
    } else if (this.kRight) {
        this.x += distance;
        this.mouseX += distance;
    }
};

// // Collision check against surrounding tiles
// Player.prototype.collisionCheck = function() {
//     var startingRow = this.tileRow - 1;
//     if (startingRow < 0) startingRow  = 0;
//     var endRow = this.tileRow +1;
//     if (endRow > window.game.level.rowTileCount) endRow = window.game.level.rowTileCount;
//     var startingCol = this.tileCol -1;
//     if (startingCol < 0) startingCol = 0;
//     var endCol = this.tileCol +1;
//     if (endCol > window.game.level.colTileCount) endCol = window.game.level.colTileCount;
//
//     for (var row = startingRow; row < endRow; row += 1) {
//         for (var col = startingCol; col < endCol; col += 1) {
//             if (window.game.level.level.tiles[row][col] === 0) continue; // every tile other than 0 are non walkable
//             // collision
//             if (this.tileRow === row && this.tileCol === col) {
//                 return false;
//             }
//         }
//     }
//     return true;
// };

Player.prototype.networkUpdate = function(update){
    delete update.id;
    // networkUpdate
    for (var key in update) {
        if (key === "actions") this[key] = this[key].concat(update[key]);
        else this[key] = update[key];
    }
};

Player.prototype.performAction = function(action){
    switch(action.action){
        case "turnTowards":
            this.turnTowards(action.data.x, action.data.y);
            break;
        case "fire":
            return this.weapons[this.selectedWeaponIndex].fire(action);
        case "die":
            this.die(action);
            break;
        case "respawn":
            return this.respawn(action);
        case "changeWeapon":
            return this.changeWeapon(action);
        case "reload":
    }       return this.weapons[this.selectedWeaponIndex].reload(action);
};

Player.prototype.render = function(){
    if(!this.alive) return;
    this.ctx.save(); // save current state
    this.ctx.translate(this.x - window.game.camera.x, this.y - window.game.camera.y); // change origin
    this.ctx.rotate(this.direction); // rotate

    this.ctx.drawImage(window.game.spritesheet, this.weapons[this.selectedWeaponIndex].sx, this.weapons[this.selectedWeaponIndex].sy, this.sw, this.sh, -(this.sw / 2), -(this.sh / 2), this.dw, this.dh);
    this.ctx.restore(); // restore original states (no rotation etc)

};

Player.prototype.turnTowards = function(x,y) {
    var xDiff = x - this.x;
    var yDiff = y - this.y;
    this.direction = Math.atan2(yDiff, xDiff);// * (180 / Math.PI);
};

Player.prototype.takeDamage = function(damage, direction) {
    this.hp -= damage;
    if (this.hp <= 0) {
        this.actions.push({
            action: "die",
            data: {
                direction: direction
            }
        });
    }

    window.game.entities.push(new Emitter({
        type: "Blood",
        lifeTime: 0.3,
        emitSpeed: 0.05,
        x: this.x,
        y: this.y
    }));
};

Player.prototype.die = function(action) {
    this.alive = false;
    this.weapons[this.selectedWeaponIndex].reloading = false;
    this.weapons[this.selectedWeaponIndex].reloadTimer = 0;

    // create a corpse
    var corpse = new Entity({
        x: this.x + Math.cos(action.data.direction) * 10,
        y: this.y + Math.sin(action.data.direction) * 10,
        sx: 60 +( Math.floor(Math.random() * 3) * 60),
        sy: 120,
        sw: 60,
        sh: 60,
        dw: 60,
        dh: 60,
        direction: action.data.direction,
        ctx: window.game.bgCtx
    });

    window.game.entities.push(corpse);
};

Player.prototype.respawn = function(action) {
    this.x = action.data.x;
    this.y = action.data.y;
    this.hp = 100;
    this.alive = true;
    return action;
};

Player.prototype.changeWeapon = function(action) {
    this.weapons[this.selectedWeaponIndex].reloading = false;
    this.weapons[this.selectedWeaponIndex].reloadTimer = 0;
    this.selectedWeaponIndex = action.data.selectedWeaponIndex;
    return action;
};

Player.prototype.getFullState = function() {
    return {
        x: this.x,
        y: this.y,
        id: this.id,
        hp: this.hp,
        alive: this.alive,
        radius: this.radius,
        direction: this.direction,
        viewingAngle: this.viewingAngle,
        speed: this.speed,
        kUp: this.kUp,
        kDown: this.kDown,
        kLeft: this.kLeft,
        kRight: this.kRight,
        mouseX: this.mouseX,
        mouseY: this.mouseY,
        selectedWeaponIndex: this.selectedWeaponIndex,
        weaponState: this.getWeaponState()
    };
};

// The state the client sends to the host
Player.prototype.getClientState = function() {
    return {
        id: this.id,
        direction: this.direction,
        kUp: this.kUp,
        kDown: this.kDown,
        kLeft: this.kLeft,
        kRight: this.kRight,
        mouseX: this.mouseX,
        mouseY: this.mouseY
    };
};

// get the state of each weapon
Player.prototype.getWeaponState = function() {
    var state = [];
    for (var i = 0; i < this.weapons.length; i += 1) {
        state.push(this.weapons[i].getState());
    }
    return state;
};


module.exports = Player;
