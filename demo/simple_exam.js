TM.declare('HomeController').inherit('thinkmvc.Controller').extend({
  events: {
    'click #btn': 'showUserName'
  },
  
  rootNode: '#enter-fields',
  
  selectors: {
    userName: '#username'
  },
  
  initialize: function() {
    this.invoke('thinkmvc.Controller:initialize');
    this._el.$userName.val('').focus();
  },
  
  showUserName: function() {
    var user = this.U.createInstance('models.User', this._el.$userName.val());
    user.retrieveDetails();
  }
});

TM.declare('models.User').inherit('thinkmvc.Model').extend({
  viewPath: 'views.UserView',
  
  initialize: function(name) {
    this.invoke('thinkmvc.Model:initialize');
    this._name = name;
  },
  
  retrieveDetails: function() {
    var msg, name = this._name;
    if (!name) {
      msg = 'Please enter your name.';
    } else {
      var age = name === 'Nanfei' ? 31 : (name === 'Eric' ? 16 : 27);
      msg = 'Hello, ' + name + ', your age is ' + age;
      if (age > 20) {
        msg += ', your edu is master';
      }
    }
    
    this.trigger('show-details', msg);
  }
});

TM.declare('views.UserView').inherit('thinkmvc.View').extend({
  events: {
    'show-details': 'showDetails'
  },
  
  selectors: {
    yourName: '#yourName'
  },
  
  showDetails: function(evt) {
    this._el.$yourName.html(evt.data).show();
  }
});