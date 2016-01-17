var monsters;
var selectedMonster;

window.addEventListener("load", function () {
    setupConditionalFields();

    loadMonsters();
    byId("out_new").addEventListener("click", newEmptyMonster);
    byId("out_delete").addEventListener("click", function () {
        deleteMonster(selectedMonster);
    });
    byId("in_panel").addEventListener("change", function () {
        selectedMonster.setMonster(getInputMonster());
        saveMonsters();
    });
});

function MonsterElem(monster) {
    var elem;
    var handleSelected = false;
    var selectionChangeInterval=null;

    this.getMonster = function () {
        return monster;
    }
    this.setMonster = function (newMonster) {
        monster = newMonster;
        renderMonster(monster, elem);
    }
    this.getElem = function () {
        return elem;
    }
    this.select = function () {
        if (selectedMonster) selectedMonster.deselect();
        selectedMonster = this;
        elem.className = "out_monster selected";
        setInputMonster(monster);
    }
    this.deselect = function () {
        elem.className = "out_monster";
    }
    this.destroy = function () {
        if (selectionChangeInterval !== null) {
            clearInterval(selectionChangeInterval);
        }
    }

    elem = byId("out_template").cloneNode(true);
    elem.addEventListener("click", this.select.bind(this));

    var handleTop = byId("out_handle_top", elem);

    function selectHandle(event) {
        var selection = window.getSelection();
        selection.selectAllChildren(handleTop);
        selectionChange();
    }
    handleTop.addEventListener("click", selectHandle);
    handleTop.addEventListener("contextmenu", selectHandle);

    function selectionChange() {
        var selection = window.getSelection();
        if (selection.anchorNode && selection.focusNode
        && isAncestor(handleTop, selection.anchorNode)
        && isAncestor(handleTop, selection.focusNode)) {
            if (!handleSelected) {
                handleSelected = true;
                byId("out_handle_text", elem).className = "selected";
                selectionChangeInterval = setInterval(selectionChange, 100);
            }
        } else if (handleSelected) {
            handleSelected = false;
            byId("out_handle_text", elem).className = "";
            clearInterval(selectionChangeInterval);
            selectionChangeInterval = null;
        }
    }

    handleTop.addEventListener("cut", (function (event) {
        var data = JSON.stringify(monster);
        event.clipboardData.setData("application/json", data);
        event.clipboardData.setData("text/plain", data);
        event.preventDefault();
        deleteMonster(this)
    }).bind(this));

    handleTop.addEventListener("copy", function (event) {
        var data = JSON.stringify(monster);
        event.clipboardData.setData("application/json", data);
        event.clipboardData.setData("text/plain", data);
        event.preventDefault();
        byId("out_handle_text", elem).className = "selected";
    });

    handleTop.addEventListener("paste", (function (event) {
        var monster = emptyMonster();
        var json = event.clipboardData.getData("text/plain");
        try {
            var data = JSON.parse(json);
            for (var k in monster) {
                if (!(k in data)) throw new Exception("missing key: " + k);
                monster[k] = data[k]
                delete data[k];
            }
            for (var k in data) {
                throw new Exception("unknown key: " + k);
            }
            this.setMonster(monster);
            if (selectedMonster == this) setInputMonster(monster);
            saveMonsters();
        } catch (e) {
            byId("out_handle_text").className = "selected error";
        }
        event.preventDefault();
    }).bind(this));

    handleTop.addEventListener("input", function (event) {
        handleTop.textContent = "JSON";
    });

    elem.id = "";
    elem.hidden = false;
    this.setMonster(monster)

    return this;
}

function newEmptyMonster () {
    var monster = new MonsterElem(emptyMonster());
    var panel = byId("out_panel");
    panel.insertBefore(monster.getElem(), panel.firstChild);
    monsters.push(monster);
    monster.select();
    saveMonsters();
}

function deleteMonster (monster) {
    byId("out_panel").removeChild(monster.getElem());
    monster.destroy();
    var i = monsters.indexOf(monster);
    monsters.splice(i, 1);
    if (i < monsters.length) {
        if (monster == selectedMonster) monsters[i].select();
    } else if (monsters.length) {
        if (monster == selectedMonster) monsters[i-1].select();
    } else {
        newEmptyMonster();
    }
    saveMonsters();
}

function loadMonsters() {
    var rawMonsters = cookies.get("monsters", [emptyMonster()]);
    monsters = [];
    forEach(rawMonsters, function (rawMonster) {
        var monster = new MonsterElem(rawMonster);
        monsters.push(monster);
        var panel = byId("out_panel");
        panel.insertBefore(monster.getElem(), panel.firstChild);
    });
    monsters[monsters.length-1].select();
}

function saveMonsters() {
    var rawMonsters = [];
    forEach(monsters, function (monsterElem) {
        rawMonsters.push(monsterElem.getMonster());
    });
    cookies.set("monsters", rawMonsters);
}

function emptyMonster() {
    var monster = {};
    var elements = byId("in_panel").elements;
    forEach(elements, function (e) {
        if (!e.name) return;
        var item = elements.namedItem(e.name);
        monster[e.name] = item.type == "checkbox" ? false : "";
    });
    return monster;
}

function getInputMonster() {
    var monster = {};
    var elements = byId("in_panel").elements;
    forEach(elements, function (e) {
        if (!e.name) return;
        var item = elements.namedItem(e.name);
        monster[e.name] = item.type == "checkbox" ? item.checked : item.value;
    });
    return monster;
}

function setInputMonster(monster) {
    var elements = byId("in_panel").elements;
    for (var name in monster) {
        var item = elements.namedItem(name);
        if (item === null) continue;
        var value = monster[name];
        if (typeof value == "boolean" && item.type == "checkbox") {
            item.checked = value;
            item.dispatchEvent(new CustomEvent("change"));
        } else if (typeof value == "string") {
            item.value = value;
        }
    }
}

function renderMonster(monster, e) {
    byId("out_name",e).textContent = monster.name;
    byId("out_move",e).textContent = monster.move;
    byId("out_instinct",e).textContent = monster.instinct;

    var tags = [];
    var qualities = [];
    var attackTags = [];
    var range = {hand:false, close:false, reach:false, near:false, far:false};
    var damageSides = null
    var damageAdd = 0;
    var damageBest = false;
    var damageWorst = false;
    var piercing = 0;
    var hp = null;
    var armour = null;

    switch (monster.number) {
        case "horde":
            tags.push("horde");
            damageSides = 6;
            hp = 3;
            break;
        case "group":
            tags.push("group");
            damageSides = 8;
            hp = 6;
            break;
        case "solitary":
            tags.push("solitary");
            damageSides = 10;
            hp = 12;
    }

    switch (monster.size) {
        case "tiny":
            tags.push("tiny");
            range.hand = true;
            damageAdd -= 2;
            break;
        case "small":
            tags.push("small");
            range.close = true;
            break;
        case "human":
            range.close = true;
            break;
        case "large":
            tags.push("large");
            range.reach = true;
            if (hp !== null) hp += 4;
            damageAdd += 1;
            break;
        case "huge":
            tags.push("huge");
            range.reach = true;
            if (hp !== null) hp += 8;
            damageAdd += 3;
    }

    armour = parseInt(monster.armour);
    if (isNaN(armour)) armour = null;

    if (monster.forceful) {
        damageAdd += 2;
        attackTags.push("forceful");
    }
    if (monster.skill_offense) {
        damageBest = true;
    }
    if (monster.skill_defence) {
        if (armour !== null) armour += 1;
    }
    if (monster.deft_strikes) {
        piercing += 1;
    }
    if (monster.endurance) {
        if (hp !== null) hp += 4;
    }
    if (monster.stealthy) {
        tags.push("stealthy");
        byId("out_stealthy_move",e).textContent = monster.stealthy_move;
        byId("out_stealthy_move",e).hidden = false;
    } else {
        byId("out_stealthy_move",e).hidden = true;
        byId("out_stealthy_move",e).textContent = "";
    }
    if (monster.adaptation) {
        var newQualities = monster.adaptation_quality.split(/\s*,\s*/g);
        qualities = qualities.concat(newQualities);
    }
    if (monster.divine) {
        tags.push("divine");
        switch (monster.divine_favour) {
            case "damage":
                damageAdd += 2;
                break;
            case "hp":
                if (hp !== null) hp += 2;
                break;
            case "both":
                damageAdd += 2;
                if (hp !== null) hp += 2;
        }
    }
    if (monster.magical) {
        tags.push("magical");
        byId("out_magical_move",e).textContent = monster.magical_move;
        byId("out_magical_move",e).hidden = false;
    } else {
        byId("out_magical_move",e).hidden = true;
        byId("out_magical_move",e).textContent = "";
    }

    byId("out_attack",e).textContent = monster.attack;
    if (monster.vicious) {
        damageAdd += 2;
    }
    if (monster.reach) {
        range.reach = true;
    }
    if (monster.weak) {
        if (damageSides) damageSides -= 2;
    }
    if (monster.messy) {
        attackTags.push("messy");
        addPiercing = parseInt(monster.messy_piercing);
        if (!isNaN(addPiercing)) piercing += addPiercing;
    }
    if (monster.ignores_armour) {
        attackTags.push("ignores armour");
    }
    if (monster.ranged) {
        range.hand = false;
        range.close = false;
        range.reach = false;
        switch (monster.range) {
            case "near":
                range.near = true;
                break;
            case "far":
                range.far = true;
                break;
            case "both":
                range.near = true;
                range.far = true;
        }
    }

    if (monster.devious) {
        tags.push("devious");
        byId("out_devious_move",e).textContent = monster.devious_move;
        byId("out_devious_move",e).hidden = false;
    } else {
        byId("out_devious_move",e).hidden = true;
        byId("out_devious_move",e).textContent = "";
    }
    if (monster.organised) {
        byId("out_organised_move",e).textContent = monster.organised_move;
        byId("out_organised_move",e).hidden = false;
    } else {
        byId("out_organised_move",e).hidden = true;
        byId("out_organised_move",e).textContent = "";
    }
    if (monster.intelligent) {
        tags.push("intelligent");
    }
    if (monster.cautious) {
        tags.push("cautious");
        if (armour !== null) armour += 1;
    }
    if (monster.hoarder) {
        tags.push("hoarder");
    }
    if (monster.planar) {
        tags.push("planar");
        byId("out_planar_move",e).textContent = monster.planar_move;
        byId("out_planar_move",e).hidden = false;
    } else {
        byId("out_planar_move",e).hidden = true;
        byId("out_planar_move",e).textContent = "";
    }
    if (monster.beyond_biology) {
        if (hp !== null) hp += 4;
    }
    if (monster.construct) {
        tags.push("construct");
        var newQualities = monster.construct_qualities.split(/\s*,\s*/g);
        qualities = qualities.concat(newQualities);
    }
    if (monster.terrifying) {
        tags.push("terrifying");
        var newQualities = monster.terrifying_quality.split(/\s*,\s*/g);
        qualities = qualities.concat(newQualities);
    }
    if (monster.amorphous) {
        tags.push("amorphous");
        if (armour !== null) armour += 1;
        if (hp !== null) hp += 3;
    }
    if (monster.ancient) {
        if (damageSides) damageSides += 2;
    }
    if (monster.nonviolent) {
        damageWorst = true;
    }

    byId("out_tags",e).textContent = tags.join(", ",e);

    byId("out_qualities_row",e).hidden = qualities.length == 0;
    qualities = qualities.filter(function (q) { return q.length != 0 });
    byId("out_qualities",e).textContent = qualities.join(", ",e);

    var preAttackTags = [];
    for (var r in range) if (range[r]) preAttackTags.push(r);
    if (piercing != 0) preAttackTags.push("+"+piercing.toString()+" piercing");
    attackTags = preAttackTags.concat(attackTags);
    byId("out_attack_tags",e).textContent = attackTags.join(", ",e);

    if (damageSides !== null) {
        damageString = "d"+damageSides.toString();

        if (damageBest && !damageWorst) {
            damageString = "b[2"+damageString+"]"
        } else if (damageWorst && !damageBest) {
            damageString = "w[2"+damageString+"]"
        }

        if (damageAdd > 0) {
            damageString += "+"+damageAdd.toString();
        } else if (damageAdd < 0) {
            damageString += damageAdd.toString();
        }

        byId("out_damage",e).textContent = damageString;
        byId("out_damage_warning",e).hidden = !damageBest || !damageWorst
    } else {
        byId("out_damage",e).textContent = "";
        byId("out_damage_warning",e).hidden = true;
    }

    if (armour !== null) {
        byId("out_armour",e).textContent = armour.toString();
    } else {
        byId("out_armour",e).textContent = "";
    }

    if (hp != null) {
        byId("out_hp",e).textContent = hp.toString();
    } else {
        byId("out_hp",e).textContent = "";
    }
}

function setupConditionalFields() {
    [["#in_stealthy",   "#in_stealthy_move"],
     ["#in_adaptation", "#in_adaptation_quality"],
     ["#in_divine",     "[name=divine_favour]"],
     ["#in_magical",    "#in_magical_move"],
     ["#in_messy",      "[name=messy_piercing]"],
     ["#in_ranged",     "[name=range]"],
     ["#in_devious",    "#in_devious_move"],
     ["#in_organised",  "#in_organised_move"],
     ["#in_planar",     "#in_planar_move"],
     ["#in_construct",  "#in_construct_qualities"],
     ["#in_terrifying", "#in_terrifying_quality"]
    ].forEach(function (pair) {
        var ce = document.querySelector(pair[0]);
        ce.addEventListener("change", function () {
            forEach(document.querySelectorAll(pair[1]), function (e) {
                e.disabled = ! ce.checked;
            });
        });
    });
}

function byId(id, elem) {
    if (!elem) elem = document;
    return elem.querySelector("#"+id);
}

function forEach(xs, f) {
    for (var i=0; i < xs.length; ++i) f(xs[i]);
}

function isAncestor (aNode, dNode) {
    while (dNode !== aNode) {
        dNode = dNode.parentNode;
        if (dNode == null) return false;
    }
    return true;
}
