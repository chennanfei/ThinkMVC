TM.configure({
  baseUrl: '',
  
  dependencies: {
    docIndex: ['jquery', 'docData']
  },
  
  forceSync: false,
  
  modules: {
    docData: 'data_demo.js',
    docIndex: 'demo.js',
    jquery: 'http://code.jquery.com/jquery-2.0.3.js'
  },
  
  pages: {
    gateway: {
      controller: 'doc.GatewayController',
      module: 'docIndex'
    }
  }
});