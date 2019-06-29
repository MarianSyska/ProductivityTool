var killDistraction;

chrome.runtime.sendMessage(null, {command: "getEnvironment"}, null, function(response){
    killDistraction = response.environment;
});

killDistraction.backup();

