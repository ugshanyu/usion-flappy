(function (root) {
  'use strict';

  function create(options) {
    var sdkReady = false;
    var submitted = false;
    var currentTab = 'friends';

    function strings() {
      return options.getStrings();
    }

    function emptyText(tab) {
      return tab === 'global' ? strings().emptyGlobal : strings().empty;
    }

    function setTab(tab) {
      var friends = document.getElementById('tab-friends');
      var global = document.getElementById('tab-global');
      friends.classList.toggle('active', tab === 'friends');
      friends.setAttribute('aria-selected', tab === 'friends');
      global.classList.toggle('active', tab === 'global');
      global.setAttribute('aria-selected', tab === 'global');
    }

    function showEmpty(tab) {
      document.getElementById('records').innerHTML =
        '<div class="empty">' + emptyText(tab) + '</div>';
    }

    function renderRecords(entries, tab) {
      var records = document.getElementById('records');
      if (!entries.length) {
        showEmpty(tab);
        return;
      }
      records.innerHTML = '';
      entries.forEach(function (entry) {
        var row = document.createElement('div');
        row.className = 'rec' + (entry.is_me ? ' me' : '');
        var rank = document.createElement('div');
        rank.className = 'rank';
        rank.textContent = String(entry.rank);
        var avatar;
        if (entry.avatar) {
          avatar = document.createElement('img');
          avatar.src = entry.avatar;
          avatar.alt = '';
        } else {
          avatar = document.createElement('div');
          avatar.className = 'ph';
          avatar.textContent = (entry.name || '?').charAt(0).toUpperCase();
        }
        var name = document.createElement('div');
        name.className = 'nm';
        name.textContent = entry.is_me ? strings().you : (entry.name || 'Player');
        var score = document.createElement('div');
        score.className = 'sc';
        score.textContent = String(entry.score);
        row.appendChild(rank);
        row.appendChild(avatar);
        row.appendChild(name);
        row.appendChild(score);
        records.appendChild(row);
      });
    }

    function load(tab) {
      currentTab = tab;
      setTab(tab);
      var records = document.getElementById('records');
      if (!sdkReady || !root.Usion || !Usion.leaderboard) {
        showEmpty(tab);
        return;
      }
      records.innerHTML = '<div class="empty">' + strings().loading + '</div>';
      var request = tab === 'global'
        ? Usion.leaderboard.top({ limit: 10 })
        : Usion.leaderboard.friends({ limit: 20 });
      request.then(function (entries) {
        if (currentTab === tab) renderRecords(entries || [], tab);
      }).catch(function () {
        if (currentTab === tab) showEmpty(tab);
      });
    }

    function finish(score) {
      currentTab = 'friends';
      setTab(currentTab);
      document.getElementById('records').innerHTML =
        '<div class="empty">' + strings().loading + '</div>';
      if (!sdkReady || !root.Usion || !Usion.leaderboard) {
        showEmpty(currentTab);
        return;
      }
      var submit = Promise.resolve();
      if (!submitted && score > 0) {
        submitted = true;
        submit = Usion.leaderboard.submit(score).then(function (result) {
          if (result && typeof result.best === 'number') {
            options.updateBest(result.best);
          }
        }).catch(function () {});
      }
      submit.then(function () { load(currentTab); });
    }

    function boot() {
      sdkReady = true;
      if (Usion.leaderboard && Usion.leaderboard.me) {
        Usion.leaderboard.me().then(function (result) {
          if (result && typeof result.score === 'number') {
            options.updateBest(result.score);
          }
        }).catch(function () {});
      }
    }

    function reset() {
      submitted = false;
    }

    document.getElementById('tab-friends').addEventListener('click', function () {
      load('friends');
    });
    document.getElementById('tab-global').addEventListener('click', function () {
      load('global');
    });

    return { boot: boot, finish: finish, reset: reset };
  }

  root.FlappyLeaderboard = { create: create };
})(window);
