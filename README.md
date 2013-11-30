ThinkMVC
========

ThinkMVC is a javascript MVC framework. It follows the AMD rule, namely you don't care about the order of defining classes. Also the framework defines the single entrance of executing your custom javascript code.

What is the architecture?
1. The core part can do: construct a "class", allow a class to inherit from the other one, download resources asynchronously, provide a single entrance of executing the custom code.
2. Base on core part, it provides such classes: Base, Event, EventManager, ui.Common, Controller, View, Model, Collection.
(1) Base: the super class of all other custom classes
(2) Event: custom event class
(3) EventManager: manage events
(4) Model: it inherits from EventManager. it is supposed to contain business logic.
(5) Collection: a set of Model. It also inherits from EventManager
(6) ui.Common: it provides some  common APIs related to DOM
(7) Controller: it responses customer requests from client and decides which model should handle requests
(8) View: it listens to the model events and updates UI


How does it work?
1. Firstly you need load the thinkmvc.js in the html page and set an attribute 'data-page' to the body tag. This attribute tells the framework what the current page is.
<script type="text/javascript" data-config="config.js" src="thinkmvc.js" defer></script>
<body data-page=“gateway”>…</body>

2. The framework load config.js and read it. And then load other resources which your custom code depends on.
config.js
-------------------
TM.configure({
  baseUrl: '',
  dependencies: {
    myapp: ['data'],
  },                                                                                                                                      
  forceSync: false,                                                                                                                       
  modules: {
    data: '/gp/mcheckout/assets/javascript/data_demo.js',
    myapp: '/gp/mcheckout/assets/javascript/appliaction_demo.js'
  },

  pages: {
    gateway: {
      controller: 'doc.GatewayController',
      module: 'myapp'
    }
  }
});
-------------------

3. After all resources are downloaded, the framework creates the page-level controller instance for current page.

4. in the controller, you can do such stuff: binds windows events, initialize the page, etc.
