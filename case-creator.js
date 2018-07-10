var nforce = require('nforce');

module.exports = function(item, size) {
    var vars = {
        item: item,
        size: size,
        clientId: process.env.SF_CLIENT_ID,
        clientSecret: process.env.SF_CLIENT_SECRET,
        redirectUrl: process.env.SF_AUTH_REDIRECT_URL,
        username: process.env.SF_USERNAME,
        password: process.env.SF_PASSWORD,
        token: process.env.SF_TOKEN
    };
    console.log(vars);
    
    var org = nforce.createConnection({
        clientId: process.env.SF_CLIENT_ID,
        clientSecret: process.env.SF_CLIENT_SECRET,
        redirectUri: process.env.SF_AUTH_REDIRECT_URL,
        mode: 'single'
    });

    //create the object
    var newCase = nforce.createSObject('Case');
    newCase.set('Subject', 'FitAssist: Jane - fitting room 4');
    newCase.set('Customer_Name__c', 'Jane Smith');
    newCase.set('Priority', 'High');
    newCase.set('Origin', 'Fitting Room Assistant');
    newCase.set('Type', 'FitAssist');
    newCase.set('Status', 'New');
    newCase.set('Description', 'Item: ' + item + "\nSize: " + size);

    org.authenticate({
        username: process.env.SF_USERNAME,
        password: process.env.SF_PASSWORD + process.env.SF_TOKEN
    }).then(function () {
        return org.insert({
            sobject: newCase
        })
    }).then(function (result) {
        if (result.success) {
            console.log("Case successfully created!");
        } else {
            console.log("Case creation FAILED: " + JSON.stringify(result));
        }
    }).error(function (err) {
        console.log("Case creation FAILED: " + JSON.stringify(err));
    });
    return true;
}