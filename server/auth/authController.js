// Auth Controller
// ---------------
//
// The Auth controller handles requests passed from the User router.

var Q = require('q');
var request = require('request');
var keys = require('../config/secureAuth.js');
var $ = require('jquery');

var auth = {
  // This function assigns paramaters for an API request.
  assignReqParams: function(provider, usage, param){
    var call = provider + '-' + usage;
    
    if (call === 'github-getRepos'){
      return {
        // param: (function(){console.log('inside', param)})(),
        url: 'https://api.github.com/users/' + param.github.user.username + '/repos',
        data: {access_token: param.github.accessToken},
        headers: {
          'User-Agent': 'GitFit',
          Authorization: 'token ' + param.github.accessToken
        }
      };
    }

    var paramStore = {
      
      'github-getToken': {
        uri: 'https://github.com/login/oauth/access_token',
        redirect_uri: 'http://localhost:8000',
        method: 'GET',
        body: {
          code: param,
          'client_id': keys.github.clientID,
          'client_secret': keys.github.clientSecret
        },
        json: true
      },

      'github-getUser': {
        headers: {
          'User-Agent': 'GitFit',
          Authorization: 'token ' + param
        },
        url: 'https://api.github.com/user',
      },

      'jawbone-getToken': {
        uri: 'https://jawbone.com/auth/oauth2/token?client_id=' + keys.jawbone.clientID + 
          '&client_secret=' + keys.jawbone.clientSecret + 
          '&grant_type=authorization_code' +
          '&code=' + param,
      },

      'jawbone-getUser':{
        url: 'https://jawbone.com/nudge/api/v.1.1/users/@me',
        headers: {'Authorization': 'Bearer ' + param},  
      }
    };

    return paramStore[call];
  },

  // Save a new user in our database
  getTokenFromCode: function(req, res, next){
    var userAccounts = req.query.accountCodes;
    var tokenParams = auth.assignReqParams('github', 'getToken', userAccounts.github.code);
    var fitnessParams = auth.assignReqParams(userAccounts.fitness.provider, 'getToken', userAccounts.fitness.code);
    var deferredGet = Q.nfbind(request);

    deferredGet(tokenParams)
      .then(function(body){
        userAccounts.github.accessToken = body[0].body.access_token;
        return userAccounts;
      })
      .then(function(userAccounts){
        deferredGet(fitnessParams)
          .then(function(body){
            userAccounts.fitness.accessToken = JSON.parse(body[0].body).access_token;
            return userAccounts;
        })        
          // get user info from github 
          .then(function(userAccounts){
            var githubUserParams = auth.assignReqParams('github', 'getUser', userAccounts.github.accessToken);
            deferredGet(githubUserParams)
              .then(function(body){
                var parsedBody = JSON.parse(body[0].body);
                // console.log('JSON.Parse: body[0].body', JSON.parse(body[0].body));
                userAccounts.github.user = {
                  id: parsedBody.id,
                  username: parsedBody.login,
                  name: parsedBody.name,
                  repos: parsedBody.repos_url
                };
                return userAccounts;
              })
              .then(function(userAccounts){
                var githubUserParams = auth.assignReqParams('github', 'getRepos', userAccounts);
                // deferredGet(githubUserParams);
                  deferredGet(githubUserParams)
                  .then(function(body){
                    console.log(JSON.parse(body[0].body));

                    var reposList = [];

                    JSON.parse(body[0].body).forEach(function(repo){
                      reposList.push(repo.name);
                    });
                    console.log(reposList);

                    
                    // repos.forEach(function(repo) {
                    // });
                    // updateState({
                    //   userInfo: {github: {
                    //     repos: {$set: reposList}
                    //   }}
                    // });

                    // userAccounts.github.reposList = reposList;

                  });
                  return userAccounts;
                })
              // .then(function(userAccounts){
              //   console.log(userAccounts);
              //   console.log('JSON.parse(x[0]["body"])', JSON.parse(x[0]["body"]));


              //   // console.log('Saved user repos: ', reposList);
              //   // console.log('Confirm via log User');

              //   app.state.userInfo.github.repos.forEach(function(repo) {
              //     app.auth.makeRequest('github', 'commits', repo);
              //   });

              // });

              // get commits - adapt from app.jsx
                // for each repo
                  // for each commit, they're stored by author - add those that have your username

              // get overall steps from jawbone - adapt from app.jsx

              // get user info from jawbone
              // .then(function(userAccounts){
              //   var fitnessUserParams = auth.assignReqParams(userAccounts.fitness.provider, 'getUser', userAccounts.fitness.accessToken);
              //   deferredGet(fitnessUserParams)
              //     .then(function(body, req){
              //       var parsedBody = JSON.parse(body[1]);
              //       console.log('parsedBody', parsedBody);
              //       // userAccounts.fitness.user = {
              //       // xid: parsedBody.data.xid,
              //       // name: parsedBody.name
              //       // };
              //     });
              // })
              // .then(function(userAccounts){
              //   console.log('userAccounts', userAccounts);
              // }); 
          });
      });

    // .then()
    // get user info from fitnessProvider
    // .then()
    // save user in database by github unique id if info from both services is available
    // .then()
    // deferred.resolve(req.query.accountCodes);

  },

  getRequest: function(param, cb){
    request(param, function(err, res, body){
      if(err) {
        console.log(err);
      } else {
        console.log('DOING A GET REQUEST WITH THESE PARAMATERS:', param);
        cb(body);
      }
    });
  },

};

module.exports = auth;