// API Handler
//_____________
//
// The API Handler is a collection of promises that can be called from elsewhere to simplify code readability.

var Q = require('q');
var deferredRequest = Q.nfbind(require('request'));
var assignRequestParams = require('./requestParameters.js');

module.exports = {

  // Takes in a userAccount, exchanges the provider codes in the account object for their respective tokens.
  getTokens: function(userAccount) {
    // Get Github token from code
    var githubTokenParams = assignRequestParams('github', 'getToken', userAccount.github.code);

    return deferredRequest(githubTokenParams)
      // Save token to userAccount
      .then(function(response){
        userAccount.github.accessToken = response[1].access_token;
      })
      // If there is a Fitness Provider, get its token from code
      .then(function(){
        if( userAccount.fitness ) {
        var fitnessParams = assignRequestParams(userAccount.fitness.provider, 'getToken', userAccount.fitness.code);
        return deferredRequest(fitnessParams)
          // Save Fitness token to userAccount
          .then(function(response) {
            userAccount.fitness.accessToken = JSON.parse(response[1]).access_token;
            return userAccount;
          });
        }
      })
      .fail(function(error) {
        console.error('Error in apiHandler.getTokens, token exchange failed: ', error);
      });
  },

  getGithubUser: function(userAccount) {
    var githubUserParams = assignRequestParams('github', 'getUser', userAccount.github.accessToken);
    return deferredRequest(githubUserParams)
    // Store Github User information
      .then(function(response) {
        var githubUser = JSON.parse(response[1]);
        userAccount.github.user = {
          id: githubUser.id,
          reposUrl: githubUser.repos_url,
          username: githubUser.login,
          commitDates: [],
          commitCounts: []
        };
        return userAccount;
      });
  },

  getGithubData: function(userAccount) {

    var githubRepoParams = assignRequestParams('github', 'repos', userAccount.github);

    // Get Github Repo information
    return deferredRequest(githubRepoParams)
    
      // Extract individual repo names and store:
      .then(function(response){
        var repos = JSON.parse(response[1]);
        var repoList = [];
        repos.forEach(function(repo) {
          repoList.push(repo.name);
        });
console.log("THIS IS THE REPO LIST IS THERE ONE THAT IS UNDEFINED WHAT THE HELL IS GOING ON", repoList);
        userAccount.github.repos = repoList;
      })
      // Extract commit information by repo and store on userAccount:
      .then(function() {
        var commitCountDates = {};
        var repoUrlsToCall = userAccount.github.repos.map(function(repo) {
          return assignRequestParams('github', 'commits-weekly', userAccount, repo);
        });
// console.log("WE ARE ABOUT TO MAP THROUGH ALL OF THESE: ", repoUrlsToCall);
        return Q.all(repoUrlsToCall.map(function(callParam) {
          return deferredRequest(callParam);
        }))
          .then(function(results) {



// console.log("ARE ALL OF THESE RESULTS DEFINED?  WHY ARE WE GETTING NO FOREACH ON UNDEFINED?  WHICH FOREACH IS FAILING? ", Array.isArray(results), typeof results);
console.log("THIS IS THE RESULTS LENGTH", results.length);
// console.log("THIS IS THE RESULTS LENGTH", results);

            return results.forEach(function(response, index) {
              var commits = JSON.parse(response[1]);



console.log("ARE ALL OF THESE COMMITS DEFINED?  WHY ARE WE GETTING NO FOREACH ON UNDEFINED?  WHICH FOREACH IS FAILING? ", typeof commits, userAccount.github.repos[index]);
if( !Array.isArray(commits) ) {console.log(commits)};



              commits.forEach(function(commitInfo){
                var commitDate = commitInfo.commit.committer.date.match(/[0-9][0-9][0-9][0-9]\-[0-9][0-9]\-[0-9][0-9]/)[0];
                commitCountDates[commitDate] = commitCountDates[commitDate] + 1 || 0;
              });
            });
          })
          .then(function() {
            Object.keys(commitCountDates).forEach(function(key) {
              userAccount.github.user.commitDates.push(key);
              userAccount.github.user.commitCounts.push(commitCountDates[key]);
            });
console.log("THIS USER SHOULD HAVE ALL GITHUB DATA", userAccount);
            return userAccount;
          });
      })

      .fail(function(error) {
        console.error('Error in apiHandler.getGithubData, failed to get Github data: ', error);
      });
  },

  getFitnessData: function(userAccount) {
console.log('THIS IS THE ACCOUNT BEING PASSED INTO GETFITNESSDATA', userAccount);

    var fitnessStepsParams = assignRequestParams(userAccount.fitness.provider, 'steps', userAccount.fitness.accessToken);
    userAccount.fitness.stepDates = [];
    userAccount.fitness.stepCounts = [];

    return deferredRequest(fitnessStepsParams)
      // Get and process data
      .then(function(response) {
        var jawboneMoves = JSON.parse(response[1]).data.items;
console.log("ARE ALL OF THESE RESULTS DEFINED?  WHY ARE WE GETTING NO FOREACH ON UNDEFINED?  WHICH FOREACH IS FAILING? ", typeof jawboneMoves);
if( !Array.isArray(jawboneMoves) ) {console.log(jawboneMoves)};
        jawboneMoves.forEach(function(moveData) {
          var date = moveData.date.toString();
          date = date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
          userAccount.fitness.stepDates.push(date);
          userAccount.fitness.stepCounts.push(moveData.details.steps);
        });
        return userAccount;
      })

      .fail(function(error) {
        console.error('Error in apiHandler.getFitnessData, failed to get steps: ', error);
      });
  }

};
