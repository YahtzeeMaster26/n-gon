/* eslint-disable strict */

//global player variables for use in matter.js physics
let player, jumpSensor, playerBody, playerHead, headSensor;

// player Object Prototype *********************************************
const m = {
    spawn() {
        //load player in matter.js physic engine
        // let vector = Vertices.fromPath("0 40  50 40   50 115   0 115   30 130   20 130"); //player as a series of vertices
        let vertices = Vertices.fromPath("0,40, 50,40, 50,115, 30,130, 20,130, 0,115, 0,40"); //player as a series of vertices
        playerBody = Bodies.fromVertices(0, 0, vertices);
        jumpSensor = Bodies.rectangle(0, 46, 36, 6, {
            //this sensor check if the player is on the ground to enable jumping
            sleepThreshold: 99999999999,
            isSensor: true
        });
        vertices = Vertices.fromPath("16 -82  2 -66  2 -37  43 -37  43 -66  30 -82");
        playerHead = Bodies.fromVertices(0, -55, vertices); //this part of the player lowers on crouch
        headSensor = Bodies.rectangle(0, -57, 48, 45, {
            //senses if the player's head is empty and can return after crouching
            sleepThreshold: 99999999999,
            isSensor: true
        });
        player = Body.create({
            //combine jumpSensor and playerBody
            parts: [playerBody, playerHead, jumpSensor, headSensor],
            inertia: Infinity, //prevents player rotation
            friction: 0.002,
            frictionAir: 0.001,
            //frictionStatic: 0.5,
            restitution: 0,
            sleepThreshold: Infinity,
            collisionFilter: {
                group: 0,
                category: cat.player,
                mask: cat.body | cat.map | cat.mob | cat.mobBullet | cat.mobShield
            },
            death() {
                m.death();
            }
        });
        Matter.Body.setMass(player, m.mass);
        World.add(engine.world, [player]);

        m.holdConstraint = Constraint.create({
            //holding body constraint
            pointA: {
                x: 0,
                y: 0
            },
            bodyB: jumpSensor, //setting constraint to jump sensor because it has to be on something until the player picks up things
            stiffness: 0.4
        });
        World.add(engine.world, m.holdConstraint);
    },
    cycle: 300, //starts at 300 cycles instead of 0 to prevent bugs with m.history
    lastKillCycle: 0,
    lastHarmCycle: 0,
    width: 50,
    radius: 30,
    fillColor: "#fff",
    fillColorDark: "#ccc",
    color: {
        hue: 0,
        sat: 0,
        light: 100,
    },
    setFillColors() {
        this.fillColor = `hsl(${m.color.hue},${m.color.sat}%,${m.color.light}%)`
        this.fillColorDark = `hsl(${m.color.hue},${m.color.sat}%,${m.color.light-20}%)`
    },
    height: 42,
    yOffWhen: {
        crouch: 22,
        stand: 49,
        jump: 70
    },
    defaultMass: 5,
    mass: 5,
    FxNotHolding: 0.015,
    Fx: 0.016, //run Force on ground //
    jumpForce: 0.42,
    setMovement() {
        m.Fx = 0.016 * tech.squirrelFx * tech.fastTime;
        m.jumpForce = 0.42 * tech.squirrelJump * tech.fastTimeJump;
    },
    FxAir: 0.016, // 0.4/5/5  run Force in Air
    yOff: 70,
    yOffGoal: 70,
    onGround: false, //checks if on ground or in air
    standingOn: undefined,
    numTouching: 0,
    crouch: false,
    // isHeadClear: true,
    spawnPos: {
        x: 0,
        y: 0
    },
    spawnVel: {
        x: 0,
        y: 0
    },
    pos: {
        x: 0,
        y: 0
    },
    yPosDifference: 24.2859, //player.position.y - m.pos.y  //24.285923217549026
    // yPosDifferenceCrouched: -2.7140767824453604,
    Sy: 0, //adds a smoothing effect to vertical only
    Vx: 0,
    Vy: 0,
    friction: {
        ground: 0.01,
        air: 0.0025
    },
    airSpeedLimit: 125, // 125/mass/mass = 5
    angle: 0,
    walk_cycle: 0,
    stepSize: 0,
    flipLegs: -1,
    hip: {
        x: 12,
        y: 24
    },
    knee: {
        x: 0,
        y: 0,
        x2: 0,
        y2: 0
    },
    foot: {
        x: 0,
        y: 0
    },
    legLength1: 55,
    legLength2: 45,
    transX: 0,
    transY: 0,
    history: [], //tracks the last second of player position
    resetHistory() {
        for (let i = 0; i < 600; i++) { //reset history
            m.history[i] = {
                position: {
                    x: player.position.x,
                    y: player.position.y,
                },
                velocity: {
                    x: player.velocity.x,
                    y: player.velocity.y
                },
                yOff: m.yOff,
                angle: m.angle,
                health: m.health,
                energy: m.energy,
                activeGun: b.activeGun
            }
        }
    },
    move() {
        m.pos.x = player.position.x;
        m.pos.y = playerBody.position.y - m.yOff;
        m.Vx = player.velocity.x;
        m.Vy = player.velocity.y;

        //tracks the last 10s of player information
        // console.log(m.history)
        m.history.splice(m.cycle % 600, 1, {
            position: {
                x: player.position.x,
                y: player.position.y,
            },
            velocity: {
                x: player.velocity.x,
                y: player.velocity.y
            },
            yOff: m.yOff,
            angle: m.angle,
            health: m.health,
            energy: m.energy,
            activeGun: b.activeGun
        });
        // const back = 59  // 59 looks at 1 second ago //29 looks at 1/2 a second ago
        // historyIndex = (m.cycle - back) % 600
    },
    transSmoothX: 0,
    transSmoothY: 0,
    lastGroundedPositionY: 0,
    // mouseZoom: 0,
    look() {
        //always on mouse look
        m.angle = Math.atan2(
            simulation.mouseInGame.y - m.pos.y,
            simulation.mouseInGame.x - m.pos.x
        );
        //smoothed mouse look translations
        const scale = 0.8;
        m.transSmoothX = canvas.width2 - m.pos.x - (simulation.mouse.x - canvas.width2) * scale;
        m.transSmoothY = canvas.height2 - m.pos.y - (simulation.mouse.y - canvas.height2) * scale;

        m.transX += (m.transSmoothX - m.transX) * 0.07;
        m.transY += (m.transSmoothY - m.transY) * 0.07;
    },
    doCrouch() {
        if (!m.crouch) {
            m.crouch = true;
            m.yOffGoal = m.yOffWhen.crouch;
            if ((playerHead.position.y - player.position.y) < 0) {

                Matter.Body.setPosition(playerHead, {
                    x: player.position.x,
                    y: player.position.y + 9.1740767
                })


                // Matter.Body.translate(playerHead, {
                //     x: 0,
                //     y: 40
                // });
            }
            // playerHead.collisionFilter.group = -1
            // playerHead.collisionFilter.category = 0
            // playerHead.collisionFilter.mask = -1
            // playerHead.isSensor = true;  //works, but has a 2 second lag...
            // collisionFilter: {
            //     group: 0,
            //     category: cat.player,
            //     mask: cat.body | cat.map | cat.mob | cat.mobBullet | cat.mobShield
            // },
        }
    },
    undoCrouch() {
        if (m.crouch) {
            m.crouch = false;
            m.yOffGoal = m.yOffWhen.stand;
            if ((playerHead.position.y - player.position.y) > 0) {
                Matter.Body.setPosition(playerHead, {
                    x: player.position.x,
                    y: player.position.y - 30.28592321
                })
                // Matter.Body.translate(playerHead, {
                //     x: 0,
                //     y: -40
                // });
            }

            // playerHead.collisionFilter = {
            //     group: 0,
            //     category: cat.player,
            //     mask: cat.body | cat.map | cat.mob | cat.mobBullet | cat.mobShield
            // }
            // playerHead.isSensor = false;
            // playerHead.collisionFilter.category = cat.player
            // playerHead.collisionFilter.mask = cat.body | cat.map | cat.mob | cat.mobBullet | cat.mobShield
        }
    },
    hardLandCD: 0,
    checkHeadClear() {
        if (Matter.Query.collides(headSensor, map).length > 0) {
            return false
        } else {
            return true
        }
    },
    buttonCD_jump: 0, //cool down for player buttons
    groundControl() {
        //check for crouch or jump
        if (m.crouch) {
            if (!(input.down) && m.checkHeadClear() && m.hardLandCD < m.cycle) m.undoCrouch();
        } else if (input.down || m.hardLandCD > m.cycle) {
            m.doCrouch(); //on ground && not crouched and pressing s or down
        } else if ((input.up) && m.buttonCD_jump + 20 < m.cycle && m.yOffWhen.stand > 23) {
            m.buttonCD_jump = m.cycle; //can't jump again until 20 cycles pass
            //apply a fraction of the jump force to the body the player is jumping off of
            Matter.Body.applyForce(m.standingOn, m.pos, {
                x: 0,
                y: m.jumpForce * 0.12 * Math.min(m.standingOn.mass, 5)
            });
            player.force.y = -m.jumpForce; //player jump force
            Matter.Body.setVelocity(player, { //zero player y-velocity for consistent jumps
                x: player.velocity.x,
                y: 0
            });
        }

        if (input.left) {
            if (player.velocity.x > -2) {
                player.force.x -= m.Fx * 1.5
            } else {
                player.force.x -= m.Fx
            }
            // }
        } else if (input.right) {
            if (player.velocity.x < 2) {
                player.force.x += m.Fx * 1.5
            } else {
                player.force.x += m.Fx
            }
        } else {
            const stoppingFriction = 0.92;
            Matter.Body.setVelocity(player, {
                x: player.velocity.x * stoppingFriction,
                y: player.velocity.y * stoppingFriction
            });
        }
        //come to a stop if fast or if no move key is pressed
        if (player.speed > 4) {
            const stoppingFriction = (m.crouch) ? 0.65 : 0.89; // this controls speed when crouched
            Matter.Body.setVelocity(player, {
                x: player.velocity.x * stoppingFriction,
                y: player.velocity.y * stoppingFriction
            });
        }
    },
    airControl() {
        //check for short jumps   //moving up   //recently pressed jump  //but not pressing jump key now
        if (m.buttonCD_jump + 60 > m.cycle && !(input.up) && m.Vy < 0) {
            Matter.Body.setVelocity(player, {
                //reduce player y-velocity every cycle
                x: player.velocity.x,
                y: player.velocity.y * 0.94
            });
        }

        if (input.left) {
            if (player.velocity.x > -m.airSpeedLimit / player.mass / player.mass) player.force.x -= m.FxAir; // move player   left / a
        } else if (input.right) {
            if (player.velocity.x < m.airSpeedLimit / player.mass / player.mass) player.force.x += m.FxAir; //move player  right / d
        }
    },
    alive: false,
    death() {
        if (tech.isImmortal) { //if player has the immortality buff, spawn on the same level with randomized damage
            simulation.isTextLogOpen = false;
            //count tech
            let totalTech = 0;
            for (let i = 0; i < tech.tech.length; i++) {
                if (!tech.tech[i].isNonRefundable) totalTech += tech.tech[i].count
            }
            if (tech.isDeterminism) totalTech -= 3 //remove the bonus tech 
            if (tech.isSuperDeterminism) totalTech -= 2 //remove the bonus tech 
            totalTech = totalTech * 1.15 + 1 // a few extra to make it stronger
            const totalGuns = b.inventory.length //count guns

            function randomizeTech() {
                for (let i = 0; i < totalTech; i++) {
                    //find what tech I don't have
                    let options = [];
                    for (let i = 0, len = tech.tech.length; i < len; i++) {
                        if (tech.tech[i].count < tech.tech[i].maxCount &&
                            !tech.tech[i].isNonRefundable &&
                            tech.tech[i].name !== "quantum immortality" &&
                            tech.tech[i].name !== "Born rule" &&
                            tech.tech[i].allowed()
                        ) options.push(i);
                    }
                    //add a new tech
                    if (options.length > 0) {
                        const choose = Math.floor(Math.random() * options.length)
                        let newTech = options[choose]
                        tech.giveTech(newTech)
                        options.splice(choose, 1);
                    }
                }
                simulation.updateTechHUD();
            }

            function randomizeField() {
                m.setField(Math.ceil(Math.random() * (m.fieldUpgrades.length - 1)))
            }

            function randomizeHealth() {
                m.health = 0.7 + Math.random()
                if (m.health > 1) m.health = 1;
                m.displayHealth();
            }

            function randomizeGuns() {
                //removes guns and ammo  
                b.inventory = [];
                b.activeGun = null;
                b.inventoryGun = 0;
                for (let i = 0, len = b.guns.length; i < len; ++i) {
                    b.guns[i].have = false;
                    if (b.guns[i].ammo !== Infinity) b.guns[i].ammo = 0;
                }
                //give random guns
                for (let i = 0; i < totalGuns; i++) b.giveGuns()
                //randomize ammo
                for (let i = 0, len = b.inventory.length; i < len; i++) {
                    if (b.guns[b.inventory[i]].ammo !== Infinity) {
                        b.guns[b.inventory[i]].ammo = Math.max(0, Math.floor(6 * b.guns[b.inventory[i]].ammo * Math.sqrt(Math.random())))
                    }
                }
                simulation.makeGunHUD(); //update gun HUD
            }

            simulation.wipe = function() { //set wipe to have trails
                ctx.fillStyle = "rgba(255,255,255,0)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            function randomizeEverything() {
                spawn.setSpawnList(); //new mob types
                simulation.clearNow = true; //triggers a map reset

                tech.setupAllTech(); //remove all tech
                for (let i = 0; i < bullet.length; ++i) Matter.World.remove(engine.world, bullet[i]);
                bullet = []; //remove all bullets
                randomizeHealth()
                randomizeField()
                randomizeGuns()
                randomizeTech()
            }

            randomizeEverything()
            const swapPeriod = 1000
            for (let i = 0, len = 5; i < len; i++) {
                setTimeout(function() {
                    randomizeEverything()
                    simulation.isTextLogOpen = true;
                    simulation.makeTextLog(`simulation.amplitude <span class='color-symbol'>=</span> 0.${len-i-1}`, swapPeriod);
                    simulation.isTextLogOpen = false;
                    simulation.wipe = function() { //set wipe to have trails
                        ctx.fillStyle = `rgba(255,255,255,${(i+1)*(i+1)*0.006})`;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        // pixelWindows()
                    }
                }, (i + 1) * swapPeriod);
            }

            setTimeout(function() {
                simulation.wipe = function() { //set wipe to normal
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
                simulation.isTextLogOpen = true;
                simulation.makeTextLog("simulation.amplitude <span class='color-symbol'>=</span> null");
            }, 6 * swapPeriod);

        } else if (m.alive) { //normal death code here
            m.alive = false;
            simulation.paused = true;
            m.health = 0;
            m.displayHealth();
            document.getElementById("text-log").style.opacity = 0; //fade out any active text logs
            document.getElementById("fade-out").style.opacity = 1; //slowly fades out
            // build.shareURL(false)
            setTimeout(function() {
                World.clear(engine.world);
                Engine.clear(engine);
                simulation.splashReturn();
            }, 3000);
        }
    },
    health: 0,
    maxHealth: 1, //set in simulation.reset()
    drawHealth() {
        if (m.health < 1) {
            ctx.fillStyle = "rgba(100, 100, 100, 0.5)";
            ctx.fillRect(m.pos.x - m.radius, m.pos.y - 50, 60, 10);
            ctx.fillStyle = "#f00";
            ctx.fillRect(
                m.pos.x - m.radius,
                m.pos.y - 50,
                60 * m.health,
                10
            );
        }
    },
    displayHealth() {
        id = document.getElementById("health");
        // health display follows a x^1.5 rule to make it seem like the player has lower health, this makes the player feel more excitement
        id.style.width = Math.floor(300 * m.maxHealth * Math.pow(m.health / m.maxHealth, 1.4)) + "px";
        //css animation blink if health is low
        if (m.health < 0.3) {
            id.classList.add("low-health");
        } else {
            id.classList.remove("low-health");
        }
    },
    addHealth(heal) {
        if (!tech.isEnergyHealth) {
            m.health += heal * simulation.healScale;
            if (m.health > m.maxHealth) m.health = m.maxHealth;
            m.displayHealth();
        }
    },
    baseHealth: 1,
    setMaxHealth() {
        m.maxHealth = m.baseHealth + tech.bonusHealth + tech.armorFromPowerUps + (tech.isHyperSaturation ? Infinity : 0)
        document.getElementById("health-bg").style.width = `${Math.floor(300*m.maxHealth)}px`
        simulation.makeTextLog(`<span class='color-var'>m</span>.<span class='color-h'>maxHealth</span> <span class='color-symbol'>=</span> ${m.maxHealth.toFixed(2)}`)
        if (m.health > m.maxHealth) m.health = m.maxHealth;
        m.displayHealth();
    },

    defaultFPSCycle: 0, //tracks when to return to normal fps
    immuneCycle: 0, //used in engine
    harmReduction() { // eslint-disable-line
        let dmg = 1
        dmg *= m.fieldHarmReduction
        if (tech.squirrelFx !== 1) dmg *= 1 + (tech.squirrelFx - 1) / 5 //cause more damage
        if (tech.isSpeedHarm) dmg *= 1 - Math.min(player.speed * 0.0185, 0.55)
        if (tech.isSlowFPS) dmg *= 0.8
        if (tech.isPiezo) dmg *= 0.85
        if (tech.isHarmReduce && m.fieldUpgrades[m.fieldMode].name === "negative mass field" && m.isFieldActive) dmg *= 0.6
        if (tech.isBotArmor) dmg *= 0.97 ** tech.totalBots()
        if (tech.isHarmArmor && m.lastHarmCycle + 600 > m.cycle) dmg *= 0.33;
        if (tech.isNoFireDefense && m.cycle > m.fireCDcycle + 120) dmg *= 0.6
        if (tech.energyRegen === 0) dmg *= 0.4
        if (tech.isTurret && m.crouch) dmg *= 0.5;
        if (tech.isFireMoveLock && input.fire) dmg *= 0.4;
        if (tech.isEntanglement && b.inventory[0] === b.activeGun) {
            for (let i = 0, len = b.inventory.length; i < len; i++) dmg *= 0.87 // 1 - 0.15
        }
				if (tech.isHyperSaturation) dmg *= 1.8
        return dmg
    },
    rewind(steps) { // m.rewind(Math.floor(Math.min(599, 137 * m.energy)))
        if (tech.isRewindGrenade) {
            for (let i = 1, len = Math.floor(2 + steps / 40); i < len; i++) {
                b.grenade(Vector.add(m.pos, { x: 10 * (Math.random() - 0.5), y: 10 * (Math.random() - 0.5) }), -i * Math.PI / len) //fire different angles for each grenade
                const who = bullet[bullet.length - 1]
                if (tech.isVacuumBomb) {
                    Matter.Body.setVelocity(who, {
                        x: who.velocity.x * 0.5,
                        y: who.velocity.y * 0.5
                    });
                } else if (tech.isRPG) {
                    who.endCycle = (who.endCycle - simulation.cycle) * 0.2 + simulation.cycle
                } else if (tech.isNeutronBomb) {
                    Matter.Body.setVelocity(who, {
                        x: who.velocity.x * 0.3,
                        y: who.velocity.y * 0.3
                    });
                } else {
                    Matter.Body.setVelocity(who, {
                        x: who.velocity.x * 0.5,
                        y: who.velocity.y * 0.5
                    });
                    who.endCycle = (who.endCycle - simulation.cycle) * 0.5 + simulation.cycle
                }
            }
        }
        let history = m.history[(m.cycle - steps) % 600]
        Matter.Body.setPosition(player, history.position);
        Matter.Body.setVelocity(player, { x: history.velocity.x, y: history.velocity.y });
        m.yOff = history.yOff
        if (m.yOff < 48) {
            m.doCrouch()
        } else {
            m.undoCrouch()
        }

        // b.activeGun = history.activeGun
        // for (let i = 0; i < b.inventory.length; i++) {
        //     if (b.inventory[i] === b.activeGun) b.inventoryGun = i
        // }
        // simulation.updateGunHUD();
        // simulation.boldActiveGunHUD();

        // move bots to follow player
        for (let i = 0; i < bullet.length; i++) {
            if (bullet[i].botType) {
                Matter.Body.setPosition(bullet[i], Vector.add(player.position, {
                    x: 250 * (Math.random() - 0.5),
                    y: 250 * (Math.random() - 0.5)
                }));
                Matter.Body.setVelocity(bullet[i], {
                    x: 0,
                    y: 0
                });
            }
        }
        m.energy = Math.max(m.energy - steps / 136, 0.01)
        m.immuneCycle = m.cycle + 30; //player is immune to collision damage for 30 cycles

        let isDrawPlayer = true
        const shortPause = function() {
            if (m.defaultFPSCycle < m.cycle) { //back to default values
                simulation.fpsCap = simulation.fpsCapDefault
                simulation.fpsInterval = 1000 / simulation.fpsCap;
                document.getElementById("dmg").style.transition = "opacity 1s";
                document.getElementById("dmg").style.opacity = "0";
            } else {
                requestAnimationFrame(shortPause);
                if (isDrawPlayer) {
                    isDrawPlayer = false
                    ctx.save();
                    ctx.translate(canvas.width2, canvas.height2); //center
                    ctx.scale(simulation.zoom / simulation.edgeZoomOutSmooth, simulation.zoom / simulation.edgeZoomOutSmooth); //zoom in once centered
                    ctx.translate(-canvas.width2 + m.transX, -canvas.height2 + m.transY); //translate
                    for (let i = 1; i < steps; i++) {
                        history = m.history[(m.cycle - i) % 600]
                        m.pos.x = history.position.x
                        m.pos.y = history.position.y + m.yPosDifference - history.yOff
                        m.yOff = history.yOff
                        m.draw();
                    }
                    ctx.restore();
                    m.resetHistory()
                }
            }
        };

        if (m.defaultFPSCycle < m.cycle) requestAnimationFrame(shortPause);
        simulation.fpsCap = 3 //1 is longest pause, 4 is standard
        simulation.fpsInterval = 1000 / simulation.fpsCap;
        m.defaultFPSCycle = m.cycle
        if (tech.isRewindBot) {
            const len = steps * 0.042 * tech.isRewindBot
            for (let i = 0; i < len; i++) {
                const where = m.history[Math.abs(m.cycle - i * 40) % 600].position //spread out spawn locations along past history
                b.randomBot({
                    x: where.x + 100 * (Math.random() - 0.5),
                    y: where.y + 100 * (Math.random() - 0.5)
                }, false, false)
                bullet[bullet.length - 1].endCycle = simulation.cycle + 360 + Math.floor(180 * Math.random()) //6-9 seconds
            }
        }
    },
    damage(dmg) { // eslint-disable-line
        if (tech.isRewindAvoidDeath && m.energy > 0.66) {
            const steps = Math.floor(Math.min(299, 137 * m.energy))
            simulation.makeTextLog(`<span class='color-var'>m</span>.rewind(${steps})`)
            m.rewind(steps)
            return
        }
        m.lastHarmCycle = m.cycle
        if (tech.isDroneOnDamage) { //chance to build a drone on damage  from tech
            const len = Math.min((dmg - 0.06 * Math.random()) * 40, 40)
            for (let i = 0; i < len; i++) {
                if (Math.random() < 0.5) b.drone() //spawn drone
            }
        }

        if (tech.isEnergyHealth) {
            m.energy -= dmg;
            if (m.energy < 0 || isNaN(m.energy)) { //taking deadly damage
                if (tech.isDeathAvoid && powerUps.research.count && !tech.isDeathAvoidedThisLevel) {
                    tech.isDeathAvoidedThisLevel = true
                    powerUps.research.changeRerolls(-1)
                    simulation.makeTextLog(`<span class='color-var'>m</span>.<span class='color-r'>research</span><span class='color-symbol'>--</span><br>${powerUps.research.count}`)
                    for (let i = 0; i < 6; i++) {
                        powerUps.spawn(m.pos.x, m.pos.y, "heal", false);
                    }
                    m.energy = m.maxEnergy
                    m.immuneCycle = m.cycle + 360 //disable this.immuneCycle bonus seconds
                    simulation.wipe = function() { //set wipe to have trails
                        ctx.fillStyle = "rgba(255,255,255,0.03)";
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                    setTimeout(function() {
                        simulation.wipe = function() { //set wipe to normal
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                        }
                    }, 3000);
                    return;
                } else { //death
                    m.health = 0;
                    m.energy = 0;
                    m.death();
                    return;
                }
            }
        } else {
            dmg *= m.harmReduction()
            m.health -= dmg;
            if (m.health < 0 || isNaN(m.health)) {
                if (tech.isDeathAvoid && powerUps.research.count > 0 && !tech.isDeathAvoidedThisLevel) { //&& Math.random() < 0.5
                    tech.isDeathAvoidedThisLevel = true
                    m.health = 0.05
                    powerUps.research.changeRerolls(-1)
                    simulation.makeTextLog(`<span class='color-var'>m</span>.<span class='color-r'>research</span><span class='color-symbol'>--</span>
                    <br>${powerUps.research.count}`)
                    for (let i = 0; i < 6; i++) powerUps.spawn(m.pos.x + 10 * Math.random(), m.pos.y + 10 * Math.random(), "heal", false);
                    m.immuneCycle = m.cycle + 360 //disable this.immuneCycle bonus seconds
                    simulation.wipe = function() { //set wipe to have trails
                        ctx.fillStyle = "rgba(255,255,255,0.03)";
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                    setTimeout(function() {
                        simulation.wipe = function() { //set wipe to normal
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                        }
                    }, 3000);
                } else {
                    m.health = 0;
                    m.death();
                    return;
                }
            }
            m.displayHealth();
            document.getElementById("dmg").style.transition = "opacity 0s";
            document.getElementById("dmg").style.opacity = 0.1 + Math.min(0.6, dmg * 4);
        }

        if (dmg > 0.06 / m.holdingMassScale) m.drop(); //drop block if holding
        const normalFPS = function() {
            if (m.defaultFPSCycle < m.cycle) { //back to default values
                simulation.fpsCap = simulation.fpsCapDefault
                simulation.fpsInterval = 1000 / simulation.fpsCap;
                document.getElementById("dmg").style.transition = "opacity 1s";
                document.getElementById("dmg").style.opacity = "0";
            } else {
                requestAnimationFrame(normalFPS);
            }
        };

        if (m.defaultFPSCycle < m.cycle) requestAnimationFrame(normalFPS);
        if (tech.isSlowFPS) { // slow game 
            simulation.fpsCap = 30 //new fps
            simulation.fpsInterval = 1000 / simulation.fpsCap;
            //how long to wait to return to normal fps
            m.defaultFPSCycle = m.cycle + 20 + Math.min(90, Math.floor(200 * dmg))
            if (tech.isHarmFreeze) { //freeze all mobs
                for (let i = 0, len = mob.length; i < len; i++) {
                    mobs.statusSlow(mob[i], 300)
                }
            }
        } else {
            if (dmg > 0.05) { // freeze game for high damage hits
                simulation.fpsCap = 4 //40 - Math.min(25, 100 * dmg)
                simulation.fpsInterval = 1000 / simulation.fpsCap;
            } else {
                simulation.fpsCap = simulation.fpsCapDefault
                simulation.fpsInterval = 1000 / simulation.fpsCap;
            }
            m.defaultFPSCycle = m.cycle
        }
        // if (!noTransition) {
        //   document.getElementById("health").style.transition = "width 0s ease-out"
        // } else {
        //   document.getElementById("health").style.transition = "width 1s ease-out"
        // }
    },
    hitMob(i, dmg) {
        //prevents damage happening too quick
    },
    buttonCD: 0, //cool down for player buttons
    drawLeg(stroke) {
        // if (simulation.mouseInGame.x > m.pos.x) {
        if (m.angle > -Math.PI / 2 && m.angle < Math.PI / 2) {
            m.flipLegs = 1;
        } else {
            m.flipLegs = -1;
        }
        ctx.save();
        ctx.scale(m.flipLegs, 1); //leg lines
        ctx.beginPath();
        ctx.moveTo(m.hip.x, m.hip.y);
        ctx.lineTo(m.knee.x, m.knee.y);
        ctx.lineTo(m.foot.x, m.foot.y);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 7;
        ctx.stroke();

        //toe lines
        ctx.beginPath();
        ctx.moveTo(m.foot.x, m.foot.y);
        ctx.lineTo(m.foot.x - 15, m.foot.y + 5);
        ctx.moveTo(m.foot.x, m.foot.y);
        ctx.lineTo(m.foot.x + 15, m.foot.y + 5);
        ctx.lineWidth = 4;
        ctx.stroke();

        //hip joint
        ctx.beginPath();
        ctx.arc(m.hip.x, m.hip.y, 11, 0, 2 * Math.PI);
        //knee joint
        ctx.moveTo(m.knee.x + 7, m.knee.y);
        ctx.arc(m.knee.x, m.knee.y, 7, 0, 2 * Math.PI);
        //foot joint
        ctx.moveTo(m.foot.x + 6, m.foot.y);
        ctx.arc(m.foot.x, m.foot.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = m.fillColor;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    },
    calcLeg(cycle_offset, offset) {
        m.hip.x = 12 + offset;
        m.hip.y = 24 + offset;
        //stepSize goes to zero if Vx is zero or not on ground (make m transition cleaner)
        m.stepSize = 0.8 * m.stepSize + 0.2 * (7 * Math.sqrt(Math.min(9, Math.abs(m.Vx))) * m.onGround);
        //changes to stepsize are smoothed by adding only a percent of the new value each cycle
        const stepAngle = 0.034 * m.walk_cycle + cycle_offset;
        m.foot.x = 2.2 * m.stepSize * Math.cos(stepAngle) + offset;
        m.foot.y = offset + 1.2 * m.stepSize * Math.sin(stepAngle) + m.yOff + m.height;
        const Ymax = m.yOff + m.height;
        if (m.foot.y > Ymax) m.foot.y = Ymax;

        //calculate knee position as intersection of circle from hip and foot
        const d = Math.sqrt((m.hip.x - m.foot.x) * (m.hip.x - m.foot.x) + (m.hip.y - m.foot.y) * (m.hip.y - m.foot.y));
        const l = (m.legLength1 * m.legLength1 - m.legLength2 * m.legLength2 + d * d) / (2 * d);
        const h = Math.sqrt(m.legLength1 * m.legLength1 - l * l);
        m.knee.x = (l / d) * (m.foot.x - m.hip.x) - (h / d) * (m.foot.y - m.hip.y) + m.hip.x + offset;
        m.knee.y = (l / d) * (m.foot.y - m.hip.y) + (h / d) * (m.foot.x - m.hip.x) + m.hip.y;
    },
    draw() {
        ctx.fillStyle = m.fillColor;
        m.walk_cycle += m.flipLegs * m.Vx;

        //draw body
        ctx.save();
        ctx.globalAlpha = (m.immuneCycle < m.cycle) ? 1 : 0.5
        ctx.translate(m.pos.x, m.pos.y);
        m.calcLeg(Math.PI, -3);
        m.drawLeg("#4a4a4a");
        m.calcLeg(0, 0);
        m.drawLeg("#333");
        ctx.rotate(m.angle);

        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, 2 * Math.PI);
        let grd = ctx.createLinearGradient(-30, 0, 30, 0);
        grd.addColorStop(0, m.fillColorDark);
        grd.addColorStop(1, m.fillColor);
        ctx.fillStyle = grd;
        ctx.fill();
        ctx.arc(15, 0, 4, 0, 2 * Math.PI);
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        ctx.stroke();
        // ctx.beginPath();
        // ctx.arc(15, 0, 3, 0, 2 * Math.PI);
        // ctx.fillStyle = '#0cf';
        // ctx.fill()
        ctx.restore();
        m.yOff = m.yOff * 0.85 + m.yOffGoal * 0.15; //smoothly move leg height towards height goal
    },
    // *********************************************
    // **************** fields *********************
    // *********************************************
    closest: {
        dist: 1000,
        index: 0
    },
    isHolding: false,
    isCloak: false,
    throwCharge: 0,
    fireCDcycle: 0,
    fieldCDcycle: 0,
    fieldMode: 0, //basic field mode before upgrades
    maxEnergy: 1, //can be increased by a tech
    holdingTarget: null,
    timeSkipLastCycle: 0,
    // these values are set on reset by setHoldDefaults()
    grabPowerUpRange2: 0,
    isFieldActive: false,
    fieldRange: 155,
    fieldShieldingScale: 1,
    fieldDamage: 1,
    duplicateChance: 0,
    energy: 0,
    fieldRegen: 0,
    fieldMode: 0,
    fieldFire: false,
    fieldHarmReduction: 1,
    holdingMassScale: 0,
    hole: {
        isOn: false,
        isReady: true,
        pos1: {
            x: 0,
            y: 0
        },
        pos2: {
            x: 0,
            y: 0
        },
    },
    fieldArc: 0,
    fieldThreshold: 0,
    calculateFieldThreshold() {
        m.fieldThreshold = Math.cos(m.fieldArc * Math.PI)
    },
    setHoldDefaults() {
        if (m.energy < m.maxEnergy) m.energy = m.maxEnergy;
        m.fieldRegen = tech.energyRegen; //0.001
        m.fieldMeterColor = "#0cf"
        m.fieldShieldingScale = 1;
        m.fieldBlockCD = 10;
        m.fieldHarmReduction = 1;
        m.fieldDamage = 1
        m.duplicateChance = 0
        if (tech.duplicationChance() === 0) simulation.draw.powerUp = simulation.draw.powerUpNormal
        m.grabPowerUpRange2 = 156000;
        m.fieldRange = 155;
        m.fieldFire = false;
        m.fieldCDcycle = 0;
        m.isCloak = false;
        player.collisionFilter.mask = cat.body | cat.map | cat.mob | cat.mobBullet | cat.mobShield
        m.airSpeedLimit = 125
        m.drop();
        m.holdingMassScale = 0.5;
        m.isFieldActive = false; //only being used by negative mass field
        m.fieldArc = 0.2; //run calculateFieldThreshold after setting fieldArc, used for powerUp grab and mobPush with lookingAt(mob)
        m.calculateFieldThreshold(); //run calculateFieldThreshold after setting fieldArc, used for powerUp grab and mobPush with lookingAt(mob)
        m.isBodiesAsleep = true;
        m.wakeCheck();
        // m.setMaxEnergy();
        m.hole = {
            isOn: false,
            isReady: true,
            pos1: {
                x: 0,
                y: 0
            },
            pos2: {
                x: 0,
                y: 0
            },
        }
    },
    setMaxEnergy() {
        m.maxEnergy = (tech.isMaxEnergyTech ? 0.5 : 1) + tech.bonusEnergy + tech.healMaxEnergyBonus
        simulation.makeTextLog(`<span class='color-var'>m</span>.<span class='color-f'>maxEnergy</span> <span class='color-symbol'>=</span> ${(m.maxEnergy.toFixed(2))}`)
    },
    fieldMeterColor: "#0cf",
    drawFieldMeter(bgColor = "rgba(0, 0, 0, 0.4)", range = 60) {
        if (m.energy < m.maxEnergy) {
            m.energy += m.fieldRegen;
            if (m.energy < 0) m.energy = 0
            ctx.fillStyle = bgColor;
            const xOff = m.pos.x - m.radius * m.maxEnergy
            const yOff = m.pos.y - 50
            ctx.fillRect(xOff, yOff, range * m.maxEnergy, 10);
            ctx.fillStyle = m.fieldMeterColor;
            ctx.fillRect(xOff, yOff, range * m.energy, 10);
        } else if (m.energy > m.maxEnergy + 0.05) {
            ctx.fillStyle = bgColor;
            const xOff = m.pos.x - m.radius * m.energy
            const yOff = m.pos.y - 50
            // ctx.fillRect(xOff, yOff, range * m.maxEnergy, 10);
            ctx.fillStyle = m.fieldMeterColor;
            ctx.fillRect(xOff, yOff, range * m.energy, 10);
        }
        // else {
        //   m.energy = m.maxEnergy
        // }
    },
    lookingAt(who) {
        //calculate a vector from body to player and make it length 1
        const diff = Vector.normalise(Vector.sub(who.position, m.pos));
        //make a vector for the player's direction of length 1
        const dir = {
            x: Math.cos(m.angle),
            y: Math.sin(m.angle)
        };
        //the dot product of diff and dir will return how much over lap between the vectors
        // console.log(Vector.dot(dir, diff))
        if (Vector.dot(dir, diff) > m.fieldThreshold) {
            return true;
        }
        return false;
    },
    drop() {
        if (m.isHolding) {
            m.fieldCDcycle = m.cycle + 15;
            m.isHolding = false;
            m.throwCharge = 0;
            m.definePlayerMass()
            if (m.holdingTarget) {
                m.holdingTarget.collisionFilter.category = cat.body;
                m.holdingTarget.collisionFilter.mask = cat.player | cat.map | cat.body | cat.bullet | cat.mob | cat.mobBullet
                m.holdingTarget = null;
            }
        }
    },
    definePlayerMass(mass = m.defaultMass) {
        Matter.Body.setMass(player, mass);
        //reduce air and ground move forces
        m.Fx = 0.08 / mass * tech.squirrelFx //base player mass is 5
        m.FxAir = 0.4 / mass / mass //base player mass is 5
        //make player stand a bit lower when holding heavy masses
        m.yOffWhen.stand = Math.max(m.yOffWhen.crouch, Math.min(49, 49 - (mass - 5) * 6))
        if (m.onGround && !m.crouch) m.yOffGoal = m.yOffWhen.stand;
    },
    drawHold(target, stroke = true) {
        if (target) {
            const eye = 15;
            const len = target.vertices.length - 1;
            ctx.fillStyle = "rgba(110,170,200," + (0.2 + 0.4 * Math.random()) + ")";
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#000";
            ctx.beginPath();
            ctx.moveTo(
                m.pos.x + eye * Math.cos(m.angle),
                m.pos.y + eye * Math.sin(m.angle)
            );
            ctx.lineTo(target.vertices[len].x, target.vertices[len].y);
            ctx.lineTo(target.vertices[0].x, target.vertices[0].y);
            ctx.fill();
            if (stroke) ctx.stroke();
            for (let i = 0; i < len; i++) {
                ctx.beginPath();
                ctx.moveTo(
                    m.pos.x + eye * Math.cos(m.angle),
                    m.pos.y + eye * Math.sin(m.angle)
                );
                ctx.lineTo(target.vertices[i].x, target.vertices[i].y);
                ctx.lineTo(target.vertices[i + 1].x, target.vertices[i + 1].y);
                ctx.fill();
                if (stroke) ctx.stroke();
            }
        }
    },
    holding() {
        if (m.fireCDcycle < m.cycle) m.fireCDcycle = m.cycle - 1
        if (m.holdingTarget) {
            m.energy -= m.fieldRegen;
            if (m.energy < 0) m.energy = 0;
            Matter.Body.setPosition(m.holdingTarget, {
                x: m.pos.x + 70 * Math.cos(m.angle),
                y: m.pos.y + 70 * Math.sin(m.angle)
            });
            Matter.Body.setVelocity(m.holdingTarget, player.velocity);
            Matter.Body.rotate(m.holdingTarget, 0.01 / m.holdingTarget.mass); //gently spin the block
        } else {
            m.isHolding = false
        }
    },
    throwBlock() {
        if (m.holdingTarget) {
            if (input.field) {
                if (m.energy > 0.001) {
                    if (m.fireCDcycle < m.cycle) m.fireCDcycle = m.cycle
                    m.energy -= 0.001 / tech.throwChargeRate;
                    m.throwCharge += 0.5 * tech.throwChargeRate / m.holdingTarget.mass
                    //draw charge
                    const x = m.pos.x + 15 * Math.cos(m.angle);
                    const y = m.pos.y + 15 * Math.sin(m.angle);
                    const len = m.holdingTarget.vertices.length - 1;
                    const edge = m.throwCharge * m.throwCharge * m.throwCharge;
                    const grd = ctx.createRadialGradient(x, y, edge, x, y, edge + 5);
                    grd.addColorStop(0, "rgba(255,50,150,0.3)");
                    grd.addColorStop(1, "transparent");
                    ctx.fillStyle = grd;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(m.holdingTarget.vertices[len].x, m.holdingTarget.vertices[len].y);
                    ctx.lineTo(m.holdingTarget.vertices[0].x, m.holdingTarget.vertices[0].y);
                    ctx.fill();
                    for (let i = 0; i < len; i++) {
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        ctx.lineTo(m.holdingTarget.vertices[i].x, m.holdingTarget.vertices[i].y);
                        ctx.lineTo(m.holdingTarget.vertices[i + 1].x, m.holdingTarget.vertices[i + 1].y);
                        ctx.fill();
                    }
                } else {
                    m.drop()
                }
            } else if (m.throwCharge > 0) { //Matter.Query.region(mob, player.bounds)
                //throw the body
                m.fieldCDcycle = m.cycle + 15;
                m.isHolding = false;
                //bullet-like collisions
                m.holdingTarget.collisionFilter.category = cat.body; //cat.bullet;
                m.holdingTarget.collisionFilter.mask = cat.map | cat.body | cat.bullet | cat.mob | cat.mobBullet | cat.mobShield;
                //check every second to see if player is away from thrown body, and make solid
                const solid = function(that) {
                    const dx = that.position.x - player.position.x;
                    const dy = that.position.y - player.position.y;
                    if (dx * dx + dy * dy > 10000 && that !== m.holdingTarget) {
                        // that.collisionFilter.category = cat.body; //make solid
                        that.collisionFilter.mask = cat.player | cat.map | cat.body | cat.bullet | cat.mob | cat.mobBullet; //can hit player now
                    } else {
                        setTimeout(solid, 25, that);
                    }
                };
                setTimeout(solid, 150, m.holdingTarget);

                const charge = Math.min(m.throwCharge / 5, 1)
                //***** scale throw speed with the first number, 80 *****
                let speed = 80 * charge * Math.min(1, 0.8 / Math.pow(m.holdingTarget.mass, 0.25));

                if (Matter.Query.collides(m.holdingTarget, map).length !== 0) {
                    speed *= 0.7 //drop speed by 30% if touching map
                    if (Matter.Query.ray(map, m.holdingTarget.position, m.pos).length !== 0) speed = 0 //drop to zero if the center of the block can't see the center of the player through the map
                    //|| Matter.Query.ray(body, m.holdingTarget.position, m.pos).length > 1
                }

                m.throwCharge = 0;
                Matter.Body.setVelocity(m.holdingTarget, {
                    x: player.velocity.x * 0.5 + Math.cos(m.angle) * speed,
                    y: player.velocity.y * 0.5 + Math.sin(m.angle) * speed
                });
                //player recoil //stronger in x-dir to prevent jump hacking

                Matter.Body.setVelocity(player, {
                    x: player.velocity.x - Math.cos(m.angle) * speed / (m.crouch ? 30 : 10) * Math.sqrt(m.holdingTarget.mass),
                    y: player.velocity.y - Math.sin(m.angle) * speed / 30 * Math.sqrt(m.holdingTarget.mass)
                });
                m.definePlayerMass() //return to normal player mass
            }
        } else {
            m.isHolding = false
        }
    },
    drawField() {
        if (m.holdingTarget) {
            ctx.fillStyle = "rgba(110,170,200," + (m.energy * (0.05 + 0.05 * Math.random())) + ")";
            ctx.strokeStyle = "rgba(110, 200, 235, " + (0.3 + 0.08 * Math.random()) + ")" //"#9bd" //"rgba(110, 200, 235, " + (0.5 + 0.1 * Math.random()) + ")"
        } else {
            ctx.fillStyle = "rgba(110,170,200," + (0.02 + m.energy * (0.15 + 0.15 * Math.random())) + ")";
            ctx.strokeStyle = "rgba(110, 200, 235, " + (0.6 + 0.2 * Math.random()) + ")" //"#9bd" //"rgba(110, 200, 235, " + (0.5 + 0.1 * Math.random()) + ")"
        }
        // const off = 2 * Math.cos(simulation.cycle * 0.1)
        const range = m.fieldRange;
        ctx.beginPath();
        ctx.arc(m.pos.x, m.pos.y, range, m.angle - Math.PI * m.fieldArc, m.angle + Math.PI * m.fieldArc, false);
        ctx.lineWidth = 2;
        ctx.lineCap = "butt"
        ctx.stroke();
        let eye = 13;
        let aMag = 0.75 * Math.PI * m.fieldArc
        let a = m.angle + aMag
        let cp1x = m.pos.x + 0.6 * range * Math.cos(a)
        let cp1y = m.pos.y + 0.6 * range * Math.sin(a)
        ctx.quadraticCurveTo(cp1x, cp1y, m.pos.x + eye * Math.cos(m.angle), m.pos.y + eye * Math.sin(m.angle))
        a = m.angle - aMag
        cp1x = m.pos.x + 0.6 * range * Math.cos(a)
        cp1y = m.pos.y + 0.6 * range * Math.sin(a)
        ctx.quadraticCurveTo(cp1x, cp1y, m.pos.x + 1 * range * Math.cos(m.angle - Math.PI * m.fieldArc), m.pos.y + 1 * range * Math.sin(m.angle - Math.PI * m.fieldArc))
        ctx.fill();
        // ctx.lineTo(m.pos.x + eye * Math.cos(m.angle), m.pos.y + eye * Math.sin(m.angle));

        //draw random lines in field for cool effect
        let offAngle = m.angle + 1.7 * Math.PI * m.fieldArc * (Math.random() - 0.5);
        ctx.beginPath();
        eye = 15;
        ctx.moveTo(m.pos.x + eye * Math.cos(m.angle), m.pos.y + eye * Math.sin(m.angle));
        ctx.lineTo(m.pos.x + range * Math.cos(offAngle), m.pos.y + range * Math.sin(offAngle));
        ctx.strokeStyle = "rgba(120,170,255,0.6)";
        ctx.lineWidth = 1;
        ctx.stroke();
    },
    grabPowerUp() { //look for power ups to grab with field
        if (m.fireCDcycle < m.cycle) m.fireCDcycle = m.cycle - 1
        for (let i = 0, len = powerUp.length; i < len; ++i) {
            const dxP = m.pos.x - powerUp[i].position.x;
            const dyP = m.pos.y - powerUp[i].position.y;
            const dist2 = dxP * dxP + dyP * dyP;
            // float towards player  if looking at and in range  or  if very close to player
            if (dist2 < m.grabPowerUpRange2 &&
                (m.lookingAt(powerUp[i]) || dist2 < 16000) &&
                !(m.health === m.maxHealth && powerUp[i].name === "heal") &&
                Matter.Query.ray(map, powerUp[i].position, m.pos).length === 0
            ) {
                powerUp[i].force.x += 0.05 * (dxP / Math.sqrt(dist2)) * powerUp[i].mass;
                powerUp[i].force.y += 0.05 * (dyP / Math.sqrt(dist2)) * powerUp[i].mass - powerUp[i].mass * simulation.g; //negate gravity
                //extra friction
                Matter.Body.setVelocity(powerUp[i], {
                    x: powerUp[i].velocity.x * 0.11,
                    y: powerUp[i].velocity.y * 0.11
                });
                if (dist2 < 5000 && !simulation.isChoosing) { //use power up if it is close enough
                    powerUps.onPickUp(powerUp[i]);
                    Matter.Body.setVelocity(player, { //player knock back, after grabbing power up
                        x: player.velocity.x + powerUp[i].velocity.x / player.mass * 5,
                        y: player.velocity.y + powerUp[i].velocity.y / player.mass * 5
                    });
                    powerUp[i].effect();
                    Matter.World.remove(engine.world, powerUp[i]);
                    powerUp.splice(i, 1);
                    return; //because the array order is messed up after splice
                }
            }
        }
    },
    pushMass(who) {
        const speed = Vector.magnitude(Vector.sub(who.velocity, player.velocity))
        const fieldBlockCost = (0.03 + Math.sqrt(who.mass) * speed * 0.003) * m.fieldShieldingScale;
        const unit = Vector.normalise(Vector.sub(player.position, who.position))

        if (m.energy > fieldBlockCost * 0.2) { //shield needs at least some of the cost to block
            m.energy -= fieldBlockCost
            if (m.energy < 0) {
                m.energy = 0;
            }
            // if (m.energy > m.maxEnergy) m.energy = m.maxEnergy;

            if (tech.blockDmg) {
                who.damage(tech.blockDmg * b.dmgScale)
                //draw electricity
                const step = 40
                ctx.beginPath();
                for (let i = 0, len = 2.5 * tech.blockDmg; i < len; i++) {
                    let x = m.pos.x - 20 * unit.x;
                    let y = m.pos.y - 20 * unit.y;
                    ctx.moveTo(x, y);
                    for (let i = 0; i < 8; i++) {
                        x += step * (-unit.x + 1.5 * (Math.random() - 0.5))
                        y += step * (-unit.y + 1.5 * (Math.random() - 0.5))
                        ctx.lineTo(x, y);
                    }
                }
                ctx.lineWidth = 3;
                ctx.strokeStyle = "#f0f";
                ctx.stroke();
            } else {
                m.drawHold(who);
            }
            // if (tech.isFreezeMobs) mobs.statusSlow(who, 60) //this works but doesn't have a fun effect

            // m.holdingTarget = null
            //knock backs
            if (m.fieldShieldingScale > 0) {
                const massRoot = Math.sqrt(Math.min(12, Math.max(0.15, who.mass))); // masses above 12 can start to overcome the push back
                Matter.Body.setVelocity(who, {
                    x: player.velocity.x - (15 * unit.x) / massRoot,
                    y: player.velocity.y - (15 * unit.y) / massRoot
                });
                m.fieldCDcycle = m.cycle + m.fieldBlockCD;
                if (m.crouch) {
                    Matter.Body.setVelocity(player, {
                        x: player.velocity.x + 0.4 * unit.x * massRoot,
                        y: player.velocity.y + 0.4 * unit.y * massRoot
                    });
                } else {
                    Matter.Body.setVelocity(player, {
                        x: player.velocity.x + 5 * unit.x * massRoot,
                        y: player.velocity.y + 5 * unit.y * massRoot
                    });
                }
            } else {
                if (tech.isStunField && m.fieldUpgrades[m.fieldMode].name === "perfect diamagnetism") mobs.statusStun(who, tech.isStunField)
                // mobs.statusSlow(who, tech.isStunField)
                const massRoot = Math.sqrt(Math.max(0.15, who.mass)); // masses above 12 can start to overcome the push back
                Matter.Body.setVelocity(who, {
                    x: player.velocity.x - (20 * unit.x) / massRoot,
                    y: player.velocity.y - (20 * unit.y) / massRoot
                });
                if (who.dropPowerUp && player.speed < 12) {
                    const massRootCap = Math.sqrt(Math.min(10, Math.max(0.4, who.mass))); // masses above 12 can start to overcome the push back
                    Matter.Body.setVelocity(player, {
                        x: 0.9 * player.velocity.x + 0.6 * unit.x * massRootCap,
                        y: 0.9 * player.velocity.y + 0.6 * unit.y * massRootCap
                    });
                }
            }
        }
    },
    pushMobsFacing() { // find mobs in range and in direction looking
        for (let i = 0, len = mob.length; i < len; ++i) {
            if (
                Vector.magnitude(Vector.sub(mob[i].position, player.position)) - mob[i].radius < m.fieldRange &&
                m.lookingAt(mob[i]) &&
                Matter.Query.ray(map, mob[i].position, m.pos).length === 0
            ) {
                mob[i].locatePlayer();
                m.pushMass(mob[i]);
            }
        }
    },
    pushMobs360(range = m.fieldRange * 0.75) { // find mobs in range in any direction
        for (let i = 0, len = mob.length; i < len; ++i) {
            if (
                Vector.magnitude(Vector.sub(mob[i].position, m.pos)) < range &&
                Matter.Query.ray(map, mob[i].position, m.pos).length === 0
            ) {
                mob[i].locatePlayer();
                m.pushMass(mob[i]);
            }
        }
    },
    lookForPickUp() { //find body to pickup
        if (m.energy > m.fieldRegen) m.energy -= m.fieldRegen;
        const grabbing = {
            targetIndex: null,
            targetRange: 150,
            // lookingAt: false //false to pick up object in range, but not looking at
        };
        for (let i = 0, len = body.length; i < len; ++i) {
            if (Matter.Query.ray(map, body[i].position, m.pos).length === 0) {
                //is m next body a better target then my current best
                const dist = Vector.magnitude(Vector.sub(body[i].position, m.pos));
                const looking = m.lookingAt(body[i]);
                // if (dist < grabbing.targetRange && (looking || !grabbing.lookingAt) && !body[i].isNotHoldable) {
                if (dist < grabbing.targetRange && looking && !body[i].isNotHoldable) {
                    grabbing.targetRange = dist;
                    grabbing.targetIndex = i;
                    // grabbing.lookingAt = looking;
                }
            }
        }
        // set pick up target for when mouse is released
        if (body[grabbing.targetIndex]) {
            m.holdingTarget = body[grabbing.targetIndex];
            //
            ctx.beginPath(); //draw on each valid body
            let vertices = m.holdingTarget.vertices;
            ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let j = 1; j < vertices.length; j += 1) {
                ctx.lineTo(vertices[j].x, vertices[j].y);
            }
            ctx.lineTo(vertices[0].x, vertices[0].y);
            ctx.fillStyle = "rgba(190,215,230," + (0.3 + 0.7 * Math.random()) + ")";
            ctx.fill();

            ctx.globalAlpha = 0.2;
            m.drawHold(m.holdingTarget);
            ctx.globalAlpha = 1;
        } else {
            m.holdingTarget = null;
        }
    },
    pickUp() {
        //triggers when a hold target exits and field button is released
        m.isHolding = true;
        //conserve momentum when player mass changes
        totalMomentum = Vector.add(Vector.mult(player.velocity, player.mass), Vector.mult(m.holdingTarget.velocity, m.holdingTarget.mass))
        Matter.Body.setVelocity(player, Vector.mult(totalMomentum, 1 / (m.defaultMass + m.holdingTarget.mass)));

        m.definePlayerMass(m.defaultMass + m.holdingTarget.mass * m.holdingMassScale)
        //make block collide with nothing
        m.holdingTarget.collisionFilter.category = 0;
        m.holdingTarget.collisionFilter.mask = 0;
    },
    wakeCheck() {
        if (m.isBodiesAsleep) {
            m.isBodiesAsleep = false;

            function wake(who) {
                for (let i = 0, len = who.length; i < len; ++i) {
                    Matter.Sleeping.set(who[i], false)
                    if (who[i].storeVelocity) {
                        Matter.Body.setVelocity(who[i], {
                            x: who[i].storeVelocity.x,
                            y: who[i].storeVelocity.y
                        })
                        Matter.Body.setAngularVelocity(who[i], who[i].storeAngularVelocity)
                    }
                }
            }
            if (tech.isFreezeMobs) {
                for (let i = 0, len = mob.length; i < len; ++i) {
                    Matter.Sleeping.set(mob[i], false)
                    mobs.statusSlow(mob[i], 60)
                }
            } else {
                wake(mob);
            }
            wake(body);
            wake(bullet);
            for (let i = 0, len = cons.length; i < len; i++) {
                if (cons[i].stiffness === 0) {
                    cons[i].stiffness = cons[i].storeStiffness
                }
            }
            // wake(powerUp);
        }
    },
    hold() {},
    setField(index) {
        if (isNaN(index)) { //find index by name
            let found = false
            for (let i = 0; i < m.fieldUpgrades.length; i++) {
                if (index === m.fieldUpgrades[i].name) {
                    index = i;
                    found = true;
                    break;
                }
            }
            if (!found) return //if you can't find the field don't give a field to avoid game crash
        }
        m.fieldMode = index;
        document.getElementById("field").innerHTML = m.fieldUpgrades[index].name
        m.setHoldDefaults();
        m.fieldUpgrades[index].effect();
    },
    fieldUpgrades: [{
            name: "field emitter",
            description: "use <strong class='color-f'>energy</strong> to <strong>block</strong> mobs,<br><strong>grab</strong> power ups, and <strong>throw</strong> blocks",
            effect: () => {
                m.hold = function() {
                    if (m.isHolding) {
                        m.drawHold(m.holdingTarget);
                        m.holding();
                        m.throwBlock();
                    } else if ((input.field && m.fieldCDcycle < m.cycle)) { //not hold but field button is pressed
                        m.grabPowerUp();
                        m.lookForPickUp();
                        if (m.energy > 0.05) {
                            m.drawField();
                            m.pushMobsFacing();
                        }
                    } else if (m.holdingTarget && m.fieldCDcycle < m.cycle) { //holding, but field button is released
                        m.pickUp();
                    } else {
                        m.holdingTarget = null; //clears holding target (this is so you only pick up right after the field button is released and a hold target exists)
                    }
                    m.drawFieldMeter()
                }
            }
        },
        {
            name: "standing wave harmonics",
            description: "<strong>3</strong> oscillating <strong>shields</strong> are permanently active<br><strong>blocking</strong> drains <strong class='color-f'>energy</strong> with no <strong>cool down</strong><br>reduce <strong class='color-harm'>harm</strong> by <strong>15%</strong>",
            effect: () => {
                // m.fieldHarmReduction = 0.80;
                m.fieldBlockCD = 0;
                m.fieldHarmReduction = 0.85;
                m.hold = function() {
                    if (m.isHolding) {
                        m.drawHold(m.holdingTarget);
                        m.holding();
                        m.throwBlock();
                    } else if ((input.field) && m.fieldCDcycle < m.cycle) { //not hold but field button is pressed
                        m.grabPowerUp();
                        m.lookForPickUp();
                    } else if (m.holdingTarget && m.fieldCDcycle < m.cycle) { //holding, but field button is released
                        m.pickUp();
                    } else {
                        m.holdingTarget = null; //clears holding target (this is so you only pick up right after the field button is released and a hold target exists)
                    }
                    if (m.energy > 0.1 && m.fieldCDcycle < m.cycle) {
                        const fieldRange1 = (0.7 + 0.3 * Math.sin(m.cycle / 23)) * m.fieldRange
                        const fieldRange2 = (0.63 + 0.37 * Math.sin(m.cycle / 37)) * m.fieldRange
                        const fieldRange3 = (0.65 + 0.35 * Math.sin(m.cycle / 47)) * m.fieldRange
                        const netfieldRange = Math.max(fieldRange1, fieldRange2, fieldRange3)
                        ctx.fillStyle = "rgba(110,170,200," + (0.04 + m.energy * (0.12 + 0.13 * Math.random())) + ")";
                        ctx.beginPath();
                        ctx.arc(m.pos.x, m.pos.y, fieldRange1, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.beginPath();
                        ctx.arc(m.pos.x, m.pos.y, fieldRange2, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.beginPath();
                        ctx.arc(m.pos.x, m.pos.y, fieldRange3, 0, 2 * Math.PI);
                        ctx.fill();
                        m.pushMobs360(netfieldRange);
                        // m.pushBody360(netfieldRange);  //can't throw block when pushhing blocks away
                    }
                    m.drawFieldMeter()
                }
            }
        },
        {
            name: "perfect diamagnetism",
            // description: "gain <strong class='color-f'>energy</strong> when <strong>blocking</strong><br>no <strong>recoil</strong> when <strong>blocking</strong>",
            description: "<strong>blocking</strong> does not drain <strong class='color-f'>energy</strong><br><strong>blocking</strong> has no <strong>cool down</strong> and less <strong>recoil</strong><br><strong>attract</strong> power ups from <strong>far away</strong>",
            effect: () => {
                m.fieldShieldingScale = 0;
                m.grabPowerUpRange2 = 10000000
                m.hold = function() {
                    const wave = Math.sin(m.cycle * 0.022);
                    m.fieldRange = 170 + 12 * wave
                    m.fieldArc = 0.33 + 0.045 * wave //run calculateFieldThreshold after setting fieldArc, used for powerUp grab and mobPush with lookingAt(mob)
                    m.calculateFieldThreshold();
                    if (m.isHolding) {
                        m.drawHold(m.holdingTarget);
                        m.holding();
                        m.throwBlock();
                    } else if ((input.field && m.fieldCDcycle < m.cycle)) { //not hold but field button is pressed
                        m.grabPowerUp();
                        m.lookForPickUp();
                        if (m.energy > 0.05) {
                            //draw field
                            if (m.holdingTarget) {
                                ctx.fillStyle = "rgba(110,170,200," + (0.06 + 0.03 * Math.random()) + ")";
                                ctx.strokeStyle = "rgba(110, 200, 235, " + (0.35 + 0.05 * Math.random()) + ")"
                            } else {
                                ctx.fillStyle = "rgba(110,170,200," + (0.27 + 0.2 * Math.random() - 0.1 * wave) + ")";
                                ctx.strokeStyle = "rgba(110, 200, 235, " + (0.4 + 0.5 * Math.random()) + ")"
                            }
                            ctx.beginPath();
                            ctx.arc(m.pos.x, m.pos.y, m.fieldRange, m.angle - Math.PI * m.fieldArc, m.angle + Math.PI * m.fieldArc, false);
                            ctx.lineWidth = 2.5 - 1.5 * wave;
                            ctx.lineCap = "butt"
                            ctx.stroke();
                            const curve = 0.57 + 0.04 * wave
                            const aMag = (1 - curve * 1.2) * Math.PI * m.fieldArc
                            let a = m.angle + aMag
                            let cp1x = m.pos.x + curve * m.fieldRange * Math.cos(a)
                            let cp1y = m.pos.y + curve * m.fieldRange * Math.sin(a)
                            ctx.quadraticCurveTo(cp1x, cp1y, m.pos.x + 30 * Math.cos(m.angle), m.pos.y + 30 * Math.sin(m.angle))
                            a = m.angle - aMag
                            cp1x = m.pos.x + curve * m.fieldRange * Math.cos(a)
                            cp1y = m.pos.y + curve * m.fieldRange * Math.sin(a)
                            ctx.quadraticCurveTo(cp1x, cp1y, m.pos.x + 1 * m.fieldRange * Math.cos(m.angle - Math.PI * m.fieldArc), m.pos.y + 1 * m.fieldRange * Math.sin(m.angle - Math.PI * m.fieldArc))
                            ctx.fill();
                            m.pushMobsFacing();
                        }
                    } else if (m.holdingTarget && m.fieldCDcycle < m.cycle) { //holding, but field button is released
                        m.pickUp();
                    } else {
                        m.holdingTarget = null; //clears holding target (this is so you only pick up right after the field button is released and a hold target exists)
                    }
                    m.drawFieldMeter()

                    if (tech.isPerfectBrake) { //cap mob speed around player
                        const range = 160 + 140 * wave + 150 * m.energy
                        for (let i = 0; i < mob.length; i++) {
                            const distance = Vector.magnitude(Vector.sub(m.pos, mob[i].position))
                            if (distance < range) {
                                const cap = mob[i].isShielded ? 8.5 : 4.5
                                if (mob[i].speed > cap && Vector.dot(mob[i].velocity, Vector.sub(m.pos, mob[i].position)) > 0) { // if velocity is directed towards player
                                    Matter.Body.setVelocity(mob[i], Vector.mult(Vector.normalise(mob[i].velocity), cap)); //set velocity to cap, but keep the direction
                                }
                            }
                        }
                        ctx.beginPath();
                        ctx.arc(m.pos.x, m.pos.y, range, 0, 2 * Math.PI);
                        ctx.fillStyle = "hsla(200,50%,61%,0.08)";
                        ctx.fill();
                    }
                }
            }
        },
        {
            name: "nano-scale manufacturing",
            description: "use <strong class='color-f'>energy</strong> to <strong>block</strong> mobs<br>excess <strong class='color-f'>energy</strong> used to build <strong>drones</strong><br><strong>double</strong> your default <strong class='color-f'>energy</strong> regeneration",
            effect: () => {
                m.hold = function() {
                    if (m.energy > m.maxEnergy - 0.02 && m.fieldCDcycle < m.cycle && !input.field && bullet.length < 200) {
                        if (tech.isSporeField) {
                            // const len = Math.floor(5 + 4 * Math.random())
                            const len = Math.ceil(m.energy * 10)
                            m.energy = 0;
                            for (let i = 0; i < len; i++) b.spore(m.pos)
                        } else if (tech.isMissileField) {
                            m.energy -= 0.5;
                            b.missile({ x: m.pos.x, y: m.pos.y - 40 }, -Math.PI / 2, 0, 1)
                        } else if (tech.isIceField) {
                            m.energy -= 0.057;
                            b.iceIX(1)
                        } else {
                            m.energy -= 0.45;
                            b.drone(1)
                        }
                    }

                    if (m.isHolding) {
                        m.drawHold(m.holdingTarget);
                        m.holding();
                        m.throwBlock();
                    } else if ((input.field && m.fieldCDcycle < m.cycle)) { //not hold but field button is pressed
                        m.grabPowerUp();
                        m.lookForPickUp();
                        if (m.energy > 0.05) {
                            m.drawField();
                            m.pushMobsFacing();
                        }
                    } else if (m.holdingTarget && m.fieldCDcycle < m.cycle) { //holding, but field button is released
                        m.pickUp();
                    } else {
                        m.holdingTarget = null; //clears holding target (this is so you only pick up right after the field button is released and a hold target exists)
                    }
                    m.energy += m.fieldRegen;
                    m.drawFieldMeter()
                }
            }
        },
        {
            name: "negative mass field",
            description: "use <strong class='color-f'>energy</strong> to nullify &nbsp;<strong style='letter-spacing: 7px;'>gravity</strong><br>reduce <strong class='color-harm'>harm</strong> by <strong>45%</strong><br><strong>blocks</strong> held by the field have a lower <strong>mass</strong>",
            fieldDrawRadius: 0,
            effect: () => {
                m.fieldFire = true;
                m.holdingMassScale = 0.03; //can hold heavier blocks with lower cost to jumping
                m.fieldMeterColor = "#000"
                m.fieldHarmReduction = 0.55;
                m.fieldDrawRadius = 0;

                m.hold = function() {
                    m.airSpeedLimit = 125 //5 * player.mass * player.mass
                    m.FxAir = 0.016
                    m.isFieldActive = false;
                    if (m.isHolding) {
                        m.drawHold(m.holdingTarget);
                        m.holding();
                        m.throwBlock();
                    } else if (input.field && m.fieldCDcycle < m.cycle) { //push away
                        m.grabPowerUp();
                        m.lookForPickUp();
                        const DRAIN = 0.00035
                        if (m.energy > DRAIN) {
                            m.isFieldActive = true; //used with tech.isHarmReduce
                            m.airSpeedLimit = 400 // 7* player.mass * player.mass
                            m.FxAir = 0.005
                            // m.pushMobs360();

                            //repulse mobs
                            // for (let i = 0, len = mob.length; i < len; ++i) {
                            //   sub = Vector.sub(mob[i].position, m.pos);
                            //   dist2 = Vector.magnitudeSquared(sub);
                            //   if (dist2 < this.fieldDrawRadius * this.fieldDrawRadius && mob[i].speed > 6) {
                            //     const force = Vector.mult(Vector.perp(Vector.normalise(sub)), 0.00004 * mob[i].speed * mob[i].mass)
                            //     mob[i].force.x = force.x
                            //     mob[i].force.y = force.y
                            //   }
                            // }
                            //look for nearby objects to make zero-g
                            function zeroG(who, range, mag = 1.06) {
                                for (let i = 0, len = who.length; i < len; ++i) {
                                    sub = Vector.sub(who[i].position, m.pos);
                                    dist = Vector.magnitude(sub);
                                    if (dist < range) {
                                        who[i].force.y -= who[i].mass * (simulation.g * mag); //add a bit more then standard gravity
                                    }
                                }
                            }
                            // zeroG(bullet);  //works fine, but not that noticeable and maybe not worth the possible performance hit
                            // zeroG(mob);  //mobs are too irregular to make this work?

                            if (input.down) { //down
                                player.force.y -= 0.5 * player.mass * simulation.g;
                                this.fieldDrawRadius = this.fieldDrawRadius * 0.97 + 400 * 0.03;
                                zeroG(powerUp, this.fieldDrawRadius, 0.7);
                                zeroG(body, this.fieldDrawRadius, 0.7);
                            } else if (input.up) { //up
                                m.energy -= 5 * DRAIN;
                                this.fieldDrawRadius = this.fieldDrawRadius * 0.97 + 850 * 0.03;
                                player.force.y -= 1.45 * player.mass * simulation.g;
                                zeroG(powerUp, this.fieldDrawRadius, 1.38);
                                zeroG(body, this.fieldDrawRadius, 1.38);
                            } else {
                                m.energy -= DRAIN;
                                this.fieldDrawRadius = this.fieldDrawRadius * 0.97 + 650 * 0.03;
                                player.force.y -= 1.07 * player.mass * simulation.g; // slow upward drift
                                zeroG(powerUp, this.fieldDrawRadius);
                                zeroG(body, this.fieldDrawRadius);
                            }
                            if (m.energy < 0.001) {
                                m.fieldCDcycle = m.cycle + 120;
                                m.energy = 0;
                            }
                            //add extra friction for horizontal motion
                            if (input.down || input.up || input.left || input.right) {
                                Matter.Body.setVelocity(player, {
                                    x: player.velocity.x * 0.99,
                                    y: player.velocity.y * 0.98
                                });
                            } else { //slow rise and fall
                                Matter.Body.setVelocity(player, {
                                    x: player.velocity.x * 0.99,
                                    y: player.velocity.y * 0.98
                                });
                            }
                            if (tech.isFreezeMobs) {
                                const ICE_DRAIN = 0.0005
                                for (let i = 0, len = mob.length; i < len; i++) {
                                    if (((mob[i].distanceToPlayer() + mob[i].radius) < this.fieldDrawRadius) && !mob[i].shield && !mob[i].isShielded) {
                                        if (m.energy > ICE_DRAIN * 2) {
                                            m.energy -= ICE_DRAIN;
                                            this.fieldDrawRadius -= 2;
                                            mobs.statusSlow(mob[i], 45)
                                        } else {
                                            break;
                                        }
                                    }
                                }
                            }

                            //draw zero-G range
                            ctx.beginPath();
                            ctx.arc(m.pos.x, m.pos.y, this.fieldDrawRadius, 0, 2 * Math.PI);
                            ctx.fillStyle = "#f5f5ff";
                            ctx.globalCompositeOperation = "difference";
                            ctx.fill();
                            ctx.globalCompositeOperation = "source-over";
                        }
                    } else if (m.holdingTarget && m.fieldCDcycle < m.cycle) { //holding, but field button is released
                        m.pickUp();
                        this.fieldDrawRadius = 0
                    } else {
                        m.holdingTarget = null; //clears holding target (this is so you only pick up right after the field button is released and a hold target exists)
                        this.fieldDrawRadius = 0
                    }
                    m.drawFieldMeter("rgba(0,0,0,0.2)")
                }
            }
        },
        {
            name: "plasma torch",
            description: "use <strong class='color-f'>energy</strong> to emit short range <strong class='color-plasma'>plasma</strong><br><strong class='color-d'>damages</strong> and <strong>pushes</strong> mobs away",
            effect() {
                m.fieldMeterColor = "#f0f"
                m.hold = function() {
                    b.isExtruderOn = false
                    if (m.isHolding) {
                        m.drawHold(m.holdingTarget);
                        m.holding();
                        m.throwBlock();
                    } else if (input.field && m.fieldCDcycle < m.cycle) { //not hold but field button is pressed
                        m.grabPowerUp();
                        m.lookForPickUp();
                        if (tech.isExtruder) {
                            b.extruder();
                        } else {
                            b.plasma();
                        }
                    } else if (m.holdingTarget && m.fieldCDcycle < m.cycle) { //holding, but field button is released
                        m.pickUp();
                    } else {
                        m.holdingTarget = null; //clears holding target (this is so you only pick up right after the field button is released and a hold target exists)
                    }
                    m.drawFieldMeter("rgba(0, 0, 0, 0.2)")

                    if (tech.isExtruder) {
                        if (input.field) {
                            b.wasExtruderOn = true
                        } else {
                            b.wasExtruderOn = false
                            b.canExtruderFire = true
                        }
                        ctx.lineWidth = 5;
                        ctx.strokeStyle = "#f07"
                        ctx.beginPath(); //draw all the wave bullets
                        for (let i = 0, len = bullet.length; i < len; i++) {
                            if (bullet[i].isWave) {
                                if (bullet[i].isBranch) {
                                    ctx.stroke();
                                    ctx.beginPath(); //draw all the wave bullets
                                } else {
                                    ctx.lineTo(bullet[i].position.x, bullet[i].position.y)
                                }
                            }
                        }
                        if (b.wasExtruderOn && b.isExtruderOn) ctx.lineTo(m.pos.x + 15 * Math.cos(m.angle), m.pos.y + 15 * Math.sin(m.angle))
                        ctx.stroke();
                    }
                }
            }
        },
        {
            name: "time dilation field",
            description: "use <strong class='color-f'>energy</strong> to <strong style='letter-spacing: 1px;'>stop time</strong><br><strong>move</strong> and <strong>fire</strong> while time is stopped",
            effect: () => {
                // m.fieldMeterColor = "#000"
                m.fieldFire = true;
                m.isBodiesAsleep = false;
                m.hold = function() {
                    if (m.isHolding) {
                        m.wakeCheck();
                        m.drawHold(m.holdingTarget);
                        m.holding();
                        m.throwBlock();
                    } else if (input.field && m.fieldCDcycle < m.cycle) {
                        m.grabPowerUp();
                        m.lookForPickUp(180);

                        const DRAIN = 0.0013
                        if (m.energy > DRAIN) {
                            m.energy -= DRAIN;
                            if (m.energy < DRAIN) {
                                m.fieldCDcycle = m.cycle + 120;
                                m.energy = 0;
                                m.wakeCheck();
                            }
                            //draw field everywhere
                            ctx.globalCompositeOperation = "saturation"
                            ctx.fillStyle = "#ccc";
                            ctx.fillRect(-100000, -100000, 200000, 200000)
                            ctx.globalCompositeOperation = "source-over"
                            //stop time
                            m.isBodiesAsleep = true;

                            function sleep(who) {
                                for (let i = 0, len = who.length; i < len; ++i) {
                                    if (!who[i].isSleeping) {
                                        who[i].storeVelocity = who[i].velocity
                                        who[i].storeAngularVelocity = who[i].angularVelocity
                                    }
                                    Matter.Sleeping.set(who[i], true)
                                }
                            }
                            sleep(mob);
                            sleep(body);
                            sleep(bullet);
                            //doesn't really work, just slows down constraints
                            for (let i = 0, len = cons.length; i < len; i++) {
                                if (cons[i].stiffness !== 0) {
                                    cons[i].storeStiffness = cons[i].stiffness;
                                    cons[i].stiffness = 0;
                                }
                            }

                            simulation.cycle--; //pause all functions that depend on game cycle increasing
                            if (tech.isTimeSkip) {
                                m.immuneCycle = m.cycle + 10;
                                simulation.isTimeSkipping = true;
                                m.cycle++;
                                simulation.gravity();
                                Engine.update(engine, simulation.delta);
                                // level.checkZones();
                                // level.checkQuery();
                                m.move();
                                simulation.checks();
                                // mobs.loop();
                                // m.draw();
                                m.walk_cycle += m.flipLegs * m.Vx;
                                // m.hold();
                                // m.energy += DRAIN; // 1 to undo the energy drain from time speed up, 0.5 to cut energy drain in half
                                b.fire();
                                // b.bulletRemove();
                                b.bulletDo();
                                simulation.isTimeSkipping = false;
                            }
                            // simulation.cycle--; //pause all functions that depend on game cycle increasing
                            // if (tech.isTimeSkip && !simulation.isTimeSkipping) { //speed up the rate of time
                            //   simulation.timeSkip(1)
                            //   m.energy += 1.5 * DRAIN; //x1 to undo the energy drain from time speed up, x1.5 to cut energy drain in half
                            // }
                        }
                    } else if (m.holdingTarget && m.fieldCDcycle < m.cycle) { //holding, but field button is released
                        m.wakeCheck();
                        m.pickUp();
                    } else {
                        m.wakeCheck();
                        m.holdingTarget = null; //clears holding target (this is so you only pick up right after the field button is released and a hold target exists)
                    }
                    m.drawFieldMeter()
                }
            }
        },
        {
            name: "metamaterial cloaking", //"weak photonic coupling" "electromagnetically induced transparency" "optical non-coupling" "slow light field" "electro-optic transparency"
            description: "<strong class='color-cloaked'>cloak</strong> after not using your gun or field<br>while <strong class='color-cloaked'>cloaked</strong> mobs can't see you<br>increase <strong class='color-d'>damage</strong> by <strong>133%</strong>",
            effect: () => {
                m.fieldFire = true;
                m.fieldMeterColor = "#fff";
                m.fieldPhase = 0;
                m.isCloak = false
                m.fieldDamage = 2.33 // 1 + 111/100
                m.fieldDrawRadius = 0
                const drawRadius = 1000

                m.hold = function() {
                    if (m.isHolding) {
                        m.drawHold(m.holdingTarget);
                        m.holding();
                        m.throwBlock();
                    } else if (input.field && m.fieldCDcycle < m.cycle) { //not hold and field button is pressed
                        m.grabPowerUp();
                        m.lookForPickUp();
                    } else if (m.holdingTarget && m.fieldCDcycle < m.cycle) { //holding target exists, and field button is not pressed
                        m.pickUp();
                    } else {
                        m.holdingTarget = null; //clears holding target (this is so you only pick up right after the field button is released and a hold target exists)
                    }

                    //120 cycles after shooting (or using field) enable cloak
                    if (m.energy < 0.05 && m.fireCDcycle < m.cycle && !input.fire) m.fireCDcycle = m.cycle
                    if (m.fireCDcycle + 50 < m.cycle) {
                        if (!m.isCloak) {
                            m.isCloak = true //enter cloak
                            if (tech.isIntangible) {
                                for (let i = 0; i < bullet.length; i++) {
                                    if (bullet[i].botType && bullet[i].botType !== "orbit") bullet[i].collisionFilter.mask = cat.map | cat.bullet | cat.mobBullet | cat.mobShield
                                }
                            }
                        }
                    } else if (m.isCloak) { //exit cloak
                        m.isCloak = false
                        if (tech.isIntangible) {
                            for (let i = 0; i < bullet.length; i++) {
                                if (bullet[i].botType && bullet[i].botType !== "orbit") bullet[i].collisionFilter.mask = cat.map | cat.body | cat.bullet | cat.mob | cat.mobBullet | cat.mobShield
                            }
                        }
                        if (tech.isCloakStun) { //stun nearby mobs after exiting cloak
                            let isMobsAround = false
                            const stunRange = m.fieldDrawRadius * 1.15
                            const drain = 0.3 * m.energy
                            for (let i = 0, len = mob.length; i < len; ++i) {
                                if (
                                    Vector.magnitude(Vector.sub(mob[i].position, m.pos)) < stunRange &&
                                    Matter.Query.ray(map, mob[i].position, m.pos).length === 0
                                ) {
                                    isMobsAround = true
                                    mobs.statusStun(mob[i], 30 + drain * 300)
                                }
                            }
                            if (isMobsAround && m.energy > drain) {
                                m.energy -= drain
                                simulation.drawList.push({
                                    x: m.pos.x,
                                    y: m.pos.y,
                                    radius: stunRange,
                                    color: "hsla(0,50%,100%,0.6)",
                                    time: 4
                                });
                                // ctx.beginPath();
                                // ctx.arc(m.pos.x, m.pos.y, 800, 0, 2 * Math.PI);
                                // ctx.fillStyle = "#000"
                                // ctx.fill();
                            }
                        }
                    }

                    function drawField() {
                        m.fieldPhase += 0.007 + 0.07 * (1 - energy)
                        const wiggle = 0.15 * Math.sin(m.fieldPhase * 0.5)
                        ctx.beginPath();
                        ctx.ellipse(m.pos.x, m.pos.y, m.fieldDrawRadius * (1 - wiggle), m.fieldDrawRadius * (1 + wiggle), m.fieldPhase, 0, 2 * Math.PI);
                        if (m.fireCDcycle > m.cycle && (input.field)) {
                            ctx.lineWidth = 5;
                            ctx.strokeStyle = `rgba(0, 204, 255,1)`
                            ctx.stroke()
                        }
                        ctx.fillStyle = "#fff" //`rgba(0,0,0,${0.5+0.5*m.energy})`;
                        ctx.globalCompositeOperation = "destination-in"; //in or atop
                        ctx.fill();
                        ctx.globalCompositeOperation = "source-over";
                        ctx.clip();
                    }

                    const energy = Math.max(0.01, Math.min(m.energy, 1))
                    if (m.isCloak) {
                        this.fieldRange = this.fieldRange * 0.9 + 0.1 * drawRadius
                        m.fieldDrawRadius = this.fieldRange * Math.min(1, 0.3 + 0.5 * Math.min(1, energy * energy));
                        drawField()
                    } else {
                        if (this.fieldRange < 3000) {
                            this.fieldRange += 200
                            m.fieldDrawRadius = this.fieldRange * Math.min(1, 0.3 + 0.5 * Math.min(1, energy * energy));
                            drawField()
                        }
                    }
                    if (tech.isIntangible) {
                        if (m.isCloak) {
                            player.collisionFilter.mask = cat.map
                            let inPlayer = Matter.Query.region(mob, player.bounds)
                            if (inPlayer.length > 0) {
                                for (let i = 0; i < inPlayer.length; i++) {
                                    if (m.energy > 0) {
                                        if (inPlayer[i].shield) { //shields drain player energy
                                            m.energy -= 0.014;
                                        } else {
                                            m.energy -= 0.004;
                                        }
                                    }
                                }
                            }
                        } else {
                            player.collisionFilter.mask = cat.body | cat.map | cat.mob | cat.mobBullet | cat.mobShield //normal collisions
                        }
                    }

                    if (m.energy < m.maxEnergy) { // replaces m.drawFieldMeter() with custom code
                        m.energy += m.fieldRegen;
                        if (m.energy < 0) m.energy = 0
                        const xOff = m.pos.x - m.radius * m.maxEnergy
                        const yOff = m.pos.y - 50
                        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
                        ctx.fillRect(xOff, yOff, 60 * m.maxEnergy, 10);
                        ctx.fillStyle = m.fieldMeterColor;
                        ctx.fillRect(xOff, yOff, 60 * m.energy, 10);
                        ctx.beginPath()
                        ctx.rect(xOff, yOff, 60 * m.maxEnergy, 10);
                        ctx.strokeStyle = "rgb(0, 0, 0)";
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }
        },
        // {
        //   name: "phase decoherence field",
        //   description: "use <strong class='color-f'>energy</strong> to become <strong>intangible</strong><br><strong>firing</strong> and touching <strong>shields</strong> <strong>drains</strong> <strong class='color-f'>energy</strong><br>unable to <strong>see</strong> and be <strong>seen</strong> by mobs",
        //   effect: () => {
        //     m.fieldFire = true;
        //     m.fieldMeterColor = "#fff";
        //     m.fieldPhase = 0;

        //     m.hold = function () {
        //       function drawField(radius) {
        //         radius *= Math.min(4, 0.9 + 2.2 * m.energy * m.energy);
        //         const rotate = m.cycle * 0.005;
        //         m.fieldPhase += 0.5 - 0.5 * Math.sqrt(Math.max(0.01, Math.min(m.energy, 1)));
        //         const off1 = 1 + 0.06 * Math.sin(m.fieldPhase);
        //         const off2 = 1 - 0.06 * Math.sin(m.fieldPhase);
        //         ctx.beginPath();
        //         ctx.ellipse(m.pos.x, m.pos.y, radius * off1, radius * off2, rotate, 0, 2 * Math.PI);
        //         if (m.fireCDcycle > m.cycle && (input.field)) {
        //           ctx.lineWidth = 5;
        //           ctx.strokeStyle = `rgba(0, 204, 255,1)`
        //           ctx.stroke()
        //         }
        //         ctx.fillStyle = "#fff" //`rgba(0,0,0,${0.5+0.5*m.energy})`;
        //         ctx.globalCompositeOperation = "destination-in"; //in or atop
        //         ctx.fill();
        //         ctx.globalCompositeOperation = "source-over";
        //         ctx.clip();
        //       }

        //       m.isCloak = false //isCloak disables most uses of foundPlayer() 
        //       player.collisionFilter.mask = cat.body | cat.map | cat.mob | cat.mobBullet | cat.mobShield //normal collisions
        //       if (m.isHolding) {
        //         if (this.fieldRange < 2000) {
        //           this.fieldRange += 100
        //           drawField(this.fieldRange)
        //         }
        //         m.drawHold(m.holdingTarget);
        //         m.holding();
        //         m.throwBlock();
        //       } else if (input.field) {
        //         m.grabPowerUp();
        //         m.lookForPickUp();

        //         if (m.fieldCDcycle < m.cycle) {
        //           // simulation.draw.bodyFill = "transparent"
        //           // simulation.draw.bodyStroke = "transparent"

        //           const DRAIN = 0.00013 + (m.fireCDcycle > m.cycle ? 0.005 : 0)
        //           if (m.energy > DRAIN) {
        //             m.energy -= DRAIN;
        //             // if (m.energy < 0.001) {
        //             //   m.fieldCDcycle = m.cycle + 120;
        //             //   m.energy = 0;
        //             //   m.holdingTarget = null; //clears holding target (this is so you only pick up right after the field button is released and a hold target exists)
        //             // }
        //             this.fieldRange = this.fieldRange * 0.8 + 0.2 * 160
        //             drawField(this.fieldRange)

        //             m.isCloak = true //isCloak disables most uses of foundPlayer() 
        //             player.collisionFilter.mask = cat.map


        //             let inPlayer = Matter.Query.region(mob, player.bounds)
        //             if (inPlayer.length > 0) {
        //               for (let i = 0; i < inPlayer.length; i++) {
        //                 if (inPlayer[i].shield) {
        //                   m.energy -= 0.005; //shields drain player energy
        //                   //draw outline of shield
        //                   ctx.fillStyle = `rgba(140,217,255,0.5)`
        //                   ctx.fill()
        //                 } else if (tech.superposition && inPlayer[i].dropPowerUp) {
        //                   // inPlayer[i].damage(0.4 * b.dmgScale); //damage mobs inside the player
        //                   // m.energy += 0.005;

        //                   mobs.statusStun(inPlayer[i], 300)
        //                   //draw outline of mob in a few random locations to show blurriness
        //                   const vertices = inPlayer[i].vertices;
        //                   const off = 30
        //                   for (let k = 0; k < 3; k++) {
        //                     const xOff = off * (Math.random() - 0.5)
        //                     const yOff = off * (Math.random() - 0.5)
        //                     ctx.beginPath();
        //                     ctx.moveTo(xOff + vertices[0].x, yOff + vertices[0].y);
        //                     for (let j = 1, len = vertices.length; j < len; ++j) {
        //                       ctx.lineTo(xOff + vertices[j].x, yOff + vertices[j].y);
        //                     }
        //                     ctx.lineTo(xOff + vertices[0].x, yOff + vertices[0].y);
        //                     ctx.fillStyle = "rgba(0,0,0,0.1)"
        //                     ctx.fill()
        //                   }
        //                   break;
        //                 }
        //               }
        //             }
        //           } else {
        //             m.fieldCDcycle = m.cycle + 120;
        //             m.energy = 0;
        //             m.holdingTarget = null; //clears holding target (this is so you only pick up right after the field button is released and a hold target exists)
        //             drawField(this.fieldRange)
        //           }
        //         }
        //       } else if (m.holdingTarget && m.fieldCDcycle < m.cycle) { //holding, but field button is released
        //         m.pickUp();
        //         if (this.fieldRange < 2000) {
        //           this.fieldRange += 100
        //           drawField(this.fieldRange)
        //         }
        //       } else {
        //         // this.fieldRange = 3000
        //         if (this.fieldRange < 2000 && m.holdingTarget === null) {
        //           this.fieldRange += 100
        //           drawField(this.fieldRange)
        //         }
        //         m.holdingTarget = null; //clears holding target (this is so you only pick up right after the field button is released and a hold target exists)
        //       }

        //       if (m.energy < m.maxEnergy) {
        //         m.energy += m.fieldRegen;
        //         const xOff = m.pos.x - m.radius * m.maxEnergy
        //         const yOff = m.pos.y - 50
        //         ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        //         ctx.fillRect(xOff, yOff, 60 * m.maxEnergy, 10);
        //         ctx.fillStyle = m.fieldMeterColor;
        //         ctx.fillRect(xOff, yOff, 60 * m.energy, 10);
        //         ctx.beginPath()
        //         ctx.rect(xOff, yOff, 60 * m.maxEnergy, 10);
        //         ctx.strokeStyle = "rgb(0, 0, 0)";
        //         ctx.lineWidth = 1;
        //         ctx.stroke();
        //       }
        //       if (m.energy < 0) m.energy = 0
        //     }
        //   }
        // },
        {
            name: "pilot wave",
            description: "use <strong class='color-f'>energy</strong> to push <strong>blocks</strong> with your mouse<br>field <strong>radius</strong> decreases out of <strong>line of sight</strong><br>allows <strong class='color-m'>tech</strong> that normally require other <strong class='color-f'>fields</strong>",
            effect: () => {
                m.fieldPhase = 0;
                m.fieldPosition = {
                    x: simulation.mouseInGame.x,
                    y: simulation.mouseInGame.y
                }
                m.lastFieldPosition = {
                    x: simulation.mouseInGame.x,
                    y: simulation.mouseInGame.y
                }
                m.fieldOn = false;
                m.fieldRadius = 0;
                m.drop();
                m.hold = function() {
                    if (input.field) {
                        if (m.fieldCDcycle < m.cycle) {
                            const scale = 25
                            const bounds = {
                                min: {
                                    x: m.fieldPosition.x - scale,
                                    y: m.fieldPosition.y - scale
                                },
                                max: {
                                    x: m.fieldPosition.x + scale,
                                    y: m.fieldPosition.y + scale
                                }
                            }
                            const isInMap = Matter.Query.region(map, bounds).length
                            // const isInMap = Matter.Query.point(map, m.fieldPosition).length

                            if (!m.fieldOn) { // if field was off, and it starting up, teleport to new mouse location
                                m.fieldOn = true;
                                m.fieldPosition = { //smooth the mouse position
                                    x: simulation.mouseInGame.x,
                                    y: simulation.mouseInGame.y
                                }
                                m.lastFieldPosition = { //used to find velocity of field changes
                                    x: m.fieldPosition.x,
                                    y: m.fieldPosition.y
                                }
                            } else { //when field is on it smoothly moves towards the mouse
                                m.lastFieldPosition = { //used to find velocity of field changes
                                    x: m.fieldPosition.x,
                                    y: m.fieldPosition.y
                                }
                                const smooth = isInMap ? 0.985 : 0.96;
                                m.fieldPosition = { //smooth the mouse position
                                    x: m.fieldPosition.x * smooth + simulation.mouseInGame.x * (1 - smooth),
                                    y: m.fieldPosition.y * smooth + simulation.mouseInGame.y * (1 - smooth),
                                }
                            }

                            //grab power ups into the field
                            for (let i = 0, len = powerUp.length; i < len; ++i) {
                                const dxP = m.fieldPosition.x - powerUp[i].position.x;
                                const dyP = m.fieldPosition.y - powerUp[i].position.y;
                                const dist2 = dxP * dxP + dyP * dyP;
                                // float towards field  if looking at and in range  or  if very close to player
                                if (dist2 < m.fieldRadius * m.fieldRadius && (m.lookingAt(powerUp[i]) || dist2 < 16000) && !(m.health === m.maxHealth && powerUp[i].name === "heal")) {
                                    powerUp[i].force.x += 7 * (dxP / dist2) * powerUp[i].mass;
                                    powerUp[i].force.y += 7 * (dyP / dist2) * powerUp[i].mass - powerUp[i].mass * simulation.g; //negate gravity
                                    //extra friction
                                    Matter.Body.setVelocity(powerUp[i], {
                                        x: powerUp[i].velocity.x * 0.11,
                                        y: powerUp[i].velocity.y * 0.11
                                    });
                                    if (dist2 < 5000 && !simulation.isChoosing) { //use power up if it is close enough
                                        powerUps.onPickUp(powerUp[i]);
                                        powerUp[i].effect();
                                        Matter.World.remove(engine.world, powerUp[i]);
                                        powerUp.splice(i, 1);
                                        // m.fieldRadius += 50
                                        break; //because the array order is messed up after splice
                                    }
                                }
                            }
                            //grab power ups normally too
                            m.grabPowerUp();

                            if (m.energy > 0.01) {
                                //find mouse velocity
                                const diff = Vector.sub(m.fieldPosition, m.lastFieldPosition)
                                const speed = Vector.magnitude(diff)
                                const velocity = Vector.mult(Vector.normalise(diff), Math.min(speed, 45)) //limit velocity
                                let radius, radiusSmooth
                                if (Matter.Query.ray(map, m.fieldPosition, player.position).length) { //is there something block the player's view of the field
                                    radius = 0
                                    radiusSmooth = Math.max(0, isInMap ? 0.96 - 0.02 * speed : 0.995); //0.99
                                } else {
                                    radius = Math.max(50, 250 - 2 * speed)
                                    radiusSmooth = 0.97
                                }
                                m.fieldRadius = m.fieldRadius * radiusSmooth + radius * (1 - radiusSmooth)

                                for (let i = 0, len = body.length; i < len; ++i) {
                                    if (Vector.magnitude(Vector.sub(body[i].position, m.fieldPosition)) < m.fieldRadius && !body[i].isNotHoldable) {
                                        const DRAIN = speed * body[i].mass * 0.000013
                                        if (m.energy > DRAIN) {
                                            m.energy -= DRAIN;
                                            Matter.Body.setVelocity(body[i], velocity); //give block mouse velocity
                                            Matter.Body.setAngularVelocity(body[i], body[i].angularVelocity * 0.8)
                                            // body[i].force.y -= body[i].mass * simulation.g; //remove gravity effects
                                            //blocks drift towards center of pilot wave
                                            const sub = Vector.sub(m.fieldPosition, body[i].position)
                                            const unit = Vector.mult(Vector.normalise(sub), 0.00005 * Vector.magnitude(sub))
                                            body[i].force.x += unit.x
                                            body[i].force.y += unit.y - body[i].mass * simulation.g //remove gravity effects
                                        } else {
                                            m.fieldCDcycle = m.cycle + 120;
                                            m.fieldOn = false
                                            m.fieldRadius = 0
                                            break
                                        }
                                    }
                                }

                                if (tech.isFreezeMobs) {
                                    for (let i = 0, len = mob.length; i < len; ++i) {
                                        if (Vector.magnitude(Vector.sub(mob[i].position, m.fieldPosition)) < m.fieldRadius) {
                                            mobs.statusSlow(mob[i], 120)
                                        }
                                    }
                                }

                                ctx.beginPath();
                                const rotate = m.cycle * 0.008;
                                m.fieldPhase += 0.2 // - 0.5 * Math.sqrt(Math.min(m.energy, 1));
                                const off1 = 1 + 0.06 * Math.sin(m.fieldPhase);
                                const off2 = 1 - 0.06 * Math.sin(m.fieldPhase);
                                ctx.beginPath();
                                ctx.ellipse(m.fieldPosition.x, m.fieldPosition.y, 1.2 * m.fieldRadius * off1, 1.2 * m.fieldRadius * off2, rotate, 0, 2 * Math.PI);
                                ctx.globalCompositeOperation = "exclusion"; //"exclusion" "difference";
                                ctx.fillStyle = "#fff"; //"#eef";
                                ctx.fill();
                                ctx.globalCompositeOperation = "source-over";
                                ctx.beginPath();
                                ctx.ellipse(m.fieldPosition.x, m.fieldPosition.y, 1.2 * m.fieldRadius * off1, 1.2 * m.fieldRadius * off2, rotate, 0, 2 * Math.PI * m.energy / m.maxEnergy);
                                ctx.strokeStyle = "#000";
                                ctx.lineWidth = 4;
                                ctx.stroke();
                            } else {
                                m.fieldCDcycle = m.cycle + 120;
                                m.fieldOn = false
                                m.fieldRadius = 0
                            }
                        } else {
                            m.grabPowerUp();
                        }
                    } else {
                        m.fieldOn = false
                        m.fieldRadius = 0
                    }
                    m.drawFieldMeter()
                }
            }
        },
        {
            name: "wormhole",
            description: "use <strong class='color-f'>energy</strong> to <strong>tunnel</strong> through a <strong class='color-worm'>wormhole</strong><br><strong class='color-worm'>wormholes</strong> attract blocks and power ups<br><strong>10%</strong> chance to <strong class='color-dup'>duplicate</strong> spawned <strong>power ups</strong>", //<br>bullets may also traverse <strong class='color-worm'>wormholes</strong>
            effect: function() {
                m.drop();
                m.duplicateChance = 0.1
                simulation.draw.powerUp = simulation.draw.powerUpBonus //change power up draw

                // if (tech.isRewindGun) {
                //     m.hold = this.rewind
                // } else {
                m.hold = this.teleport
                // }
            },
            rewindCount: 0,
            // rewind: function() {
            //     if (input.down) {
            //         if (input.field && m.fieldCDcycle < m.cycle) { //not hold but field button is pressed
            //             const DRAIN = 0.01
            //             if (this.rewindCount < 289 && m.energy > DRAIN) {
            //                 m.energy -= DRAIN


            //                 if (this.rewindCount === 0) {
            //                     const shortPause = function() {
            //                         if (m.defaultFPSCycle < m.cycle) { //back to default values
            //                             simulation.fpsCap = simulation.fpsCapDefault
            //                             simulation.fpsInterval = 1000 / simulation.fpsCap;
            //                             // document.getElementById("dmg").style.transition = "opacity 1s";
            //                             // document.getElementById("dmg").style.opacity = "0";
            //                         } else {
            //                             requestAnimationFrame(shortPause);
            //                         }
            //                     };
            //                     if (m.defaultFPSCycle < m.cycle) requestAnimationFrame(shortPause);
            //                     simulation.fpsCap = 4 //1 is longest pause, 4 is standard
            //                     simulation.fpsInterval = 1000 / simulation.fpsCap;
            //                     m.defaultFPSCycle = m.cycle
            //                 }


            //                 this.rewindCount += 10;
            //                 simulation.wipe = function() { //set wipe to have trails
            //                     // ctx.fillStyle = "rgba(255,255,255,0)";
            //                     ctx.fillStyle = `rgba(221,221,221,${0.004})`;
            //                     ctx.fillRect(0, 0, canvas.width, canvas.height);
            //                 }
            //                 let history = m.history[(m.cycle - this.rewindCount) % 300]
            //                 Matter.Body.setPosition(player, history.position);
            //                 Matter.Body.setVelocity(player, { x: history.velocity.x, y: history.velocity.y });
            //                 if (history.health > m.health) {
            //                     m.health = history.health
            //                     m.displayHealth();
            //                 }
            //                 //grab power ups
            //                 for (let i = 0, len = powerUp.length; i < len; ++i) {
            //                     const dxP = player.position.x - powerUp[i].position.x;
            //                     const dyP = player.position.y - powerUp[i].position.y;
            //                     if (dxP * dxP + dyP * dyP < 50000 && !simulation.isChoosing && !(m.health === m.maxHealth && powerUp[i].name === "heal")) {
            //                         powerUps.onPickUp(player.position);
            //                         powerUp[i].effect();
            //                         Matter.World.remove(engine.world, powerUp[i]);
            //                         powerUp.splice(i, 1);
            //                         const shortPause = function() {
            //                             if (m.defaultFPSCycle < m.cycle) { //back to default values
            //                                 simulation.fpsCap = simulation.fpsCapDefault
            //                                 simulation.fpsInterval = 1000 / simulation.fpsCap;
            //                                 // document.getElementById("dmg").style.transition = "opacity 1s";
            //                                 // document.getElementById("dmg").style.opacity = "0";
            //                             } else {
            //                                 requestAnimationFrame(shortPause);
            //                             }
            //                         };
            //                         if (m.defaultFPSCycle < m.cycle) requestAnimationFrame(shortPause);
            //                         simulation.fpsCap = 3 //1 is longest pause, 4 is standard
            //                         simulation.fpsInterval = 1000 / simulation.fpsCap;
            //                         m.defaultFPSCycle = m.cycle
            //                         break; //because the array order is messed up after splice
            //                     }
            //                 }
            //                 m.immuneCycle = m.cycle + 5; //player is immune to collision damage for 30 cycles
            //             } else {
            //                 m.fieldCDcycle = m.cycle + 30;
            //                 // m.resetHistory();
            //             }
            //         } else {
            //             if (this.rewindCount !== 0) {
            //                 m.fieldCDcycle = m.cycle + 30;
            //                 m.resetHistory();
            //                 this.rewindCount = 0;
            //                 simulation.wipe = function() { //set wipe to normal
            //                     ctx.clearRect(0, 0, canvas.width, canvas.height);
            //                 }
            //             }
            //             m.holdingTarget = null; //clears holding target (this is so you only pick up right after the field button is released and a hold target exists)
            //         }
            //     }
            //     m.drawFieldMeter()
            // },
            teleport: function() {
                // m.hole = {  //this is reset with each new field, but I'm leaving it here for reference
                //   isOn: false,
                //   isReady: true,
                //   pos1: {x: 0,y: 0},
                //   pos2: {x: 0,y: 0},
                //   angle: 0,
                //   unit:{x:0,y:0},
                // }
                if (m.hole.isOn) {
                    // draw holes
                    m.fieldRange = 0.97 * m.fieldRange + 0.03 * (50 + 10 * Math.sin(simulation.cycle * 0.025))
                    const semiMajorAxis = m.fieldRange + 30
                    const edge1a = Vector.add(Vector.mult(m.hole.unit, semiMajorAxis), m.hole.pos1)
                    const edge1b = Vector.add(Vector.mult(m.hole.unit, -semiMajorAxis), m.hole.pos1)
                    const edge2a = Vector.add(Vector.mult(m.hole.unit, semiMajorAxis), m.hole.pos2)
                    const edge2b = Vector.add(Vector.mult(m.hole.unit, -semiMajorAxis), m.hole.pos2)
                    ctx.beginPath();
                    ctx.moveTo(edge1a.x, edge1a.y)
                    ctx.bezierCurveTo(m.hole.pos1.x, m.hole.pos1.y, m.hole.pos2.x, m.hole.pos2.y, edge2a.x, edge2a.y);
                    ctx.lineTo(edge2b.x, edge2b.y)
                    ctx.bezierCurveTo(m.hole.pos2.x, m.hole.pos2.y, m.hole.pos1.x, m.hole.pos1.y, edge1b.x, edge1b.y);
                    ctx.fillStyle = `rgba(255,255,255,${200 / m.fieldRange / m.fieldRange})` //"rgba(0,0,0,0.1)"
                    ctx.fill();
                    ctx.beginPath();
                    ctx.ellipse(m.hole.pos1.x, m.hole.pos1.y, m.fieldRange, semiMajorAxis, m.hole.angle, 0, 2 * Math.PI)
                    ctx.ellipse(m.hole.pos2.x, m.hole.pos2.y, m.fieldRange, semiMajorAxis, m.hole.angle, 0, 2 * Math.PI)
                    ctx.fillStyle = `rgba(255,255,255,${32 / m.fieldRange})`
                    ctx.fill();

                    //suck power ups
                    for (let i = 0, len = powerUp.length; i < len; ++i) {
                        //which hole is closer
                        const dxP1 = m.hole.pos1.x - powerUp[i].position.x;
                        const dyP1 = m.hole.pos1.y - powerUp[i].position.y;
                        const dxP2 = m.hole.pos2.x - powerUp[i].position.x;
                        const dyP2 = m.hole.pos2.y - powerUp[i].position.y;
                        let dxP, dyP, dist2
                        if (dxP1 * dxP1 + dyP1 * dyP1 < dxP2 * dxP2 + dyP2 * dyP2) {
                            dxP = dxP1
                            dyP = dyP1
                        } else {
                            dxP = dxP2
                            dyP = dyP2
                        }
                        dist2 = dxP * dxP + dyP * dyP;
                        if (dist2 < 600000 && !(m.health === m.maxHealth && powerUp[i].name === "heal")) {
                            powerUp[i].force.x += 4 * (dxP / dist2) * powerUp[i].mass; // float towards hole
                            powerUp[i].force.y += 4 * (dyP / dist2) * powerUp[i].mass - powerUp[i].mass * simulation.g; //negate gravity
                            Matter.Body.setVelocity(powerUp[i], { //extra friction
                                x: powerUp[i].velocity.x * 0.05,
                                y: powerUp[i].velocity.y * 0.05
                            });
                            if (dist2 < 1000 && !simulation.isChoosing) { //use power up if it is close enough
                                m.fieldRange *= 0.8
                                powerUps.onPickUp(powerUp[i]);
                                powerUp[i].effect();
                                Matter.World.remove(engine.world, powerUp[i]);
                                powerUp.splice(i, 1);
                                break; //because the array order is messed up after splice
                            }
                        }
                    }
                    //suck and shrink blocks
                    const suckRange = 500
                    const shrinkRange = 100
                    const shrinkScale = 0.97;
                    const slowScale = 0.9
                    for (let i = 0, len = body.length; i < len; i++) {
                        if (!body[i].isNotHoldable) {
                            const dist1 = Vector.magnitude(Vector.sub(m.hole.pos1, body[i].position))
                            const dist2 = Vector.magnitude(Vector.sub(m.hole.pos2, body[i].position))
                            if (dist1 < dist2) {
                                if (dist1 < suckRange) {
                                    const pull = Vector.mult(Vector.normalise(Vector.sub(m.hole.pos1, body[i].position)), 1)
                                    const slow = Vector.mult(body[i].velocity, slowScale)
                                    Matter.Body.setVelocity(body[i], Vector.add(slow, pull));
                                    //shrink
                                    if (Vector.magnitude(Vector.sub(m.hole.pos1, body[i].position)) < shrinkRange) {
                                        Matter.Body.scale(body[i], shrinkScale, shrinkScale);
                                        if (body[i].mass < 0.05) {
                                            Matter.World.remove(engine.world, body[i]);
                                            body.splice(i, 1);
                                            m.fieldRange *= 0.8
                                            if (tech.isWormholeEnergy) m.energy += 0.5
                                            if (tech.isWormSpores) { //pandimensionalspermia
                                                for (let i = 0, len = Math.ceil(3 * Math.random()); i < len; i++) {
                                                    b.spore(Vector.add(m.hole.pos2, Vector.rotate({
                                                        x: m.fieldRange * 0.4,
                                                        y: 0
                                                    }, 2 * Math.PI * Math.random())))
                                                    Matter.Body.setVelocity(bullet[bullet.length - 1], Vector.mult(Vector.rotate(m.hole.unit, Math.PI / 2), -15));
                                                }
                                            }
                                            break
                                        }
                                    }
                                }
                            } else if (dist2 < suckRange) {
                                const pull = Vector.mult(Vector.normalise(Vector.sub(m.hole.pos2, body[i].position)), 1)
                                const slow = Vector.mult(body[i].velocity, slowScale)
                                Matter.Body.setVelocity(body[i], Vector.add(slow, pull));
                                //shrink
                                if (Vector.magnitude(Vector.sub(m.hole.pos2, body[i].position)) < shrinkRange) {
                                    Matter.Body.scale(body[i], shrinkScale, shrinkScale);
                                    if (body[i].mass < 0.05) {
                                        Matter.World.remove(engine.world, body[i]);
                                        body.splice(i, 1);
                                        m.fieldRange *= 0.8
                                        // if (tech.isWormholeEnergy && m.energy < m.maxEnergy * 2) m.energy = m.maxEnergy * 2
                                        if (tech.isWormholeEnergy) m.energy += 0.5
                                        if (tech.isWormSpores) { //pandimensionalspermia
                                            for (let i = 0, len = Math.ceil(3 * Math.random()); i < len; i++) {
                                                b.spore(Vector.add(m.hole.pos1, Vector.rotate({
                                                    x: m.fieldRange * 0.4,
                                                    y: 0
                                                }, 2 * Math.PI * Math.random())))
                                                Matter.Body.setVelocity(bullet[bullet.length - 1], Vector.mult(Vector.rotate(m.hole.unit, Math.PI / 2), 15));
                                            }
                                        }
                                        break
                                    }
                                }
                            }
                        }
                    }
                    if (tech.isWormBullets) {
                        //teleport bullets
                        for (let i = 0, len = bullet.length; i < len; ++i) { //teleport bullets from hole1 to hole2
                            if (!bullet[i].botType && !bullet[i].isInHole) { //don't teleport bots
                                if (Vector.magnitude(Vector.sub(m.hole.pos1, bullet[i].position)) < m.fieldRange) { //find if bullet is touching hole1
                                    Matter.Body.setPosition(bullet[i], Vector.add(m.hole.pos2, Vector.sub(m.hole.pos1, bullet[i].position)));
                                    m.fieldRange += 5
                                    bullet[i].isInHole = true
                                } else if (Vector.magnitude(Vector.sub(m.hole.pos2, bullet[i].position)) < m.fieldRange) { //find if bullet is touching hole1
                                    Matter.Body.setPosition(bullet[i], Vector.add(m.hole.pos1, Vector.sub(m.hole.pos2, bullet[i].position)));
                                    m.fieldRange += 5
                                    bullet[i].isInHole = true
                                }
                            }
                        }
                        // mobs get pushed away
                        for (let i = 0, len = mob.length; i < len; i++) {
                            if (Vector.magnitude(Vector.sub(m.hole.pos1, mob[i].position)) < 200) {
                                const pull = Vector.mult(Vector.normalise(Vector.sub(m.hole.pos1, mob[i].position)), -0.07)
                                Matter.Body.setVelocity(mob[i], Vector.add(mob[i].velocity, pull));
                            }
                            if (Vector.magnitude(Vector.sub(m.hole.pos2, mob[i].position)) < 200) {
                                const pull = Vector.mult(Vector.normalise(Vector.sub(m.hole.pos2, mob[i].position)), -0.07)
                                Matter.Body.setVelocity(mob[i], Vector.add(mob[i].velocity, pull));
                            }
                        }
                    }
                }

                if (input.field && m.fieldCDcycle < m.cycle) { //not hold but field button is pressed
                    const justPastMouse = Vector.add(Vector.mult(Vector.normalise(Vector.sub(simulation.mouseInGame, m.pos)), 50), simulation.mouseInGame)
                    const scale = 60
                    // console.log(Matter.Query.region(map, bounds))
                    if (m.hole.isReady &&
                        (
                            Matter.Query.region(map, {
                                min: {
                                    x: simulation.mouseInGame.x - scale,
                                    y: simulation.mouseInGame.y - scale
                                },
                                max: {
                                    x: simulation.mouseInGame.x + scale,
                                    y: simulation.mouseInGame.y + scale
                                }
                            }).length === 0 &&
                            Matter.Query.ray(map, m.pos, justPastMouse).length === 0
                            // Matter.Query.ray(map, m.pos, simulation.mouseInGame).length === 0 &&
                            // Matter.Query.ray(map, player.position, simulation.mouseInGame).length === 0 &&
                            // Matter.Query.ray(map, player.position, justPastMouse).length === 0
                        )
                    ) {
                        const sub = Vector.sub(simulation.mouseInGame, m.pos)
                        const mag = Vector.magnitude(sub)
                        const drain = 0.03 + 0.005 * Math.sqrt(mag)
                        if (m.energy > drain && mag > 300) {
                            m.energy -= drain
                            m.hole.isReady = false;
                            m.fieldRange = 0
                            Matter.Body.setPosition(player, simulation.mouseInGame);
                            m.buttonCD_jump = 0 //this might fix a bug with jumping
                            const velocity = Vector.mult(Vector.normalise(sub), 18)
                            Matter.Body.setVelocity(player, {
                                x: velocity.x,
                                y: velocity.y - 4 //an extra vertical kick so the player hangs in place longer
                            });
                            m.immuneCycle = m.cycle + 15; //player is immune to collision damage 
                            // move bots to follow player
                            for (let i = 0; i < bullet.length; i++) {
                                if (bullet[i].botType) {
                                    Matter.Body.setPosition(bullet[i], Vector.add(player.position, {
                                        x: 250 * (Math.random() - 0.5),
                                        y: 250 * (Math.random() - 0.5)
                                    }));
                                    Matter.Body.setVelocity(bullet[i], {
                                        x: 0,
                                        y: 0
                                    });
                                }
                            }

                            //set holes
                            m.hole.isOn = true;
                            m.hole.pos1.x = m.pos.x
                            m.hole.pos1.y = m.pos.y
                            m.hole.pos2.x = player.position.x
                            m.hole.pos2.y = player.position.y
                            m.hole.angle = Math.atan2(sub.y, sub.x)
                            m.hole.unit = Vector.perp(Vector.normalise(sub))

                            if (tech.isWormholeDamage) {
                                who = Matter.Query.ray(mob, m.pos, simulation.mouseInGame, 80)
                                for (let i = 0; i < who.length; i++) {
                                    if (who[i].body.alive) {
                                        mobs.statusDoT(who[i].body, 0.6, 420)
                                        mobs.statusStun(who[i].body, 240)
                                    }
                                }
                            }
                        } else {
                            m.grabPowerUp();
                        }
                    } else {
                        m.grabPowerUp();
                    }
                } else if (m.holdingTarget && m.fieldCDcycle < m.cycle) { //holding, but field button is released
                    m.pickUp();
                } else {
                    m.holdingTarget = null; //clears holding target (this is so you only pick up right after the field button is released and a hold target exists)
                    m.hole.isReady = true;
                }
                m.drawFieldMeter()
            },
        },
    ],
};