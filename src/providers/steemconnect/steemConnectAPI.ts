import sc2 from 'sc2-sdk';

const api = sc2.Initialize({
      app: 'steemia.app',
      callbackURL: 'http://localhost:8100',
      scope: ['login', 'offline', 'vote', 
                  'comment', 'comment_delete', 
                  'comment_options', 'custom_json',
                  'claim_reward_balance'],
});

export default api;