function TimeTable() {


    this.db = new Dexie("Productivity");

    this.db.version("1").stores({activities: "[specifier+date]"});

    this.db.open().catch( function(event){

        console.error(" connectioDatabasen failed!");

    });

    this.add = function(milliseconds, specifier, date){

        var db = this.db;

        db.activities.get({specifier: specifier, date: date.toDateString()}, function(activity){

            if(activity != undefined)
                db.activities.put({specifier: specifier, date: date.toDateString(), timeSpend: activity.timeSpend + milliseconds});
            else
                db.activities.put({specifier: specifier, date: date.toDateString(), timeSpend: milliseconds});

        });
        
    };

    this.set = function(milliseconds, specifier, date){

        var db = this.db;

        db.activities.put({specifier: specifier, timeSpend: milliseconds, date: date.toDateString()});

    };

    this.get = async function(specifier, date, callback){

        var db = this.db;
        var timeSpend;

        db.activities.get({specifier: specifier, date: date.toDateString()}, function(activity){
            callback(activity.timeSpend);
        });
    };

    this.getAll = function(){

        var db = this.db;

        return db.activities.toArray();

    };

    this.getAllWithDate = function(date){

        var db = this.db;

        return db.activities.where({date: date.toDateString}).toArray();

    };
}


function convertMillisecondsForBadge(milliseconds){
    var time = new Date(milliseconds);
    if (time.getHours() == 0){
        return time.getMinutes().toString() + "m";
    } else if (time.getHours() < 10){
        return time.getHours().toString() + ":" + Math.floor(time.getMinutes() / 10).toString() + "h";
    } else {
        return time.getHours().toString() + "h";
    }
}

function getFQDN(url){
    output = /www\..+\.[a-z]{2,3}\//i.exec(url);

    if(output != null)
        return output[0];
    else
        return null;
}



var killDistraction = (function (){
    var currentPage = {name: null, startTime: null, counter: 0};
    var timeTable = new TimeTable();
    var self = this;

    this.getIdentifierOfTab = function(tab){
        if(tab.url == null) return null;
        var identifier = getFQDN(tab.url);
        return identifier != null ? identifier : "others";
    }

    function ifActivePageChanged(callback){
        chrome.tabs.query({active: true, lastFocusedWindow: true}, function(result){
    
            var currentActivePage;

            if(result.length){
                var currentActivePage = self.getIdentifierOfTab(result[0]);
            }

            if(currentPage.name != currentActivePage){
                callback(currentActivePage);
            }
    
        });
    }

    function consumeCurrentPage(){
        if(currentPage.name != null){
            timeTable.add(new Date() - currentPage.startTime, currentPage.name, new Date());
        }
    }
    
    function loadNewActivePage(newActivePage){
        currentPage.name = newActivePage;
        currentPage.startTime = new Date();
        if(newActivePage != null)
            timeTable.get(newActivePage, new Date(), function(timeSpend){
                currentPage.counter = timeSpend;
            });
    }

    function refreshActivePage(){
        ifActivePageChanged(function(currentActivePage){
            consumeCurrentPage();
            loadNewActivePage(currentActivePage);
        });
    }

    function tick() {
        if(currentPage.name != null){
            currentPage.counter += 1000;
            chrome.browserAction.setBadgeText({text: convertMillisecondsForBadge(currentPage.counter)});
        } else {
            chrome.browserAction.setBadgeText({text: ""});
        }
        
    }

    this.backup = function(){
        consumeCurrentPage();
        currentPage.startTime = new Date();
    }

    setInterval(this.backup, 300000);

    setInterval(tick, 1000);
    
    chrome.tabs.onUpdated.addListener(refreshActivePage);

    chrome.tabs.onActivated.addListener(refreshActivePage);

    chrome.windows.onFocusChanged.addListener(refreshActivePage);

    chrome.runtime.onSuspend.addListener(consumeCurrentPage);

    return this;
})();

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
    if(message.command === "getEnviroment"){
        sendResponse({enviroment: killDistraction});
    }
});

chrome.browserAction.onClicked.addListener(function(){
    chrome.tabs.create({url: "pages/popup.html"});
});